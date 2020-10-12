/**
 * Author: edzillion
 * Content License: [copyright and-or license] If using an existing system
 * 					you may want to put a (link to a) license or copyright
 * 					notice here (e.g. the OGL).
 * Software License: [your license] Put your desired license here, which
 * 					 determines how others may use and modify your module
 */

//CONFIG.debug.hooks = true;
CONFIG.logLevel = 2;

// Import JavaScript modules
import { registerSettings } from './module/settings';
import { preloadTemplates } from './module/preloadTemplates';
import { log, LogLevel } from './module/logging';

import { getPointAt } from './module/bezier';

import {
  getRandomGlyph,
  lookupTokenBloodColor,
  computeSightFromPoint,
  drawDebugRect,
  randomBoxMuller,
  getDirectionNrml,
  alignSplatsAndGetOffset,
} from './module/helpers';

import * as splatFonts from './data/splatFonts';

import { MODULE_ID } from './constants';

const lastTokenState: Array<SaveObject> = [];
const splatPool: Array<PIXI.Container> = [];
const fadingSplatPool: Array<PIXI.Container> = [];
let activeScene;

(document as any).fonts.ready.then(() => {
  log(LogLevel.DEBUG, 'All fonts in use by visible text have loaded.');
});
(document as any).fonts.onloadingdone = (fontFaceSetEvent) => {
  log(LogLevel.DEBUG, 'onloadingdone we have ' + fontFaceSetEvent.fontfaces.length + ' font faces loaded');
  const check = (document as any).fonts.check('1em splatter');
  log(LogLevel.DEBUG, 'splatter loaded? ' + check);
};

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async () => {
  log(LogLevel.INFO, 'Initializing blood-n-guts');

  // Assign custom classes and constants here

  // Register custom module settings
  registerSettings();

  // Preload Handlebars templates
  await preloadTemplates();

  // Register custom sheets (if any)
});

/* ------------------------------------ */
/* Setup module							*/
/* ------------------------------------   */
Hooks.once('setup', () => {
  // Do anything after initialization but before
  // ready
  log(LogLevel.INFO, 'setup Hook:');
});

/* ------------------------------------ */
/* When ready							              */
/* ------------------------------------ */
Hooks.once('ready', () => {
  log(LogLevel.DEBUG, 'ready, inserting preload stub');
  // Insert a div that uses the font so that it preloads
  const stub = document.createElement('div');
  stub.style.cssText = "visibility:hidden; font-family: 'splatter';";
  stub.innerHTML = 'A';
  const stub2 = document.createElement('div');
  stub2.style.cssText = "visibility:hidden; font-family: 'WC Rhesus A Bta';";
  stub2.innerHTML = 'A';
  document.body.appendChild(stub);
  document.body.appendChild(stub2);

  const canvasTokens = canvas.tokens.placeables;
  for (let i = 0; i < canvasTokens.length; i++) saveTokenState(canvasTokens[i]);
});

Hooks.on('createToken', (_scene, tokenData) => {
  const token = new Token(tokenData);
  saveTokenState(token);
});

Hooks.once('canvasInit', (canvas) => {
  log(LogLevel.INFO, 'canvasInit', canvas);
  if (canvas.scene.active) activeScene = canvas.scene;
  //redraw containers?

  const splatP = activeScene.getFlag(MODULE_ID, 'splatPool');
  if (splatP) {
    console.log(JSON.parse(splatP));
  }
});

Hooks.once('canvasReady', () => {
  log(LogLevel.INFO, 'canvasReady');
  if (CONFIG.logLevel >= LogLevel.DEBUG) {
    document.addEventListener(
      'click',
      (event) => {
        const [x, y] = [event.clientX, event.clientY];
        const t = canvas.stage.worldTransform;
        const xx = (x - t.tx) / canvas.stage.scale.x;
        const yy = (y - t.ty) / canvas.stage.scale.y;
        log(LogLevel.DEBUG, xx, yy);
      },
      false,
    );
  }
});

Hooks.on('updateToken', async (scene, tokenData, changes, options, uid) => {
  log(LogLevel.DEBUG, tokenData, changes, uid);

  const token = canvas.tokens.placeables.find((t) => t.data._id === tokenData._id);
  if (!token) log(LogLevel.ERROR, 'updateToken token not found!');

  await checkForMovement(token, changes);
  checkForDamage(token, changes.actorData);
  saveTokenState(token);
});

Hooks.on('updateActor', async (actor, changes, diff) => {
  log(LogLevel.DEBUG, actor, changes, diff);

  const token = canvas.tokens.placeables.find((t) => t.actor.id === actor.id);
  if (!token) log(LogLevel.ERROR, 'updateActor token not found!');

  await checkForMovement(token, changes);
  checkForDamage(token, changes);
  saveTokenState(token);
});

async function checkForMovement(token: Token, changes) {
  if (changes.x || changes.y) {
    log(LogLevel.DEBUG, 'checkForMovement id:' + token.id);

    // is this token bleeding?
    if (await token.getFlag(MODULE_ID, 'bleeding')) {
      log(LogLevel.DEBUG, 'checkForMovement lastTokenState', lastTokenState, changes);
      log(LogLevel.DEBUG, 'checkForMovement id:' + token.id + ' - bleeding');

      drawTrailSplats(
        token,
        splatFonts.fonts[game.settings.get(MODULE_ID, 'trailSplatFont')],
        game.settings.get(MODULE_ID, 'trailSplatSize'),
        game.settings.get(MODULE_ID, 'trailSplatDensity'),
      );
    }
  }
}

async function checkForDamage(token: Token, actorDataChanges) {
  log(LogLevel.DEBUG, 'last saves:', lastTokenState);
  if (!actorDataChanges?.data?.attributes?.hp) return;

  const currentHP = actorDataChanges.data.attributes.hp.value;
  const lastHP = lastTokenState[token.id].hp;

  if (currentHP < lastHP) {
    log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - hp down');
    const deathMult = actorDataChanges.data.attributes.hp.value === 0 ? 2 : 1;
    if (deathMult === 2) log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - death');

    drawFloorSplats(
      token,
      splatFonts.fonts[game.settings.get(MODULE_ID, 'floorSplatFont')],
      game.settings.get(MODULE_ID, 'floorSplatSize'),
      game.settings.get(MODULE_ID, 'floorSplatDensity') * deathMult,
    );
    drawTokenSplats(
      token,
      splatFonts.fonts[game.settings.get(MODULE_ID, 'tokenSplatFont')],
      game.settings.get(MODULE_ID, 'tokenSplatSize'),
      game.settings.get(MODULE_ID, 'tokenSplatDensity') * deathMult,
    );

    await token.setFlag(MODULE_ID, 'bleeding', true);
    log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - bleeding:true');
  } else if (currentHP > lastHP) {
    await token.unsetFlag(MODULE_ID, 'bleeding');
    log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - bleeding:unset');
  }
}

const drawFloorSplats = (token: Token, font: SplatFont, size: number, density: number) => {
  if (!density) return;

  const glyphArray: Array<string> = Array.from({ length: density }, () => getRandomGlyph(font));

  // scale the font based on token size
  const fontSize = size * Math.round((token.width + token.height) / canvas.grid.size / 2);

  const style: PIXI.TextStyle = new PIXI.TextStyle({
    fontFamily: font.name,
    fontSize: fontSize,
    fill: lookupTokenBloodColor(token),
    align: 'center',
  });

  const splatsContainer = new PIXI.Container();

  const pixelSpreadX = token.width * game.settings.get(MODULE_ID, 'splatSpread');
  const pixelSpreadY = token.height * game.settings.get(MODULE_ID, 'splatSpread');
  log(LogLevel.DEBUG, 'splatTrail pixelSpread', pixelSpreadX, pixelSpreadY);
  log(LogLevel.DEBUG, 'drawSplatPositions: floor ');
  const splats: Array<PIXI.Text> = glyphArray.map((glyph) => {
    const tm = PIXI.TextMetrics.measureText(glyph, style);
    const randX = randomBoxMuller() * pixelSpreadX - pixelSpreadX / 2;
    const randY = randomBoxMuller() * pixelSpreadY - pixelSpreadY / 2;
    const text = new PIXI.Text(glyph, style);
    text.x = randX - tm.width / 2;
    text.y = randY - tm.height / 2;
    return text;
  });

  const offset = alignSplatsAndGetOffset(splats);
  splatsContainer.x = offset.x;
  splatsContainer.y = offset.y;
  for (let j = 0; j < splats.length; j++) {
    splatsContainer.addChild(splats[j]);
    if (CONFIG.logLevel >= LogLevel.DEBUG) drawDebugRect(splats[j], 1, 0xffffff);
  }
  const maxDistance = Math.max(splatsContainer.width, splatsContainer.height);
  const sight = computeSightFromPoint(token.center, maxDistance);

  const sightMask = new PIXI.Graphics();
  sightMask.beginFill(1, 1);
  sightMask.drawPolygon(sight);
  sightMask.endFill();

  sightMask.x -= splatsContainer.x;
  sightMask.y -= splatsContainer.y;
  splatsContainer.addChild(sightMask);
  splatsContainer.mask = sightMask;

  splatsContainer.x += token.center.x;
  splatsContainer.y += token.center.y;

  addToSplatPool(splatsContainer);
  canvas.tiles.addChild(splatsContainer);

  if (CONFIG.logLevel >= LogLevel.DEBUG) drawDebugRect(splatsContainer);
};

const drawTrailSplats = (token: Token, font: SplatFont, size: number, density: number) => {
  if (!density) return;

  const glyphArray: Array<string> = Array.from({ length: density }, () => getRandomGlyph(font));

  // scale the font based on token size
  const fontSize = size * Math.round((token.width + token.height) / canvas.grid.size / 2);

  const style: PIXI.TextStyle = new PIXI.TextStyle({
    fontFamily: font.name,
    fontSize: fontSize,
    fill: lookupTokenBloodColor(token),
    align: 'center',
  });

  const splatsContainer = new PIXI.Container();

  log(LogLevel.DEBUG, 'drawSplatPositions: trail ');

  const lastPosOrigin = new PIXI.Point(
    lastTokenState[token.id].centerX - token.center.x,
    lastTokenState[token.id].centerY - token.center.y,
  );
  const currPosOrigin = new PIXI.Point(0, 0);
  const direction = getDirectionNrml(lastPosOrigin, currPosOrigin);

  //horiz or vert movement
  const pixelSpread = direction.x
    ? token.width * game.settings.get(MODULE_ID, 'splatSpread')
    : token.height * game.settings.get(MODULE_ID, 'splatSpread');

  const rand = randomBoxMuller() * pixelSpread - pixelSpread / 2;

  // first go half the distance in the direction we are going
  const controlPt: PIXI.Point = new PIXI.Point(
    lastPosOrigin.x + direction.x * (canvas.grid.size / 2),
    lastPosOrigin.y + direction.y * (canvas.grid.size / 2),
  );
  // then swap direction y,x to give us an position to the side
  controlPt.set(controlPt.x + direction.y * rand, controlPt.y + direction.x * rand);

  const increment = 1 / game.settings.get(MODULE_ID, 'trailSplatDensity');
  let dist = increment;
  const splats: Array<PIXI.Text> = glyphArray.map((glyph) => {
    const tm = PIXI.TextMetrics.measureText(glyph, style);
    const text = new PIXI.Text(glyph, style);
    const pt = getPointAt(lastPosOrigin, controlPt, currPosOrigin, dist);
    text.x = pt.x - tm.width / 2;
    text.y = pt.y - tm.height / 2;
    dist += increment;
    return text;
  });

  const offset = alignSplatsAndGetOffset(splats);
  splatsContainer.x = offset.x;
  splatsContainer.y = offset.y;
  for (let j = 0; j < splats.length; j++) {
    splatsContainer.addChild(splats[j]);
    if (CONFIG.logLevel >= LogLevel.DEBUG) drawDebugRect(splats[j], 1, 0xffffff);
  }

  const maxDistance = Math.max(splatsContainer.width, splatsContainer.height);
  const sight = computeSightFromPoint(token.center, maxDistance);

  const sightMask = new PIXI.Graphics();
  sightMask.beginFill(1, 1);
  sightMask.drawPolygon(sight);
  sightMask.endFill();

  sightMask.x -= splatsContainer.x;
  sightMask.y -= splatsContainer.y;
  splatsContainer.addChild(sightMask);
  splatsContainer.mask = sightMask;

  splatsContainer.x += token.center.x;
  splatsContainer.y += token.center.y;

  addToSplatPool(splatsContainer);
  canvas.tiles.addChild(splatsContainer);

  if (CONFIG.logLevel >= LogLevel.DEBUG) drawDebugRect(splatsContainer);
};

const drawTokenSplats = (token: Token, font: SplatFont, size: number, density: number) => {
  if (!density) return;

  const glyphArray: Array<string> = Array.from({ length: density }, () => getRandomGlyph(font));

  // scale the font based on token size
  const fontSize = size * Math.round((token.width + token.height) / canvas.grid.size / 2);

  const style: PIXI.TextStyle = new PIXI.TextStyle({
    fontFamily: font.name,
    fontSize: fontSize,
    fill: lookupTokenBloodColor(token),
    align: 'center',
  });

  const splatsContainer = new PIXI.Container();

  log(LogLevel.INFO, 'splatToken');

  // @ts-ignore
  const imgPath = token.data.img;
  const tokenSprite = PIXI.Sprite.from(imgPath);
  const maskSprite = PIXI.Sprite.from(imgPath);

  tokenSprite.width = token.width;
  tokenSprite.height = token.height;
  maskSprite.width = tokenSprite.width;
  maskSprite.height = tokenSprite.height;

  const textureContainer = new PIXI.Container();
  textureContainer.addChild(maskSprite);

  const bwMatrix = new PIXI.filters.ColorMatrixFilter();
  const negativeMatrix = new PIXI.filters.ColorMatrixFilter();
  maskSprite.filters = [bwMatrix, negativeMatrix];
  bwMatrix.brightness(0, false);
  negativeMatrix.negative(false);

  const renderTexture = new PIXI.RenderTexture(
    new PIXI.BaseRenderTexture({
      width: tokenSprite.width,
      height: tokenSprite.height,
      // scaleMode: PIXI.SCALE_MODES.LINEAR,
      // resolution: 1
    }),
  );

  const renderSprite = new PIXI.Sprite(renderTexture);
  renderSprite.x -= token.width / 2;
  renderSprite.y -= token.height / 2;
  splatsContainer.mask = renderSprite;
  splatsContainer.addChild(renderSprite);

  canvas.app.renderer.render(textureContainer, renderTexture);

  const pixelSpreadX = token.width * game.settings.get(MODULE_ID, 'splatSpread') * 2;
  const pixelSpreadY = token.height * game.settings.get(MODULE_ID, 'splatSpread') * 2;

  log(LogLevel.DEBUG, 'splatTrail pixelSpread', pixelSpreadX, pixelSpreadY);

  const splats: Array<PIXI.Text> = glyphArray.map((glyph) => {
    const tm = PIXI.TextMetrics.measureText(glyph, style);
    const randX = randomBoxMuller() * pixelSpreadX - pixelSpreadX / 2;
    const randY = randomBoxMuller() * pixelSpreadY - pixelSpreadY / 2;
    const text = new PIXI.Text(glyph, style);
    text.x = randX - tm.width / 2;
    text.y = randY - tm.height / 2;
    splatsContainer.addChild(text);
    return text;
  });

  const offset = alignSplatsAndGetOffset(splats);
  splatsContainer.x += offset.x;
  splatsContainer.y += offset.y;
  renderSprite.x -= offset.x;
  renderSprite.y -= offset.y;
  tokenSprite.x -= offset.x;
  tokenSprite.y -= offset.y;

  splatsContainer.x += token.width / 2;
  splatsContainer.y += token.height / 2;

  addToSplatPool(splatsContainer);
  token.addChildAt(splatsContainer, token.children.length);

  if (CONFIG.logLevel >= LogLevel.DEBUG) drawDebugRect(splatsContainer, 2, 0x00ffff);
};

const saveTokenState = (token: Token): void => {
  log(LogLevel.DEBUG, 'saveTokenState:', token);
  log(LogLevel.DEBUG, 'saveTokenState name:' + token.data.name);

  let saveObj: SaveObject = {
    x: token.x,
    y: token.y,
    centerX: token.center.x,
    centerY: token.center.y,
    hp: token.actor.data.data.attributes.hp.value,
  };

  saveObj = JSON.parse(JSON.stringify(saveObj));
  log(LogLevel.DEBUG, 'saveTokenState clonedSaveObj:', saveObj);
  lastTokenState[token.id] = Object.assign(saveObj);
};

const addToSplatPool = (container: PIXI.Container): void => {
  log(LogLevel.DEBUG, 'addToSplatPool');
  if (splatPool.length >= game.settings.get(MODULE_ID, 'splatPoolSize')) {
    const fadingSplat = splatPool.shift();
    fadingSplat.alpha = 0.3;
    if (fadingSplatPool.length >= game.settings.get(MODULE_ID, 'splatPoolSize') / 5) {
      const destroySplat = fadingSplatPool.shift();
      destroySplat.destroy({ children: true });
    }
    fadingSplatPool.push(fadingSplat);
  }
  splatPool.push(container);
  saveSplatsToScene();
  log(LogLevel.DEBUG, `addToSplatPool splatPool:${splatPool.length}, fadingSplatPool:${fadingSplatPool.length}`);
};

const saveSplatsToScene = async () => {
  //const sp = JSON.stringify(splatPool);
  console.log(splatPool);
  //activeScene.setFlag(MODULE_ID, 'splatPool', sp);
};

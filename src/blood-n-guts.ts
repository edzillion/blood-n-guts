/**
 * Author: edzillion
 * Software License: [CC0-1.0 License]
 * @packageDocumentation
 */

//CONFIG.debug.hooks = false;
CONFIG.logLevel = 2;

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
  alignSplatsGetOffsetAndDimensions,
} from './module/helpers';

import * as splatFonts from './data/splatFonts';
import { MODULE_ID } from './constants';

globalThis.sceneSplatPool = [];
let lastTokenState: Array<TokenSaveObject> = [];
let fadingSplatPool: Array<SplatPoolObject> = [];

let damageScale = 1;
let fontsLoaded = false;

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
  log(LogLevel.INFO, 'setup Hook');
});

/* ------------------------------------ */
/* When ready							              */
/* ------------------------------------ */
Hooks.once('ready', () => {
  log(LogLevel.INFO, 'ready, inserting preload stub');
  // Insert a div that uses the font so that it preloads
  const stub = document.createElement('div');
  stub.style.cssText = "visibility:hidden; font-family: 'splatter';";
  stub.innerHTML = 'A';
  const stub2 = document.createElement('div');
  stub2.style.cssText = "visibility:hidden; font-family: 'WC Rhesus A Bta';";
  stub2.innerHTML = 'A';
  document.body.appendChild(stub);
  document.body.appendChild(stub2);
});

Hooks.on('canvasInit', (canvas) => {
  log(LogLevel.INFO, 'canvasInit', canvas.scene.name);
  if (!canvas.scene.active) log(LogLevel.INFO, 'canvasInit, skipping inactive scene');
});

Hooks.on('canvasReady', (canvas) => {
  if (!canvas.scene.active) return;
  log(LogLevel.INFO, 'canvasReady, active:', canvas.scene.name);

  // wipe pools to be refilled from scene flag data
  globalThis.sceneSplatPool = [];
  fadingSplatPool = [];
  // wipe token state, to be refilled by saveTokenState below
  lastTokenState = [];

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

  // need to wait on fonts loading before we can drawSceneSplats
  if (!fontsLoaded) {
    (document as any).fonts.onloadingdone = () => {
      const allFontsPresent =
        (document as any).fonts.check('1em ' + game.settings.get(MODULE_ID, 'floorSplatFont')) &&
        (document as any).fonts.check('1em ' + game.settings.get(MODULE_ID, 'tokenSplatFont')) &&
        (document as any).fonts.check('1em ' + game.settings.get(MODULE_ID, 'trailSplatFont'));

      if (!allFontsPresent) return;
      log(LogLevel.DEBUG, 'canvasReady allFontsPresent loaded:');
      fontsLoaded = true;

      const pool = canvas.scene.getFlag(MODULE_ID, 'sceneSplatPool');
      log(LogLevel.INFO, 'canvasReady sceneSplatPool loaded:', pool);
      drawSceneSplats(pool);

      const canvasTokens = canvas.tokens.placeables.filter((t) => t.actor);
      for (let i = 0; i < canvasTokens.length; i++) saveTokenState(canvasTokens[i]);
    };
  } else {
    const pool = canvas.scene.getFlag(MODULE_ID, 'sceneSplatPool');
    log(LogLevel.INFO, 'canvasReady sceneSplatPool loaded:', pool);
    drawSceneSplats(pool);

    const canvasTokens = canvas.tokens.placeables.filter((t) => t.actor);
    for (let i = 0; i < canvasTokens.length; i++) saveTokenState(canvasTokens[i]);
  }
});

Hooks.on('createToken', (scene, tokenData) => {
  if (!scene.active) return;
  log(LogLevel.INFO, 'createToken', tokenData);
  const token = new Token(tokenData);
  saveTokenState(token);
});

Hooks.on('updateToken', async (scene, tokenData, changes, _options, uid) => {
  if (!scene.active) return;
  log(LogLevel.DEBUG, tokenData, changes, uid);

  const token = canvas.tokens.placeables.find((t) => t.data._id === tokenData._id);
  if (!token) {
    log(LogLevel.ERROR, 'updateToken token not found!');
    return;
  }
  if (!token.actor) {
    log(LogLevel.DEBUG, 'token has no actor, skipping');
    return;
  }

  // update rotation of tokenSplats
  if (changes.rotation != undefined) {
    globalThis.sceneSplatPool
      .filter((s) => s.save.tokenId === token.id)
      .map((s) => {
        s.splatContainer.angle = changes.rotation;
      });
  }

  log(LogLevel.DEBUG, 'updateToken token:', token.name, token);

  await checkForMovement(token, changes);
  checkForDamage(token, changes.actorData);
  saveTokenState(token);
});

Hooks.on('updateActor', async (actor, changes, diff) => {
  if (!canvas.scene.active) return;
  log(LogLevel.DEBUG, actor, changes, diff);

  const token = canvas.tokens.placeables.find((t) => t.actor.id === actor.id);
  if (!token) log(LogLevel.ERROR, 'updateActor token not found!');

  await checkForMovement(token, changes);
  checkForDamage(token, changes);
  saveTokenState(token);
});

/**
 * Check if a token has moved since it's last update and generate trail tiles if bleeding.
 * @category core
 * @function
 * @param {Token} token - the token to check.
 * @param {any} actorDataChanges - the token.actor changes object.
 */
async function checkForMovement(token: Token, actorDataChanges: any): Promise<void> {
  if (actorDataChanges.x || actorDataChanges.y) {
    log(LogLevel.DEBUG, 'checkForMovement id:' + token.id);

    // is this token bleeding?
    if (await token.getFlag(MODULE_ID, 'bleeding')) {
      log(LogLevel.DEBUG, 'checkForMovement lastTokenState', lastTokenState, actorDataChanges);
      log(LogLevel.DEBUG, 'checkForMovement id:' + token.id + ' - bleeding');

      generateTrailSplats(
        token,
        splatFonts.fonts[game.settings.get(MODULE_ID, 'trailSplatFont')],
        game.settings.get(MODULE_ID, 'trailSplatSize'),
        game.settings.get(MODULE_ID, 'trailSplatDensity'),
      );
    }
  }
}

/**
 * Check if a token has taken damage since it's last update and generate splats if so.
 * @category core
 * @function
 * @param {Token} token - the token to check.
 * @param {any} actorDataChanges - the token.actor changes object.
 */
async function checkForDamage(token: Token, actorDataChanges: any): Promise<void> {
  log(LogLevel.DEBUG, 'last saves:', lastTokenState);
  if (!actorDataChanges?.data?.attributes?.hp) return;

  const currentHP = actorDataChanges.data.attributes.hp.value;
  const lastHP = lastTokenState[token.id].hp;

  if (currentHP < lastHP) {
    log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - hp down');

    // damageScale is a scale based on the fraction of overall HP lost.
    damageScale = (lastHP - currentHP) / token.actor.data.data.attributes.hp.max;
    damageScale += 1;

    // death multiplier doubles the splats on death
    const deathMult = actorDataChanges.data.attributes.hp.value === 0 ? 2 : 1;
    if (deathMult === 2) log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - death');

    generateFloorSplats(
      token,
      splatFonts.fonts[game.settings.get(MODULE_ID, 'floorSplatFont')],
      game.settings.get(MODULE_ID, 'floorSplatSize'),
      Math.round(game.settings.get(MODULE_ID, 'floorSplatDensity') * deathMult * damageScale),
    );
    generateTokenSplats(
      token,
      splatFonts.fonts[game.settings.get(MODULE_ID, 'tokenSplatFont')],
      game.settings.get(MODULE_ID, 'tokenSplatSize'),
      Math.round(game.settings.get(MODULE_ID, 'tokenSplatDensity') * deathMult * damageScale),
    );

    await token.setFlag(MODULE_ID, 'bleeding', true);
    log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - bleeding:true');
  } else if (currentHP > lastHP) {
    // token.actor has been healed so they are no longer bleeding.
    await token.unsetFlag(MODULE_ID, 'bleeding');
    log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - bleeding:unset');
  }
}

/**
 * Generate splats on the floor beneath a token.
 * @category core
 * @function
 * @param {Token} token - the token to generate splats for.
 * @param {SplatFont} font - the font to use for splats.
 * @param {number} size - the size of splats.
 * @param {number} density - the amount of splats.
 */
const generateFloorSplats = (token: Token, font: SplatFont, size: number, density: number): Promise<void> => {
  if (!density) return;
  log(LogLevel.INFO, 'generateFloorSplats');

  const splatSaveObj: Partial<SplatSaveObject> = {};

  // scale the splats based on token size
  const fontSize = size * Math.round((token.w + token.h) / canvas.grid.size / 2);
  splatSaveObj.styleData = {
    fontFamily: font.name,
    fontSize: fontSize,
    fill: lookupTokenBloodColor(token),
    align: 'center',
  };
  const style = new PIXI.TextStyle(splatSaveObj.styleData);

  // get a random glyph and then get a random (x,y) spread away from the token.
  const glyphArray: Array<string> = Array.from({ length: density }, () => getRandomGlyph(font));
  const pixelSpreadX = token.w * game.settings.get(MODULE_ID, 'splatSpread');
  const pixelSpreadY = token.h * game.settings.get(MODULE_ID, 'splatSpread');
  log(LogLevel.DEBUG, 'splatTrail pixelSpread', pixelSpreadX, pixelSpreadY);
  log(LogLevel.DEBUG, 'drawSplatPositions: floor ');

  // create our splats for later drawing.
  splatSaveObj.splats = glyphArray.map((glyph) => {
    const tm = PIXI.TextMetrics.measureText(glyph, style);
    const randX = randomBoxMuller() * pixelSpreadX - pixelSpreadX / 2;
    const randY = randomBoxMuller() * pixelSpreadY - pixelSpreadY / 2;
    return {
      x: randX - tm.width / 2,
      y: randY - tm.height / 2,
      width: tm.width,
      height: tm.height,
      glyph: glyph,
    };
  });

  const { offset, width, height } = alignSplatsGetOffsetAndDimensions(splatSaveObj.splats);
  splatSaveObj.offset = offset;
  splatSaveObj.x = offset.x;
  splatSaveObj.y = offset.y;

  const maxDistance = Math.max(width, height);
  const sight = computeSightFromPoint(token.center, maxDistance);

  // since we don't want to add the mask to the splatContainer yet (as that will
  // screw up our alignment) we need to move it by editing the x,y points directly
  for (let i = 0; i < sight.length; i += 2) {
    sight[i] -= splatSaveObj.offset.x;
    sight[i + 1] -= splatSaveObj.offset.y;
  }

  splatSaveObj.x += token.center.x;
  splatSaveObj.y += token.center.y;

  splatSaveObj.maskPolygon = sight;
  drawSplat(<SplatSaveObject>splatSaveObj);
};

/**
 * Generate splats on the token itself.
 * @category core
 * @function
 * @param {Token} token - the token to generate splats for.
 * @param {SplatFont} font - the font to use for splats.
 * @param {number} size - the size of splats.
 * @param {number} density - the amount of splats.
 */
const generateTokenSplats = (token: Token, font: SplatFont, size: number, density: number) => {
  if (!density) return;
  log(LogLevel.INFO, 'generateTokenSplats');

  const splatSaveObj: Partial<SplatSaveObject> = {};

  // scale the splats based on token size
  const fontSize = size * Math.round((token.w + token.h) / canvas.grid.size / 2);
  splatSaveObj.styleData = {
    fontFamily: font.name,
    fontSize: fontSize,
    fill: lookupTokenBloodColor(token),
    align: 'center',
  };
  const style = new PIXI.TextStyle(splatSaveObj.styleData);

  splatSaveObj.tokenId = token.id;

  // get a random glyph and then get a random (x,y) spread away from the token.
  const glyphArray: Array<string> = Array.from({ length: density }, () => getRandomGlyph(font));
  const pixelSpreadX = token.w * game.settings.get(MODULE_ID, 'splatSpread') * 2;
  const pixelSpreadY = token.h * game.settings.get(MODULE_ID, 'splatSpread') * 2;

  log(LogLevel.DEBUG, 'generateTokenSplats pixelSpread', pixelSpreadX, pixelSpreadY);

  // create our splats for later drawing.
  splatSaveObj.splats = glyphArray.map((glyph) => {
    const tm = PIXI.TextMetrics.measureText(glyph, style);
    const randX = randomBoxMuller() * pixelSpreadX - pixelSpreadX / 2;
    const randY = randomBoxMuller() * pixelSpreadY - pixelSpreadY / 2;
    return {
      x: randX - tm.width / 2,
      y: randY - tm.height / 2,
      width: tm.width,
      height: tm.height,
      glyph: glyph,
    };
  });

  const { offset } = alignSplatsGetOffsetAndDimensions(splatSaveObj.splats);
  splatSaveObj.offset = offset;
  splatSaveObj.x = offset.x + token.w / 2;
  splatSaveObj.y = offset.y + token.h / 2;

  drawSplat(<SplatSaveObject>splatSaveObj);
};

/**
 * Generate splats in a trail on the floor behind a moving token.
 * @function
 * @category core
 * @param {Token} token - the token to generate splats for.
 * @param {SplatFont} font - the font to use for splats.
 * @param {number} size - the size of splats.
 * @param {number} density - the amount of splats.
 */
const generateTrailSplats = (token: Token, font: SplatFont, size: number, density: number) => {
  if (!density) return;
  log(LogLevel.INFO, 'generateTrailSplats');

  const splatSaveObj: Partial<SplatSaveObject> = {};

  // scale the splats based on token size
  const fontSize = size * Math.round((token.w + token.h) / canvas.grid.size / 2);
  splatSaveObj.styleData = {
    fontFamily: font.name,
    fontSize: fontSize,
    fill: lookupTokenBloodColor(token),
    align: 'center',
  };
  const style = new PIXI.TextStyle(splatSaveObj.styleData);

  const lastPosOrigin = new PIXI.Point(
    lastTokenState[token.id].centerX - token.center.x,
    lastTokenState[token.id].centerY - token.center.y,
  );
  const currPosOrigin = new PIXI.Point(0, 0);
  const direction = getDirectionNrml(lastPosOrigin, currPosOrigin);

  //horiz or vert movement
  const pixelSpread = direction.x
    ? token.w * game.settings.get(MODULE_ID, 'splatSpread')
    : token.h * game.settings.get(MODULE_ID, 'splatSpread');

  const rand = randomBoxMuller() * pixelSpread - pixelSpread / 2;
  log(LogLevel.DEBUG, 'generateTrailSplats rand', rand);
  // first go half the distance in the direction we are going
  const controlPt: PIXI.Point = new PIXI.Point(
    lastPosOrigin.x + direction.x * (canvas.grid.size / 2),
    lastPosOrigin.y + direction.y * (canvas.grid.size / 2),
  );
  // then swap direction y,x to give us an position to the side
  controlPt.set(controlPt.x + direction.y * rand, controlPt.y + direction.x * rand);
  log(LogLevel.DEBUG, 'generateTrailSplats spread, ctrlPt', pixelSpread, controlPt);

  // get random glyphs and the interval between each splat
  const glyphArray: Array<string> = Array.from({ length: density }, () => getRandomGlyph(font));
  const increment = 1 / game.settings.get(MODULE_ID, 'trailSplatDensity');
  let dist = increment;
  // create our splats for later drawing.
  splatSaveObj.splats = glyphArray.map((glyph) => {
    const tm = PIXI.TextMetrics.measureText(glyph, style);
    const pt = getPointAt(lastPosOrigin, controlPt, currPosOrigin, dist);
    dist += increment;
    return {
      x: pt.x - tm.width / 2,
      y: pt.y - tm.height / 2,
      width: tm.width,
      height: tm.height,
      glyph: glyph,
    };
  });
  log(LogLevel.DEBUG, 'generateTrailSplats splatSaveObj.splats', splatSaveObj.splats);

  const { offset, width, height } = alignSplatsGetOffsetAndDimensions(splatSaveObj.splats);

  splatSaveObj.offset = offset;
  splatSaveObj.x = offset.x;
  splatSaveObj.y = offset.y;

  const maxDistance = Math.max(width, height);
  const sight = computeSightFromPoint(token.center, maxDistance);
  splatSaveObj.maskPolygon = sight;

  // since we don't want to add the mask to the splatContainer yet (as that will
  // screw up our alignment) we need to move it by editing the x,y points directly
  for (let i = 0; i < sight.length; i += 2) {
    sight[i] -= splatSaveObj.offset.x;
    sight[i + 1] -= splatSaveObj.offset.y;
  }

  splatSaveObj.x += token.center.x;
  splatSaveObj.y += token.center.y;

  drawSplat(<SplatSaveObject>splatSaveObj);
};

/**
 * Draw splats to the canvas from their save object.
 * @category core
 * @function
 * @param {SplatSaveObject} splatSaveObj - the splats data.
 */
const drawSplat = (splatSaveObj: SplatSaveObject): void => {
  log(LogLevel.INFO, 'drawSplat');
  log(LogLevel.DEBUG, 'drawSplat: splatSaveObj', splatSaveObj);
  const splatsContainer = new PIXI.Container();
  const style = new PIXI.TextStyle(splatSaveObj.styleData);

  // if it's maskPolygon type we can create a sightMask directly.
  if (splatSaveObj.maskPolygon) {
    splatSaveObj.splats.forEach((splat) => {
      const text = new PIXI.Text(splat.glyph, style);
      text.x = splat.x;
      text.y = splat.y;
      splatsContainer.addChild(text);
      return text;
    });

    log(LogLevel.DEBUG, 'drawSplat: splatSaveObj.maskPolygon');
    const sightMask = new PIXI.Graphics();
    sightMask.beginFill(1, 1);
    sightMask.drawPolygon(splatSaveObj.maskPolygon);
    sightMask.endFill();

    splatsContainer.addChild(sightMask);
    splatsContainer.mask = sightMask;

    splatsContainer.x = splatSaveObj.x;
    splatsContainer.y = splatSaveObj.y;
    canvas.tiles.addChild(splatsContainer);
  }
  // if it's tokenId type we must create renderSprite to use as a mask.
  else if (splatSaveObj.tokenId) {
    log(LogLevel.DEBUG, 'drawSplat: splatSaveObj.tokenId');

    const token = canvas.tokens.placeables.find((t) => t.data._id === splatSaveObj.tokenId);
    if (!token) log(LogLevel.ERROR, 'drawSplat token not found!', splatSaveObj);
    const tokenSpriteWidth = token.data.width * canvas.grid.size * token.data.scale;
    const tokenSpriteHeight = token.data.height * canvas.grid.size * token.data.scale;

    splatSaveObj.splats.forEach((splat) => {
      const text = new PIXI.Text(splat.glyph, style);
      text.x = splat.x + splatSaveObj.offset.x + tokenSpriteWidth / 2;
      text.y = splat.y + splatSaveObj.offset.y + tokenSpriteHeight / 2;
      splatsContainer.addChild(text);
      return text;
    });

    const maskSprite = PIXI.Sprite.from(token.data.img);

    maskSprite.width = tokenSpriteWidth;
    maskSprite.height = tokenSpriteHeight;
    log(LogLevel.DEBUG, 'drawSplat maskSprite: ', duplicate(maskSprite.width), duplicate(maskSprite.height));

    const textureContainer = new PIXI.Container();
    textureContainer.addChild(maskSprite);

    const bwMatrix = new PIXI.filters.ColorMatrixFilter();
    const negativeMatrix = new PIXI.filters.ColorMatrixFilter();
    maskSprite.filters = [bwMatrix, negativeMatrix];
    bwMatrix.brightness(0, false);
    negativeMatrix.negative(false);

    const renderTexture = new PIXI.RenderTexture(
      new PIXI.BaseRenderTexture({
        width: tokenSpriteWidth,
        height: tokenSpriteHeight,
        // scaleMode: PIXI.SCALE_MODES.LINEAR,
        // resolution: 1
      }),
    );
    const renderSprite = new PIXI.Sprite(renderTexture);
    canvas.app.renderer.render(textureContainer, renderTexture);

    splatsContainer.addChild(renderSprite);
    splatsContainer.mask = renderSprite;

    splatsContainer.pivot.set(tokenSpriteWidth / 2, tokenSpriteHeight / 2);
    splatsContainer.position.set(token.w / 2, token.h / 2);

    splatsContainer.angle = token.data.rotation;
    token.addChildAt(splatsContainer, 2);
  } else log(LogLevel.ERROR, 'drawSplat: splatSaveObj should have either .imgPath or .maskPolygon!');

  addToSplatPool(splatsContainer, splatSaveObj);

  if (CONFIG.logLevel >= LogLevel.DEBUG) drawDebugRect(splatsContainer);
};

/**
 * Saves the state of the token for later comparison.
 * @category core
 * @function
 * @param {Token} token - token to save.
 */
const saveTokenState = (token: Token): void => {
  log(LogLevel.INFO, 'saveTokenState:', token.data.name, token.id);

  let saveObj: TokenSaveObject = {
    x: token.x,
    y: token.y,
    centerX: token.center.x,
    centerY: token.center.y,
    hp: token.actor.data.data.attributes.hp.value,
  };

  saveObj = duplicate(saveObj);
  log(LogLevel.DEBUG, 'saveTokenState clonedSaveObj:', saveObj);
  lastTokenState[token.id] = Object.assign(saveObj);
};

/**
 * Adds the token data and a reference to the token on the canvas to our pool. The pool is a FIFO
 * stack with maximum size `blood-n-guts.sceneSplatPoolSize`. When size is exceeded the oldest entries
 * are moved to `fadingSplatPool` and their alpha is changed to 0.3. When this pool is exceeded (which is hard-coded
 * to be 20% of the size of the main pool) then those entries are destroyed.
 * @category core
 * @function
 * @param {PIXI.Container} splatContainer - reference to splatContainer on canvas.
 * @param {SplatSaveObject} splatSaveObj - token data to save.
 */
const addToSplatPool = (splatContainer, splatSaveObj): void => {
  const poolObj = { save: splatSaveObj, splatContainer: splatContainer };
  if (globalThis.sceneSplatPool.length >= game.settings.get(MODULE_ID, 'sceneSplatPoolSize')) {
    const fadingSplatPoolObj = globalThis.sceneSplatPool.shift();
    fadingSplatPoolObj.splatContainer.alpha = 0.3;
    if (fadingSplatPool.length >= game.settings.get(MODULE_ID, 'sceneSplatPoolSize') / 5) {
      const destroy = fadingSplatPool.shift();
      destroy.splatContainer.destroy({ children: true });
    }
    fadingSplatPool.push(fadingSplatPoolObj);
  }
  globalThis.sceneSplatPool.push(poolObj);

  log(
    LogLevel.DEBUG,
    `addToSplatPool sceneSplatPool:${globalThis.sceneSplatPool.length}, fadingSplatPool:${fadingSplatPool.length}`,
  );
  saveSceneSplats();
};

/**
 * Saves all `SaveObject`s in `globalThis.sceneSplatPool` and saves them to scene flag `sceneSplatPool`
 * @category core
 * @function
 */
const saveSceneSplats = async (): Promise<void> => {
  log(LogLevel.INFO, 'saveSceneSplats', canvas.scene.name);
  const pool = globalThis.sceneSplatPool.map((splat) => splat.save);
  log(LogLevel.DEBUG, 'saveSceneSplats: pool', pool);
  await canvas.scene.setFlag(MODULE_ID, 'sceneSplatPool', pool);
};

/**
 * Loads all `SaveObject`s from scene flag `sceneSplatPool` and draws them - this
 * will also add them back into the pool.
 * @category core
 * @function
 */
const drawSceneSplats = async (splatSaveObjects): Promise<void> => {
  if (!splatSaveObjects) return;
  log(LogLevel.INFO, 'drawSceneSplats', canvas.scene.name);
  splatSaveObjects.forEach((splatSaveObj: SplatSaveObject) => {
    drawSplat(splatSaveObj);
  });
};

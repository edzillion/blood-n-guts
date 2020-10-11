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
import { colors, getRGBA } from './module/colors';
import { getPointAt } from './module/bezier';

import * as bloodColorSettings from './data/bloodColorSettings';
import * as splatFonts from './data/splatFonts';

import { MODULE_ID } from './constants';

const lastTokenState: Array<SaveObject> = [];

(document as any).fonts.ready.then(() => {
  log(LogLevel.DEBUG, 'All fonts in use by visible text have loaded.');
});
(document as any).fonts.onloadingdone = (fontFaceSetEvent) => {
  log(LogLevel.DEBUG, 'onloadingdone we have ' + fontFaceSetEvent.fontfaces.length + ' font faces loaded');
  const check = (document as any).fonts.check('1em splatter');
  log(LogLevel.DEBUG, 'splatter loaded? ' + check); // true
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

Hooks.on('createToken', (_scene, token) => {
  saveTokenState(token);
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

      const startPtCentered = new PIXI.Point(lastTokenState[token.id].centerX, lastTokenState[token.id].centerY);
      const endPtCentered = new PIXI.Point(token.center.x, token.center.y);
      const splats = generateSplatTrail(
        token,
        splatFonts.fonts[game.settings.get(MODULE_ID, 'trailSplatFont')],
        game.settings.get(MODULE_ID, 'trailSplatSize'),
        game.settings.get(MODULE_ID, 'trailSplatDensity'),
        'trail',
      );
      //splats.x = token.center.x;
      //splats.y = token.center.y;

      //splatTrail(splats, startPtCentered, endPtCentered);
    }
  }
}

async function checkForDamage(token: Token, actorDataChanges) {
  log(LogLevel.DEBUG, 'last saves:', lastTokenState);
  if (!actorDataChanges?.data?.attributes?.hp) return;

  //const tokenId = token.data?._id ? token.data._id : token.id;
  const currentHP = actorDataChanges.data.attributes.hp.value;
  const lastHP = lastTokenState[token.id].hp;

  if (currentHP < lastHP) {
    log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - hp down');

    const splats = generateSplatTrail(
      token,
      splatFonts.fonts[game.settings.get(MODULE_ID, 'floorSplatFont')],
      game.settings.get(MODULE_ID, 'floorSplatSize'),
      game.settings.get(MODULE_ID, 'floorSplatDensity'),
      'floor',
    );
    // splatFloor(splats);
    // splats = generateSplats(
    //   token,
    //   splatFonts.fonts[game.settings.get(MODULE_ID, 'tokenSplatFont')],
    //   game.settings.get(MODULE_ID, 'tokenSplatSize'),
    //   game.settings.get(MODULE_ID, 'tokenSplatDensity'),
    // );
    // splatToken(splats);

    await token.setFlag(MODULE_ID, 'bleeding', true);
    log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - bleeding:true');

    if (actorDataChanges.data.attributes.hp.value == 0) {
      log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - death');
      // generateSplats(
      //   token,
      //   splatFonts.fonts[game.settings.get(MODULE_ID, 'floorSplatFont')],
      //   game.settings.get(MODULE_ID, 'floorSplatSize'),
      //   game.settings.get(MODULE_ID, 'floorSplatDensity') * 2,
      // );
    }
  } else if (currentHP > lastHP) {
    await token.unsetFlag(MODULE_ID, 'bleeding');
    log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - bleeding:unset');
  }
}

function generateSplats(token: Token, font: SplatFont, size: number, density: number): PIXI.Container {
  if (density === 0) return;

  log(LogLevel.INFO, 'generateSplats', font);

  const glyphArray: Array<string> = Array.from({ length: density }, () => getRandomGlyph(font));

  const style: PIXI.TextStyle = new PIXI.TextStyle({
    fontFamily: font.name,
    fontSize: size,
    fill: lookupTokenBloodColor(token),
    align: 'center',
  });

  const pixelSpread = canvas.grid.size * game.settings.get(MODULE_ID, 'splatSpread');

  // as a font the glyphs are always taller than they are wide
  const textHeight = PIXI.TextMetrics.measureText(glyphArray[0], style).height;
  const maxDistance = 200;
  const sight = computeSightFromPoint(token.center, maxDistance);

  const splatsContainer = new PIXI.Container();

  let highestX,
    highestY = 0;

  const splats: Array<Splat> = glyphArray.map((glyph) => {
    const tm = PIXI.TextMetrics.measureText(glyph, style);
    const randX = randomBoxMuller() * pixelSpread - pixelSpread / 2;
    const randY = randomBoxMuller() * pixelSpread - pixelSpread / 2;
    const text = new PIXI.Text(glyph, style);
    text.x = randX - tm.width / 2;
    text.y = randY - tm.height / 2;
    return {
      text: text,
      token: token,
      tileData: {
        img: 'data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
        width: tm.width,
        height: tm.height,
        x: randX - tm.width / 2,
        y: randY - tm.height / 2,
      },
    };
  });

  // for (let i = 0; i < glyphArray.length; i++) {
  //   const tm = PIXI.TextMetrics.measureText(glyphArray[i], style);
  //   const text = new PIXI.Text(glyphArray[i], style);
  //   const randX = randomBoxMuller() * pixelSpread - pixelSpread / 2;
  //   const randY = randomBoxMuller() * pixelSpread - pixelSpread / 2;

  //   log(LogLevel.DEBUG, 'randX,Y', randX, randY);
  //   text.x += randX;
  //   text.y += randY;
  //   drawDebugRect(text, 1, 0xffffff);
  //   // highestX = randX + tm.width > highestX ? randX + tm.width : 0;
  //   // highestY = randY + tm.height > highestY ? randY + tm.height : 0;
  //   if (highestX) splatsContainer.width = highestX;
  //   if (highestY) splatsContainer.height = highestY;
  //   splatsContainer.addChild(text);
  // }
  // splatsContainer.calculateBounds();

  const blah = getSplatsBounds(splats);
  console.log('(' + blah[0] + ',' + blah[1] + ')');
  console.log('(' + blah[2] + ',' + blah[3] + ')');

  log(LogLevel.DEBUG, 'generateSplats sightMask');
  const sightMask = new PIXI.Graphics();
  sightMask.beginFill(1, 1);
  sightMask.drawPolygon(sight);
  sightMask.endFill();

  for (let j = 0; j < splats.length; j++) {
    splatsContainer.addChild(splats[j].text);
  }
  splatsContainer.x = blah[0];
  splatsContainer.y = blah[1];
  sightMask.x -= blah[0];
  sightMask.y -= blah[1];
  splatsContainer.addChild(sightMask);
  splatsContainer.mask = sightMask;

  splatsContainer.x += token.center.x;
  splatsContainer.y += token.center.y;

  canvas.tiles.addChild(splatsContainer);
  drawDebugRect(splatsContainer);

  // splatsContainer.children.forEach((text) => {
  //   drawDebugRect(text, 1, 0xffffff);
  // });

  return splatsContainer;
}

function saveTokenState(token) {
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
}

function getDirectionNrml(lastPosition: Point, changes: any): PIXI.Point {
  let x = Number(changes.x > lastPosition.x);
  let y = Number(changes.y > lastPosition.y);
  if (!x) x = -Number(changes.x < lastPosition.x);
  if (!y) y = -Number(changes.y < lastPosition.y);
  return new PIXI.Point(x, y);
}

function getRandomGlyph(font: SplatFont): string {
  const glyph = font.availableGlyphs[Math.floor(Math.random() * font.availableGlyphs.length)];
  log(LogLevel.DEBUG, 'getRandomGlyph: ' + glyph);
  return glyph;
}

async function splatFloor(splats: Array<Splat>) {
  log(LogLevel.INFO, 'splatFloor');
  generateTiles(splats);
}

async function splatTrail(splats: Array<Splat>, startPtCentered: PIXI.Point, endPtCentered: PIXI.Point) {
  if (!game.settings.get(MODULE_ID, 'trailSplatDensity')) return;
  log(LogLevel.INFO, 'splatTrail: (start), (end) ', startPtCentered, endPtCentered);
  const direction = getDirectionNrml(startPtCentered, endPtCentered);

  const pixelSpread = canvas.grid.size * game.settings.get(MODULE_ID, 'splatSpread');
  const rand = randomBoxMuller() * pixelSpread - pixelSpread / 2;

  log(LogLevel.DEBUG, 'splatTrail pixelSpread', pixelSpread, rand);
  log(LogLevel.DEBUG, 'splatTrail: direction ', direction);

  // first go half the distance in the direction we are going
  const controlPt: PIXI.Point = new PIXI.Point(
    startPtCentered.x + direction.x * (canvas.grid.size / 2),
    startPtCentered.y + direction.y * (canvas.grid.size / 2),
  );
  // then swap direction y,x to give us an position to the side
  controlPt.set(controlPt.x + direction.y * rand, controlPt.y + direction.x * rand);

  for (let i = 0, j = 0; i < splats.length; i++, j += 1 / game.settings.get(MODULE_ID, 'trailSplatDensity')) {
    [{ x: splats[i].tileData.x, y: splats[i].tileData.y }] = [getPointAt(startPtCentered, controlPt, endPtCentered, j)];
  }

  generateTiles(splats);
}

async function splatToken(splats: Array<Splat>) {
  if (!splats) return;

  log(LogLevel.INFO, 'splatToken');

  // @ts-ignore
  const imgPath = splats[0].token.img;
  const tokenSprite = PIXI.Sprite.from(imgPath);
  const maskSprite = PIXI.Sprite.from(imgPath);

  // scale sprite down to grid bounds
  if (tokenSprite.width > tokenSprite.height) {
    const w = canvas.grid.size / tokenSprite.width;
    tokenSprite.height *= w;
    tokenSprite.width = canvas.grid.size;
  } else {
    const h = canvas.grid.size / tokenSprite.height;
    tokenSprite.width *= h;
    tokenSprite.height = canvas.grid.size;
  }

  maskSprite.width = tokenSprite.width;
  maskSprite.height = tokenSprite.height;

  const textureContainer = new PIXI.Container();
  const maskContainer = new PIXI.Container();

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
  renderSprite.x -= canvas.grid.size / 2;
  renderSprite.y -= canvas.grid.size / 2;
  maskContainer.mask = renderSprite;
  maskContainer.addChild(renderSprite);

  //canvas.effects.addChild(maskContainer)
  canvas.app.renderer.render(textureContainer, renderTexture);

  splats.map((splat) => {
    //add some randomness
    const randX = Math.random() * 60 - 30;
    const randY = Math.random() * 60 - 30;
    log(LogLevel.DEBUG, 'rand', randX, randY);
    splat.text.x -= randX;
    splat.text.y -= randY;

    maskContainer.addChild(splat.text);
    const tokenCenterPt = new PIXI.Point(splat.token.center.x, splat.token.center.y);
    maskContainer.x = tokenCenterPt.x;
    maskContainer.y = tokenCenterPt.y;
    canvas.effects.addChild(maskContainer);
    splat.container = maskContainer;
    log(LogLevel.DEBUG, 'splatToken: maskContainer (x,y): ', maskContainer.x, maskContainer.y);
  });
}

async function generateTiles(splats: any[]) {
  log(LogLevel.INFO, 'generateTiles');

  splats.map(async (splat) => {
    const tile: Tile = await Tile.create(splat.tileData);

    log(LogLevel.DEBUG, 'generateTiles splat: ', splat);

    tile.addChild(splat.text);
    tile.addChild(splat.sightMask);
    //tile.mask = splat.sightMask;
    // tile.x = splat.token.center.x;
    // tile.y = splat.token.center.y;
    canvas.tiles.addChild(tile);

    if (CONFIG.logLevel >= LogLevel.DEBUG) {
      const myRect = new PIXI.Graphics();
      myRect
        .lineStyle(1, 0xffffff)
        .drawRect(tile.x - tile.width / 2, tile.y - tile.height / 2, tile.width, tile.height);
      canvas.drawings.addChild(myRect);
      log(LogLevel.DEBUG, 'generateTiles: added Rect');

      const myRect2 = new PIXI.Graphics();
      myRect2
        .lineStyle(5, 0x0000ff)
        .drawRect(splat.sightMask.x, splat.sightMask.y, splat.sightMask.width, splat.sightMask.height);
      canvas.drawings.addChild(myRect2);
      log(LogLevel.DEBUG, 'generateTiles: added sightMask');

      const myRect3 = new PIXI.Graphics();
      myRect3.lineStyle(2, 0xff0000).drawRect(splat.text.x, splat.text.y, splat.text.width, splat.text.height);
      canvas.drawings.addChild(myRect3);
      log(LogLevel.DEBUG, 'generateTiles: added sightMask');
    }
  });
}

function computeSightFromPoint(origin: Point, range: number): [number] {
  const walls: Array<any> = canvas.walls.blockMovement;
  const minAngle = 360,
    maxAngle = 360;
  const cullDistance = 5; //tiles?
  const cullMult = 2; //default
  const density = 6; //default

  const sight = canvas.sight.constructor.computeSight(
    origin,
    range,
    minAngle,
    maxAngle,
    cullDistance,
    cullMult,
    density,
    walls,
  );
  sight.fov.points;
  let lowestX = canvas.dimensions.sceneWidth;
  let lowestY = canvas.dimensions.sceneHeight;

  for (let i = 0; i < sight.fov.points.length; i += 2) {
    console.log('currentLowestX:' + lowestX, 'currentLowestY:' + lowestY);
    lowestX = sight.fov.points[i] < lowestX ? sight.fov.points[i] : lowestX;
    lowestY = sight.fov.points[i + 1] < lowestY ? sight.fov.points[i + 1] : lowestY;
  }
  for (let j = 0; j < sight.fov.points.length; j += 2) {
    sight.fov.points[j] -= origin.x;
    sight.fov.points[j + 1] -= origin.y;
  }
  return sight.fov.points;
}

function randomBoxMuller(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) return randomBoxMuller(); // resample between 0 and 1
  return num;
}

function lookupTokenBloodColor(token) {
  log(LogLevel.INFO, 'lookupTokenBloodColor: ' + token.name);

  const actor: Actor = token.actor ? token.actor : game.actors.get(token.actorId);
  const actorType: string = actor.data.type;
  const type: string = actorType === 'npc' ? actor.data.data.details.type : actor.data.data.details.race;

  log(LogLevel.DEBUG, 'lookupTokenBloodColor: ', actorType, type);
  let bloodColor: string;
  const rgbaOnlyRegex = /rgba\((\d{1,3}%?),\s*(\d{1,3}%?),\s*(\d{1,3}%?),\s*(\d*(?:\.\d+)?)\)/gi;
  bloodColor = bloodColorSettings.color[type];
  let rgba;
  if (bloodColor === 'name') {
    rgba = getActorColorByName(actor);
    log(LogLevel.DEBUG, 'lookupTokenBloodColor name:', bloodColor, rgba);
  } else if (getRGBA(bloodColor)) {
    rgba = getRGBA(bloodColor);
    log(LogLevel.DEBUG, 'lookupTokenBloodColor getRGBA:', bloodColor, rgba);
  } else if (rgbaOnlyRegex.test(bloodColor)) {
    rgba = bloodColor;
    log(LogLevel.DEBUG, 'lookupTokenBloodColor rgbaOnlyRegex:', bloodColor, rgba);
  } else {
    log(LogLevel.ERROR, 'lookupTokenBloodColor color not recognized!', bloodColor, rgba);
  }

  bloodColor = rgba;

  log(LogLevel.INFO, 'lookupTokenBloodColor: ' + bloodColor);
  return bloodColor;
}

function getActorColorByName(actor): string {
  log(LogLevel.DEBUG, 'getActorColorByName:' + actor.data.name);
  let color: Array<number>;
  let colorString: string;
  const wordsInName: Array<string> = actor.data.name.toLowerCase().split(' ');
  for (let i = 0; i < wordsInName.length; i++) {
    const word = wordsInName[i];
    if (colors[word]) {
      color = colors[word];
      log(LogLevel.DEBUG, 'color found!: ' + color);
      break;
    }
  }
  if (!color) log(LogLevel.ERROR, 'unable to find actor color!');
  else colorString = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.7)`;
  return colorString;
}

function drawDebugRect(container: any, width = 2, color = 0xff0000) {
  const rect = new PIXI.Graphics();
  rect.lineStyle(width, color).drawRect(container.x, container.y, container.width, container.height);
  canvas.drawings.addChild(rect);
  log(LogLevel.DEBUG, 'drawDebugRect: ', container);
}

function getSplatsBounds(splats) {
  let lowestX = canvas.dimensions.sceneWidth;
  let lowestY = canvas.dimensions.sceneHeight;
  let highestX = 0;
  let highestY = 0;
  for (let i = 0; i < splats.length; i++) {
    const s = splats[i];
    if (s.tileData.x < lowestX) {
      console.log('lowestX', s.tileData.x);
      lowestX = s.tileData.x;
    }
    if (s.tileData.y < lowestY) {
      console.log('lowestY', s.tileData.y);
      lowestY = s.tileData.y;
    }
    if (s.tileData.x + s.tileData.width > highestX) {
      console.log('highestX', s.tileData.x);
      highestX = s.tileData.x + s.tileData.width;
    }
    if (s.tileData.y + s.tileData.height > highestY) {
      console.log('highestY', s.tileData.y);
      highestY = s.tileData.y + s.tileData.height;
    }
  }
  for (let j = 0; j < splats.length; j++) {
    const s = splats[j];
    s.text.x -= lowestX;
    s.text.y -= lowestY;
  }

  return [lowestX, lowestY, highestX, highestY];
}

function alignSplatContainer(splatContainer) {
  let lowestX = canvas.dimensions.sceneWidth;
  let lowestY = canvas.dimensions.sceneHeight;
  let highestX = 0;
  let highestY = 0;
  for (let i = 0; i < splatContainer.children.length; i++) {
    const txt = splatContainer.children[i];
    if (txt.x < lowestX) {
      console.log('lowestX', txt.x);
      lowestX = txt.x;
    }
    if (txt.y < lowestY) {
      console.log('lowestY', txt.y);
      lowestY = txt.y;
    }
    if (txt.x + txt.width > highestX) {
      console.log('highestX', txt.x);
      highestX = txt.x + txt.width;
    }
    if (txt.y + txt.height > highestY) {
      console.log('highestY', txt.y);
      highestY = txt.y + txt.height;
    }
  }
  // for (let j = 0; j < splatContainer.children.length; j++) {
  //   const s = splatContainer.children[j];
  //   s.text.x -= lowestX;
  //   s.text.y -= lowestY;
  // }

  return [lowestX, lowestY, highestX, highestY];
}

const generateSplatTrail = (token, font, size, density, type) => {
  const glyphArray: Array<string> = Array.from({ length: density }, () => getRandomGlyph(font));

  const style: PIXI.TextStyle = new PIXI.TextStyle({
    fontFamily: font.name,
    fontSize: size,
    fill: lookupTokenBloodColor(token),
    align: 'center',
  });

  const splatsContainer = generateSplatPositions(type, token, glyphArray, style);
  console.log(splatsContainer);

  const maxDistance = Math.max(splatsContainer.width, splatsContainer.height);
  const sight = computeSightFromPoint(token.center, maxDistance);

  // log(LogLevel.DEBUG, 'generateSplats sightMask');
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

  canvas.tiles.addChild(splatsContainer);
  drawDebugRect(splatsContainer);
};

const generateSplatPositions = (type, token, glyphArray, style) => {
  const pixelSpread = canvas.grid.size * game.settings.get(MODULE_ID, 'splatSpread');

  log(LogLevel.DEBUG, 'splatTrail pixelSpread', pixelSpread);

  let splats: Array<PIXI.Text>;
  const splatsContainer = new PIXI.Container();

  switch (type) {
    case 'floor': {
      log(LogLevel.DEBUG, 'generateSplatPositions: floor ');
      splats = glyphArray.map((glyph) => {
        const tm = PIXI.TextMetrics.measureText(glyph, style);
        const randX = randomBoxMuller() * pixelSpread - pixelSpread / 2;
        const randY = randomBoxMuller() * pixelSpread - pixelSpread / 2;
        const text = new PIXI.Text(glyph, style);
        text.x = randX - tm.width / 2;
        text.y = randY - tm.height / 2;
        return text;
      });
      break;
    }
    case 'trail': {
      log(LogLevel.DEBUG, 'generateSplatPositions: trail ');

      const lastPosOrigin = new PIXI.Point(
        lastTokenState[token.id].centerX - token.center.x,
        lastTokenState[token.id].centerY - token.center.y,
      );
      const currPosOrigin = new PIXI.Point(0, 0);
      const direction = getDirectionNrml(lastPosOrigin, currPosOrigin);

      // first go half the distance in the direction we are going
      const controlPt: PIXI.Point = new PIXI.Point(
        lastPosOrigin.x + direction.x * (canvas.grid.size / 2),
        lastPosOrigin.y + direction.y * (canvas.grid.size / 2),
      );
      const rand = randomBoxMuller() * pixelSpread - pixelSpread / 2;
      // then swap direction y,x to give us an position to the side
      controlPt.set(controlPt.x + direction.y * rand, controlPt.y + direction.x * rand);
      console.log('ctrl', controlPt);

      const increment = 1 / (game.settings.get(MODULE_ID, 'trailSplatDensity') - 1);
      let dist = 0;
      splats = glyphArray.map((glyph) => {
        const tm = PIXI.TextMetrics.measureText(glyph, style);
        const text = new PIXI.Text(glyph, style);
        const pt = getPointAt(lastPosOrigin, controlPt, currPosOrigin, dist);
        text.x = pt.x - tm.width / 2;
        text.y = pt.y - tm.height / 2;
        dist += increment;
        return text;
      });
      break;
    }
  }

  const blah = getSplatsBounds2(splats);
  console.log('(' + blah[0] + ',' + blah[1] + ')');
  console.log('(' + blah[2] + ',' + blah[3] + ')');

  splatsContainer.x = blah[0];
  splatsContainer.y = blah[1];
  for (let j = 0; j < splats.length; j++) {
    splatsContainer.addChild(splats[j]);
    drawDebugRect(splats[j], 1, 0xffffff);
  }

  return splatsContainer;
};

function getSplatsBounds2(splats) {
  let lowestX = canvas.dimensions.sceneWidth;
  let lowestY = canvas.dimensions.sceneHeight;
  let highestX = 0;
  let highestY = 0;
  for (let i = 0; i < splats.length; i++) {
    const txt = splats[i];
    if (txt.x < lowestX) {
      console.log('lowestX', txt.x);
      lowestX = txt.x;
    }
    if (txt.y < lowestY) {
      console.log('lowestY', txt.y);
      lowestY = txt.y;
    }
    if (txt.x + txt.width > highestX) {
      console.log('highestX', txt.x);
      highestX = txt.x + txt.width;
    }
    if (txt.y + txt.height > highestY) {
      console.log('highestY', txt.y);
      highestY = txt.y + txt.height;
    }
  }
  for (let j = 0; j < splats.length; j++) {
    const t = splats[j];
    t.x -= lowestX;
    t.y -= lowestY;
  }

  return [lowestX, lowestY, highestX, highestY];
}

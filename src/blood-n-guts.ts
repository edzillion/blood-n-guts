/**
 * Documentation for Blood 'n Guts, a Foundry VTT module that adds blood splatter to your games.
 * All functionality is wrapped in it's main Class `BloodNGuts`.
 * @license [GNU GPLv3.0 & 'Commons Clause' License Condition v1.0]{@link https://github.com/edzillion/blood-n-guts/blob/master/LICENSE.md}
 * @packageDocumentation
 * @author [edzillion]{@link https://github.com/edzillion}
 */

import { registerSettings } from './module/settings';
import { preloadTemplates } from './module/preloadTemplates';
import { log, LogLevel } from './module/logging';
import {
  getRandomGlyph,
  lookupTokenBloodColor,
  computeSightFromPoint,
  drawDebugRect,
  getRandomBoxMuller,
  getDirectionNrml,
  alignSplatsGetOffsetAndDimensions,
  getPointOnCurve,
  getUID,
} from './module/helpers';
import * as splatFonts from './data/splatFonts';
import { MODULE_ID } from './constants';

globalThis.sceneSplatPool = [];

//CONFIG.debug.hooks = true;
CONFIG.bng = { logLevel: 2 };

/**
 * Main class wrapper for all blood-n-guts features.
 * @class
 */
export class BloodNGuts {
  public static allFontsReady: Promise<any>;
  private static splatState: Array<SplatStateObject>;
  private static tokenState: Array<TokenStateObject>;
  public static splatTokens: Record<string, SplatToken>;

  public static initialize(): void {
    BloodNGuts.splatState = [];
    BloodNGuts.tokenState = [];
    BloodNGuts.splatTokens = {};
  }

  /**
   * Generate splats on the floor beneath a token.
   * @category GMOnly
   * @function
   * @param {Token} token - the token to generate splats for.
   * @param {SplatFont} font - the font to use for splats.
   * @param {number} size - the size of splats.
   * @param {number} density - the amount of splats.
   * @param {number} severity - more and bigger splats based on the severity of the wound.
   */
  public static splatFloor(
    splatToken: SplatToken,
    font: SplatFont,
    size: number,
    density: number,
  ): Promise<Entity<PlaceableObject>> {
    if (!density) return;
    log(LogLevel.INFO, 'splatFloor');

    const splatStateObj: Partial<SplatStateObject> = {};

    // scale the splats based on token size and severity
    const fontSize = Math.round(size * ((splatToken.w + splatToken.h) / canvas.grid.size / 2) * splatToken.hitSeverity);
    log(LogLevel.DEBUG, 'splatFloor fontSize', fontSize);
    splatStateObj.styleData = {
      fontFamily: font.name,
      fontSize: fontSize,
      fill: splatToken.bloodColor,
      align: 'center',
    };
    const style = new PIXI.TextStyle(splatStateObj.styleData);

    // amount of splats is based on density and severity
    const amount = Math.round(density * splatToken.hitSeverity);
    // get a random glyph and then get a random (x,y) spread away from the token.
    const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
    const pixelSpreadX = splatToken.w * game.settings.get(MODULE_ID, 'splatSpread');
    const pixelSpreadY = splatToken.h * game.settings.get(MODULE_ID, 'splatSpread');
    log(LogLevel.DEBUG, 'splatFloor amount', amount);
    log(LogLevel.DEBUG, 'splatFloor pixelSpread', pixelSpreadX, pixelSpreadY);

    // create our splats for later drawing.
    splatStateObj.splats = glyphArray.map((glyph) => {
      const tm = PIXI.TextMetrics.measureText(glyph, style);
      const randX = getRandomBoxMuller() * pixelSpreadX - pixelSpreadX / 2;
      const randY = getRandomBoxMuller() * pixelSpreadY - pixelSpreadY / 2;
      return {
        x: Math.round(randX - tm.width / 2),
        y: Math.round(randY - tm.height / 2),
        width: tm.width,
        height: tm.height,
        glyph: glyph,
      };
    });

    const { offset, width, height } = alignSplatsGetOffsetAndDimensions(splatStateObj.splats);
    splatStateObj.offset = offset;
    splatStateObj.x = offset.x;
    splatStateObj.y = offset.y;

    const maxDistance = Math.max(width, height);
    const sight = computeSightFromPoint(splatToken.token.center, maxDistance);

    // since we don't want to add the mask to the splatsContainer yet (as that will
    // screw up our alignment) we need to move it by editing the x,y points directly
    for (let i = 0; i < sight.length; i += 2) {
      sight[i] -= splatStateObj.offset.x;
      sight[i + 1] -= splatStateObj.offset.y;
    }

    splatStateObj.x += splatToken.token.center.x;
    splatStateObj.y += splatToken.token.center.y;

    splatStateObj.maskPolygon = sight;

    return BloodNGuts.saveToSceneFlag([<SplatStateObject>splatStateObj]);
  }

  /**
   * Generate splats in a trail on the floor behind a moving token.
   * @category GMOnly
   * @function
   * @param {Token} token - the token to generate splats for.
   * @param {SplatFont} font - the font to use for splats.
   * @param {number} size - the size of splats.
   * @param {number} density - the amount of splats.
   * @param {number} severity - more and bigger splats based on the severity of the wound.
   */
  public static splatTrail(
    splatToken: SplatToken,
    font: SplatFont,
    size: number,
    density: number,
  ): Promise<Entity<PlaceableObject>> {
    if (!density) return;
    log(LogLevel.INFO, 'splatTrail');
    log(LogLevel.DEBUG, 'splatTrail severity', splatToken.bleedingSeverity);

    const splatStateObj: Partial<SplatStateObject> = {};

    // scale the splats based on token size and severity
    const fontSize = Math.round(
      size * ((splatToken.w + splatToken.h) / canvas.grid.size / 2) * splatToken.bleedingSeverity,
    );
    log(LogLevel.DEBUG, 'splatTrail fontSize', fontSize);
    splatStateObj.styleData = {
      fontFamily: font.name,
      fontSize: fontSize,
      fill: splatToken.bloodColor,
      align: 'center',
    };
    const style = new PIXI.TextStyle(splatStateObj.styleData);

    const origin = new PIXI.Point(0);
    const trailOrigin = new PIXI.Point(
      -splatToken.direction.x * canvas.grid.size,
      -splatToken.direction.y * canvas.grid.size,
    );

    log(LogLevel.DEBUG, 'splatTrail origin,trailOrigin', origin, trailOrigin);

    //horiz or vert movement
    const pixelSpread = splatToken.direction.x
      ? splatToken.w * game.settings.get(MODULE_ID, 'splatSpread') * 2
      : splatToken.h * game.settings.get(MODULE_ID, 'splatSpread') * 2;

    const rand = getRandomBoxMuller() * pixelSpread - pixelSpread / 2;
    log(LogLevel.DEBUG, 'splatTrail rand', rand);
    // first go half the distance in the direction we are going
    const controlPt: PIXI.Point = new PIXI.Point(
      trailOrigin.x + splatToken.direction.x * (canvas.grid.size / 2),
      trailOrigin.y + splatToken.direction.y * (canvas.grid.size / 2),
    );
    // then swap direction y,x to give us an position to the side
    controlPt.set(controlPt.x + splatToken.direction.y * rand, controlPt.y + splatToken.direction.x * rand);
    log(LogLevel.DEBUG, 'splatTrail spread, ctrlPt', rand, controlPt);

    // get random glyphs and the interval between each splat
    // amount is based on density and severity
    const amount = Math.round(density * splatToken.bleedingSeverity);
    const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
    const increment = 1 / amount;
    log(LogLevel.DEBUG, 'splatTrail amount', amount);

    // we skip 0 because that position already has a splat from the last trailSplat/floorSplat
    let dist = increment;
    // create our splats for later drawing.
    splatStateObj.splats = glyphArray.map((glyph) => {
      const tm = PIXI.TextMetrics.measureText(glyph, style);
      const pt = getPointOnCurve(trailOrigin, controlPt, origin, dist);
      dist += increment;
      return {
        x: Math.round(pt.x - tm.width / 2),
        y: Math.round(pt.y - tm.height / 2),
        width: tm.width,
        height: tm.height,
        glyph: glyph,
      };
    });
    log(LogLevel.DEBUG, 'splatTrail splatStateObj.splats', splatStateObj.splats);

    const { offset, width, height } = alignSplatsGetOffsetAndDimensions(splatStateObj.splats);

    splatStateObj.offset = offset;
    splatStateObj.x = offset.x;
    splatStateObj.y = offset.y;

    const maxDistance = Math.max(width, height);
    const sight = computeSightFromPoint(splatToken.token.center, maxDistance);
    splatStateObj.maskPolygon = sight;

    // since we don't want to add the mask to the splatsContainer yet (as that will
    // screw up our alignment) we need to move it by editing the x,y points directly
    for (let i = 0; i < sight.length; i += 2) {
      sight[i] -= splatStateObj.offset.x;
      sight[i + 1] -= splatStateObj.offset.y;
    }

    splatStateObj.x += splatToken.token.center.x;
    splatStateObj.y += splatToken.token.center.y;
    return BloodNGuts.saveToSceneFlag([<SplatStateObject>splatStateObj]);
  }

  /**
   * Draw splats to the canvas from it's state object and return a reference to the `PIXI.Container` that holds them.
   * @category GMOnly
   * @function
   * @param {SplatStateObject} splatStateObject - the splats data.
   * @returns {PIXI.Container} - the canvas reference.
   */
  private static drawSplatsGetContainer(splatStateObject: SplatStateObject): PIXI.Container {
    log(LogLevel.INFO, 'drawSplats');
    log(LogLevel.DEBUG, 'drawSplats: splatStateObject', splatStateObject);
    const splatsContainer = new PIXI.Container();
    const style = new PIXI.TextStyle(splatStateObject.styleData);
    // if it's maskPolygon type we can create a sightMask directly.
    if (splatStateObject.maskPolygon) {
      splatStateObject.splats.forEach((splat) => {
        const text = new PIXI.Text(splat.glyph, style);
        text.x = splat.x;
        text.y = splat.y;
        splatsContainer.addChild(text);
        return text;
      });

      log(LogLevel.DEBUG, 'drawSplats: splatStateObj.maskPolygon');
      const sightMask = new PIXI.Graphics();
      sightMask.beginFill(1, 1);
      sightMask.drawPolygon(splatStateObject.maskPolygon);
      sightMask.endFill();

      splatsContainer.addChild(sightMask);
      splatsContainer.mask = sightMask;

      splatsContainer.x = splatStateObject.x;
      splatsContainer.y = splatStateObject.y;

      canvas.tiles.addChild(splatsContainer);
    }
    // if it's tokenId add to our previously created tokenSplat container
    else if (splatStateObject.tokenId) {
      log(LogLevel.DEBUG, 'drawSplats: splatStateObj.tokenId');

      const splatToken = BloodNGuts.splatTokens[splatStateObject.tokenId];
      if (!splatToken) log(LogLevel.ERROR, 'drawSplats token not found!', splatStateObject);

      splatStateObject.splats.forEach((splat) => {
        const text = new PIXI.Text(splat.glyph, style);
        text.x = splat.x + splatStateObject.offset.x + splatToken.w / 2;
        text.y = splat.y + splatStateObject.offset.y + splatToken.h / 2;
        splatToken.splatsContainer.addChild(text);
        return text;
      });

      //todo: maybe don't need this
      // splatsContainer.pivot.set(tokenSpriteWidth / 2, tokenSpriteHeight / 2);
      // splatsContainer.position.set(token.w / 2, token.h / 2);
      // splatsContainer.angle = token.data.rotation;
    } else log(LogLevel.ERROR, 'drawSplats: splatStateObject should have either .imgPath or .maskPolygon!');

    if (CONFIG.bng.logLevel > LogLevel.DEBUG) drawDebugRect(splatsContainer);

    return splatsContainer;
  }

  /**
   * Saves the given `SplatStateObject` to our scene flag, add it's `.id` property if not already set.
   * @category GMOnly
   * @function
   * @param {Array<SplatStateObject>} [splatStateObj] - token data to save. if ommitted will just save the current
   * splatState (useful for removing stateObjs).
   */
  private static saveToSceneFlag(newStateObjs?: Array<SplatStateObject>): Promise<Entity> {
    if (!game.user.isGM) return;
    log(LogLevel.INFO, 'saveToSceneFlag', newStateObjs);

    const poolSize = game.settings.get(MODULE_ID, 'sceneSplatPoolSize');

    // add new state objs to the list and give them uids
    if (newStateObjs) {
      newStateObjs.forEach((s) => {
        if (!s.id) s.id = getUID();
        BloodNGuts.splatState.push(s);
      });

      if (BloodNGuts.splatState.length > poolSize) {
        BloodNGuts.splatState.splice(0, BloodNGuts.splatState.length - poolSize);
      }
      log(LogLevel.DEBUG, `saveToSceneFlag splatState.length:${BloodNGuts.splatState.length}`);
    }

    log(LogLevel.DEBUG, 'saveToSceneFlag: stateObjects', BloodNGuts.splatState);
    return canvas.scene.setFlag(MODULE_ID, 'splatState', BloodNGuts.splatState);
  }

  /**
   * Adds the token data and a reference to the token on the canvas to our pool. The pool is a FIFO stack with
   * maximum size `blood-n-guts.sceneSplatPoolSize`. When size is exceeded the oldest entries are destroyed.
   * 15% of the oldest splats are set to fade (alpha 0.3) and the oldest 1/3 of those are set to very faded (alpha 0.1)
   * @category GMOnly
   * @function
   * @param {SplatStateObject} splatStateObj - token data to add.
   */
  private static addToSplatPool(splatStateObj: SplatStateObject, splatsContainer: PIXI.Container = null): void {
    log(LogLevel.INFO, 'addToSplatPool', splatStateObj);

    // if we set splatsContainer to null, it will be added on sceneUpdate when it is drawn to canvas.
    const poolObj = { state: splatStateObj, splatsContainer: splatsContainer };
    const maxPoolSize = game.settings.get(MODULE_ID, 'sceneSplatPoolSize');
    const fadedPoolSize = Math.floor(globalThis.sceneSplatPool.length * 0.15);
    const veryFadedPoolSize = Math.ceil(fadedPoolSize * 0.33);
    log(LogLevel.DEBUG, 'addToSplatPool sizes curr, max', globalThis.sceneSplatPool.length, maxPoolSize);

    if (globalThis.sceneSplatPool.length >= maxPoolSize) {
      // remove the oldest splat
      const destroy = globalThis.sceneSplatPool.shift();
      log(LogLevel.DEBUG, 'fadingSplatPool destroying id', destroy.state.id);
      destroy.splatsContainer.destroy({ children: true });
    }
    //add the new splat
    globalThis.sceneSplatPool.push(poolObj);
    // 15% of splats will be set to fade. 1/3rd of those will be very faded
    if (globalThis.sceneSplatPool.length >= fadedPoolSize) {
      const size = Math.min(fadedPoolSize, globalThis.sceneSplatPool.length);
      for (let index = 0; index < size; index++) {
        const alpha = index < veryFadedPoolSize ? 0.1 : 0.3;
        globalThis.sceneSplatPool[index].splatsContainer.alpha = alpha;
      }
    }
    log(
      LogLevel.DEBUG,
      `addToSplatPool sceneSplatPool:${globalThis.sceneSplatPool.length}, fadedPoolSize:${fadedPoolSize}, veryFadedPoolSize:${veryFadedPoolSize}`,
    );
  }

  /**
   * Loads all `SplatStateObject`s from scene flag `splatState` and draws them - this
   * will also add them back into the pool. Also adds scene tokens to `tokenState`
   * @category GMOnly
   * @function
   */
  private static async setupScene(): Promise<void> {
    let stateObjects = canvas.scene.getFlag(MODULE_ID, 'splatState');
    log(LogLevel.INFO, 'setupScene stateObjects loaded:', stateObjects);

    if (stateObjects) {
      log(LogLevel.INFO, 'setupScene drawSplats', canvas.scene.name);
      const extantTokens = Object.keys(BloodNGuts.splatTokens);
      stateObjects = stateObjects.filter((so) => !so.tokenId || extantTokens.includes(so.tokenId));
      // draw each missing splatsContainer and save a reference to it in the pool.
      // if the splatPoolSize has changed then we want to add only the latest
      const maxPoolSize = Math.min(game.settings.get(MODULE_ID, 'sceneSplatPoolSize'), stateObjects.length);

      for (let i = 0; i < maxPoolSize; i++) {
        BloodNGuts.addToSplatPool(stateObjects[i], BloodNGuts.drawSplatsGetContainer(stateObjects[i]));
        BloodNGuts.splatState.push(stateObjects[i]);
      }
    }
  }

  /**
   * Wipes all splats from the current scene and empties all pools.
   * @category GMOnly
   * @function
   */
  public static wipeSceneSplats(): void {
    log(LogLevel.INFO, 'wipeSceneSplats');
    canvas.scene.setFlag(MODULE_ID, 'splatState', null);

    // destroy scene splats
    globalThis.sceneSplatPool.forEach((poolObj) => {
      poolObj.splatsContainer.destroy();
    });

    // destroy token splats
    for (const tokenId in BloodNGuts.splatTokens) {
      const splatToken = BloodNGuts.splatTokens[tokenId];
      splatToken.wipeAll();
    }
    globalThis.sceneSplatPool = [];
    BloodNGuts.splatState = [];
  }

  /**
   * Handler called on all updateToken and updateActor events. Checks for movement and damage and
   * calls splat generate methods.
   * @category GMOnly
   * @function
   * @async
   * @param {scene} - reference to the current scene
   * @param {tokenData} - tokenData of updated Token/Actor
   * @param {changes} - changes
   */
  public static async updateTokenOrActorHandler(scene, tokenData, changes): Promise<void> {
    if (!scene.active || !game.user.isGM) return;
    log(LogLevel.INFO, 'updateTokenOrActorHandler', changes);
    const tokenId = tokenData._id || tokenData.data._id;
    const splatToken = BloodNGuts.splatTokens[tokenId];
    splatToken.updateChanges(changes);
  }

  /**
   * Handler called when canvas has been fully loaded. Wipes state data and reloads from flags.
   * @category GMOnly
   * @function
   * @param {scene} - reference to the current scene
   * @param {tokenData} - tokenData of updated Token/Actor
   * @param {changes} - changes
   */
  public static canvasReadyHandler(canvas): void {
    if (!canvas.scene.active) return;
    log(LogLevel.INFO, 'canvasReady, active:', canvas.scene.name);

    //canvas.scene.setFlag(MODULE_ID, 'sceneSplatPool', null);

    // wipe pools to be refilled from scene flag data
    globalThis.sceneSplatPool = [];

    // need to wait on fonts loading before we can setupScene
    BloodNGuts.allFontsReady.then(() => {
      BloodNGuts.setupScene();
    });
  }

  /**
   * Handler called when scene data updated. Draws splats from scene data flags.
   * @category GMandPC
   * @function
   * @param {scene} - reference to the current scene
   * @param {changes} - changes
   */
  public static updateSceneHandler(scene, changes): void {
    if (!scene.active || !globalThis.sceneSplatPool) return;

    if (changes.flags[MODULE_ID]?.splatState === null) {
      if (game.user.isRole(CONST.USER_ROLES.PLAYER)) BloodNGuts.wipeSceneSplats();
      return;
    } else if (!changes.flags[MODULE_ID]?.splatState) return;
    log(LogLevel.INFO, 'updateSceneHandler');

    const extantTokens = Object.keys(BloodNGuts.splatTokens);
    const splatState = changes.flags[MODULE_ID].splatState.filter(
      (so) => !so.tokenId || extantTokens.includes(so.tokenId),
    );

    // todo: bug TypeError: Cannot read property 'splatState' of undefined

    const updatedStateIds = splatState.map((s) => s.id);
    log(LogLevel.DEBUG, 'updateScene updatedStateIds', updatedStateIds);

    const oldStateIds = globalThis.sceneSplatPool.map((poolObj) => poolObj.state.id);
    log(LogLevel.DEBUG, 'updateScene oldStateIds', oldStateIds);

    const removeIds = oldStateIds.filter((id) => !updatedStateIds.includes(id));
    log(LogLevel.DEBUG, 'updateScene removeIds', removeIds);

    if (removeIds) {
      globalThis.sceneSplatPool = globalThis.sceneSplatPool.filter((poolObj) => {
        if (removeIds.includes(poolObj.state.id)) {
          // if it is a tokensplat we do not want to destroy our mask etc. we will just destroy the individual splats
          if (poolObj.state.tokenId) {
            poolObj.splatsContainer.children.forEach((displayObj) => {
              if (!displayObj.isMask) displayObj.destroy();
            });
          } else poolObj.splatsContainer.destroy();
          return false;
        }
        return true;
      });
    }

    const addIds = updatedStateIds.filter((id) => !oldStateIds.includes(id));
    log(LogLevel.DEBUG, 'updateScene addIds', addIds);
    // addstateObjects are stateObjs that are not yet in the splat pool
    if (addIds) {
      const addStateObjects = splatState.filter((stateObj) => {
        if (addIds.includes(stateObj.id)) return stateObj;
      });

      // draw each missing splatsContainer and save a reference to it in the pool.
      addStateObjects.forEach((stateObj) => {
        BloodNGuts.addToSplatPool(stateObj, BloodNGuts.drawSplatsGetContainer(stateObj));
      });
      log(LogLevel.DEBUG, 'updateScene addStateObjects', addStateObjects);
    }
    log(LogLevel.DEBUG, 'updateScene sceneSplatPool', globalThis.sceneSplatPool);
  }

  /**
   * Handler called before token added to scene. Saves new tokens via `saveTokenState()`
   * @category GMOnly
   * @function
   * @param {scene} - reference to the current scene
   * @param {tokenData} - new Token data
   */
  public static async preCreateTokenHandler(scene, tokenData, _options, _userId): Promise<any> {
    if (!scene.active || !game.user.isGM) return;
    log(LogLevel.INFO, 'preCreateTokenHandler', tokenData);
  }

  /**
   * Handler called when token added to scene. Saves new tokens via `saveTokenState()`
   * @category GMOnly
   * @function
   * @param {scene} - reference to the current scene
   * @param {tokenData} - new Token data
   */
  public static async createTokenHandler(scene, tokenData, _options, _userId): Promise<any> {
    if (!scene.active || !game.user.isGM) return;
    log(LogLevel.INFO, 'createTokenHandler', tokenData);
  }

  /**
   * Handler called when left button bar is drawn
   * @category GMOnly
   * @function
   * @param {buttons} - reference to the buttons controller
   */
  public static getSceneControlButtonsHandler(buttons) {
    log(LogLevel.INFO, 'getSceneControlButtonsHandler');
    const tileButtons = buttons.find((b) => b.name == 'tiles');

    if (tileButtons) {
      tileButtons.tools.push({
        name: 'wipe',
        title: 'Wipe all blood splats from this scene.',
        icon: 'fas fa-tint-slash',
        active: true,
        visible: true,
        onClick: BloodNGuts.wipeSceneSplats,
      });
    }
  }

  /**
   * Handler called when token is deleted. Removed tokenSplats and state for this token.
   * @category GMOnly
   * @function
   * @param {buttons} - reference to the buttons controller
   */
  public static async deleteTokenHandler(scene, token) {
    // perhaps this is not scene agnostic
    if (!game.user.isGM) return;
    log(LogLevel.INFO, 'deleteTokenHandler', token);
    if (BloodNGuts.tokenState) delete BloodNGuts.tokenState[token._id];
  }
}

// Hooks
Hooks.once('init', async () => {
  log(LogLevel.INFO, `Initializing module ${MODULE_ID}`);

  // Assign custom classes and constants here
  BloodNGuts.initialize();
  // Register custom module settings
  registerSettings();

  (document as any).fonts.load('12px splatter');
  (document as any).fonts.load('12px WC Rhesus A Bta');

  BloodNGuts.allFontsReady = (document as any).fonts.ready;

  // Preload Handlebars templates
  await preloadTemplates();
  // Register custom sheets (if any)
});

Hooks.once('setup', () => {
  // Do anything after initialization but before
  // ready
  log(LogLevel.INFO, 'setup Hook');
});

Hooks.once('ready', () => {
  log(LogLevel.INFO, 'ready');
});

Hooks.on('canvasInit', (canvas) => {
  log(LogLevel.INFO, 'canvasInit', canvas.scene.name);
  if (!canvas.scene.active) log(LogLevel.INFO, 'canvasInit, skipping inactive scene');
});

Hooks.on('canvasReady', BloodNGuts.canvasReadyHandler);

Hooks.on('preCreateToken', BloodNGuts.preCreateTokenHandler);

Hooks.on('createToken', BloodNGuts.createTokenHandler);

Hooks.on('updateToken', BloodNGuts.updateTokenOrActorHandler);
Hooks.on('updateActor', (actor, changes) => {
  if (!canvas.scene.active || !game.user.isGM) return;
  // convert into same structure as token changes.
  if (changes.data) changes.actorData = { data: changes.data };
  const token = canvas.tokens.placeables.filter((t) => t.actor).find((t) => t.actor.id === actor.id);
  if (!token) log(LogLevel.ERROR, 'updateActor token not found!');
  else BloodNGuts.updateTokenOrActorHandler(canvas.scene, token.data, changes);
});

Hooks.on('deleteToken', BloodNGuts.deleteTokenHandler);

Hooks.on('updateScene', BloodNGuts.updateSceneHandler);
Hooks.on('getSceneControlButtons', BloodNGuts.getSceneControlButtonsHandler);

class SplatToken {
  token: Token;
  splatsContainer: PIXI.Container;
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  direction: PIXI.Point;
  hp: number;
  maxHP: number;
  splatsContainerZIndex: number;

  bloodColor: string;

  bleedingCount: number;
  hitSeverity: number;
  bleedingSeverity: number;

  tokenSplats: Array<TokenSplatStateObject>;

  constructor(token: Token) {
    // @ts-ignore
    this.id = token.id || token.actor.data._id;
    this.token = token;
    this.w = token.data.width * canvas.grid.size * token.data.scale;
    this.h = token.data.height * canvas.grid.size * token.data.scale;
    this.bloodColor = lookupTokenBloodColor(token);
    this.saveState(token);
    this.bleedingSeverity = this.token.getFlag(MODULE_ID, 'bleedingSeverity');
    this.tokenSplats = this.token.getFlag(MODULE_ID, 'splats') || [];
    this.splatsContainer = new PIXI.Container();
  }

  public async createMask() {
    // @ts-ignore
    const maskTexture = await PIXI.Texture.fromURL(this.token.data.img);
    const maskSprite = PIXI.Sprite.from(maskTexture);
    maskSprite.width = this.w;
    maskSprite.height = this.h;

    const textureContainer = new PIXI.Container();
    textureContainer.addChild(maskSprite);
    const bwMatrix = new PIXI.filters.ColorMatrixFilter();
    const negativeMatrix = new PIXI.filters.ColorMatrixFilter();
    maskSprite.filters = [bwMatrix, negativeMatrix];
    bwMatrix.brightness(0, false);
    negativeMatrix.negative(false);
    const renderTexture = new PIXI.RenderTexture(
      new PIXI.BaseRenderTexture({
        width: this.w,
        height: this.h,
        // scaleMode: PIXI.SCALE_MODES.LINEAR,
        // resolution: 1
      }),
    );

    const renderSprite = new PIXI.Sprite(renderTexture);
    canvas.app.renderer.render(textureContainer, renderTexture);

    this.splatsContainer.addChild(renderSprite);
    this.splatsContainer.mask = renderSprite;
    this.splatsContainer.pivot.set(this.w / 2, this.h / 2);
    this.splatsContainer.position.set(this.w / 2, this.h / 2);
    this.splatsContainer.angle = this.token.data.rotation;
  }

  private setSeverity(severity: number) {
    this.hitSeverity = severity;
    if (this.hitSeverity > (this.bleedingSeverity ?? 0) + 1) {
      this.bleedingSeverity = this.hitSeverity;
      this.token.setFlag(MODULE_ID, 'bleedingSeverity', severity);
    }
  }

  saveState(token) {
    this.x = token.x;
    this.y = token.y;
    this.hp = token.actor.data.data.attributes.hp.value;
    this.maxHP = token.actor.data.data.attributes.hp.max;
    // reset hit severity and direction for next round.
    this.hitSeverity = null;
    this.direction = null;
  }

  updateChanges(changes) {
    if (
      changes.rotation === undefined &&
      changes.x === undefined &&
      changes.y === undefined &&
      changes.actorData?.data?.attributes?.hp === undefined
    )
      return;

    this.updateDamage(changes);
    this.updateMovement(changes);
    this.updateBleeding(changes);

    if (this.hitSeverity > 0) {
      this.bleedFloor();
      this.bleedToken();
    } else if (this.hitSeverity < 0) {
      this.healToken();
    }
    if (this.direction && this.bleedingSeverity) this.bleedTrail();

    this.updateRotation(changes);
    this.draw();

    this.saveState(this.token);
  }

  private bleedFloor() {
    const density = game.settings.get(MODULE_ID, 'floorSplatDensity');
    if (!density) return;
    log(LogLevel.DEBUG, 'updateTokenOrActorHandler damageScale > 0:' + this.id + ' - bleeding:true');
    BloodNGuts.splatFloor(
      this,
      splatFonts.fonts[game.settings.get(MODULE_ID, 'floorSplatFont')],
      game.settings.get(MODULE_ID, 'floorSplatSize'),
      Math.round(density),
    );
  }

  private bleedTrail() {
    const density = game.settings.get(MODULE_ID, 'trailSplatDensity');
    if (!density) return;
    if (density > 0 && density < 1) {
      if (this.bleedingCount === 0) {
        BloodNGuts.splatFloor(
          this,
          splatFonts.fonts[game.settings.get(MODULE_ID, 'trailSplatFont')],
          game.settings.get(MODULE_ID, 'trailSplatSize'),
          1, //one splat per 1/density grid squares
        );
      }
    } else {
      BloodNGuts.splatTrail(
        this,
        splatFonts.fonts[game.settings.get(MODULE_ID, 'trailSplatFont')],
        game.settings.get(MODULE_ID, 'trailSplatSize'),
        density,
      );
    }
  }

  private async healToken() {
    if (!this.tokenSplats) return;
    // make positive for sanity purposes
    let tempSeverity = this.hitSeverity * -1;
    // deal with scale/healthThreshold > 1. We can only heal potentially 100%
    if (tempSeverity > 1) tempSeverity = 1;
    this.token.setFlag(MODULE_ID, 'bleedingSeverity', null);
    this.bleedingSeverity = null;

    log(LogLevel.DEBUG, 'updateTokenOrActorHandler allTokensSplats:');
    const removeAmount = Math.ceil(this.tokenSplats.length * tempSeverity);
    log(LogLevel.DEBUG, 'updateTokenOrActorHandler removeAmount:', removeAmount);
    this.tokenSplats.splice(0, removeAmount);
  }

  private async bleedToken() {
    const splatStateObj: Partial<TokenSplatStateObject> = {};
    const density = game.settings.get(MODULE_ID, 'tokenSplatDensity');
    if (density === 0) return;

    const font = splatFonts.fonts[game.settings.get(MODULE_ID, 'tokenSplatFont')];

    // scale the splats based on token size and severity
    const fontSize = Math.round(
      game.settings.get(MODULE_ID, 'trailSplatSize') * ((this.w + this.h) / canvas.grid.size / 2) * this.hitSeverity,
    );
    log(LogLevel.DEBUG, 'bleedToken fontSize', fontSize);
    splatStateObj.styleData = {
      fontFamily: font.name,
      fontSize: fontSize,
      fill: this.bloodColor,
      align: 'center',
    };
    const style = new PIXI.TextStyle(splatStateObj.styleData);
    // amount of splats is based on density and severity
    const amount = Math.round(density * this.hitSeverity);
    if (amount === 0) return;
    // get a random glyph and then get a random (x,y) spread away from the token.
    const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
    const pixelSpreadX = this.w * game.settings.get(MODULE_ID, 'splatSpread');
    const pixelSpreadY = this.h * game.settings.get(MODULE_ID, 'splatSpread');
    log(LogLevel.DEBUG, 'bleedToken amount', amount);
    log(LogLevel.DEBUG, 'bleedToken pixelSpread', pixelSpreadX, pixelSpreadY);

    // create our splats for later drawing.
    splatStateObj.splats = glyphArray.map((glyph) => {
      const tm = PIXI.TextMetrics.measureText(glyph, style);
      const randX = getRandomBoxMuller() * pixelSpreadX - pixelSpreadX / 2;
      const randY = getRandomBoxMuller() * pixelSpreadY - pixelSpreadY / 2;
      return {
        x: Math.round(randX - tm.width / 2),
        y: Math.round(randY - tm.height / 2),
        width: tm.width,
        height: tm.height,
        glyph: glyph,
      };
    });
    const { offset } = alignSplatsGetOffsetAndDimensions(splatStateObj.splats);
    splatStateObj.offset = offset;
    splatStateObj.splats.forEach((s) => {
      s.x += offset.x + this.h / 2;
      s.y += offset.y + this.w / 2;
    });

    this.tokenSplats.push(<TokenSplatStateObject>splatStateObj);

    await this.token.setFlag(MODULE_ID, 'splats', this.tokenSplats);
  }

  private updateBleeding(changes) {
    if (!this.direction || !this.bleedingSeverity) return;

    const density = game.settings.get(MODULE_ID, 'trailSplatDensity');
    if (!--this.bleedingCount) this.bleedingCount = Math.round(1 / density);
  }

  private updateDamage(changes) {
    if (changes.actorData === undefined || changes.actorData.data.attributes?.hp === undefined) return;
    this.setSeverity(this.getDamageSeverity(changes));
    log(LogLevel.DEBUG, 'updateTokenOrActorHandler this.hitSeverity', this.hitSeverity);
  }

  private updateMovement(changes) {
    if (changes.x === undefined && changes.y === undefined) return;

    const posX = changes.x === undefined ? this.x : changes.x;
    const posY = changes.y === undefined ? this.y : changes.y;
    const currPos = new PIXI.Point(posX, posY);
    const lastPos = new PIXI.Point(this.x, this.y);
    log(LogLevel.DEBUG, 'checkForMovement pos: l,c:', lastPos, currPos);

    this.direction = getDirectionNrml(lastPos, currPos);
  }

  private updateRotation(changes) {
    if (changes.rotation === undefined) return;
    log(LogLevel.DEBUG, 'updateTokenOrActorHandler updating rotation', changes.rotation);
    this.splatsContainer.angle = changes.rotation;
  }

  public async draw() {
    log(LogLevel.DEBUG, 'drawSplats: splatStateObj.tokenId');
    this.wipe();
    BloodNGuts.allFontsReady.then(() => {
      this.tokenSplats.forEach((splatState) => {
        splatState.splats.forEach((splat) => {
          const text = new PIXI.Text(splat.glyph, splatState.styleData);
          text.x = splat.x;
          text.y = splat.y;
          this.splatsContainer.addChild(text);
        });
      });
    });
  }

  public wipe() {
    let counter = 0;
    // delete everything except the sprite mask
    while (this.splatsContainer.children.length > 1) {
      const displayObj = this.splatsContainer.children[counter];
      if (!displayObj.isMask) displayObj.destroy();
      else counter++;
    }
  }

  public wipeAll() {
    this.wipe();
    this.tokenSplats = [];
    this.token.setFlag(MODULE_ID, 'splats', null);
  }

  /**
   * Get severity, a number between -1 and 2:
   * * > -1[full health or fully healed] to  0[minimal heal]
   * * > 1 + (0[minimal damage] and 0.5[all HP in one hit])* 2 [if dead]
   * * or 0 if not hit at all.
   * @category GMOnly
   * @function
   * @param {Token} token - the token to check.
   * @param {any} changes - the token.actor changes object.
   * @returns {number} - the damage severity.
   */
  private getDamageSeverity(changes: any): number {
    log(LogLevel.INFO, 'getDamageSeverity', changes.actorData);
    const currentHP = changes.actorData.data.attributes.hp.value;

    //fully healed, return -1
    if (currentHP === this.maxHP) return -1;

    const healthThreshold = game.settings.get(MODULE_ID, 'healthThreshold');
    const damageThreshold = game.settings.get(MODULE_ID, 'damageThreshold');
    const lastHP = this.hp;
    const fractionOfMax = currentHP / this.maxHP;
    const changeFractionOfMax = (lastHP - currentHP) / this.maxHP;

    if (currentHP && currentHP < lastHP) {
      if (fractionOfMax > healthThreshold) {
        log(LogLevel.DEBUG, 'getDamageSeverity below healthThreshold', fractionOfMax);
        return 0;
      }
      if (changeFractionOfMax < damageThreshold) {
        log(LogLevel.DEBUG, 'getDamageSeverity below damageThreshold', fractionOfMax);
        return 0;
      }
    }

    // healing
    if (changeFractionOfMax < 0) {
      //renormalise scale based on threshold.
      return changeFractionOfMax / healthThreshold;
    }
    // dead, multiply by 2.
    const deathMultiplier = currentHP === 0 ? 2 : 1;
    const severity = 1 + (changeFractionOfMax / 2) * deathMultiplier;

    log(LogLevel.DEBUG, 'getDamageSeverity severity', severity);
    return severity;
  }
}

Token.prototype.draw = (function () {
  const cached = Token.prototype.draw;
  return async function () {
    await cached.apply(this);
    if (!this.icon) return this;
    if (!BloodNGuts.splatTokens[this.id]) {
      BloodNGuts.splatTokens[this.id] = new SplatToken(this);
      await BloodNGuts.splatTokens[this.id].createMask();
    }
    const splatToken = BloodNGuts.splatTokens[this.id];
    const splatContainerZIndex = this.children.findIndex((child) => child === this.icon) + 1;
    if (splatContainerZIndex === 0) log(LogLevel.ERROR, 'draw(), cant find token.icon!');
    else {
      this.addChildAt(splatToken.splatsContainer, splatContainerZIndex);
      splatToken.draw();
      return this;
    }
  };
})();

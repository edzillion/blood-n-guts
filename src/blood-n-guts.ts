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

let ourchild;

/**
 * Main class wrapper for all blood-n-guts features.
 * @class
 * @extends FormApplication
 */
export class BloodNGuts {
  private static allFontsLoaded: boolean;
  private static splatState: Array<SplatStateObject> = [];
  private static tokenState: Array<TokenStateObject> = [];

  constructor() {
    BloodNGuts.allFontsLoaded = false;
    BloodNGuts.splatState = [];
    BloodNGuts.tokenState = [];
  }

  /**
   * Check if a token has moved since it's last update and generate trail tiles if bleeding.
   * @category GMOnly
   * @function
   * @param {Token} token - the token to check.
   * @param {any} actorDataChanges - the token.actor changes object.
   */
  private static getMovementOnGrid(token: Token, actorDataChanges: any): PIXI.Point {
    if (actorDataChanges.x === undefined && actorDataChanges.y === undefined) return;

    log(LogLevel.INFO, 'checkForMovement id:' + token.id);
    log(LogLevel.DEBUG, 'checkForMovement actorDataChanges:', actorDataChanges);
    log(LogLevel.INFO, 'checkForMovement id:', BloodNGuts.tokenState[token.id]);

    const posX = actorDataChanges.x === undefined ? BloodNGuts.tokenState[token.id].x : actorDataChanges.x;
    const posY = actorDataChanges.y === undefined ? BloodNGuts.tokenState[token.id].y : actorDataChanges.y;
    const currPos = new PIXI.Point(posX, posY);
    const lastPos = new PIXI.Point(BloodNGuts.tokenState[token.id].x, BloodNGuts.tokenState[token.id].y);
    log(LogLevel.DEBUG, 'checkForMovement pos: l,c:', lastPos, currPos);

    return getDirectionNrml(lastPos, currPos);
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
  private static getDamageSeverity(token: Token, changes: any): number {
    if (changes.actorData === undefined || changes.actorData.data.attributes?.hp === undefined) return;
    log(LogLevel.INFO, 'getDamageSeverity', changes.actorData);
    const currentHP = changes.actorData.data.attributes.hp.value;

    const maxHP = token.actor.data.data.attributes.hp.max;
    //fully healed, return -1
    if (currentHP === maxHP) return -1;

    const healthThreshold = game.settings.get(MODULE_ID, 'healthThreshold');
    const damageThreshold = game.settings.get(MODULE_ID, 'damageThreshold');
    const lastHP = BloodNGuts.tokenState[token.id].hp;
    const fractionOfMax = currentHP / maxHP;
    const changeFractionOfMax = (lastHP - currentHP) / maxHP;

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
  private static generateFloorSplats(
    token: Token,
    font: SplatFont,
    size: number,
    density: number,
    severity: number,
  ): SplatStateObject {
    if (!density) return;
    log(LogLevel.INFO, 'generateFloorSplats');

    const splatStateObj: Partial<SplatStateObject> = {};

    // scale the splats based on token size and severity
    const fontSize = Math.round(size * ((token.w + token.h) / canvas.grid.size / 2) * severity);
    log(LogLevel.DEBUG, 'generateFloorSplats fontSize', fontSize);
    splatStateObj.styleData = {
      fontFamily: font.name,
      fontSize: fontSize,
      fill: lookupTokenBloodColor(token),
      align: 'center',
    };
    const style = new PIXI.TextStyle(splatStateObj.styleData);

    // amount of splats is based on density and severity
    const amount = Math.round(density * severity);
    // get a random glyph and then get a random (x,y) spread away from the token.
    const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
    const pixelSpreadX = token.w * game.settings.get(MODULE_ID, 'splatSpread');
    const pixelSpreadY = token.h * game.settings.get(MODULE_ID, 'splatSpread');
    log(LogLevel.DEBUG, 'generateFloorSplats amount', amount);
    log(LogLevel.DEBUG, 'generateFloorSplats pixelSpread', pixelSpreadX, pixelSpreadY);

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
    const sight = computeSightFromPoint(token.center, maxDistance);

    // since we don't want to add the mask to the splatsContainer yet (as that will
    // screw up our alignment) we need to move it by editing the x,y points directly
    for (let i = 0; i < sight.length; i += 2) {
      sight[i] -= splatStateObj.offset.x;
      sight[i + 1] -= splatStateObj.offset.y;
    }

    splatStateObj.x += token.center.x;
    splatStateObj.y += token.center.y;

    splatStateObj.maskPolygon = sight;
    return <SplatStateObject>splatStateObj;
  }

  /**
   * Generate splats on the token itself.
   * @category GMOnly
   * @function
   * @param {Token} token - the token to generate splats for.
   * @param {SplatFont} font - the font to use for splats.
   * @param {number} size - the size of splats.
   * @param {number} density - the amount of splats.
   * @param {number} severity - more and bigger splats based on the severity of the wound.
   */
  private static generateTokenSplats(
    token: Token,
    font: SplatFont,
    size: number,
    density: number,
    severity: number,
  ): SplatStateObject {
    if (!density) return;
    log(LogLevel.INFO, 'generateTokenSplats');

    const splatStateObj: Partial<SplatStateObject> = {};

    // scale the splats based on token size and severity
    const fontSize = Math.round(size * ((token.w + token.h) / canvas.grid.size / 2) * severity);
    log(LogLevel.DEBUG, 'generateTokenSplats fontSize', fontSize);
    splatStateObj.styleData = {
      fontFamily: font.name,
      fontSize: fontSize,
      fill: lookupTokenBloodColor(token),
      align: 'center',
    };
    const style = new PIXI.TextStyle(splatStateObj.styleData);

    splatStateObj.tokenId = token.id;

    // amount of splats is based on density and severity
    const amount = Math.round(density * severity);
    if (amount === 0) return;
    // get a random glyph and then get a random (x,y) spread away from the token.
    const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
    const pixelSpreadX = token.w * game.settings.get(MODULE_ID, 'splatSpread');
    const pixelSpreadY = token.h * game.settings.get(MODULE_ID, 'splatSpread');
    log(LogLevel.DEBUG, 'generateTokenSplats amount', amount);
    log(LogLevel.DEBUG, 'generateTokenSplats pixelSpread', pixelSpreadX, pixelSpreadY);

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
    splatStateObj.x = offset.x + token.w / 2;
    splatStateObj.y = offset.y + token.h / 2;

    return <SplatStateObject>splatStateObj;
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
  private static generateTrailSplats(
    token: Token,
    font: SplatFont,
    size: number,
    density: number,
    severity: number,
  ): SplatStateObject {
    if (!density) return;
    log(LogLevel.INFO, 'generateTrailSplats');
    log(LogLevel.DEBUG, 'generateTrailSplats severity', severity);

    const splatStateObj: Partial<SplatStateObject> = {};

    // scale the splats based on token size and severity
    const fontSize = Math.round(size * ((token.w + token.h) / canvas.grid.size / 2) * severity);
    log(LogLevel.DEBUG, 'generateTokenSplats fontSize', fontSize);
    splatStateObj.styleData = {
      fontFamily: font.name,
      fontSize: fontSize,
      fill: lookupTokenBloodColor(token),
      align: 'center',
    };
    const style = new PIXI.TextStyle(splatStateObj.styleData);

    log(LogLevel.DEBUG, 'generateTokenSplats lastPosOrigin', BloodNGuts.tokenState[token.id], token);
    const lastPosOrigin = new PIXI.Point(
      BloodNGuts.tokenState[token.id].x - token.data.x,
      BloodNGuts.tokenState[token.id].y - token.data.y,
    );
    const currPosOrigin = new PIXI.Point(0, 0);
    const direction = getDirectionNrml(lastPosOrigin, currPosOrigin);
    log(LogLevel.DEBUG, 'generateTrailSplats pos l,c,d', lastPosOrigin, currPosOrigin, direction);

    //horiz or vert movement
    const pixelSpread = direction.x
      ? token.w * game.settings.get(MODULE_ID, 'splatSpread') * 2
      : token.h * game.settings.get(MODULE_ID, 'splatSpread') * 2;

    const rand = getRandomBoxMuller() * pixelSpread - pixelSpread / 2;
    log(LogLevel.DEBUG, 'generateTrailSplats rand', rand);
    // first go half the distance in the direction we are going
    const controlPt: PIXI.Point = new PIXI.Point(
      lastPosOrigin.x + direction.x * (canvas.grid.size / 2),
      lastPosOrigin.y + direction.y * (canvas.grid.size / 2),
    );
    // then swap direction y,x to give us an position to the side
    controlPt.set(controlPt.x + direction.y * rand, controlPt.y + direction.x * rand);
    log(LogLevel.DEBUG, 'generateTrailSplats spread, ctrlPt', rand, controlPt);

    // get random glyphs and the interval between each splat
    // amount is based on density and severity
    const amount = Math.round(density * severity);
    const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
    const increment = 1 / amount;
    log(LogLevel.DEBUG, 'generateTrailSplats amount', amount);

    // we skip 0 because that position already has a splat from the last trailSplat/floorSplat
    let dist = increment;
    // create our splats for later drawing.
    splatStateObj.splats = glyphArray.map((glyph) => {
      const tm = PIXI.TextMetrics.measureText(glyph, style);
      const pt = getPointOnCurve(lastPosOrigin, controlPt, currPosOrigin, dist);
      dist += increment;
      return {
        x: Math.round(pt.x - tm.width / 2),
        y: Math.round(pt.y - tm.height / 2),
        width: tm.width,
        height: tm.height,
        glyph: glyph,
      };
    });
    log(LogLevel.DEBUG, 'generateTrailSplats splatStateObj.splats', splatStateObj.splats);

    const { offset, width, height } = alignSplatsGetOffsetAndDimensions(splatStateObj.splats);

    splatStateObj.offset = offset;
    splatStateObj.x = offset.x;
    splatStateObj.y = offset.y;

    const maxDistance = Math.max(width, height);
    const sight = computeSightFromPoint(token.center, maxDistance);
    splatStateObj.maskPolygon = sight;

    // since we don't want to add the mask to the splatsContainer yet (as that will
    // screw up our alignment) we need to move it by editing the x,y points directly
    for (let i = 0; i < sight.length; i += 2) {
      sight[i] -= splatStateObj.offset.x;
      sight[i + 1] -= splatStateObj.offset.y;
    }

    splatStateObj.x += token.center.x;
    splatStateObj.y += token.center.y;
    return <SplatStateObject>splatStateObj;
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
    let splatsContainer = new PIXI.Container();
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
      const token = canvas.tokens.placeables.find((t) => t.data._id === splatStateObject.tokenId);
      if (!token) log(LogLevel.ERROR, 'drawSplats token not found!', splatStateObject);

      const tokenStateObj = BloodNGuts.tokenState[splatStateObject.tokenId];
      if (!tokenStateObj) log(LogLevel.ERROR, 'tokenStateObj token not found!', splatStateObject);

      if (!tokenStateObj.splatContainerZIndex) log(LogLevel.ERROR, 'tokenStateObj missing splatContainerZIndex');
      splatsContainer = token.children[tokenStateObj.splatContainerZIndex];

      const tokenSpriteWidth = token.data.width * canvas.grid.size * token.data.scale;
      const tokenSpriteHeight = token.data.height * canvas.grid.size * token.data.scale;

      splatStateObject.splats.forEach((splat) => {
        const text = new PIXI.Text(splat.glyph, style);
        text.x = splat.x + splatStateObject.offset.x + tokenSpriteWidth / 2;
        text.y = splat.y + splatStateObject.offset.y + tokenSpriteHeight / 2;
        splatsContainer.addChild(text);
        return text;
      });

      //todo: maybe don't need this
      // splatsContainer.pivot.set(tokenSpriteWidth / 2, tokenSpriteHeight / 2);
      // splatsContainer.position.set(token.w / 2, token.h / 2);
      // splatsContainer.angle = token.data.rotation;

      const splatContainerZIndex = token.children.findIndex((child) => child === token.icon) + 1;
      if (splatContainerZIndex === 0) log(LogLevel.ERROR, 'drawSplats, cant find token.icon!');
      else if (splatContainerZIndex !== tokenStateObj.splatContainerZIndex)
        log(LogLevel.ERROR, 'drawSplats, splatContainerZIndex has changed!');
    } else log(LogLevel.ERROR, 'drawSplats: splatStateObject should have either .imgPath or .maskPolygon!');

    if (CONFIG.bng.logLevel > LogLevel.DEBUG) drawDebugRect(splatsContainer);

    return splatsContainer;
  }

  /**
   * Saves the state of the token for later comparison.
   * @category GMOnly
   * @function
   * @param {Token} token - token to save.
   * @param {number} [severity=1] - severity of wound, scales trail splats. If set to 0 severity will be reset to 1.
   */
  private static saveTokenState(token: Token, severity = 1, splatContainerZIndex?: number): void {
    log(LogLevel.INFO, 'saveTokenState:', token.data.name, token.id);
    // only save severity if it's higher. if severity is 0 reset to 1.
    if (!severity || !BloodNGuts.tokenState[token.id]) severity = 1;
    else
      severity =
        BloodNGuts.tokenState[token.id].severity > severity ? BloodNGuts.tokenState[token.id].severity : severity;

    const zindex = splatContainerZIndex || BloodNGuts.tokenState[token.id].splatContainerZIndex;

    let stateObj: TokenStateObject = {
      id: token.id,
      x: token.data.x,
      y: token.data.y,
      hp: token.actor.data.data.attributes.hp.value,
      severity: severity,
      splatContainerZIndex: zindex,
    };

    stateObj = duplicate(stateObj);
    log(LogLevel.DEBUG, 'saveTokenState clonedStateObj:', stateObj);
    BloodNGuts.tokenState[token.id] = Object.assign(stateObj);
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
  private static async setupScene(): void {
    let stateObjects = canvas.scene.getFlag(MODULE_ID, 'splatState');
    log(LogLevel.INFO, 'setupScene stateObjects loaded:', stateObjects);

    //save tokens state
    const canvasTokens = canvas.tokens.placeables.filter((t) => t.actor);
    const promises = canvasTokens.map((t) => BloodNGuts.createTokenHandler(canvas.scene, t));
    await Promise.all(promises);
    console.log('setupScene have we waited?');

    if (stateObjects) {
      log(LogLevel.INFO, 'setupScene drawSplats', canvas.scene.name);
      const extantTokens = Object.keys(BloodNGuts.tokenState);
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
    globalThis.sceneSplatPool.forEach((poolObj) => {
      // don't destroy our already built masks
      if (poolObj.state.tokenId) {
        poolObj.splatsContainer.children.forEach((displayObj) => {
          if (!displayObj.isMask) displayObj.destroy();
        });
      } else poolObj.splatsContainer.destroy();
    });
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
    const token = canvas.tokens.placeables.find((t) => t.data._id === tokenId);
    if (!token) {
      log(LogLevel.ERROR, 'updateTokenOrActorHandler token not found!');
      return;
    }
    if (!token.actor) {
      log(LogLevel.DEBUG, 'updateTokenOrActorHandler has no actor, skipping');
      return;
    }

    const iconIndex = token.children.findIndex((child) => child === token.icon);
    if (iconIndex === -1) log(LogLevel.ERROR, 'cant find token.icon!');
    else if (
      BloodNGuts.tokenState[token.id]?.splatContainerZIndex &&
      iconIndex + 1 !== BloodNGuts.tokenState[token.id].splatContainerZIndex
    )
      log(LogLevel.ERROR, 'iconIndex has changed!', iconIndex);

    // update rotation of tokenSplats
    if (changes.rotation != undefined) {
      log(LogLevel.DEBUG, 'updateTokenOrActorHandler updating rotation', changes.rotation);
      if (globalThis.sceneSplatPool) {
        globalThis.sceneSplatPool
          .filter((s) => s.state.tokenId === token.id)
          .forEach((s) => {
            s.splatsContainer.angle = changes.rotation;
          });
      }
    }

    // at this point we're only interested in these changes.
    if (changes.x === undefined && changes.y === undefined && changes.actorData?.data?.attributes?.hp === undefined)
      return;

    log(LogLevel.INFO, 'updateTokenOrActorHandler', token.name, token);
    let stateObjects: Array<SplatStateObject> = [];
    const promises: Array<Promise<PlaceableObject | Entity>> = [];
    let severity = BloodNGuts.tokenState[token.id].severity;

    // check for damage and generate splats
    let tempSeverity = BloodNGuts.getDamageSeverity(token, changes);
    log(LogLevel.DEBUG, 'updateTokenOrActorHandler tempSeverity', tempSeverity);
    if (tempSeverity) {
      switch (true) {
        // damage dealt
        case tempSeverity > 0: {
          severity = tempSeverity;

          promises.push(token.setFlag(MODULE_ID, 'bleeding', true));
          log(LogLevel.DEBUG, 'updateTokenOrActorHandler damageScale > 0:' + token.id + ' - bleeding:true');

          stateObjects.push(
            BloodNGuts.generateFloorSplats(
              token,
              splatFonts.fonts[game.settings.get(MODULE_ID, 'floorSplatFont')],
              game.settings.get(MODULE_ID, 'floorSplatSize'),
              Math.round(game.settings.get(MODULE_ID, 'floorSplatDensity')),
              severity,
            ),
          );
          stateObjects.push(
            BloodNGuts.generateTokenSplats(
              token,
              splatFonts.fonts[game.settings.get(MODULE_ID, 'tokenSplatFont')],
              game.settings.get(MODULE_ID, 'tokenSplatSize'),
              Math.round(game.settings.get(MODULE_ID, 'tokenSplatDensity')),
              severity,
            ),
          );
          log(LogLevel.DEBUG, 'updateTokenOrActorHandler damageScale > 0: stateObjects', stateObjects);

          break;
        }
        // healing
        case tempSeverity < 0: {
          severity = 0;
          // make positive for sanity purposes
          tempSeverity *= -1;
          // deal with scale/healthThreshold > 1. We can only heal potentially 100%
          if (tempSeverity > 1) tempSeverity = 1;
          promises.push(token.unsetFlag(MODULE_ID, 'bleeding'), token.unsetFlag(MODULE_ID, 'bleedingCount'));
          log(LogLevel.DEBUG, 'updateTokenOrActorHandler damageScale < 0:' + token.id + ' - bleeding:unset');
          const allTokensSplats = BloodNGuts.splatState.filter((state) => state.tokenId === token.id);
          if (!allTokensSplats) break;

          log(LogLevel.DEBUG, 'updateTokenOrActorHandler allTokensSplats:');
          let keepThisMany = allTokensSplats.length - Math.ceil(allTokensSplats.length * tempSeverity);
          log(LogLevel.DEBUG, 'updateTokenOrActorHandler keepThisMany:', keepThisMany);

          BloodNGuts.splatState = BloodNGuts.splatState.filter((state) => {
            if (state.tokenId !== token.id) return true;
            else if (keepThisMany-- > 0) return true;
          });
          break;
        }
        default: {
          log(LogLevel.ERROR, 'updateTokenOrActorHandler damageScale === 0!');
          break;
        }
      }
    }

    // check for movement and if bleeding draw trail
    const direction = BloodNGuts.getMovementOnGrid(token, changes);
    log(LogLevel.INFO, 'updateTokenOrActorHandler direction', direction);
    if (direction && token.getFlag(MODULE_ID, 'bleeding')) {
      const density = game.settings.get(MODULE_ID, 'trailSplatDensity');

      if (density > 0 && density < 1) {
        let count = token.getFlag(MODULE_ID, 'bleedingCount');
        log(LogLevel.DEBUG, 'updateTokenOrActorHandler density < 1', count);
        if (!--count) {
          stateObjects.push(
            BloodNGuts.generateFloorSplats(
              token,
              splatFonts.fonts[game.settings.get(MODULE_ID, 'trailSplatFont')],
              game.settings.get(MODULE_ID, 'trailSplatSize'),
              1, //one splat per 1/density grid squares
              severity,
            ),
          );
          count = Math.round(1 / density);
        }
        promises.push(token.setFlag(MODULE_ID, 'bleedingCount', count));
      } else {
        stateObjects.push(
          BloodNGuts.generateTrailSplats(
            token,
            splatFonts.fonts[game.settings.get(MODULE_ID, 'trailSplatFont')],
            game.settings.get(MODULE_ID, 'trailSplatSize'),
            density,
            severity,
          ),
        );
      }
    }
    BloodNGuts.saveTokenState(token, severity);
    // filter out null entries returned when density = 0
    stateObjects = stateObjects.filter((s) => s);
    promises.push(BloodNGuts.saveToSceneFlag(stateObjects));
    await Promise.all(promises);
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
    if (!BloodNGuts.allFontsLoaded)
      (document as any).fonts.onloadingdone = () => {
        const allFontsPresent =
          (document as any).fonts.check('1em ' + game.settings.get(MODULE_ID, 'floorSplatFont')) &&
          (document as any).fonts.check('1em ' + game.settings.get(MODULE_ID, 'tokenSplatFont')) &&
          (document as any).fonts.check('1em ' + game.settings.get(MODULE_ID, 'trailSplatFont'));

        if (!allFontsPresent) return;
        log(LogLevel.DEBUG, 'canvasReady allFontsPresent');
        BloodNGuts.allFontsLoaded = true;
        BloodNGuts.setupScene();
      };
    else BloodNGuts.setupScene();
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

    // if (BloodNGuts.fadingSplatPool.length) debugger;
    if (changes.flags[MODULE_ID]?.splatState === null) {
      if (game.user.isRole(CONST.USER_ROLES.PLAYER)) BloodNGuts.wipeSceneSplats();
      return;
    } else if (!changes.flags[MODULE_ID]?.splatState) return;
    log(LogLevel.INFO, 'updateSceneHandler');

    const extantTokens = Object.keys(BloodNGuts.tokenState);
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
   * Handler called when token added to scene. Saves new tokens via `saveTokenState()`
   * @category GMOnly
   * @function
   * @param {scene} - reference to the current scene
   * @param {tokenData} - new Token data
   */
  public static async createTokenHandler(scene, tokenData): Promise<any> {
    if (!scene.active || !game.user.isGM) return;
    const data = tokenData.data || tokenData;
    log(LogLevel.INFO, 'createToken', data);
    const token = new Token(data);
    const tokenSpriteWidth = data.width * canvas.grid.size * data.scale;
    const tokenSpriteHeight = data.height * canvas.grid.size * data.scale;

    const maskSprite = PIXI.Sprite.from(data.img);
    maskSprite.width = tokenSpriteWidth;
    maskSprite.height = tokenSpriteHeight;
    log(LogLevel.DEBUG, 'drawSplats maskSprite: ', duplicate(maskSprite.width), duplicate(maskSprite.height));

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

    const emptySplatsContainer = new PIXI.Container();
    emptySplatsContainer.addChild(renderSprite);
    emptySplatsContainer.mask = renderSprite;

    emptySplatsContainer.pivot.set(tokenSpriteWidth / 2, tokenSpriteHeight / 2);
    emptySplatsContainer.position.set(token.w / 2, token.h / 2);
    emptySplatsContainer.angle = data.rotation;

    //return new Promise<void>((resolve, reject) => {
    //we need to call draw to make sure the Token has set up Token.icon etc.
    return token.draw().then(() => {
      // @ts-ignore
      const splatContainerZIndex = token.children.findIndex((child) => child === token.icon) + 1;
      if (splatContainerZIndex === 0) log(LogLevel.ERROR, 'drawSplats, cant find token.icon!');
      else token.addChildAt(emptySplatsContainer, splatContainerZIndex);

      BloodNGuts.saveTokenState(token, 1, splatContainerZIndex);
    });
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

  // Register custom module settings
  registerSettings();

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

Hooks.on('canvasReady', BloodNGuts.canvasReadyHandler);

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

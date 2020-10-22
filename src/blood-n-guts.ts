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
let splatState = [];

//CONFIG.debug.hooks = true;
CONFIG.bngLogLevel = 1;

/**
 * Main class wrapper for all blood-n-guts features.
 * @class
 * @extends FormApplication
 */
export class BloodNGuts {
  public static allFontsLoaded: boolean;
  public static fadingSplatPool: Array<SplatPoolObject>;
  public static lastTokenState: Array<TokenSaveObject> = [];

  constructor() {
    BloodNGuts.allFontsLoaded = false;
    BloodNGuts.fadingSplatPool = [];
    BloodNGuts.lastTokenState = [];
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
    log(LogLevel.INFO, 'checkForMovement id:', this.lastTokenState[token.id]);

    const posX = actorDataChanges.x === undefined ? this.lastTokenState[token.id].x : actorDataChanges.x;
    const posY = actorDataChanges.y === undefined ? this.lastTokenState[token.id].y : actorDataChanges.y;
    const currPos = new PIXI.Point(posX, posY);
    const lastPos = new PIXI.Point(this.lastTokenState[token.id].x, this.lastTokenState[token.id].y);
    log(LogLevel.DEBUG, 'checkForMovement pos: l,c:', lastPos, currPos);

    return getDirectionNrml(lastPos, currPos);
  }

  /**
   * Get severity, a number between -1 and 1.5:
   * * > -1(full health or fully healed) to < 0(minimal heal)
   * * > 1(minimal damage) and < 1.5(all HP in one hit)
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

    // fully healed, return -1
    if (currentHP === maxHP) return -1;

    const lastHP = this.lastTokenState[token.id].hp;
    const scale = (lastHP - currentHP) / maxHP;
    if (scale < 0) return scale; // healing
    const severity = 1 + scale / 2;

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
  ): SplatSaveObject {
    if (!density) return;
    log(LogLevel.INFO, 'generateFloorSplats');

    const splatSaveObj: Partial<SplatSaveObject> = {};
    severity += 1;

    // scale the splats based on token size and severity
    const fontSize = Math.round(size * ((token.w + token.h) / canvas.grid.size / 2) * severity);
    log(LogLevel.DEBUG, 'generateFloorSplats fontSize', fontSize);
    splatSaveObj.styleData = {
      fontFamily: font.name,
      fontSize: fontSize,
      fill: lookupTokenBloodColor(token),
      align: 'center',
    };
    const style = new PIXI.TextStyle(splatSaveObj.styleData);

    // amount of splats is based on density and severity
    const amount = Math.round(density * severity);
    // get a random glyph and then get a random (x,y) spread away from the token.
    const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
    const pixelSpreadX = token.w * game.settings.get(MODULE_ID, 'splatSpread');
    const pixelSpreadY = token.h * game.settings.get(MODULE_ID, 'splatSpread');
    log(LogLevel.DEBUG, 'generateFloorSplats amount', amount);
    log(LogLevel.DEBUG, 'generateFloorSplats pixelSpread', pixelSpreadX, pixelSpreadY);

    // create our splats for later drawing.
    splatSaveObj.splats = glyphArray.map((glyph) => {
      const tm = PIXI.TextMetrics.measureText(glyph, style);
      const randX = getRandomBoxMuller() * pixelSpreadX - pixelSpreadX / 2;
      const randY = getRandomBoxMuller() * pixelSpreadY - pixelSpreadY / 2;
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

    // since we don't want to add the mask to the splatsContainer yet (as that will
    // screw up our alignment) we need to move it by editing the x,y points directly
    for (let i = 0; i < sight.length; i += 2) {
      sight[i] -= splatSaveObj.offset.x;
      sight[i + 1] -= splatSaveObj.offset.y;
    }

    splatSaveObj.x += token.center.x;
    splatSaveObj.y += token.center.y;

    splatSaveObj.maskPolygon = sight;
    return <SplatSaveObject>splatSaveObj;
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
  ): SplatSaveObject {
    if (!density) return;
    log(LogLevel.INFO, 'generateTokenSplats');

    const splatSaveObj: Partial<SplatSaveObject> = {};
    severity += 1;

    // scale the splats based on token size and severity
    const fontSize = Math.round(size * ((token.w + token.h) / canvas.grid.size / 2) * severity);
    log(LogLevel.DEBUG, 'generateTokenSplats fontSize', fontSize);
    splatSaveObj.styleData = {
      fontFamily: font.name,
      fontSize: fontSize,
      fill: lookupTokenBloodColor(token),
      align: 'center',
    };
    const style = new PIXI.TextStyle(splatSaveObj.styleData);

    splatSaveObj.tokenId = token.id;

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
    splatSaveObj.splats = glyphArray.map((glyph) => {
      const tm = PIXI.TextMetrics.measureText(glyph, style);
      const randX = getRandomBoxMuller() * pixelSpreadX - pixelSpreadX / 2;
      const randY = getRandomBoxMuller() * pixelSpreadY - pixelSpreadY / 2;
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

    return <SplatSaveObject>splatSaveObj;
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
  ): SplatSaveObject {
    if (!density) return;
    log(LogLevel.INFO, 'generateTrailSplats');
    log(LogLevel.DEBUG, 'generateTrailSplats severity', severity);

    const splatSaveObj: Partial<SplatSaveObject> = {};

    severity += 1;

    // scale the splats based on token size and severity
    const fontSize = Math.round(size * ((token.w + token.h) / canvas.grid.size / 2) * severity);
    log(LogLevel.DEBUG, 'generateTokenSplats fontSize', fontSize);
    splatSaveObj.styleData = {
      fontFamily: font.name,
      fontSize: fontSize,
      fill: lookupTokenBloodColor(token),
      align: 'center',
    };
    const style = new PIXI.TextStyle(splatSaveObj.styleData);

    const lastPosOrigin = new PIXI.Point(
      this.lastTokenState[token.id].centerX - token.center.x,
      this.lastTokenState[token.id].centerY - token.center.y,
    );
    const currPosOrigin = new PIXI.Point(0, 0);
    const direction = getDirectionNrml(lastPosOrigin, currPosOrigin);
    log(LogLevel.DEBUG, 'generateTrailSplats pos l,c,d', lastPosOrigin, currPosOrigin, direction);

    //horiz or vert movement
    const pixelSpread = direction.x
      ? token.w * game.settings.get(MODULE_ID, 'splatSpread')
      : token.h * game.settings.get(MODULE_ID, 'splatSpread');

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
    splatSaveObj.splats = glyphArray.map((glyph) => {
      const tm = PIXI.TextMetrics.measureText(glyph, style);
      const pt = getPointOnCurve(lastPosOrigin, controlPt, currPosOrigin, dist);
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

    // since we don't want to add the mask to the splatsContainer yet (as that will
    // screw up our alignment) we need to move it by editing the x,y points directly
    for (let i = 0; i < sight.length; i += 2) {
      sight[i] -= splatSaveObj.offset.x;
      sight[i + 1] -= splatSaveObj.offset.y;
    }

    splatSaveObj.x += token.center.x;
    splatSaveObj.y += token.center.y;
    return <SplatSaveObject>splatSaveObj;
  }

  /**
   * Draw splats to the canvas from it's save object and return a reference to the `PIXI.Container` that holds them.
   * @category GMOnly
   * @function
   * @param {SplatSaveObject} splatSaveObject - the splats data.
   * @returns {PIXI.Container} - the canvas reference.
   */
  private static drawSplatsGetContainer(splatSaveObject: SplatSaveObject): PIXI.Container {
    log(LogLevel.INFO, 'drawSplats');
    log(LogLevel.DEBUG, 'drawSplats: splatSaveObject', splatSaveObject);
    const splatsContainer = new PIXI.Container();
    const style = new PIXI.TextStyle(splatSaveObject.styleData);

    // if it's maskPolygon type we can create a sightMask directly.
    if (splatSaveObject.maskPolygon) {
      splatSaveObject.splats.forEach((splat) => {
        const text = new PIXI.Text(splat.glyph, style);
        text.x = splat.x;
        text.y = splat.y;
        splatsContainer.addChild(text);
        return text;
      });

      log(LogLevel.DEBUG, 'drawSplats: splatSaveObj.maskPolygon');
      const sightMask = new PIXI.Graphics();
      sightMask.beginFill(1, 1);
      sightMask.drawPolygon(splatSaveObject.maskPolygon);
      sightMask.endFill();

      splatsContainer.addChild(sightMask);
      splatsContainer.mask = sightMask;

      splatsContainer.x = splatSaveObject.x;
      splatsContainer.y = splatSaveObject.y;

      canvas.tiles.addChild(splatsContainer);
    }
    // if it's tokenId type we must create renderSprite to use as a mask.
    else if (splatSaveObject.tokenId) {
      log(LogLevel.DEBUG, 'drawSplats: splatSaveObj.tokenId');

      const token = canvas.tokens.placeables.find((t) => t.data._id === splatSaveObject.tokenId);
      if (!token) log(LogLevel.ERROR, 'drawSplats token not found!', splatSaveObject);
      const tokenSpriteWidth = token.data.width * canvas.grid.size * token.data.scale;
      const tokenSpriteHeight = token.data.height * canvas.grid.size * token.data.scale;

      splatSaveObject.splats.forEach((splat) => {
        const text = new PIXI.Text(splat.glyph, style);
        text.x = splat.x + splatSaveObject.offset.x + tokenSpriteWidth / 2;
        text.y = splat.y + splatSaveObject.offset.y + tokenSpriteHeight / 2;
        splatsContainer.addChild(text);
        return text;
      });

      const maskSprite = PIXI.Sprite.from(token.data.img);

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

      splatsContainer.addChild(renderSprite);
      splatsContainer.mask = renderSprite;

      splatsContainer.pivot.set(tokenSpriteWidth / 2, tokenSpriteHeight / 2);
      splatsContainer.position.set(token.w / 2, token.h / 2);
      splatsContainer.angle = token.data.rotation;

      token.addChildAt(splatsContainer, 2);
    } else log(LogLevel.ERROR, 'drawSplats: splatSaveObj should have either .imgPath or .maskPolygon!');

    if (CONFIG.bngLogLevel >= LogLevel.DEBUG) drawDebugRect(splatsContainer);

    return splatsContainer;
  }

  /**
   * Saves the state of the token for later comparison.
   * @category GMOnly
   * @function
   * @param {Token} token - token to save.
   * @param {number} [severity=1] - severity of wound, scales trail splats. If set to 0 severity will be reset to 1.
   */
  private static saveTokenState(token: Token, severity = 1): void {
    log(LogLevel.INFO, 'saveTokenState:', token.data.name, token.id);

    // only save severity if it's higher. if severity is 0 reset to 1.
    if (!severity || !this.lastTokenState[token.id]) severity = 1;
    else
      severity = this.lastTokenState[token.id].severity > severity ? this.lastTokenState[token.id].severity : severity;

    let saveObj: TokenSaveObject = {
      id: token.id,
      x: token.data.x,
      y: token.data.y,
      hp: token.actor.data.data.attributes.hp.value,
      severity: severity,
    };

    saveObj = duplicate(saveObj);
    log(LogLevel.DEBUG, 'saveTokenState clonedSaveObj:', saveObj);
    this.lastTokenState[token.id] = Object.assign(saveObj);
  }

  /**
   * Saves the given `SplatSaveObject` to our scene flag, add it's `.id` property if not already set.
   * @category GMOnly
   * @function
   * @param {Array<SplatSaveObject>} [splatSaveObj] - token data to save. if ommitted will just save the current
   * splatState (useful for removing saveObjs).
   */
  private static saveToSceneFlag(newSaveObjs?: Array<SplatSaveObject>): Promise<Entity> {
    if (!game.user.isGM) return;
    log(LogLevel.INFO, 'saveToSceneFlag', newSaveObjs);

    const poolSize = game.settings.get(MODULE_ID, 'sceneSplatPoolSize');

    // add new save objs to the list and give them uids
    if (newSaveObjs) {
      newSaveObjs.forEach((s) => {
        if (!s.id) s.id = getUID();
        splatState.push(s);
      });

      if (splatState.length > poolSize) {
        splatState.splice(0, splatState.length - poolSize);
      }
      log(LogLevel.DEBUG, `saveToSceneFlag splatState.length:${splatState.length}`);
    }

    log(LogLevel.DEBUG, 'saveToSceneFlag: saveObjects', splatState);
    return canvas.scene.setFlag(MODULE_ID, 'splatState', splatState);
  }

  /**
   * Adds the token data and a reference to the token on the canvas to our pool. The pool is a FIFO
   * stack with maximum size `blood-n-guts.sceneSplatPoolSize`. When size is exceeded the oldest entries
   * are moved to `fadingSplatPool` and their alpha is changed to 0.3. When this pool is exceeded (which is hard-coded
   * to be 20% of the size of the main pool) then those entries are destroyed.
   * @category GMOnly
   * @function
   * @param {SplatSaveObject} splatSaveObj - token data to save.
   */
  private static addToSplatPool(splatSaveObj: SplatSaveObject, splatsContainer: PIXI.Container = null): void {
    log(LogLevel.INFO, 'addToSplatPool', splatSaveObj);

    // if we set splatsContainer to null, it will be added on sceneUpdate when it is drawn to canvas.
    const poolObj = { save: splatSaveObj, splatsContainer: splatsContainer };
    const maxPoolSize = game.settings.get(MODULE_ID, 'sceneSplatPoolSize');
    log(LogLevel.DEBUG, 'addToSplatPool sizes curr, max', globalThis.sceneSplatPool.length, maxPoolSize);

    // 15% of splats will be set to fade
    const unfadedSplatPoolSize = Math.round(maxPoolSize * 0.85);
    if (globalThis.sceneSplatPool.length >= unfadedSplatPoolSize) {
      const fadingSplatPoolObj = globalThis.sceneSplatPool.shift();
      log(LogLevel.DEBUG, 'addToSplatPool fadingSplatPoolObj', fadingSplatPoolObj);

      if (!fadingSplatPoolObj.splatsContainer)
        log(LogLevel.ERROR, 'addToSplatPool fadingSplatPoolObj.splatsContainer is null', fadingSplatPoolObj);

      fadingSplatPoolObj.splatsContainer.alpha = 0.3;
      if (this.fadingSplatPool.length >= maxPoolSize - unfadedSplatPoolSize) {
        //debugger;
        const destroy = this.fadingSplatPool.shift();
        log(LogLevel.DEBUG, 'fadingSplatPool destroying id', destroy.save.id);
        destroy.splatsContainer.destroy({ children: true });
      }
      this.fadingSplatPool.push(fadingSplatPoolObj);
    }
    globalThis.sceneSplatPool.push(poolObj);

    log(
      LogLevel.DEBUG,
      `addToSplatPool sceneSplatPool:${globalThis.sceneSplatPool.length}, fadingSplatPool:${this.fadingSplatPool.length}`,
    );
  }

  /**
   * Loads all `SaveObject`s from scene flag `sceneSplatPool` and draws them - this
   * will also add them back into the pool. Also adds scene tokens to `lastTokenState`
   * @category GMOnly
   * @function
   */
  private static setupScene(): void {
    const saveObjects = canvas.scene.getFlag(MODULE_ID, 'splatState');
    log(LogLevel.INFO, 'setupScene saveObjects loaded:', saveObjects);

    if (saveObjects) {
      log(LogLevel.INFO, 'setupScene drawSplats', canvas.scene.name);

      // draw each missing splatsContainer and save a reference to it in the pool.
      // if the splatPoolSize has changed then we want to add only the latest
      const maxPoolSize = Math.min(game.settings.get(MODULE_ID, 'sceneSplatPoolSize'), saveObjects.length);

      for (let i = 0; i < maxPoolSize; i++) {
        this.addToSplatPool(saveObjects[i], this.drawSplatsGetContainer(saveObjects[i]));
        splatState.push(saveObjects[i]);
      }
    }

    //save tokens state
    const canvasTokens = canvas.tokens.placeables.filter((t) => t.actor);
    for (let i = 0; i < canvasTokens.length; i++) this.saveTokenState(canvasTokens[i]);
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
      poolObj.splatsContainer.destroy();
    });
    BloodNGuts.fadingSplatPool.forEach((poolObj) => {
      poolObj.splatsContainer.destroy();
    });
    globalThis.sceneSplatPool = [];
    BloodNGuts.fadingSplatPool = [];
    splatState = [];
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
    log(LogLevel.INFO, 'updateTokenHandler', changes);

    const tokenId = tokenData._id || tokenData.data._id;
    const token = canvas.tokens.placeables.find((t) => t.data._id === tokenId);
    if (!token) {
      log(LogLevel.ERROR, 'updateTokenHandler token not found!');
      return;
    }
    if (!token.actor) {
      log(LogLevel.DEBUG, 'updateTokenHandler has no actor, skipping');
      return;
    }

    // update rotation of tokenSplats
    if (changes.rotation != undefined) {
      log(LogLevel.DEBUG, 'updateTokenHandler updating rotation', changes.rotation);
      if (globalThis.sceneSplatPool) {
        globalThis.sceneSplatPool
          .filter((s) => s.save.tokenId === token.id)
          .forEach((s) => {
            s.splatsContainer.angle = changes.rotation;
          });
      }
    }

    // at this point we're only interested in these changes.
    if (changes.x === undefined && changes.y === undefined && changes.actorData?.data?.attributes?.hp === undefined)
      return;

    log(LogLevel.INFO, 'updateTokenHandler', token.name, token);
    let saveObjects: Array<SplatSaveObject> = [];
    const promises: Array<Promise<PlaceableObject | Entity>> = [];
    let severity = BloodNGuts.lastTokenState[token.id].severity;

    // check for damage and generate splats
    const tempSeverity = BloodNGuts.getDamageSeverity(token, changes);
    log(LogLevel.DEBUG, 'updateTokenHandler tempSeverity', tempSeverity);
    if (tempSeverity) {
      switch (true) {
        // damage dealt
        case tempSeverity > 0: {
          severity = tempSeverity;

          promises.push(token.setFlag(MODULE_ID, 'bleeding', true));
          log(LogLevel.DEBUG, 'updateToken damageScale > 0:' + token.id + ' - bleeding:true');

          saveObjects.push(
            BloodNGuts.generateFloorSplats(
              token,
              splatFonts.fonts[game.settings.get(MODULE_ID, 'floorSplatFont')],
              game.settings.get(MODULE_ID, 'floorSplatSize'),
              Math.round(game.settings.get(MODULE_ID, 'floorSplatDensity')),
              severity,
            ),
          );
          saveObjects.push(
            BloodNGuts.generateTokenSplats(
              token,
              splatFonts.fonts[game.settings.get(MODULE_ID, 'tokenSplatFont')],
              game.settings.get(MODULE_ID, 'tokenSplatSize'),
              Math.round(game.settings.get(MODULE_ID, 'tokenSplatDensity')),
              severity,
            ),
          );
          log(LogLevel.DEBUG, 'updateToken damageScale > 0: saveObjects', saveObjects);

          break;
        }
        // healing
        case tempSeverity < 0: {
          severity = 0;

          promises.push(token.unsetFlag(MODULE_ID, 'bleeding'), token.unsetFlag(MODULE_ID, 'bleedingCount'));
          log(LogLevel.DEBUG, 'updateToken damageScale < 0:' + token.id + ' - bleeding:unset');
          const allTokensSplats = splatState.filter((save) => save.tokenId === token.id);
          if (!allTokensSplats) break;
          log(LogLevel.DEBUG, 'updateToken allTokensSplats:', allTokensSplats.length);

          let keepThisMany = allTokensSplats.length - Math.ceil(allTokensSplats.length * -tempSeverity);
          log(LogLevel.DEBUG, 'updateToken keepThisMany:', keepThisMany);

          splatState = splatState.filter((save) => {
            if (save.tokenId !== token.id) return true;
            else if (keepThisMany-- > 0) return true;
          });
          break;
        }
        default: {
          log(LogLevel.ERROR, 'updateToken damageScale === 0!');
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
        if (!count) {
          saveObjects.push(
            BloodNGuts.generateFloorSplats(
              token,
              splatFonts.fonts[game.settings.get(MODULE_ID, 'trailSplatFont')],
              game.settings.get(MODULE_ID, 'trailSplatSize'),
              1, //one splat per 1/density grid squares
              severity,
            ),
          );
          count = Math.round(1 / density);
        } else count--;

        promises.push(token.setFlag(MODULE_ID, 'bleedingCount', count));
      } else {
        saveObjects.push(
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
    saveObjects = saveObjects.filter((s) => s);
    promises.push(BloodNGuts.saveToSceneFlag(saveObjects));
    //await Promise.all(promises);
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
    BloodNGuts.fadingSplatPool = [];

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
    //todo: bug TypeError: Cannot read property 'splatState' of undefined
    const updatedSaveIds = changes.flags[MODULE_ID].splatState.map((s) => s.id);
    log(LogLevel.DEBUG, 'updateScene updatedSaveIds', updatedSaveIds);

    const oldSaveIds = globalThis.sceneSplatPool.map((poolObj) => poolObj.save.id);
    log(LogLevel.DEBUG, 'updateScene oldSaveIds', oldSaveIds);

    const removeIds = oldSaveIds.filter((id) => !updatedSaveIds.includes(id));
    const addIds = updatedSaveIds.filter((id) => !oldSaveIds.includes(id));
    log(LogLevel.DEBUG, 'updateScene removeIds', removeIds);
    log(LogLevel.DEBUG, 'updateScene addIds', addIds);

    globalThis.sceneSplatPool = globalThis.sceneSplatPool.filter((poolObj) => {
      if (removeIds.includes(poolObj.save.id)) {
        poolObj.splatsContainer.destroy();
        return false;
      }
      return true;
    });
    log(LogLevel.DEBUG, 'updateScene sceneSplatPool', globalThis.sceneSplatPool);

    // addSaveObjects are saves that are not yet in the splat pool
    const addSaveObjects = changes.flags[MODULE_ID].splatState.filter((saveObj) => {
      if (addIds.includes(saveObj.id)) return saveObj;
    });
    log(LogLevel.DEBUG, 'updateScene addSaveObjects', addSaveObjects);
    // I suppose redrawing all splats per update would be inefficient?

    // draw each missing splatsContainer and save a reference to it in the pool.
    addSaveObjects.forEach((saveObj) => {
      BloodNGuts.addToSplatPool(saveObj, BloodNGuts.drawSplatsGetContainer(saveObj));
    });
  }

  /**
   * Handler called when token added to scene. Saves new tokens via `saveTokenState()`
   * @category GMOnly
   * @function
   * @param {scene} - reference to the current scene
   * @param {tokenData} - new Token data
   */
  public static createTokenHandler(scene, tokenData): void {
    if (!scene.active || !game.user.isGM) return;
    log(LogLevel.INFO, 'createToken', tokenData);
    const token = new Token(tokenData);
    BloodNGuts.saveTokenState(token);
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
}

// Hooks
Hooks.once('init', async () => {
  log(LogLevel.INFO, 'Initializing blood-n-guts');

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

Hooks.on('updateScene', BloodNGuts.updateSceneHandler);
Hooks.on('getSceneControlButtons', BloodNGuts.getSceneControlButtonsHandler);

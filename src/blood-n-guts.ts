/**
 * Documentation for Blood 'n Guts, a Foundry VTT module that adds blood splatter to your games.
 * All functionality is wrapped in it's main Class `BloodNGuts`.
 * @license [CC0-1.0]{@link https://creativecommons.org/publicdomain/zero/1.0/deed.en}
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
} from './module/helpers';
import * as splatFonts from './data/splatFonts';
import { MODULE_ID } from './constants';

globalThis.sceneSplatPool = [];

//CONFIG.debug.hooks = false;
CONFIG.bngLogLevel = 0;

/**
 * Main class wrapper for all blood-n-guts features.
 * @class
 * @extends FormApplication
 */
class BloodNGuts {
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
   * @category core
   * @async
   * @function
   * @param {Token} token - the token to check.
   * @param {any} actorDataChanges - the token.actor changes object.
   */
  static async checkForMovement(token: Token, actorDataChanges: any): Promise<void> {
    if (actorDataChanges.x || actorDataChanges.y) {
      log(LogLevel.DEBUG, 'checkForMovement id:' + token.id);

      // is this token bleeding?
      if (await token.getFlag(MODULE_ID, 'bleeding')) {
        log(LogLevel.DEBUG, 'checkForMovement lastTokenState', this.lastTokenState, actorDataChanges);
        log(LogLevel.DEBUG, 'checkForMovement id:' + token.id + ' - bleeding');

        this.generateTrailSplats(
          token,
          splatFonts.fonts[game.settings.get(MODULE_ID, 'trailSplatFont')],
          game.settings.get(MODULE_ID, 'trailSplatSize'),
          game.settings.get(MODULE_ID, 'trailSplatDensity'),
          this.lastTokenState[token.id].severity,
        );
      }
    }
  }

  /**
   * Check if a token has taken damage since it's last update and generate splats if so.
   * @category core
   * @async
   * @function
   * @param {Token} token - the token to check.
   * @param {any} actorDataChanges - the token.actor changes object.
   */
  static async checkForDamage(token: Token, actorDataChanges: any): Promise<number> {
    log(LogLevel.DEBUG, 'last saves:', this.lastTokenState);
    if (!actorDataChanges?.data?.attributes?.hp) return;

    const currentHP = actorDataChanges.data.attributes.hp.value;
    const lastHP = this.lastTokenState[token.id].hp;
    let damageScale = 1;

    if (currentHP < lastHP) {
      log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - hp down');

      // damageScale is a scale based on the fraction of overall HP lost.
      damageScale = (lastHP - currentHP) / token.actor.data.data.attributes.hp.max;
      damageScale += 1;

      // increase damageScale on death
      if (actorDataChanges.data.attributes.hp.value === 0)
        log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - death');
      damageScale += actorDataChanges.data.attributes.hp.value === 0 ? 0.5 : 0;

      this.generateFloorSplats(
        token,
        splatFonts.fonts[game.settings.get(MODULE_ID, 'floorSplatFont')],
        game.settings.get(MODULE_ID, 'floorSplatSize'),
        Math.round(game.settings.get(MODULE_ID, 'floorSplatDensity')),
        damageScale,
      );
      this.generateTokenSplats(
        token,
        splatFonts.fonts[game.settings.get(MODULE_ID, 'tokenSplatFont')],
        game.settings.get(MODULE_ID, 'tokenSplatSize'),
        Math.round(game.settings.get(MODULE_ID, 'tokenSplatDensity')),
        damageScale,
      );

      await token.setFlag(MODULE_ID, 'bleeding', true);
      log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - bleeding:true');
    } else if (currentHP > lastHP) {
      // token.actor has been healed so they are no longer bleeding.
      await token.unsetFlag(MODULE_ID, 'bleeding');
      log(LogLevel.DEBUG, 'checkForDamage id:' + token.id + ' - bleeding:unset');
      // need to also reset the token's severity state
      damageScale = 0;
    }
    return damageScale;
  }

  /**
   * Generate splats on the floor beneath a token.
   * @category core
   * @function
   * @param {Token} token - the token to generate splats for.
   * @param {SplatFont} font - the font to use for splats.
   * @param {number} size - the size of splats.
   * @param {number} density - the amount of splats.
   * @param {number} severity - more and bigger splats based on the severity of the wound.
   */

  static generateFloorSplats(
    token: Token,
    font: SplatFont,
    size: number,
    density: number,
    severity: number,
  ): Promise<void> {
    if (!density) return;
    log(LogLevel.INFO, 'generateFloorSplats');

    const splatSaveObj: Partial<SplatSaveObject> = {};

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

    // since we don't want to add the mask to the splatContainer yet (as that will
    // screw up our alignment) we need to move it by editing the x,y points directly
    for (let i = 0; i < sight.length; i += 2) {
      sight[i] -= splatSaveObj.offset.x;
      sight[i + 1] -= splatSaveObj.offset.y;
    }

    splatSaveObj.x += token.center.x;
    splatSaveObj.y += token.center.y;

    splatSaveObj.maskPolygon = sight;
    this.drawSplats(<SplatSaveObject>splatSaveObj);
  }

  /**
   * Generate splats on the token itself.
   * @category core
   * @function
   * @param {Token} token - the token to generate splats for.
   * @param {SplatFont} font - the font to use for splats.
   * @param {number} size - the size of splats.
   * @param {number} density - the amount of splats.
   * @param {number} severity - more and bigger splats based on the severity of the wound.
   */
  static generateTokenSplats(token: Token, font: SplatFont, size: number, density: number, severity: number) {
    if (!density) return;
    log(LogLevel.INFO, 'generateTokenSplats');

    const splatSaveObj: Partial<SplatSaveObject> = {};

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
    // get a random glyph and then get a random (x,y) spread away from the token.
    const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
    const pixelSpreadX = token.w * game.settings.get(MODULE_ID, 'splatSpread') * 2;
    const pixelSpreadY = token.h * game.settings.get(MODULE_ID, 'splatSpread') * 2;
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

    this.drawSplats(<SplatSaveObject>splatSaveObj);
  }

  /**
   * Generate splats in a trail on the floor behind a moving token.
   * @function
   * @category core
   * @param {Token} token - the token to generate splats for.
   * @param {SplatFont} font - the font to use for splats.
   * @param {number} size - the size of splats.
   * @param {number} density - the amount of splats.
   * @param {number} severity - more and bigger splats based on the severity of the wound.
   */
  static generateTrailSplats(token: Token, font: SplatFont, size: number, density: number, severity: number) {
    if (!density) return;
    log(LogLevel.INFO, 'generateTrailSplats');
    log(LogLevel.DEBUG, 'generateTrailSplats severity', severity);

    const splatSaveObj: Partial<SplatSaveObject> = {};

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
    log(LogLevel.DEBUG, 'generateTrailSplats spread, ctrlPt', pixelSpread, controlPt);

    // get random glyphs and the interval between each splat
    // amount is based on density and severity
    const amount = Math.round(density * severity);
    const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
    const increment = 1 / game.settings.get(MODULE_ID, 'trailSplatDensity');
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

    // since we don't want to add the mask to the splatContainer yet (as that will
    // screw up our alignment) we need to move it by editing the x,y points directly
    for (let i = 0; i < sight.length; i += 2) {
      sight[i] -= splatSaveObj.offset.x;
      sight[i + 1] -= splatSaveObj.offset.y;
    }

    splatSaveObj.x += token.center.x;
    splatSaveObj.y += token.center.y;

    this.drawSplats(<SplatSaveObject>splatSaveObj);
  }

  /**
   * Draw splats to the canvas from it's save object.
   * @category core
   * @function
   * @param {SplatSaveObject} splatSaveObj - the splats data.
   */
  static drawSplats(splatSaveObj: SplatSaveObject) {
    log(LogLevel.INFO, 'drawSplats');
    log(LogLevel.DEBUG, 'drawSplats: splatSaveObj', splatSaveObj);
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

      log(LogLevel.DEBUG, 'drawSplats: splatSaveObj.maskPolygon');
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
      log(LogLevel.DEBUG, 'drawSplats: splatSaveObj.tokenId');

      const token = canvas.tokens.placeables.find((t) => t.data._id === splatSaveObj.tokenId);
      if (!token) log(LogLevel.ERROR, 'drawSplats token not found!', splatSaveObj);
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

    this.addToSplatPool(splatsContainer, splatSaveObj);

    if (CONFIG.bngLogLevel >= LogLevel.DEBUG) drawDebugRect(splatsContainer);
  }

  /**
   * Saves the state of the token for later comparison.
   * @category core
   * @function
   * @param {Token} token - token to save.
   * @param {number} [severity=1] - severity of wound, scales trail splats. If set to 0 severity will be reset to 1.
   */
  static saveTokenState(token: Token, severity = 1) {
    log(LogLevel.INFO, 'saveTokenState:', token.data.name, token.id);

    // only save severity if it's higher. if severity is 0 reset to 1.
    if (!severity || !this.lastTokenState[token.id]) severity = 1;
    else
      severity = this.lastTokenState[token.id].severity > severity ? this.lastTokenState[token.id].severity : severity;

    let saveObj: TokenSaveObject = {
      id: token.id,
      x: token.x,
      y: token.y,
      centerX: token.center.x,
      centerY: token.center.y,
      hp: token.actor.data.data.attributes.hp.value,
      severity: severity,
    };

    saveObj = duplicate(saveObj);
    log(LogLevel.DEBUG, 'saveTokenState clonedSaveObj:', saveObj);
    this.lastTokenState[token.id] = Object.assign(saveObj);
  }

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
  static addToSplatPool(splatContainer, splatSaveObj) {
    const poolObj = { save: splatSaveObj, splatContainer: splatContainer };
    if (globalThis.sceneSplatPool.length >= game.settings.get(MODULE_ID, 'sceneSplatPoolSize')) {
      const fadingSplatPoolObj = globalThis.sceneSplatPool.shift();
      fadingSplatPoolObj.splatContainer.alpha = 0.3;
      if (this.fadingSplatPool.length >= game.settings.get(MODULE_ID, 'sceneSplatPoolSize') / 5) {
        const destroy = this.fadingSplatPool.shift();
        destroy.splatContainer.destroy({ children: true });
      }
      this.fadingSplatPool.push(fadingSplatPoolObj);
    }
    globalThis.sceneSplatPool.push(poolObj);

    log(
      LogLevel.DEBUG,
      `addToSplatPool sceneSplatPool:${globalThis.sceneSplatPool.length}, fadingSplatPool:${this.fadingSplatPool.length}`,
    );
    this.saveSceneSplats();
  }

  /**
   * Saves all `SaveObject`s in `globalThis.sceneSplatPool` and saves them to scene flag `sceneSplatPool`
   * @async
   * @category core
   * @function
   */
  static async saveSceneSplats() {
    log(LogLevel.INFO, 'saveSceneSplats', canvas.scene.name);
    const pool = globalThis.sceneSplatPool.map((splat) => splat.save);
    log(LogLevel.DEBUG, 'saveSceneSplats: pool', pool);
    await canvas.scene.setFlag(MODULE_ID, 'sceneSplatPool', pool);
  }

  /**
   * Loads all `SaveObject`s from scene flag `sceneSplatPool` and draws them - this
   * will also add them back into the pool. Also adds scene tokens to `lastTokenState`
   * @category core
   * @function
   */
  static setupScene() {
    const pool = canvas.scene.getFlag(MODULE_ID, 'sceneSplatPool');
    log(LogLevel.INFO, 'setupScene sceneSplatPool loaded:', pool);

    if (pool) {
      log(LogLevel.INFO, 'setupScene drawSplats', canvas.scene.name);
      pool.forEach((splatSaveObj: SplatSaveObject) => {
        this.drawSplats(splatSaveObj);
      });
    }

    // save tokens state
    const canvasTokens = canvas.tokens.placeables.filter((t) => t.actor);
    for (let i = 0; i < canvasTokens.length; i++) this.saveTokenState(canvasTokens[i]);
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

Hooks.on('canvasReady', (canvas) => {
  if (!canvas.scene.active) return;
  log(LogLevel.INFO, 'canvasReady, active:', canvas.scene.name);

  // wipe pools to be refilled from scene flag data
  globalThis.sceneSplatPool = [];
  BloodNGuts.fadingSplatPool = [];

  if (CONFIG.bngLogLevel >= LogLevel.DEBUG) {
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
});

Hooks.on('createToken', (scene, tokenData) => {
  if (!scene.active) return;
  log(LogLevel.INFO, 'createToken', tokenData);
  const token = new Token(tokenData);
  BloodNGuts.saveTokenState(token);
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

  await BloodNGuts.checkForMovement(token, changes);
  const severity = await BloodNGuts.checkForDamage(token, changes.actorData);
  BloodNGuts.saveTokenState(token, severity);
});

Hooks.on('updateActor', async (actor, changes, diff) => {
  if (!canvas.scene.active) return;
  log(LogLevel.DEBUG, actor, changes, diff);

  const token = canvas.tokens.placeables.find((t) => t.actor.id === actor.id);
  if (!token) log(LogLevel.ERROR, 'updateActor token not found!');

  await BloodNGuts.checkForMovement(token, changes);
  const severity = await BloodNGuts.checkForDamage(token, changes);
  BloodNGuts.saveTokenState(token, severity);
});

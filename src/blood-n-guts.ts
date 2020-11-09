/**
 * Documentation for Blood 'n Guts, a Foundry VTT module that adds blood splatter to your games.
 * All functionality is wrapped in it's main Class `BloodNGuts`.
 * @license [GNU GPLv3.0 & 'Commons Clause' License Condition v1.0]{@link https://github.com/edzillion/blood-n-guts/blob/master/LICENSE.md}
 * @packageDocumentation
 * @author [edzillion]{@link https://github.com/edzillion}
 */

import { registerSettings } from './module/settings';
import { log, LogLevel } from './module/logging';
import {
  getRandomGlyph,
  computeSightFromPoint,
  getRandomBoxMuller,
  alignSplatsGetOffsetAndDimensions,
  getPointOnCurve,
  getUID,
} from './module/helpers';
import { MODULE_ID } from './constants';
import SplatToken from './module/SplatToken';
import * as splatFonts from './data/splatFonts';

// CONFIG.debug.hooks = true;
CONFIG[MODULE_ID] = { logLevel: 1 };

/**
 * Main class wrapper for all blood-n-guts features.
 * @class
 */
export class BloodNGuts {
  public static allFontsReady: Promise<any>;
  public static splatTokens: Record<string, SplatToken>;
  public static scenePool: Array<SplatPoolObject>;

  public static initialize(): void {
    BloodNGuts.splatTokens = {};
    BloodNGuts.scenePool = [];
  }

  /**
   * Loads all `SplatDataObject`s from scene flag `sceneSplats` trims them and draws them - this
   * will also add them back into the pool.
   * @category GMOnly
   * @function
   */
  private static loadScene(): void {
    log(LogLevel.DEBUG, 'loadScene');
    const sceneSplats = canvas.scene.getFlag(MODULE_ID, 'sceneSplats');
    log(LogLevel.DEBUG, 'loadScene sceneSplats loaded:', sceneSplats);

    if (sceneSplats) {
      log(LogLevel.DEBUG, 'loadScene drawSceneSplats', canvas.scene.name);
      BloodNGuts.drawSceneSplats(sceneSplats);
    }
  }

  /**
   * Saves floor and trail `SplatDataObject`s to scene flag `sceneSplats`. Tokensplats are saved in their
   * own token flags.
   * @category GMOnly
   * @function
   * @returns {Promise<Entity>}
   */
  public static saveScene(): Promise<Entity> {
    log(LogLevel.DEBUG, 'saveScene');
    const sceneSplats = BloodNGuts.getTrimmedSceneSplats();
    return canvas.scene.setFlag(MODULE_ID, 'sceneSplats', sceneSplats);
  }

  /**
   * Gets all splats from the `scenePool`, trims the excess over 'sceneSplatPoolSize' and fades the oldest.
   * @category GMOnly
   * @function
   * @returns {SplatDataObject[]} - trimmed splat array
   */
  private static getTrimmedSceneSplats(): SplatDataObject[] {
    log(LogLevel.DEBUG, 'getTrimmedSceneSplats');
    const allSplats = BloodNGuts.scenePool.map((p) => p.data);
    const maxPoolSize = game.settings.get(MODULE_ID, 'sceneSplatPoolSize');
    if (allSplats.length > maxPoolSize) {
      // remove the oldest splats
      allSplats.splice(0, allSplats.length - maxPoolSize);
    }

    const fadedPoolSize = allSplats.length - Math.round(maxPoolSize * 0.85);
    const veryFadedPoolSize = Math.ceil(fadedPoolSize * 0.33);
    log(LogLevel.DEBUG, 'getTrimmedSceneSplats sizes curr, max', allSplats.length, maxPoolSize);

    // 15% of splats will be set to fade. 1/3rd of those will be very faded
    if (fadedPoolSize > 0) {
      for (let i = 0; i < fadedPoolSize; i++) {
        const alpha = i < veryFadedPoolSize ? 0.1 : 0.3;
        allSplats[i].alpha = alpha;
      }
    }

    log(
      LogLevel.DEBUG,
      `getTrimmedSceneSplats sceneSplatPool:${allSplats.length}, fadedPoolSize:${fadedPoolSize}, veryFadedPoolSize:${veryFadedPoolSize}`,
    );
    const splatsToSave = allSplats.filter((s) => !s.tokenId);
    return splatsToSave;
  }

  /**
   * Draws all new `SplatDataObject`s and those that haven't got a .splatContainer yet to the canvas
   * and adds those to the scene pool.
   * @category GMOnly
   * @function
   * @param {[SplatDataObject]} splats - updated array of scene splats
   */
  private static drawSceneSplats(splats: [SplatDataObject]): void {
    log(LogLevel.DEBUG, 'drawSceneSplats');
    const updatedIds = splats.map((s) => s.id);
    const existingIds = BloodNGuts.scenePool.map((poolObj) => poolObj.data.id);
    const drawnIds = BloodNGuts.scenePool.filter((poolObj) => poolObj.container).map((p) => p.data.id);

    // remove splats from the pool that are not in our updated splats
    BloodNGuts.scenePool = BloodNGuts.scenePool.filter((p) => {
      if (p.data.tokenId || updatedIds.includes(p.data.id)) return this;
      else p.container.destroy({ children: true });
    });

    // add both new splats and those that haven't been drawn yet.
    const splatsToAdd = splats.filter((data) => !existingIds.includes(data.id) || !drawnIds.includes(data.id));

    log(LogLevel.DEBUG, 'drawSceneSplats splatsToAdd', splatsToAdd);

    if (splatsToAdd.length) {
      splatsToAdd.forEach((data: SplatDataObject) => {
        const container = new PIXI.Container();
        const style = new PIXI.TextStyle(data.styleData);
        // all scene splats have a .maskPolgyon.
        if (data.maskPolygon) {
          data.splats.forEach((splat) => {
            const text = new PIXI.Text(splat.glyph, style);
            text.x = splat.x;
            text.y = splat.y;
            container.addChild(text);
            return text;
          });

          log(LogLevel.DEBUG, 'drawSceneSplats: splatDataObj.maskPolygon');
          const sightMask = new PIXI.Graphics();
          sightMask.beginFill(1, 1);
          sightMask.drawPolygon(data.maskPolygon);
          sightMask.endFill();

          container.addChild(sightMask);
          container.mask = sightMask;

          container.x = data.x;
          container.y = data.y;
          container.alpha = data.alpha || 1;
          // we don't want to save alpha to flags
          delete data.alpha;
          canvas.tiles.addChild(container);

          //if it's in the pool already update it otherwise add new entry
          if (existingIds.includes(data.id))
            BloodNGuts.scenePool.find((p) => p.data.id === data.id).container = container;
          else BloodNGuts.scenePool.push({ data: data, container: container });
        } else {
          log(LogLevel.ERROR, 'drawSceneSplats: splatDataObject has no .maskPolygon!');
        }
      });
    }

    // now update the alpha on already drawn splats
    const addedIds = splatsToAdd.map((s) => s.id);
    const splatsToFade = splats.filter((s) => s.alpha && !addedIds.includes(s.id));
    if (splatsToFade.length) {
      splatsToFade.forEach((s) => {
        BloodNGuts.scenePool.find((p) => p.data.id === s.id).container.alpha = s.alpha;
      });
    }
  }

  /**
   * Wipes all splats data from scene flags.
   * @category GMOnly
   * @function
   */
  public static async wipeSceneFlags(): Promise<void> {
    log(LogLevel.INFO, 'wipeSceneFlags');
    await canvas.scene.setFlag(MODULE_ID, 'sceneSplats', null);
    for (const tokenId in BloodNGuts.splatTokens) BloodNGuts.splatTokens[tokenId].wipeFlags();
  }

  /**
   * Wipes all splats from the current scene and empties all pools.
   * @category GMandPC
   * @function
   */
  public static wipeSceneSplats(): void {
    log(LogLevel.DEBUG, 'wipeSceneSplats');

    // destroy scene splats
    BloodNGuts.scenePool.forEach((poolObj) => {
      if (!poolObj.data.tokenId) poolObj.container.destroy();
    });

    BloodNGuts.scenePool = [];
  }

  // GENERATORS

  /**
   * Generate splats on the floor beneath a token.
   * @category GMOnly
   * @function
   * @param {Token} token - the token to generate splats for.
   * @param {SplatFont} font - the font to use for splats.
   * @param {number} size - the size of splats.
   * @param {number} density - the amount of splats.
   */
  public static generateFloorSplats(splatToken: SplatToken, font: SplatFont, size: number, density: number): void {
    if (!density) return;
    log(LogLevel.DEBUG, 'generateFloorSplats');

    const splatDataObj: Partial<SplatDataObject> = {};

    // scale the splats based on token size and severity
    const fontSize = Math.round(
      size * ((splatToken.spriteWidth + splatToken.spriteWidth) / canvas.grid.size / 2) * splatToken.hitSeverity,
    );
    log(LogLevel.DEBUG, 'generateFloorSplats fontSize', fontSize);
    splatDataObj.styleData = {
      fontFamily: font.name,
      fontSize: fontSize,
      fill: splatToken.bloodColor,
      align: 'center',
    };
    const style = new PIXI.TextStyle(splatDataObj.styleData);

    // amount of splats is based on density and severity
    const amount = Math.round(density * splatToken.hitSeverity);
    // get a random glyph and then get a random (x,y) spread away from the token.
    const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
    const pixelSpreadX = splatToken.spriteWidth * game.settings.get(MODULE_ID, 'splatSpread');
    const pixelSpreadY = splatToken.spriteHeight * game.settings.get(MODULE_ID, 'splatSpread');
    log(LogLevel.DEBUG, 'generateFloorSplats amount', amount);
    log(LogLevel.DEBUG, 'generateFloorSplats pixelSpread', pixelSpreadX, pixelSpreadY);

    // create our splats for later drawing.
    splatDataObj.splats = glyphArray.map((glyph) => {
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

    const { offset, width, height } = alignSplatsGetOffsetAndDimensions(splatDataObj.splats);
    splatDataObj.offset = offset;
    splatDataObj.x = offset.x;
    splatDataObj.y = offset.y;

    const maxDistance = Math.max(width, height);
    const tokenCenter = splatToken.getCenter();
    const sight = computeSightFromPoint(tokenCenter, maxDistance);

    // since we don't want to add the mask to the container yet (as that will
    // screw up our alignment) we need to move it by editing the x,y points directly
    for (let i = 0; i < sight.length; i += 2) {
      sight[i] -= splatDataObj.offset.x;
      sight[i + 1] -= splatDataObj.offset.y;
    }

    splatDataObj.x += tokenCenter.x;
    splatDataObj.y += tokenCenter.y;
    splatDataObj.maskPolygon = sight;
    splatDataObj.id = getUID();
    BloodNGuts.scenePool.push({ data: <SplatDataObject>splatDataObj });
  }

  /**
   * Generate splats in a trail on the floor behind a moving token.
   * @category GMOnly
   * @function
   * @param {Token} token - the token to generate splats for.
   * @param {SplatFont} font - the font to use for splats.
   * @param {number} size - the size of splats.
   * @param {number} density - the amount of splats.
   */
  public static generateTrailSplats(splatToken: SplatToken, font: SplatFont, size: number, distances: number[]): void {
    if (!distances) return;
    log(LogLevel.DEBUG, 'generateTrailSplats');
    log(LogLevel.DEBUG, 'generateTrailSplats severity', splatToken.bleedingSeverity);

    const splatDataObj: Partial<SplatDataObject> = {};
    splatDataObj.splats = [];
    // scale the splats based on token size and severity
    const fontSize = Math.round(
      size * ((splatToken.spriteWidth + splatToken.spriteHeight) / canvas.grid.size / 2) * splatToken.bleedingSeverity,
    );
    log(LogLevel.DEBUG, 'generateTrailSplats fontSize', fontSize);
    splatDataObj.styleData = {
      fontFamily: font.name,
      fontSize: fontSize,
      fill: splatToken.bloodColor,
      align: 'center',
    };
    const style = new PIXI.TextStyle(splatDataObj.styleData);

    //todo: improve this
    //horiz or vert movement
    const pixelSpread = splatToken.direction.x
      ? splatToken.spriteWidth * game.settings.get(MODULE_ID, 'splatSpread') * 2
      : splatToken.spriteHeight * game.settings.get(MODULE_ID, 'splatSpread') * 2;

    const rand = getRandomBoxMuller() * pixelSpread - pixelSpread / 2;
    log(LogLevel.DEBUG, 'generateTrailSplats rand', rand);
    // first get the hafway point between the start and end
    const controlPt = new PIXI.Point(
      (splatToken.lastPos.x + splatToken.currPos.x) / 2,
      (splatToken.lastPos.y + splatToken.currPos.y) / 2,
    );
    // then swap direction y,x to give us a position to the side
    controlPt.x += splatToken.direction.y * rand;
    controlPt.y += splatToken.direction.x * rand;

    log(LogLevel.DEBUG, 'generateTrailSplats', splatToken.lastPos, controlPt, splatToken.currPos, rand);

    // get random glyphs and the interval between each splat
    // amount is based on density and severity
    const glyphArray: Array<string> = Array.from({ length: distances.length }, () => getRandomGlyph(font));

    // create our splats for later drawing.
    for (let i = 0; i < glyphArray.length; i++) {
      const glyph = glyphArray[i];
      const tm = PIXI.TextMetrics.measureText(glyph, style);
      const pt = getPointOnCurve(splatToken.lastPos, controlPt, splatToken.currPos, distances[i]);
      splatDataObj.splats.push({
        x: Math.round(pt.x - tm.width / 2) - splatToken.currPos.x,
        y: Math.round(pt.y - tm.height / 2) - splatToken.currPos.y,
        width: tm.width,
        height: tm.height,
        glyph: glyph,
      });
    }
    log(LogLevel.DEBUG, 'generateTrailSplats splatDataObj.splats', splatDataObj.splats);

    const { offset, width, height } = alignSplatsGetOffsetAndDimensions(splatDataObj.splats);

    splatDataObj.offset = offset;
    splatDataObj.x = offset.x;
    splatDataObj.y = offset.y;

    const maxDistance = Math.max(width, height);

    const tokenCenter = splatToken.getCenter(); //new PIXI.Point(...canvas.grid.getCenter(splatToken.currPos.x, splatToken.currPos.y));
    const sight = computeSightFromPoint(tokenCenter, maxDistance);
    splatDataObj.maskPolygon = sight;

    // since we don't want to add the mask to the container yet (as that will
    // screw up our alignment) we need to move it by editing the x,y points directly
    for (let i = 0; i < sight.length; i += 2) {
      sight[i] -= splatDataObj.offset.x;
      sight[i + 1] -= splatDataObj.offset.y;
    }

    splatDataObj.x += tokenCenter.x;
    splatDataObj.y += tokenCenter.y;
    splatDataObj.id = getUID();
    BloodNGuts.scenePool.push({ data: <SplatDataObject>splatDataObj });
  }

  // HANDLERS

  /**
   * Handler called on all updateToken and updateActor events. Checks for movement and damage and
   * calls splat generate methods.
   * @category GMandPC
   * @function
   * @async
   * @param {scene} - reference to the current scene
   * @param {tokenData} - tokenData of updated Token/Actor
   * @param {changes} - changes
   */
  public static updateTokenOrActorHandler(scene, tokenData, changes): void {
    if (!scene.active) return;
    log(LogLevel.DEBUG, 'updateTokenOrActorHandler', changes);
    const tokenId = tokenData._id || tokenData.data._id;
    const splatToken = BloodNGuts.splatTokens[tokenId];
    if (game.user.isGM && splatToken.updateChanges(changes)) BloodNGuts.saveScene();

    if (changes.flags && changes.flags[MODULE_ID]?.splats !== undefined)
      splatToken.updateSplats(changes.flags[MODULE_ID].splats);
  }

  /**
   * Handler called when canvas has been fully loaded. Wipes scene splats and reloads from flags.
   * @category GMandPC
   * @function
   * @param {scene} - reference to the current scene
   * @param {tokenData} - tokenData of updated Token/Actor
   * @param {changes} - changes
   */
  public static canvasReadyHandler(canvas): void {
    if (!canvas.scene.active) return;
    log(LogLevel.INFO, 'canvasReady, active:', canvas.scene.name);
    // wipe pools to be refilled from scene flag data
    BloodNGuts.scenePool = [];

    // need to wait on fonts loading before we can loadScene
    BloodNGuts.allFontsReady.then(() => {
      BloodNGuts.loadScene();
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
    if (!scene.active || !changes.flags || changes.flags[MODULE_ID]?.sceneSplats === undefined) return;
    log(LogLevel.DEBUG, 'updateSceneHandler');
    if (changes.flags[MODULE_ID]?.sceneSplats === null) {
      BloodNGuts.wipeSceneSplats();
      return;
    }
    BloodNGuts.drawSceneSplats(changes.flags[MODULE_ID]?.sceneSplats);
  }

  /**
   * Handler called when token is deleted. Removed tokenSplats and pool objects for this token.
   * @category GMOnly
   * @function
   * @param {scene} - reference to the current scene
   * @param {token} - reference to deleted token
   */
  public static deleteTokenHandler(scene, token): void {
    if (!scene.active || !game.user.isGM) return;
    log(LogLevel.INFO, 'deleteTokenHandler', token);
    delete BloodNGuts.splatTokens[token._id];
    BloodNGuts.scenePool = BloodNGuts.scenePool.filter((poolObj) => poolObj.data.tokenId != token._id);
  }

  /**
   * Handler called when left button bar is drawn
   * @category GMOnly
   * @function
   * @param {buttons} - reference to the buttons controller
   */
  public static getSceneControlButtonsHandler(buttons): void {
    if (!game.user.isGM) return;
    log(LogLevel.DEBUG, 'getSceneControlButtonsHandler');
    const tileButtons = buttons.find((b) => b.name == 'tiles');

    if (tileButtons) {
      tileButtons.tools.push({
        name: 'wipe',
        title: 'Wipe all blood splats from this scene.',
        icon: 'fas fa-tint-slash',
        active: true,
        visible: true,
        onClick: BloodNGuts.wipeSceneFlags,
      });
    }
  }
}

// HOOKS

Hooks.once('init', () => {
  log(LogLevel.INFO, `Initializing module ${MODULE_ID}`);

  // Assign custom classes and constants here
  BloodNGuts.initialize();
  // Register custom module settings
  registerSettings();

  for (const fontName in splatFonts.fonts) {
    const shorthand = '12px ' + fontName;
    console.log(shorthand);
    (document as any).fonts.load(shorthand);
  }

  BloodNGuts.allFontsReady = (document as any).fonts.ready;
});

Hooks.on('canvasReady', BloodNGuts.canvasReadyHandler);
Hooks.on('updateToken', BloodNGuts.updateTokenOrActorHandler);
Hooks.on('updateActor', (actor, changes) => {
  if (!canvas.scene.active) return;
  // convert into same structure as token changes.
  if (changes.data) changes.actorData = { data: changes.data };
  const token = canvas.tokens.placeables.filter((t) => t.actor).find((t) => t.actor.id === actor.id);
  if (!token) log(LogLevel.ERROR, 'updateActor token not found!');
  else BloodNGuts.updateTokenOrActorHandler(canvas.scene, token.data, changes);
});
Hooks.on('deleteToken', BloodNGuts.deleteTokenHandler);
Hooks.on('updateScene', BloodNGuts.updateSceneHandler);
Hooks.on('getSceneControlButtons', BloodNGuts.getSceneControlButtonsHandler);

// TOKEN PROTOTYPE

Token.prototype.draw = (function () {
  const cached = Token.prototype.draw;

  return async function () {
    await cached.apply(this);
    if (!this.icon || this._original?.data?._id) return this; //no icon or dragging
    let splatToken: SplatToken;
    if (BloodNGuts.splatTokens[this.id]) splatToken = BloodNGuts.splatTokens[this.id];
    else {
      splatToken = new SplatToken(this);
      BloodNGuts.splatTokens[this.id] = splatToken;
      await BloodNGuts.splatTokens[this.id].createMask();

      if (game.user.isGM && game.settings.get(MODULE_ID, 'halfHealthBloodied')) {
        // If the `halfHealthBloodied` setting is true we need to pre-splat the tokens that are bloodied
        splatToken.preSplat();
      }
    }
    if (splatToken.bloodColor === 'none') return this;
    const splatContainerZIndex = this.children.findIndex((child) => child === this.icon) + 1;
    if (splatContainerZIndex === 0) log(LogLevel.ERROR, 'draw(), cant find token.icon!');
    else {
      this.addChildAt(splatToken.container, splatContainerZIndex);
      splatToken.draw();
      return this;
    }
  };
})();

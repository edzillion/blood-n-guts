/**
 * Documentation for Blood 'n Guts, a Foundry VTT module that adds blood splatter to your games.
 * All functionality is wrapped in it's main Class `BloodNGuts`.
 * @license [GNU GPLv3.0 & 'Commons Clause' License Condition v1.0]{@link https://github.com/edzillion/blood-n-guts/blob/master/LICENSE.md}
 * @packageDocumentation
 * @author [edzillion]{@link https://github.com/edzillion}
 */

import { mergeSettingsFiles, registerSettings, getCustomSplatFonts } from './module/settings';
import { log, LogLevel } from './module/logging';
import {
  getRandomGlyph,
  computeSightFromPoint,
  getRandomBoxMuller,
  alignSplatsGetOffsetAndDimensions,
  getPointOnCurve,
  getUID,
  getRGBA,
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
  public static allFonts: SplatFont[];
  public static splatTokens: Record<string, SplatToken>;
  public static scenePool: Array<SplatPoolObject>;
  public static disabled: boolean;

  public static initialize(): void {
    BloodNGuts.splatTokens = {};
    BloodNGuts.scenePool = [];
    BloodNGuts.disabled = false;
  }

  /**
   * Loads all `SplatDataObject`s from scene flag `sceneSplats` trims them and draws them - this
   * will also add them back into the pool.
   * @category GMandPC
   * @function
   */
  private static loadScene(): void {
    log(LogLevel.DEBUG, 'loadScene');
    const sceneSplats = canvas.scene.getFlag(MODULE_ID, 'sceneSplats');
    log(LogLevel.DEBUG, 'loadScene sceneSplats loaded:', sceneSplats);

    if (sceneSplats) {
      log(LogLevel.DEBUG, 'loadScene drawSceneSplats', canvas.scene.name);
      const trimmedSplats = this.getTrimmedSceneSplats(duplicate(sceneSplats));
      BloodNGuts.drawSceneSplats(trimmedSplats);
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
    const sceneSplats = BloodNGuts.getTrimmedSceneSplats(BloodNGuts.scenePool.map((p) => p.data));
    return canvas.scene.setFlag(MODULE_ID, 'sceneSplats', sceneSplats);
  }

  /**
   * Takes an array of splats, trims the excess over 'sceneSplatPoolSize' and fades the oldest.
   * @category GMOnly
   * @function
   * @param {SplatDataObject[]} - original splat array
   * @returns {SplatDataObject[]} - trimmed splat array
   */
  public static getTrimmedSceneSplats(splats: SplatDataObject[]): SplatDataObject[] {
    log(LogLevel.DEBUG, 'getTrimmedSceneSplats');
    const maxPoolSize = game.settings.get(MODULE_ID, 'sceneSplatPoolSize');
    if (splats.length > maxPoolSize) {
      // remove the oldest splats
      log(LogLevel.DEBUG, 'getTrimmedSceneSplats removing ', splats.length - maxPoolSize);
      splats.splice(0, splats.length - maxPoolSize);
    }

    const fadedPoolSize = splats.length - Math.round(maxPoolSize * 0.85);
    const veryFadedPoolSize = Math.ceil(fadedPoolSize * 0.33);
    log(LogLevel.DEBUG, 'getTrimmedSceneSplats sizes curr, max', splats.length, maxPoolSize);

    // 15% of splats will be set to fade. 1/3rd of those will be very faded
    if (fadedPoolSize > 0) {
      for (let i = 0; i < fadedPoolSize; i++) {
        const alpha = i < veryFadedPoolSize ? 0.1 : 0.3;
        splats[i].alpha = alpha;
      }
    }

    log(
      LogLevel.DEBUG,
      `getTrimmedSceneSplats sceneSplatPool:${splats.length}, fadedPoolSize:${fadedPoolSize}, veryFadedPoolSize:${veryFadedPoolSize}`,
    );
    const trimmedSplats = splats.filter((s) => !s.tokenId);
    return trimmedSplats;
  }

  /**
   * Draws all new `SplatDataObject`s and those that haven't got a .splatContainer yet to the canvas
   * and adds those to the scene pool.
   * @category GMandPC
   * @function
   * @param {[SplatDataObject]} splats - updated array of scene splats
   */
  public static drawSceneSplats(splats: SplatDataObject[]): void {
    log(LogLevel.DEBUG, 'drawSceneSplats');
    const updatedIds = splats.map((s) => s.id);
    const existingIds = BloodNGuts.scenePool.map((poolObj) => poolObj.data.id);
    const drawnIds = BloodNGuts.scenePool.filter((poolObj) => poolObj.container).map((p) => p.data.id);

    // remove splats from the pool that are not in our updated splats
    BloodNGuts.scenePool = BloodNGuts.scenePool.filter((p) => {
      if (p.data.tokenId || updatedIds.includes(p.data.id)) return this;
      else {
        if (p.container) p.container.destroy({ children: true });
        else {
          // todo: is there a way to make sure we always are using the latest scene flag data?
          // sometimes when pool is full and perf decreases we will have splats here that have been added
          // via a generate method that have not yet been saved to the scene, and therefore not included in updatedIds.
          // if we ingore here drawSceneSplats will be called again twice, once with this splat now in updatedIds, which
          // will then trigger another draw at which point the container is attached.
        }
      }
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
            text.x = splat.x + splat.width / 2;
            text.y = splat.y + splat.height / 2;
            text.pivot.set(splat.width / 2, splat.height / 2);
            text.angle = splat.angle;
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
   * Wipes all scene and token flags.
   * @category GMOnly
   * @function
   */
  public static async wipeAllFlags(): Promise<void> {
    log(LogLevel.INFO, 'wipeAllFlags');
    if (!canvas.scene.active) {
      ui.notifications.notify(`Note: Blood 'n Guts does not work on non-active scenes!`, 'warning');
      return;
    }
    await BloodNGuts.wipeSceneFlags();
    await BloodNGuts.wipeTokenFlags();
  }

  /**
   * Wipes all scene and token splats.
   * @category GMOnly
   * @function
   */
  public static async wipeAllSplats(): Promise<void> {
    log(LogLevel.INFO, 'wipeAllSplats');
    if (!canvas.scene.active) {
      ui.notifications.notify(`Note: Blood 'n Guts does not work on non-active scenes!`, 'warning');
      return;
    }
    BloodNGuts.wipeSceneSplats();
    BloodNGuts.wipeTokenSplats();
  }

  /**
   * Wipes all splats data from scene flags.
   * @category GMOnly
   * @function
   */
  public static async wipeSceneFlags(): Promise<void> {
    log(LogLevel.INFO, 'wipeSceneFlags');
    await canvas.scene.setFlag(MODULE_ID, 'sceneSplats', null);
  }

  /**
   * Wipes all splats from the current scene and empties all pools.
   * @category GMandPC
   * @function
   */
  public static wipeSceneSplats(): void {
    log(LogLevel.INFO, 'wipeSceneSplats');

    // destroy scene splats
    BloodNGuts.scenePool.forEach((poolObj) => {
      if (!poolObj.data.tokenId) poolObj.container.destroy();
    });

    BloodNGuts.scenePool = [];
  }

  /**
   * Wipes all splats data from token flags.
   * @category GMOnly
   * @function
   */
  public static async wipeTokenFlags(): Promise<void> {
    log(LogLevel.INFO, 'wipeTokenFlags');
    const promises: Promise<PlaceableObject>[] = [];
    for (const tokenId in BloodNGuts.splatTokens) promises.push(BloodNGuts.splatTokens[tokenId].wipeFlags());
    await Promise.all(promises);
  }

  /**
   * Wipes all token splats from the current scene.
   * @category GMandPC
   * @function
   */
  public static wipeTokenSplats(): void {
    log(LogLevel.INFO, 'wipeTokenSplats');
    for (const tokenId in BloodNGuts.splatTokens) BloodNGuts.splatTokens[tokenId].wipeSplats();
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
        angle: Math.round(Math.random() * 360),
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
   * @param {number[]} distances - distances along the trail from 0 to 1.
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
        angle: Math.round(Math.random() * 360),
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

    // account for 45deg rotated splats
    const maxDistance = Math.max(width * 1.414, height * 1.414);

    const tokenCenter = splatToken.getCenter();
    const sight = computeSightFromPoint(tokenCenter, maxDistance);
    splatDataObj.maskPolygon = sight;

    // const trailCenter = getPointOnCurve(splatToken.lastPos, controlPt, splatToken.currPos, 0.5);
    // const moveTo = new PIXI.Point(trailCenter.x - splatToken.currPos.x, trailCenter.y - splatToken.currPos.y);
    // const sightDist = distanceBetween(splatToken.lastPos, splatToken.currPos) / 2 + fontSize;
    // const sight = computeSightFromPoint(trailCenter, sightDist);
    // offset.x -= moveTo.x - 50;
    // offset.y -= moveTo.y - 50;

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

  /**
   * Draw splats on any HTMLElement sent to it.
   * @category GMOnly
   * @function
   * @param {HTMLElement} html - the HTMLElement to draw splats on.
   * @param {SplatFont=tokenSplatFont} font - the font to use for splats
   * @param {number} size - the size of splats.
   * @param {number} density - the amount of splats.
   * @param {string='blood'} bloodColor - splat color, can be a css color name or RBGA string e.g. '[255,255,0,0.5]'
   */
  public static drawDOMSplats(
    html: HTMLElement,
    font: SplatFont = BloodNGuts.allFonts[game.settings.get(MODULE_ID, 'tokenSplatFont')],
    size: number,
    density: number,
    bloodColor = 'blood',
  ): void {
    if (!density) return;
    log(LogLevel.INFO, 'drawDOMSplats');

    const glyphArray: Array<string> = Array.from({ length: density }, () => getRandomGlyph(font));

    const containerStyle = {
      width: html.clientWidth,
      height: html.clientHeight,
      color: getRGBA(bloodColor),
    };

    const container = $('<div/>', {
      class: 'splat-container',
      css: containerStyle,
    }).appendTo(html);

    // draw splats to DOM
    glyphArray.forEach((glyph) => {
      const style = {
        fontFamily: font.name,
        fontSize: size,

        align: 'center',
        left: Math.round(Math.random() * html.clientWidth) + 'px',
        top: Math.round(Math.random() * html.clientHeight) + 'px',
        position: 'absolute',
        transform: 'rotate(' + Math.round(Math.random() * 360) + 'deg)',
      };

      $('<div/>', {
        css: style,
        text: glyph,
      }).appendTo(container);
    });
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
    if (!scene.active || BloodNGuts.disabled) return;
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
    if (!canvas.scene.active || BloodNGuts.disabled) return;
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
    if (!scene.active || BloodNGuts.disabled || !changes.flags || changes.flags[MODULE_ID]?.sceneSplats === undefined)
      return;
    log(LogLevel.DEBUG, 'updateSceneHandler');
    if (changes.flags[MODULE_ID]?.sceneSplats === null) {
      BloodNGuts.wipeSceneSplats();
      return;
    }
    const trimmedSplats = BloodNGuts.getTrimmedSceneSplats(duplicate(changes.flags[MODULE_ID]?.sceneSplats));
    BloodNGuts.drawSceneSplats(trimmedSplats);
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
    log(LogLevel.INFO, 'deleteTokenHandler', token._id);
    if (BloodNGuts.splatTokens[token._id]) delete BloodNGuts.splatTokens[token._id];
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
        onClick: BloodNGuts.wipeAllFlags,
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
  mergeSettingsFiles();
  registerSettings();

  for (const fontName in splatFonts.fonts) {
    const shorthand = '12px ' + fontName;
    (document as any).fonts.load(shorthand);
  }

  getCustomSplatFonts.then((customSplatFonts: { fonts: SplatFont[] }) => {
    if (customSplatFonts) {
      for (const fontName in customSplatFonts.fonts) {
        const shorthand = '12px ' + fontName;
        (document as any).fonts.load(shorthand);
      }
    } else customSplatFonts = { fonts: [] };
    BloodNGuts.allFonts = Object.assign(splatFonts.fonts, customSplatFonts.fonts);
  });
  BloodNGuts.allFontsReady = (document as any).fonts.ready;
});

Hooks.once('ready', () => {
  window.BloodNGuts = BloodNGuts;
  Hooks.call('bloodNGutsReady');
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

Hooks.on('chatMessage', (_chatTab, commandString, _user) => {
  const commands = commandString.split(' ');
  if (commands[0] != '/blood') return;
  switch (commands[1]) {
    case 'clear':
      if (game.user.isGM) BloodNGuts.wipeAllFlags();
      else BloodNGuts.wipeAllSplats();
      return false;
    default:
      log(LogLevel.ERROR, 'chatMessage, unknown command ' + commands[1]);
      return false;
  }
});

// TOKEN PROTOTYPE

Token.prototype.draw = (function () {
  const cached = Token.prototype.draw;

  return async function () {
    await cached.apply(this);

    if (!canvas.scene.active || BloodNGuts.disabled || !this.icon || this._original?.data?._id) return this; //no icon or dragging
    let splatToken: SplatToken;

    if (BloodNGuts.splatTokens[this.id]) {
      splatToken = BloodNGuts.splatTokens[this.id];
      if (splatToken.container.children.length === 0) {
        splatToken.container = new PIXI.Container();
        await BloodNGuts.splatTokens[this.id].createMask();
      }
    } else {
      splatToken = await new SplatToken(this).create();
      BloodNGuts.splatTokens[this.id] = splatToken;
      if (game.user.isGM && splatToken.bloodColor !== 'none' && game.settings.get(MODULE_ID, 'halfHealthBloodied')) {
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

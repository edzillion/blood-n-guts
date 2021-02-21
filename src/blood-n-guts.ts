/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * Documentation for Blood 'n Guts, a Foundry VTT module that adds blood splatter to your games.
 * All functionality is wrapped in it's main Class `BloodNGuts`.
 * @license [GNU GPLv3.0 & 'Commons Clause' License Condition v1.0]{@link https://github.com/edzillion/blood-n-guts/blob/master/LICENSE.md}
 * @packageDocumentation
 * @author [edzillion]{@link https://github.com/edzillion}
 */

import {
  mergeSettingsFiles,
  registerSettings,
  getCustomSplatFonts,
  settingsReady,
  getMergedViolenceLevels,
} from './module/settings';
import { log, LogLevel } from './module/logging';
import {
  getRandomGlyph,
  getRGBA,
  changeColorPickerOpacityHack,
  rgbaStringToHexStringAndOpacity,
  lookupTokenBloodColor,
  isFirstActiveGM,
  isTokenSplatData,
} from './module/helpers';
import { MODULE_ID, MODULE_TITLE } from './constants';
import SplatToken from './classes/SplatToken';
import BloodLayer from './classes/BloodLayer';
import * as splatFonts from './data/splatFonts';

// CONFIG.debug.hooks = true;
CONFIG[MODULE_ID] = { logLevel: 2 };

/**
 * Main class wrapper for all blood-n-guts features.
 * @class
 */
export class BloodNGuts {
  public static allFontsReady: Promise<boolean>;
  public static allFonts: SplatFont[];
  public static splatTokens: Record<string, SplatToken>;
  public static disabled: boolean;
  public static paintActive: boolean;
  public static layer: BloodLayer;

  public static initialize(): void {
    BloodNGuts.splatTokens = {};
    BloodNGuts.disabled = false;
    BloodNGuts.paintActive = false;
  }

  public static registerLayer() {
    // @ts-expect-error missing definition
    const layers = mergeObject(Canvas.layers, {
      blood: BloodLayer,
    });
    // @ts-expect-error missing definition
    Object.defineProperty(Canvas, 'layers', {
      get: function () {
        return layers;
      },
    });
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
    await canvas.blood.wipeLayer(true);
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
    canvas.blood.wipeLayer();
    BloodNGuts.wipeTokenSplats();
  }

  /**
   * Wipes all splats data from token flags.
   * @category GMOnly
   * @function
   */
  public static async wipeTokenFlags(): Promise<PlaceableObject> {
    log(LogLevel.INFO, 'wipeTokenFlags');
    const updateData = [];
    for (const tokenId in BloodNGuts.splatTokens) {
      updateData.push({ _id: tokenId, 'flags.blood-n-guts.splats': '' });
    }
    return BloodNGuts.splatTokens[updateData[0]._id].token.update(updateData);
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

  /**
   * Draw splats on any HTMLElement sent to it.
   * @category GMOnly
   * @function
   * @param {HTMLElement} html - the HTMLElement to draw splats on.
   * @param {SplatFont=tokenSplatFont} font - the font to use for splats
   * @param {number} size - the size of splats.
   * @param {number} density - the amount of drips.
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
   * @param scene - reference to the current scene
   * @param tokenData - tokenData of updated Token/Actor
   * @param changes - changes
   */
  public static updateTokenOrActorHandler(scene, tokenData, changes): void {
    if (!scene.active || BloodNGuts.disabled) return;
    log(LogLevel.DEBUG, 'updateTokenOrActorHandler', changes);

    const tokenId = tokenData._id || tokenData.data._id;
    const splatToken = BloodNGuts.splatTokens[tokenId];

    // remove custom settings from a SplatToken when unchecked
    if (changes.flags && changes.flags[MODULE_ID]?.customBloodChecked != null) {
      if (!changes.flags[MODULE_ID].customBloodChecked) {
        splatToken.wipeCustomSettings().then(() => {
          return;
        });
      }
    }

    if (isFirstActiveGM()) {
      const b = splatToken.updateChanges(changes);
    }

    // if (changes.flags && changes.flags[MODULE_ID]?.splats !== undefined)
    //   splatToken.updateSplats(changes.flags[MODULE_ID].splats);
  }

  /**
   * Handler called when canvas has been fully loaded. Wipes scene splats and reloads from flags.
   * @category GMandPC
   * @function
   * @param canvas - reference to the canvas
   */
  public static canvasReadyHandler(canvas): void {
    if (!canvas.scene.active || BloodNGuts.disabled) return;
    log(LogLevel.INFO, 'canvasReady, active:', canvas.scene.name);
    const gm = game.users.find((e) => e.isGM && e.active);
    if (!gm) {
      ui.notifications.notify(`Note: Blood 'n Guts requires a GM to be online to function!`, 'warning');
      BloodNGuts.disabled = true;
    }

    // need to wait on fonts loading before we can loadScene
    BloodNGuts.allFontsReady.then(() => {
      canvas.blood.renderHistory();
    });
  }

  /**
   * Handler called when scene data updated. Draws splats from scene data flags.
   * @category GMandPC
   * @function
   * @param scene - reference to the current scene
   * @param changes - changes
   */
  public static updateSceneHandler(scene, changes): void {
    if (!scene.active || BloodNGuts.disabled || !changes.flags || changes.flags[MODULE_ID]?.sceneSplats === undefined)
      return;
    log(LogLevel.DEBUG, 'updateSceneHandler');
    // if (changes.flags[MODULE_ID]?.sceneSplats === null) {
    //   BloodNGuts.wipeSceneSplats();
    //   return;
    // }
    // const trimmedSplats = BloodNGuts.getTrimmedSceneSplats(duplicate(changes.flags[MODULE_ID]?.sceneSplats));
    // BloodNGuts.drawSceneSplats(trimmedSplats);
  }

  /**
   * Handler called when token is deleted. Removed tokenSplats and pool objects for this token.
   * @category GMOnly
   * @function
   * @param scene - reference to the current scene
   * @param token - reference to deleted token
   */
  public static deleteTokenHandler(scene, token): void {
    if (!scene.active || !isFirstActiveGM()) return;
    log(LogLevel.INFO, 'deleteTokenHandler', token._id);
    if (BloodNGuts.splatTokens[token._id]) delete BloodNGuts.splatTokens[token._id];
    canvas.blood.deleteMany(token._id);
  }

  /**
   * Handler called when token configuration window is opened. Injects custom form html and deals
   * with updating token.
   * @category GMOnly
   * @function
   * @async
   * @param {TokenConfig} tokenConfig
   * @param {JQuery} html
   */
  public static async renderTokenConfigHandler(tokenConfig: TokenConfig, html: JQuery): Promise<void> {
    log(LogLevel.INFO, 'renderTokenConfig');

    const imageTab = html.find('.tab[data-tab="image"]');
    const choices = { '': '' };
    const violenceLevels: any = await getMergedViolenceLevels;
    for (const levelName in violenceLevels) {
      choices[levelName] = levelName;
    }

    let defaultColor =
      tokenConfig.object.getFlag(MODULE_ID, 'bloodColor') || (await lookupTokenBloodColor(tokenConfig.object));
    let defaultOpacity = '0.7';
    if (defaultColor !== 'none') {
      const { hexString, opacity } = rgbaStringToHexStringAndOpacity(defaultColor);
      defaultColor = hexString;
      defaultOpacity = opacity;
    }

    const data = {
      defaultColor: defaultColor,
      levelNames: choices,
      fonts: BloodNGuts.allFonts,
      selectedColor: tokenConfig.object.getFlag(MODULE_ID, 'bloodColor'),
      currentLevel: tokenConfig.object.getFlag(MODULE_ID, 'violenceLevel'),
      floorSplatFont: tokenConfig.object.getFlag(MODULE_ID, 'floorSplatFont'),
      tokenSplatFont: tokenConfig.object.getFlag(MODULE_ID, 'tokenSplatFont'),
      trailSplatFont: tokenConfig.object.getFlag(MODULE_ID, 'trailSplatFont'),
    };
    // add blank entry for empty font settings.
    data.fonts[''] = '';

    const insertHTML = await renderTemplate('modules/' + MODULE_ID + '/templates/token-config.html', data);
    imageTab.append(insertHTML);

    const selectViolenceLevel = imageTab.find('.token-config-select-violence-level');
    const customBloodCheckBox = imageTab.find('#customBloodCheckBox');

    const customBloodPanel = imageTab.find('#customBloodPanel');
    const bloodColorPicker = imageTab.find('#bloodColorPicker');
    const bloodColorText = imageTab.find('#bloodColorText');

    // if any custom settings are set on the token
    if (data.selectedColor || data.currentLevel || data.floorSplatFont || data.tokenSplatFont || data.trailSplatFont) {
      customBloodCheckBox.prop('checked', true);
      customBloodPanel.show();
    } else {
      customBloodCheckBox.prop('checked', false);
      customBloodPanel.hide();
    }

    if (tokenConfig.object.getFlag(MODULE_ID, 'violenceLevel') === 'Disabled') {
      bloodColorPicker.prop('disabled', true);
    }

    if (!data.selectedColor || data.selectedColor === 'none') {
      changeColorPickerOpacityHack(0);
    } else {
      changeColorPickerOpacityHack(defaultOpacity);
    }

    customBloodCheckBox.on('click', (event) => {
      // @ts-ignore
      if (event.target.checked) customBloodPanel.show();
      else customBloodPanel.hide();
      tokenConfig.setPosition({ height: 'auto' });
    });

    bloodColorPicker.on('click', (event) => {
      changeColorPickerOpacityHack(defaultOpacity);
    });

    bloodColorPicker.on('change', (event) => {
      changeColorPickerOpacityHack(0.7);
      // @ts-ignore
      data.selectedColor = hexToRGBAString(colorStringToHex(event.target.value), 0.7);
      bloodColorText.val(data.selectedColor);
    });

    bloodColorText.on('change', (event) => {
      // regex test for rgba here w form validation
      // @ts-ignore
      if (event.target.value === '') {
        changeColorPickerOpacityHack(0);
        data.selectedColor = '';
      } else {
        // @ts-ignore
        const { hexString, opacity } = rgbaStringToHexStringAndOpacity(event.target.value);
        defaultColor = hexString;
        defaultOpacity = opacity;

        bloodColorPicker.val(defaultColor);
        changeColorPickerOpacityHack(opacity);
      }
    });

    selectViolenceLevel.on('change', (event) => {
      // @ts-ignore
      if (event.target.value === 'Disabled' && !bloodColorPicker.prop('disabled')) {
        bloodColorPicker.prop('disabled', true);
        bloodColorText.prop('disabled', true);
        changeColorPickerOpacityHack(0);
        bloodColorText.val('');
      } else if (bloodColorPicker.prop('disabled')) {
        bloodColorPicker.prop('disabled', false);
        bloodColorText.prop('disabled', false);
        if (data.selectedColor !== 'none') {
          const { hexString, opacity } = rgbaStringToHexStringAndOpacity(data.selectedColor);
          bloodColorPicker.val(hexString);
          changeColorPickerOpacityHack(opacity);
          bloodColorText.val(data.selectedColor);
        }
      }
    });

    tokenConfig.setPosition({ height: 'auto' });
  }

  /**
   * Handler called when user logs in/out. Used to make sure there is a GM online and disable if not.
   * @category GMOnly
   * @function
   */
  public static getUserContextOptionsHandler(): void {
    log(LogLevel.DEBUG, 'getUserContextOptions');

    const gm = game.users.find((e) => e.isGM && e.active);
    if (!gm) {
      ui.notifications.notify(`Note: Blood 'n Guts requires a GM to be online to function!`, 'warning');
      BloodNGuts.disabled = true;
    } else if (BloodNGuts.disabled) {
      ui.notifications.notify(`GM Present: Blood 'n Guts is now functional`, 'info');

      // user may have disabled BnG in settings, if not then enable.
      if (game.settings.get(MODULE_ID, 'violenceLevel') !== 'Disabled') {
        BloodNGuts.disabled = false;
      }
    }
  }
}

// HOOKS

Hooks.once('init', () => {
  log(LogLevel.INFO, `Initializing module ${MODULE_ID}`);

  BloodNGuts.registerLayer();

  // Assign custom classes and constants here
  BloodNGuts.initialize();

  let dataSource = 'data';
  try {
    // @ts-expect-error - ForgeVTT is not a global object
    dataSource = typeof ForgeVTT !== undefined && ForgeVTT.usingTheForge ? 'forgevtt' : 'data';
    log(LogLevel.INFO, 'setting forgevtt as custom data source');
  } catch (error) {
    log(LogLevel.INFO, 'setting data as custom data source');
    // todo: why the fuck is this happening?
  }

  // Register custom module settings
  mergeSettingsFiles(dataSource);
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

  // hack to get 'Custom' added as a settings option on load
  settingsReady.then(() => {
    if (game.settings.get(MODULE_ID, 'violenceLevel') === 'Custom')
      game.settings.set(MODULE_ID, 'violenceLevel', 'Custom');
  });
});

Hooks.once('ready', () => {
  window.BloodNGuts = BloodNGuts;
  Hooks.call('bloodNGutsReady');
});

Hooks.once('canvasInit', () => {
  // Add SimplefogLayer to canvas
  canvas.blood.initialize();
  BloodNGuts.layer = canvas.blood;
});
Hooks.on('canvasReady', BloodNGuts.canvasReadyHandler);
Hooks.on('updateToken', BloodNGuts.updateTokenOrActorHandler);
Hooks.on('updateActor', (actor, changes) => {
  //changes.token are changes to the prototype?
  if (!canvas.scene.active || changes.token || changes.sort) return;
  // convert into same structure as token changes.
  if (changes.data) changes.actorData = { data: changes.data };
  const token = canvas.tokens.placeables.filter((t) => t.actor).find((t) => t.actor.id === actor.id);
  if (!token) log(LogLevel.ERROR, 'updateActor token not found!');
  else BloodNGuts.updateTokenOrActorHandler(canvas.scene, token.data, changes);
});

Hooks.on('deleteToken', BloodNGuts.deleteTokenHandler);
Hooks.on('renderTokenConfig', BloodNGuts.renderTokenConfigHandler);
// Hooks.on('updateScene', BloodNGuts.updateSceneHandler);
// Hooks.on('getSceneControlButtons', BloodNGuts.getSceneControlButtonsHandler);
Hooks.on('getUserContextOptions', BloodNGuts.getUserContextOptionsHandler);

Hooks.on('chatMessage', (_chatTab, commandString, _user) => {
  const commands = commandString.split(' ');
  if (commands[0] != '/blood') return;
  switch (commands[1]) {
    case 'clear':
      if (isFirstActiveGM()) BloodNGuts.wipeAllFlags();
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
      if (isFirstActiveGM() && !splatToken.disabled) {
        splatToken.preSplat();
      }
    }
    if (splatToken.disabled) return this;
    const splatContainerZIndex = this.children.findIndex((child) => child === this.icon) + 1;
    if (splatContainerZIndex === 0) log(LogLevel.ERROR, 'draw(), cant find token.icon!');
    else {
      this.addChildAt(splatToken.container, splatContainerZIndex);
      splatToken.draw();
      return this;
    }
  };
})();

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
import { getRandomGlyph, lookupTokenBloodColor, isFirstActiveGM, generateCustomSystem } from './module/helpers';
import { MODULE_ID } from './constants';
import SplatToken from './classes/SplatToken';
import BloodLayer from './classes/BloodLayer';
import * as splatFonts from './data/splatFonts';
import Systems from './data/systems';

//CONFIG.debug.hooks = true;
CONFIG[MODULE_ID] = { logLevel: 3 };

/**
 * Main class wrapper for all blood-n-guts features.
 * @class
 */
export class BloodNGuts {
  public static allFontsReady: Promise<boolean>;
  public static allFonts: SplatFont[];
  public static splatTokens: Record<string, SplatToken>;
  public static disabled: boolean;
  public static getLatestActorHP: any;
  public static getLatestActorMaxHP: any;
  public static lookupCreatureType: any;
  public static system: System;

  public static initialize(): void {
    log(LogLevel.INFO, `Initializing module ${MODULE_ID}`);
    BloodNGuts.splatTokens = {};
    BloodNGuts.disabled = false;
  }

  // register this layer with Foundry
  public static registerLayer(): void {
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
    BloodNGuts.wipeTokenSplats();
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
   * @param {string} bloodColor - splat color in hex format e.g. #FFFFFF
   */
  public static drawDOMSplats(
    html: HTMLElement,
    font: SplatFont = BloodNGuts.allFonts[game.settings.get(MODULE_ID, 'tokenSplatFont')],
    size: number,
    density: number,
    bloodColor: string,
  ): void {
    if (!density) return;
    log(LogLevel.DEBUG, 'drawDOMSplats');

    const glyphArray: Array<string> = Array.from({ length: density }, () => getRandomGlyph(font));

    const containerStyle = {
      width: html.clientWidth,
      height: html.clientHeight,
      color: bloodColor,
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
   * @param {Scene} scene - reference to the current scene
   * @param {Record<string, any>} tokenData - tokenData of updated Token/Actor
   * @param {Record<string, unknown>} changes - changes
   */
  public static updateTokenOrActorHandler(
    scene: Scene,
    tokenData: Record<string, any>,
    changes: Record<string, unknown>,
  ): void {
    // @ts-expect-error missing definition
    if (!scene.active || BloodNGuts.disabled) return;
    log(LogLevel.DEBUG, 'updateTokenOrActorHandler', changes);

    // if the update is a flag but not from our module then return
    const entries = Object.entries(changes);
    if (entries.length === 2 && entries[0][0] === 'flags' && entries[0][1][MODULE_ID] == null) return;

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
      const type = game.actors.get(tokenData.actorId).data.type.toLowerCase();
      if (BloodNGuts.system.supportedTypes.includes(type)) {
        splatToken.updateChanges(changes);
      }
    }
  }

  /**
   * Handler called when canvas has been fully loaded. Wipes scene splats and reloads from flags.
   * @category GMandPC
   * @function
   * @param canvas - reference to the canvas
   */
  public static canvasReadyHandler(canvas: any): void {
    if (!canvas.scene.active || BloodNGuts.disabled) return;
    log(LogLevel.INFO, 'canvasReady, active:', canvas.scene.name);
    const gm = game.users.find((e) => e.isGM && e.active);
    if (!gm) {
      ui.notifications.notify(`Note: Blood 'n Guts requires a GM to be online to function!`, 'warning');
      BloodNGuts.disabled = true;
    }

    if (isFirstActiveGM()) {
      for (const tokenId in BloodNGuts.splatTokens) {
        BloodNGuts.splatTokens[tokenId].preSplat();
      }
      canvas.blood.commitHistory();
    }
  }

  /**
   * Handler called when token is deleted. Removed tokenSplats and pool objects for this token.
   * @category GMOnly
   * @function
   * @param {Scene} scene - reference to the current scene
   * @param {Token} token - reference to deleted token
   */
  public static deleteTokenHandler(scene: Scene, token: Token): void {
    //@ts-expect-error missing definition
    if (!scene.active || !isFirstActiveGM()) return;
    //@ts-expect-error missing definition
    log(LogLevel.INFO, 'deleteTokenHandler', token._id);
    //@ts-expect-error missing definition
    if (BloodNGuts.splatTokens[token._id]) delete BloodNGuts.splatTokens[token._id];
    //@ts-expect-error missing definition
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
    log(LogLevel.DEBUG, 'renderTokenConfig');

    const actorType = tokenConfig.object.actor.data.type.toLowerCase();
    const imageTab = html.find('.tab[data-tab="image"]');
    const choices = { '': '' };
    const violenceLevels: Record<string, ViolenceLevel> = await getMergedViolenceLevels;
    for (const levelName in violenceLevels) {
      choices[levelName] = levelName;
    }

    const defaultColor =
      tokenConfig.object.getFlag(MODULE_ID, 'bloodColor') || (await lookupTokenBloodColor(tokenConfig.object));

    // @ts-expect-error missing definition
    const attributes = tokenConfig.constructor.getTrackedAttributes(tokenConfig.object.actor.data.data);

    const attributeChoices = {
      // @ts-expect-error missing definition
      'Trackable Attributes': tokenConfig.constructor.getTrackedAttributeChoices(attributes)['Attribute Bars'],
    };
    let currentAttributeChoice;
    if (
      BloodNGuts.system != null &&
      BloodNGuts.system.customAttributePaths &&
      BloodNGuts.system.customAttributePaths[BloodNGuts.system.supportedTypes.indexOf(actorType)]
    )
      currentAttributeChoice =
        BloodNGuts.system.customAttributePaths[BloodNGuts.system.supportedTypes.indexOf(actorType)];

    const data = {
      // if customAttributePaths is set then we know we are dealing with a custom system
      customSystem: BloodNGuts.system == null || BloodNGuts.system.customAttributePaths != null,
      attributeChoices: attributeChoices,
      currentAttributeChoice: currentAttributeChoice,
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
    const bloodAttribute = imageTab.find('#bloodAttribute');

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

    customBloodCheckBox.on('click', (event: JQuery.ClickEvent) => {
      if (event.target.checked) customBloodPanel.show();
      else customBloodPanel.hide();
      tokenConfig.setPosition({ height: 'auto' });
    });

    selectViolenceLevel.on('change', (event: JQuery.ChangeEvent) => {
      if (event.target.value === 'Disabled' && !bloodColorPicker.prop('disabled')) {
        bloodColorPicker.prop('disabled', true);
        bloodColorText.prop('disabled', true);
        bloodColorText.val('');
      } else if (bloodColorPicker.prop('disabled')) {
        bloodColorPicker.prop('disabled', false);
        bloodColorText.prop('disabled', false);
        if (data.selectedColor !== 'none') {
          bloodColorText.val(data.selectedColor);
        }
      }
    });

    bloodAttribute.on('change', async (event: JQuery.ChangeEvent) => {
      if (event.target.value === 'none') {
        if (BloodNGuts.system != null && BloodNGuts.system.supportedTypes.includes(actorType)) {
          // if this actorType is registered w the custom System then remove it.
          const index = BloodNGuts.system.supportedTypes.indexOf(actorType);
          BloodNGuts.system.customAttributePaths.splice(index, 1);
          BloodNGuts.system.supportedTypes.splice(index, 1);
        }
      } else {
        // if we do not have a custom system create one
        if (BloodNGuts.system == null)
          BloodNGuts.system = generateCustomSystem(game.system.id, actorType, event.target.value);
        else if (BloodNGuts.system.supportedTypes.includes(actorType)) {
          // if this actorType is already registered then update it
          BloodNGuts.system.customAttributePaths[BloodNGuts.system.supportedTypes.indexOf(actorType)] =
            event.target.value;
        } else {
          // if this actorType is not registered then do so
          BloodNGuts.system.supportedTypes.push(actorType);
          BloodNGuts.system.customAttributePaths.push(event.target.value);
        }
      }
      await game.settings.set(MODULE_ID, 'system', BloodNGuts.system);

      // wipe layer and history as it will conflict with new data
      await canvas.blood.wipeLayer(true);
      // then redraw the canvas to create SplatTokens
      await canvas.draw();
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
  BloodNGuts.registerLayer();

  // Assign custom classes and constants here
  BloodNGuts.initialize();

  if (Systems[game.system.id]) {
    BloodNGuts.system = Systems[game.system.id];
    log(LogLevel.INFO, 'loaded system', game.system.id);
  }

  // check whether we are on ForgeVTT to decide where to load data from.
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
  // load custom system from settings if possible
  if (BloodNGuts.system == null) {
    const sys = game.settings.get(MODULE_ID, 'system');
    if (sys) {
      log(LogLevel.INFO, 'custom system found');
      if (sys.id !== game.system.id)
        log(LogLevel.ERROR, 'saved custom system does not match current system!', sys.id, game.system.id);
      else if (sys.supportedTypes == null || sys.supportedTypes.length === 0)
        log(LogLevel.WARN, 'saved custom system has no supportedTypes!', sys);
      else {
        BloodNGuts.system = generateCustomSystem(sys.id, sys.supportedTypes, sys.customAttributePaths);
        ui.notifications.notify(`Blood 'n Guts - loaded custom system: ${game.system.id}`, 'info');
        log(LogLevel.INFO, 'loaded custom system', game.system.id);
        return;
      }
    }
    ui.notifications.notify(`Blood 'n Guts - no compatible system: ${game.system.id}`, 'warning');
    log(LogLevel.WARN, 'no compatible system found', game.system.id);
  } else ui.notifications.notify(`Blood 'n Guts - loaded compatible system: ${game.system.id}`, 'info');
});

Hooks.on('canvasReady', BloodNGuts.canvasReadyHandler);
Hooks.on('updateToken', BloodNGuts.updateTokenOrActorHandler);
Hooks.on('updateActor', (actor, changes) => {
  //changes.token are changes to the prototype?
  if (!canvas.scene.active || changes.token || changes.sort) return;
  // convert into same structure as token changes.
  if (changes.data) changes.actorData = { data: changes.data };
  const token = canvas.tokens.placeables.filter((t) => t.actor).find((t) => t.actor.id === actor.id);
  if (token) BloodNGuts.updateTokenOrActorHandler(canvas.scene, token.data, changes);
});

Hooks.on('deleteToken', BloodNGuts.deleteTokenHandler);
Hooks.on('renderTokenConfig', BloodNGuts.renderTokenConfigHandler);
Hooks.on('getUserContextOptions', BloodNGuts.getUserContextOptionsHandler);

Hooks.on('chatMessage', (_chatTab, commandString) => {
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

    if (
      !canvas.scene.active ||
      BloodNGuts.disabled ||
      !this.icon ||
      this._original?.data?._id ||
      !BloodNGuts.system ||
      !BloodNGuts.system.supportedTypes.includes(this.actor.data.type.toLowerCase())
    )
      return this; //no icon or dragging, or not supported
    let splatToken: SplatToken;

    if (BloodNGuts.splatTokens[this.id]) {
      splatToken = BloodNGuts.splatTokens[this.id];
      // if for some reason our mask is missing then recreate it
      if (splatToken.container.children.length === 0) {
        splatToken.container = new PIXI.Container();
        await BloodNGuts.splatTokens[this.id].createMask();
      }
    } else {
      splatToken = await new SplatToken(this).create();
      BloodNGuts.splatTokens[this.id] = splatToken;
      // if BnG is loading then we can presplat every TokenSplat in one go on canvasReady
      // otherwise it is an new token so we do it now.
      if (window.BloodNGuts != null) {
        splatToken.preSplat();
        canvas.blood.commitHistory();
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

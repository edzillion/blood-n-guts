/**
 * Documentation for Blood 'n Guts, a Foundry VTT module that adds blood splatter to your games.
 * All functionality is wrapped in it's main Class `BloodNGuts`.
 * @license [GNU GPLv3.0 & 'Commons Clause' License Condition v1.0]{@link https://github.com/edzillion/blood-n-guts/blob/master/LICENSE.md}
 * @packageDocumentation
 * @author [edzillion]{@link https://github.com/edzillion}
 */

import { getCanvas, registerSettings, violenceLevelChoices } from './module/settings';
import { log, LogLevel } from './module/logging';
import {
  getRandomGlyph,
  lookupTokenBloodColor,
  isFirstActiveGM,
  generateCustomSystem,
  replaceSelectChoices,
  isBnGUpdate,
  isGMPresent,
} from './module/helpers';
import { MODULE_ID } from './constants';
import SplatToken from './classes/SplatToken';
import BloodLayer from './classes/BloodLayer';
import * as splatFonts from './data/splatFonts';
import Systems from './data/systems';

//CONFIG.debug.hooks = true;
CONFIG[MODULE_ID] = { logLevel: 2 };

/**
 * Main class wrapper for all blood-n-guts features.
 * @class
 */
export class BloodNGuts {
  public static allFontsReady: Promise<boolean>;
  public static allFonts: Record<string, SplatFont>;
  public static splatTokens: Record<string, SplatToken>;
  public static disabled: boolean;
  public static getLatestActorHP: any;
  public static getLatestActorMaxHP: any;
  public static lookupCreatureType: any;
  public static system: System;
  public static sceneLoading: boolean;

  public static initialize(): void {
    log(LogLevel.INFO, `Initializing module ${MODULE_ID}`);
    BloodNGuts.splatTokens = {};
    BloodNGuts.disabled = false;
    BloodNGuts.sceneLoading = true;
  }

  // register this layer with Foundry
  public static registerLayer(): void {
    // ts-expect-error missing definition
    const layers = mergeObject(getCanvas().layers, {
      blood: BloodLayer,
    });
    // ts-expect-error missing definition
    Object.defineProperty(Canvas, 'layers', {
      get: function () {
        return layers;
      },
    });
  }

  /**
   * Wipes all scene and token splats. Optionally wipes flags too.
   * @category GMandPC
   * @param {boolean} save - whether to also wipe the scene flags.
   * @function
   */
  public static async wipeScene(save): Promise<void> {
    log(LogLevel.INFO, 'wipeScene');
    this.wipeTokenSplats();
    await getCanvas().blood.wipeBlood(save);
  }

  /**
   * Wipes all token splats from the current scene. Does not update flags.
   * @category GMandPC
   * @function
   */
  public static wipeTokenSplats(): void {
    log(LogLevel.INFO, 'wipeTokenSplats');
    for (const tokenId in BloodNGuts.splatTokens) {
      // wipe only tokens on the current scene
      if (BloodNGuts.splatTokens[tokenId].token.scene.id === getCanvas().scene.id){
        BloodNGuts.splatTokens[tokenId].wipe();
      }
    }
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
    font: SplatFont = BloodNGuts.allFonts[<string>game.settings.get(MODULE_ID, 'tokenSplatFont')],
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
  public static async updateTokenOrActorHandler(
    scene: Scene,
    tokenData: Record<string, any>,
    changes: Record<string, unknown>,
  ): Promise<void> {
    const fromDisabledScene = scene.getFlag(MODULE_ID, 'sceneViolenceLevel') === 'Disabled';
    if (fromDisabledScene || !isBnGUpdate(changes)) return;
    log(LogLevel.DEBUG, 'updateTokenOrActorHandler', changes);

    const tokenId = tokenData._id || tokenData.data._id;
    const splatToken = BloodNGuts.splatTokens[tokenId];

    //update rotation here so that splats can rotate on non-active scenes
    if (hasProperty(changes, 'rotation') || hasProperty(changes, 'lockRotation')) {
      splatToken.updateRotation(changes);
    }

    if (isFirstActiveGM()) {
      // remove custom settings from a SplatToken when unchecked
      if (hasProperty(changes, `flags.${MODULE_ID}.customBloodChecked`)) {
        if (!changes.flags[MODULE_ID].customBloodChecked) {
          await splatToken.wipeCustomSettings();
          return;
        }
      }

      // update token violence here to update disabled state
      if (hasProperty(changes, `flags.${MODULE_ID}.tokenViolenceLevel`)) {
        // changing away from a disabled state, re-enable SplatToken
        if (changes.flags[MODULE_ID].tokenViolenceLevel !== 'Disabled' && splatToken.disabled) {
          splatToken.disabled = false;
        }
        // changing to disabled
        else if (changes.flags[MODULE_ID].tokenViolenceLevel === 'Disabled') {
          splatToken.tokenSettings.tokenViolenceLevel = 'Disabled';
          await splatToken.reset();
          splatToken.disabled = true;
          return;
        }
      }
      // ts-expect-error bad defs
      if (scene.id === game.scenes.viewed.id && !splatToken.disabled) {
        splatToken.trackChanges(changes);
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
    // sync system violence level with scene
    if (isFirstActiveGM()) {
      const violenceLvl = getCanvas().scene.getFlag(MODULE_ID, 'sceneViolenceLevel');
      log(LogLevel.DEBUG, 'canvasReadyHandler, violence Level:', violenceLvl);
      if (violenceLvl != null) {
        BloodNGuts.disabled = violenceLvl === 'Disabled' ? true : false;
        game.settings.set(MODULE_ID, 'masterViolenceLevel', violenceLvl);
      }
    }

    // checking for active means that a non-active scene will not be preSplatted on
    // navigating to it. User can still activate scene to plesplat all tokens, and
    // tokens will be presplatted when added to the scene, damaged etc.
    if (!getCanvas().scene.active || BloodNGuts.disabled) return;
    log(LogLevel.INFO, 'canvasReady, active:', getCanvas().scene.name);

    if (!isGMPresent()) {
      BloodNGuts.disabled = true;
    } else if (isFirstActiveGM()) {
      for (const tokenId in BloodNGuts.splatTokens) {
        // ts-expect-error bad def
        if (BloodNGuts.splatTokens[tokenId].token.scene.active) BloodNGuts.splatTokens[tokenId].preSplat();
      }
      getCanvas().blood.commitHistory();
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
    if (!isFirstActiveGM()) return;
    //@ts-expect-error missing definition
    log(LogLevel.INFO, 'deleteTokenHandler', token._id);
    //@ts-expect-error missing definition
    if (BloodNGuts.splatTokens[token._id]) delete BloodNGuts.splatTokens[token._id];
    //@ts-expect-error missing definition
    getCanvas().blood.deleteMany(token._id);
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

    for (const levelName in <string[]>game.settings.get(MODULE_ID, 'violenceLevels')) {
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
      currentLevel: tokenConfig.object.getFlag(MODULE_ID, 'tokenViolenceLevel'),
      floorSplatFont: tokenConfig.object.getFlag(MODULE_ID, 'floorSplatFont'),
      tokenSplatFont: tokenConfig.object.getFlag(MODULE_ID, 'tokenSplatFont'),
      trailSplatFont: tokenConfig.object.getFlag(MODULE_ID, 'trailSplatFont'),
    };
    // add blank entry for empty font settings.
    data.fonts[''] = { name: '', availableGlyphs: [] };

    const insertHTML = await renderTemplate('modules/' + MODULE_ID + '/templates/token-config.html', data);
    imageTab.append(insertHTML);

    const selectViolenceLevel = imageTab.find('.token-config-select-violence-level');
    const customBloodCheckBox = imageTab.find('#customBloodCheckBox');

    const customBloodPanel = imageTab.find('#customBloodPanel');
    const bloodColorPicker = imageTab.find('#bloodColorPicker');
    const bloodColorText = imageTab.find('#bloodColorText');
    const bloodAttribute = imageTab.find('#bloodAttribute');
    const fontSelects = imageTab.find('.advanced-config-select-font');

    // if any custom settings are set on the token
    if (data.selectedColor || data.currentLevel || data.floorSplatFont || data.tokenSplatFont || data.trailSplatFont) {
      customBloodCheckBox.prop('checked', true);
      customBloodPanel.show();
    } else {
      customBloodCheckBox.prop('checked', false);
      customBloodPanel.hide();
    }

    // if (tokenConfig.object.getFlag(MODULE_ID, 'tokenViolenceLevel') === 'Disabled') {
    //   bloodColorPicker.prop('disabled', true);
    // }

    customBloodCheckBox.on('click', (event: JQuery.ClickEvent) => {
      if (event.target.checked) customBloodPanel.show();
      else customBloodPanel.hide();
      tokenConfig.setPosition({ height: 'auto' });
    });

    selectViolenceLevel.on('change', (event: JQuery.ChangeEvent) => {
      if (event.target.value === 'Disabled') {
        bloodColorPicker.prop('disabled', true);
        bloodColorText.prop('disabled', true);
        bloodColorText.val('');
        fontSelects.prop('disabled', true);
      } else {
        bloodColorPicker.prop('disabled', false);
        bloodColorText.prop('disabled', false);
        fontSelects.prop('disabled', false);
        if (data.selectedColor !== 'none') {
          bloodColorText.val(<string>data.selectedColor);
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
      await getCanvas().blood.wipeBlood(true);
      // then redraw the canvas to create SplatTokens
      await getCanvas().draw();
    });

    tokenConfig.setPosition({ height: 'auto' });
  }

  /**
   * Handler called when Game Settings window is opened. Injects custom form html.
   * @category GMOnly
   * @function
   * @param {SettingsConfig} settingsConfig
   * @param {JQuery} html
   */
  static renderSettingsConfigHandler(settingsConfig: SettingsConfig, html: JQuery): void {
    const selectViolenceLevel = html.find('select[name="blood-n-guts.masterViolenceLevel"]');

    replaceSelectChoices(
      selectViolenceLevel,
      violenceLevelChoices(<Record<string, ViolenceLevel>>game.settings.get(MODULE_ID, 'violenceLevels')),
    );

    // if GM has set this scene's violence level to Disabled then only show that
    // option to players
    if (!isFirstActiveGM() && getCanvas().scene.getFlag(MODULE_ID, 'sceneViolenceLevel') === 'Disabled') {
      selectViolenceLevel.val('Disabled');
      selectViolenceLevel.attr('disabled', 'disabled');
    } else {
      selectViolenceLevel.val(<string>game.settings.get(MODULE_ID, 'masterViolenceLevel'));
    }

    // inject warning message if relevant
    if (!isGMPresent()) {
      const moduleHeader = html.find('.module-header:contains("Blood \'n Guts")');
      $('<p style="color:red">Warning: Blood \'n Guts requires a GM to be active to function!</p>').insertAfter(
        moduleHeader,
      );
    }
  }

  /**
   * Handler called when user logs in/out. Used to make sure there is a GM online and disable if not.
   * @category GMOnly
   * @function
   */
  public static getUserContextOptionsHandler(): void {
    log(LogLevel.DEBUG, 'getUserContextOptions');
    if (!isGMPresent()) {
      BloodNGuts.disabled = true;
    } else if (BloodNGuts.disabled) {
      // user may have disabled BnG in settings, if not then enable.
      if (game.settings.get(MODULE_ID, 'masterViolenceLevel') !== 'Disabled') {
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

  // Register custom module settings
  registerSettings();

  for (const fontName in splatFonts.fonts) {
    const shorthand = '12px ' + fontName;
    (document as any).fonts.load(shorthand);
  }

  BloodNGuts.allFonts = splatFonts.fonts;
  BloodNGuts.allFontsReady = (document as any).fonts.ready;
});

Hooks.once('ready', () => {
  BloodNGuts.sceneLoading = false;
  window.BloodNGuts = BloodNGuts;
  Hooks.call('bloodNGutsReady');
});

Hooks.once('canvasInit', () => {
  if (isFirstActiveGM()) {
    // load custom system from settings if possible
    if (BloodNGuts.system == null) {
      const sys = <System>game.settings.get(MODULE_ID, 'system');
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
  }
});

Hooks.on('canvasReady', BloodNGuts.canvasReadyHandler);
Hooks.on('updateToken', BloodNGuts.updateTokenOrActorHandler);
Hooks.on('updateActor', (actor, changes) => {
  //changes.token are changes to the prototype?
  if (changes.token || changes.sort) return;
  // convert into same structure as token changes.
  if (changes.data) changes.actorData = { data: changes.data };
  const token = (<Canvas>getCanvas()).tokens.placeables.filter((t) => t.actor).find((t) => t.actor.id === actor.id);
  if (token) BloodNGuts.updateTokenOrActorHandler(getCanvas().scene, token.data, changes);
});

Hooks.on('deleteToken', BloodNGuts.deleteTokenHandler);
Hooks.on('renderTokenConfig', BloodNGuts.renderTokenConfigHandler);
Hooks.on('renderSettingsConfig', BloodNGuts.renderSettingsConfigHandler);
Hooks.on('getUserContextOptions', BloodNGuts.getUserContextOptionsHandler);

Hooks.on('chatMessage', (_chatTab, commandString) => {
  const commands = commandString.split(' ');
  if (commands[0] != '/blood') return;
  switch (commands[1]) {
    case 'clear':
      BloodNGuts.wipeScene(isFirstActiveGM());
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
      (!isFirstActiveGM() && game.settings.get(MODULE_ID, 'masterViolenceLevel') === 'Disabled') ||
      getCanvas().scene.getFlag(MODULE_ID, 'sceneViolenceLevel') === 'Disabled' ||
      !this.icon ||
      this._original?.data?._id ||
      !this.actor ||
      !BloodNGuts.system ||
      !BloodNGuts.system.supportedTypes.includes(this.actor.data.type.toLowerCase())
    ) {
      log(LogLevel.INFO, 'Token.draw() not creating SplatToken for', this.data.name);
      return this; //no icon or dragging, or not supported
    }
    let splatToken: SplatToken;

    if (BloodNGuts.splatTokens[this.id]) {
      splatToken = BloodNGuts.splatTokens[this.id];
      // if for some reason our mask is missing then recreate it
      // @ts-expect-error todo: find out why container is being destroyed
      if (!splatToken.disabled && (splatToken.container._destroyed || splatToken.container.children.length === 0)) {
        log(LogLevel.DEBUG, 'recreating container for', splatToken.token.data.name);
        splatToken.container = new PIXI.Container();
        await BloodNGuts.splatTokens[this.id].createMask();
      }
    } else {
      splatToken = await new SplatToken(this).create();
      BloodNGuts.splatTokens[this.id] = splatToken;
      // if BnG is loading then we can presplat every TokenSplat in one go on canvasReady
      // otherwise it is an new token so we do it now.
      if (isFirstActiveGM() && !BloodNGuts.sceneLoading && !splatToken.disabled) {
        splatToken.preSplat();
        getCanvas().blood.commitHistory();
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

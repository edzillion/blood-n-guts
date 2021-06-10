import { getCanvas, registerSettings, violenceLevelChoices } from '../module/settings';
import { log, LogLevel } from '../module/logging';
import {
  getRandomGlyph,
  lookupTokenBloodColor,
  isFirstActiveGM,
  generateCustomSystem,
  replaceSelectChoices,
  isBnGUpdate,
  isGMPresent,
} from '../module/helpers';
import { MODULE_ID } from '../constants';
import SplatToken from '../classes/SplatToken';
import BloodLayer from '../classes/BloodLayer';
import * as splatFonts from '../data/splatFonts';
import Systems from '../data/systems';
import { BloodNGuts } from '../blood-n-guts';

export let readyHooks = async () => {

    // setup all the hooks
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
  
    BloodNGuts.sceneLoading = false;
    window.BloodNGuts = BloodNGuts;
    Hooks.call('bloodNGutsReady');
  
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

    //@ts-ignore
    libWrapper.register(MODULE_ID, 'Token.prototype.draw', TokenPrototypeDrawHandler, 'MIXED');
    
    // Register custom sheets (if any)
  
  }
  
  export let setupHooks = () => {

  }
  
  
  
  export let initHooks = () => {
    console.log("Init Hooks processing");
    
  
  }

// TOKEN PROTOTYPE

const TokenPrototypeDrawHandler = async function (wrapped, ...args) {
    // const cached = Token.prototype.draw;
  
    // return async function () {
    //   await cached.apply(this);
  
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
        //return this; //no icon or dragging, or not supported
        return wrapped(...args);
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
        //return this;
        return wrapped(...args);
      }
    // };
  }
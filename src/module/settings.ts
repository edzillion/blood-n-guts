import { BnGAdvancedConfig } from '../classes/BnGAdvancedConfig.js';
import { MODULE_ID } from '../constants';
import { log, LogLevel } from './logging';

import * as bloodColorSettings from '../data/bloodColorSettings';
import * as violenceLevelSettings from '../data/violenceLevelSettings';
import { isFirstActiveGM } from './helpers.js';

/**
 * Because typescript doesn't know when in the lifecycle of foundry your code runs, we have to assume that the
 * canvas is potentially not yet initialized, so it's typed as declare let canvas: Canvas | {ready: false}.
 * That's why you get errors when you try to access properties on canvas other than ready.
 * In order to get around that, you need to type guard canvas.
 * Also be aware that this will become even more important in 0.8.x because no canvas mode is being introduced there.
 * So you will need to deal with the fact that there might not be an initialized canvas at any point in time.
 * @returns
 */
export function getCanvas(): any { // Should be Canvas
  if (!(canvas instanceof Canvas) || !canvas.ready) {
    throw new Error('Canvas Is Not Initialized');
  }
  return canvas;
}

/**
 * Registers settings.
 * @module Settings
 */

export const violenceLevelChoices = (violenceLevels: Record<string, ViolenceLevel>): Record<string, string> => {
  const choices = {};
  for (const level in violenceLevels) {
    choices[level] = level;
  }
  return choices;
};

/**
 * Register module settings.
 * @function
 */
export const registerSettings = (): void => {
  game.settings.register(MODULE_ID, 'useBloodColor', {
    name: 'Blood Color',
    hint: 'If unchecked all blood will be red',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: useBloodColor set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'halfHealthBloodied', {
    name: '50% Health = Bloodied',
    hint: 'Common house rule to show bleeding effects at 50% of max health',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: halfHealthBloodied set to ' + value);
      game.settings.set(MODULE_ID, 'healthThreshold', 0.5);
      game.settings.set(MODULE_ID, 'damageThreshold', 0);
    },
  });

  game.settings.register(MODULE_ID, 'system', {
    scope: 'world',
    config: false,
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: system set to ' + value);
    },
  });

  // Advanced Configuration
  game.settings.registerMenu(MODULE_ID, 'advancedConfig', {
    name: 'Advanced Config',
    label: 'Advanced Configuration',
    hint: 'Access advanced configuration menu to find additional options',
    icon: 'fas fa-desktop',
    type: BnGAdvancedConfig,
    restricted: true,
  });

  game.settings.register(MODULE_ID, 'floorSplatFont', {
    scope: 'world',
    config: false,
    type: String,
    default: 'splatter',
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: floorSplatFont set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'tokenSplatFont', {
    scope: 'world',
    config: false,
    type: String,
    default: 'splatter',
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: tokenSplatFont set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'trailSplatFont', {
    scope: 'world',
    config: false,
    type: String,
    default: 'WC Rhesus A Bta',
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: trailSplatFont set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'masterViolenceLevel', {
    name: game.i18n.localize('Master Violence Level'),
    hint: game.i18n.localize('Blood and gore level'),
    scope: 'client',
    config: true,
    type: String,
    choices: violenceLevelChoices(violenceLevelSettings.defaults),
    default: 'Kobold',
    onChange: (value) => {
      log(LogLevel.DEBUG, 'masterViolenceLevel set to:', value);
      if (isFirstActiveGM()) return getCanvas().scene.setFlag(MODULE_ID, 'sceneViolenceLevel', value);
      else if (getCanvas().scene.getFlag(MODULE_ID, 'sceneViolenceLevel') != 'Disabled') getCanvas().draw();
    },
  });

  game.settings.register(MODULE_ID, 'violenceLevels', {
    scope: 'world',
    config: false,
    default: violenceLevelSettings.defaults,
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: violenceLevels set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'bloodColors', {
    scope: 'world',
    config: false,
    default: bloodColorSettings.colors,
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: bloodColorSettings set to ' + value);
    },
  });
};

// Custom Settings

/**
 * Promise resolving after base token settings are generated
 * @function
 * @category GMOnly
 * @returns {Promise<any>} - promise resolving to token settings
 */
export const getBaseTokenSettings = async (token: Token): Promise<TokenSettings> => {
  let baseSettings: Partial<TokenSettings> = {};

  baseSettings.tokenViolenceLevel = <string>token.getFlag(MODULE_ID, 'masterViolenceLevel');
  if (baseSettings.tokenViolenceLevel) {
    if (game.settings.get(MODULE_ID, 'violenceLevels')[baseSettings.tokenViolenceLevel] == null) {
      log(LogLevel.WARN, 'getBaseTokenSettings, violenceLevel no longer exists', baseSettings.tokenViolenceLevel);
      token.unsetFlag(MODULE_ID, 'tokenViolenceLevel');
      delete baseSettings.tokenViolenceLevel;
    } else {
      baseSettings = Object.assign(
        baseSettings,
        game.settings.get(MODULE_ID, 'violenceLevels')[baseSettings.tokenViolenceLevel],
      );
    }
  }

  baseSettings.bloodColor = <string>token.getFlag(MODULE_ID, 'bloodColor');
  baseSettings.floorSplatFont = <string>token.getFlag(MODULE_ID, 'floorSplatFont');
  baseSettings.tokenSplatFont = <string>token.getFlag(MODULE_ID, 'tokenSplatFont');
  baseSettings.trailSplatFont = <string>token.getFlag(MODULE_ID, 'trailSplatFont');
  return <TokenSettings>baseSettings;
};

import { BnGAdvancedConfig } from '../classes/BnGAdvancedConfig.js';
import { MODULE_ID } from '../constants';
import { log, LogLevel } from './logging';

import * as bloodColorSettings from '../data/bloodColorSettings';
import * as violenceLevelSettings from '../data/violenceLevelSettings';
import { isFirstActiveGM } from './helpers.js';

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

  game.settings.register(MODULE_ID, 'currentViolenceLevel', {
    name: game.i18n.localize('Violence Level'),
    hint: game.i18n.localize('Blood and gore level'),
    scope: 'client',
    config: true,
    type: String,
    choices: violenceLevelChoices(violenceLevelSettings.defaults),
    default: 'Kobold',
    onChange: (value) => {
      log(LogLevel.DEBUG, 'violenceLevel set to:', value);
      if (isFirstActiveGM()) return canvas.scene.setFlag(MODULE_ID, 'violenceLevel', value);
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
 * Promise resolving after custom splat fonts are loaded from disk.
 * @function
 * @category GMOnly
 * @returns {Promise<any>} - promise resolving to only the custom splat fonts.
 */
export const getBaseTokenSettings = async (token: Token): Promise<TokenSettings> => {
  let baseSettings: Partial<TokenSettings> = {};

  baseSettings.violenceLevel = token.getFlag(MODULE_ID, 'currentViolenceLevel');
  if (baseSettings.violenceLevel) {
    if (game.settings.get(MODULE_ID, 'violenceLevels')[baseSettings.violenceLevel] == null) {
      log(LogLevel.WARN, 'getBaseTokenSettings, violenceLevel no longer exists', baseSettings.violenceLevel);
      token.unsetFlag(MODULE_ID, 'currentViolenceLevel');
      delete baseSettings.violenceLevel;
    } else {
      baseSettings = Object.assign(
        baseSettings,
        game.settings.get(MODULE_ID, 'violenceLevels')[baseSettings.violenceLevel],
      );
    }
  }

  baseSettings.bloodColor = token.getFlag(MODULE_ID, 'bloodColor');
  baseSettings.floorSplatFont = token.getFlag(MODULE_ID, 'floorSplatFont');
  baseSettings.tokenSplatFont = token.getFlag(MODULE_ID, 'tokenSplatFont');
  baseSettings.trailSplatFont = token.getFlag(MODULE_ID, 'trailSplatFont');
  return <TokenSettings>baseSettings;
};

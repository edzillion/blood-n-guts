import { AdvancedConfig } from './advancedConfig.js';
import { MODULE_ID } from '../constants';
import * as violenceLevelSettings from '../data/violenceLevelSettings';
import { log, LogLevel } from './logging';

/**
 * Registers settings.
 * @module Settings
 */

/**
 * Register module settings.
 * @function
 */
export const registerSettings = (): void => {
  game.settings.register(MODULE_ID, 'violenceLevel', {
    name: game.i18n.localize('Violence Level'),
    hint: game.i18n.localize('Blood and gore level'),

    scope: 'client',
    config: true,
    type: Number,
    choices: {
      0: 'Shrieker',
      1: 'Kobold',
      2: 'Ogre',
      3: 'Hecatoncheires',
    },
    default: 0,
    onChange: (value) => {
      // when violenceLevel is changed we load that violenceLevel from '../data/violenceLevelSettings'
      const violenceLevel = JSON.parse(JSON.stringify(violenceLevelSettings.level[value]));
      for (const key in violenceLevel) {
        game.settings.set(MODULE_ID, key, violenceLevel[key]);
      }
    },
  });

  game.settings.register(MODULE_ID, 'useBloodColor', {
    name: 'Blood Color',
    hint: 'If unchecked all blood will be red',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: useBloodColor set to ' + value);
    },
  });

  game.settings.registerMenu(MODULE_ID, 'advancedConfig', {
    name: 'Advanced Config',
    label: 'Advanced Configuration',
    hint: 'Access advanced configuration menu to find additional options',
    icon: 'fas fa-desktop',
    type: AdvancedConfig,
    restricted: true,
  });

  // Settings in Advanced Configuration
  game.settings.register(MODULE_ID, 'floorSplatFont', {
    scope: 'client',
    config: false,
    type: String,
    default: 'splatter',
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: floorSplatFont set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'tokenSplatFont', {
    scope: 'client',
    config: false,
    type: String,
    default: 'splatter',
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: tokenSplatFont set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'trailSplatFont', {
    scope: 'client',
    config: false,
    type: String,
    default: 'WC Rhesus A Bta',
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: trailSplatFont set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'floorSplatSize', {
    scope: 'client',
    config: false,
    type: Number,
    default: '150',
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: floorSplatSize set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'floorSplatDensity', {
    scope: 'client',
    config: false,
    type: Number,
    default: '1',
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: floorSplatDensity set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'tokenSplatSize', {
    scope: 'client',
    config: false,
    type: Number,
    default: '40',
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: tokenSplatSize set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'tokenSplatDensity', {
    scope: 'client',
    config: false,
    type: Number,
    default: '1',
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: tokenSplatDensity set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'trailSplatSize', {
    scope: 'client',
    config: false,
    type: Number,
    default: '30',
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: trailSplatSize set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'trailSplatDensity', {
    scope: 'client',
    config: false,
    type: Number,
    default: '3',
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: trailSplatDensity set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'splatSpread', {
    scope: 'client',
    config: false,
    type: Number,
    default: 0.8,
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: splatSpread set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'healthThreshold', {
    scope: 'client',
    config: false,
    type: Number,
    default: 1.0,
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: healthThreshold set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'damageThreshold', {
    scope: 'client',
    config: false,
    type: Number,
    default: 0.0,
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: damageThreshold set to ' + value);
    },
  });

  game.settings.register(MODULE_ID, 'sceneSplatPoolSize', {
    scope: 'client',
    config: false,
    type: Number,
    default: 100,
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: sceneSplatPoolSize set to ' + value);
    },
  });
};

import { AdvancedConfig } from './advancedConfig.js';
import { MODULE_ID } from '../constants';
import * as violenceLevelSettings from '../data/violenceLevelSettings';
import { log, LogLevel } from './logging';

export const registerSettings = (): void => {
  game.settings.register(MODULE_ID, 'violenceLevel', {
    name: game.i18n.localize('Violence Level'),
    hint: game.i18n.localize('Blood and gore level'),

    scope: 'client', // This specifies a client-stored setting
    config: true, // This specifies that the setting appears in the configuration view
    type: Number,
    choices: {
      // If choices are defined, the resulting setting will be a select menu
      0: 'Shrieker',
      1: 'Ogre',
      2: 'Hecatoncheires',
    },
    default: 0, // The default value for the setting
    onChange: (value) => {
      const violenceLevel = JSON.parse(JSON.stringify(violenceLevelSettings.level[value]));
      for (const key in violenceLevel) {
        game.settings.set(MODULE_ID, key, violenceLevel[key]);
      }
    },
  });

  game.settings.register('blood-n-guts', 'useBloodColor', {
    name: 'Blood Color',
    hint: 'If unchecked all blood will be red',
    scope: 'client', // This specifies a client-stored setting
    config: true, // This specifies that the setting appears in the configuration view
    type: Boolean,
    default: true, // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      log(LogLevel.DEBUG, 'Settings: useBloodColor set to ' + value);
    },
  });

  game.settings.registerMenu('blood-n-guts', 'advancedConfig', {
    name: 'Advanced Config',
    label: 'Advanced Configuration',
    hint: 'Access advanced configuration menu to find additional options',
    icon: 'fas fa-desktop',
    type: AdvancedConfig,
    restricted: true,
  });

  // Settings in Advanced Configuration
  game.settings.register('blood-n-guts', 'floorSplatFont', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: String,
    default: 'splatter', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      log(LogLevel.DEBUG, 'Settings: floorSplatFont set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'tokenSplatFont', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: String,
    default: 'splatter', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      log(LogLevel.DEBUG, 'Settings: tokenSplatFont set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'trailSplatFont', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: String,
    default: 'WC Rhesus A Bta', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      log(LogLevel.DEBUG, 'Settings: trailSplatFont set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'floorSplatSize', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: '150', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      log(LogLevel.DEBUG, 'Settings: floorSplatSize set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'floorSplatDensity', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: '1', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      log(LogLevel.DEBUG, 'Settings: floorSplatDensity set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'tokenSplatSize', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: '40', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      log(LogLevel.DEBUG, 'Settings: tokenSplatSize set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'tokenSplatDensity', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: '1', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      log(LogLevel.DEBUG, 'Settings: tokenSplatDensity set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'trailSplatSize', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: '30', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      log(LogLevel.DEBUG, 'Settings: trailSplatSize set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'trailSplatDensity', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: '3', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      log(LogLevel.DEBUG, 'Settings: trailSplatDensity set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'splatSpread', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: 0.8, // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      log(LogLevel.DEBUG, 'Settings: splatSpread set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'splatPoolSize', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: 100, // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      log(LogLevel.DEBUG, 'Settings: splatPoolSize set to ' + value);
    },
  });
};

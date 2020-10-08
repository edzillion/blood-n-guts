import { AdvancedConfig } from './advancedConfig.js';
import { MODULE_ID } from '../constants';
import * as violenceLevelSettings from '../data/violenceLevelSettings';

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
      console.log('on change');
      // A callback function which triggers when the setting is changed
      const violenceLevel = JSON.parse(JSON.stringify(violenceLevelSettings.level[value]));
      for (const key in violenceLevel) {
        console.log(key, violenceLevel[key]);
        game.settings.set(MODULE_ID, key, violenceLevel[key]);
      }
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
      console.log('Settings: floorSplatFont set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'tokenSplatFont', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: String,
    default: 'splatter', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      console.log('Settings: tokenSplatFont set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'trailSplatFont', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: String,
    default: 'WC Rhesus A Bta', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      console.log('Settings: trailSplatFont set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'floorSplatSize', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: '150', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      console.log('Settings: floorSplatSize set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'floorSplatDensity', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: '1', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      console.log('Settings: floorSplatDensity set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'tokenSplatSize', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: '40', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      console.log('Settings: tokenSplatSize set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'tokenSplatDensity', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: '1', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      console.log('Settings: tokenSplatDensity set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'trailSplatSize', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: '30', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      console.log('Settings: trailSplatSize set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'trailSplatDensity', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: '3', // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      console.log('Settings: trailSplatDensity set to ' + value);
    },
  });

  game.settings.register('blood-n-guts', 'splatSpread', {
    scope: 'client', // This specifies a client-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: Number,
    default: 0.8, // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      console.log('Settings: splatSpread set to ' + value);
    },
  });
};

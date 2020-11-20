import { AdvancedConfig } from './advancedConfig.js';
import { MODULE_ID } from '../constants';
import * as violenceLevelSettings from '../data/violenceLevelSettings';
import { log, LogLevel } from './logging';
import { BloodNGuts } from '../blood-n-guts.js';
//import { promises } from 'fs';
import * as path from 'path';

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
      0: 'Disabled',
      1: 'Shrieker',
      2: 'Kobold',
      3: 'Ogre',
      4: 'Dracolich',
      5: 'Hecatoncheires',
    },
    default: 0,
    onChange: (value) => {
      if (value === '0') {
        BloodNGuts.disabled = true;
        BloodNGuts.wipeSceneSplats();
        return;
      } else if (BloodNGuts.disabled) BloodNGuts.disabled = false;
      const level = value - 1;
      // when violenceLevel is changed we load that violenceLevel from '../data/violenceLevelSettings'
      const violenceLevel = JSON.parse(JSON.stringify(violenceLevelSettings.level[level]));
      for (const key in violenceLevel) {
        game.settings.set(MODULE_ID, key, violenceLevel[key]);
      }

      //if the scenePool has increased in size we need to repopulate it
      const s = duplicate(canvas.scene.getFlag(MODULE_ID, 'sceneSplats'));
      const t = BloodNGuts.getTrimmedSceneSplats(s);
      // trim to new ScenePool size and draw
      BloodNGuts.drawSceneSplats(t);
    },
  });

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
      // when violenceLevel is changed we load that violenceLevel from '../data/violenceLevelSettings'
      game.settings.set(MODULE_ID, 'healthThreshold', 0.51);
      game.settings.set(MODULE_ID, 'damageThreshold', 0);
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

  game.settings.register(MODULE_ID, 'deathMultiplier', {
    scope: 'client',
    config: false,
    type: Number,
    default: 2,
    onChange: (value) => {
      log(LogLevel.DEBUG, 'Settings: deathMultiplier set to ' + value);
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

export const mergeSettingsFiles = async (): Promise<any> => {
  const response = await fetch('/modules/' + MODULE_ID + '/module.json');
  debugger;
  const data = await response.json();
};

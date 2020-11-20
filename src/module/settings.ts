import { AdvancedConfig } from './advancedConfig.js';
import { MODULE_ID } from '../constants';
import * as violenceLevelSettings from '../data/violenceLevelSettings';
import { log, LogLevel } from './logging';
import { BloodNGuts } from '../blood-n-guts.js';

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

let splatFontResolved;

export const splatFontsReady = new Promise((resolve, reject) => {
  splatFontResolved = resolve;
});

export const mergeSettingsFiles = async (): Promise<any> => {
  const settingsFileContents = [];
  let settingsFilePaths: string[] = [];
  let customFileNames: string[] = [];
  let filesToMerge: string[] = [];

  await FilePicker.browse('data', 'modules/' + MODULE_ID + '/data/*')
    .then((res) => {
      settingsFilePaths = res.files;
      const files = res.files.map((fullPath) => {
        return fullPath.slice(fullPath.lastIndexOf('/') + 1);
      });
      customFileNames = files
        .filter((filename) => filename.slice(-4) === 'json')
        .map((filename) => {
          return 'custom' + filename[0].toUpperCase() + filename.slice(1);
        });
    })
    .catch((err) => {
      log(LogLevel.ERROR, 'mergeSettingsFiles', err);
    });

  for (let i = 0; i < settingsFilePaths.length; i++) {
    const filePath = settingsFilePaths[i];
    const response = await fetch(filePath);
    try {
      const json = await response.json();
      const filename = response.url.slice(response.url.lastIndexOf('/') + 1);
      settingsFileContents[filename] = json;
    } catch (err) {
      log(LogLevel.ERROR, 'mergeSettingsFiles', err);
    }
  }

  // create folder if missing
  await FilePicker.createDirectory('data', MODULE_ID, {})
    .then((result) => {
      log(LogLevel.INFO, `Creating ${result}`);
    })
    .catch((err) => {
      if (!err.includes('EEXIST')) {
        log(LogLevel.ERROR, 'mergeSettingsFiles', err);
      }
    });

  await FilePicker.browse('data', MODULE_ID + '/*', {})
    .then((res) => {
      const extantFiles = res.files.map((fullPath) => fullPath.slice(fullPath.lastIndexOf('/') + 1));
      const filesToCreate = customFileNames.filter((filename) => !extantFiles.includes(filename));
      filesToCreate.forEach((filename) => {
        const file = new File(['{}'], filename);
        FilePicker.upload('data', MODULE_ID + '/', file, {});
      });
      filesToMerge = customFileNames.filter((filename) => !filesToCreate.includes(filename));
    })
    .catch((err) => {
      log(LogLevel.ERROR, 'mergeSettingsFiles', err);
    });

  for (let i = 0; i < filesToMerge.length; i++) {
    const filename = filesToMerge[i];
    const origFilename = filename.slice('custom'.length)[0].toLowerCase() + filename.slice('custom'.length + 1);
    const path = MODULE_ID + '/' + filename;
    const response = await fetch(path);
    try {
      const customSettingsJSON = await response.json();
      Object.assign(settingsFileContents[origFilename], customSettingsJSON);
    } catch (err) {
      log(LogLevel.ERROR, 'mergeSettingsFiles', err);
    }
  }

  splatFontResolved(settingsFileContents['splatFonts.json']);
};

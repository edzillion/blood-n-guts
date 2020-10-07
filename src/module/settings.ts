import { AdvancedConfig } from './advancedConfig.js';

export const registerSettings = function () {
  game.settings.register('blood-n-guts', 'violenceLevel', {
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
      // A callback function which triggers when the setting is changed
      console.log('Settings: violence-level set to ' + value);
    },
  });

  game.settings.registerMenu('blood-n-guts', 'config', {
    name: 'Advanced Config',
    label: 'Advanced Configuration',
    hint: 'Access advanced configuration menu to find additional options',
    icon: 'fas fa-desktop',
    type: AdvancedConfig,
    restricted: true,
  });
};

import { AdvancedConfig } from "./advancedConfig.js";
export const registerSettings = function () {
    game.settings.register('blood-n-guts', 'violenceLevel', {
        name: game.i18n.localize('Violence Level'),
        hint: game.i18n.localize('Blood and gore level'),
        scope: "client",
        config: true,
        type: Number,
        choices: {
            0: "Shrieker",
            1: "Ogre",
            2: "Hecatoncheires"
        },
        default: 0,
        onChange: value => {
            console.log('Settings: violence-level set to ' + value);
        }
    });
    game.settings.registerMenu("blood-n-guts", "config", {
        name: "Advanced Config",
        label: "Advanced Configuration",
        hint: "Access advanced configuration menu to find additional options",
        icon: "fas fa-desktop",
        type: AdvancedConfig,
        restricted: true,
    });
};

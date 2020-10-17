import { log, LogLevel } from './logging';
import { MODULE_ID } from '../constants';
import * as violenceLevelSettings from '../data/violenceLevelSettings';
import * as splatFonts from '../data/splatFonts';

let activeScene;

/**
 * FormApplication window for advanced configuration options.
 * @class
 */
export class AdvancedConfig extends FormApplication {
  font: SplatFont;
  allAsciiCharacters: string;

  constructor(object: any, options?: FormApplicationOptions) {
    super(object, options);
    game.settings.sheet.close();
    game.users.apps.push(this);
    if (canvas.scene.active) activeScene = canvas.scene;
  }

  static get defaultOptions(): FormApplicationOptions {
    const options = super.defaultOptions;
    options.title = 'Configure Blood n Guts Advanced Settings';
    options.id = MODULE_ID;
    options.template = 'modules/blood-n-guts/templates/advanced-config.html';
    options.closeOnSubmit = true;
    options.popOut = true;
    options.width = 600;
    options.height = 'auto';
    return options;
  }

  async getData(options) {
    // todo: sort out this permissions stuff
    // const canConfigure = game.user.can('SETTINGS_MODIFY');

    const dataObject = {};
    const level = game.settings.get(MODULE_ID, 'violenceLevel');
    const violenceLevel = violenceLevelSettings.level[level];
    for (const key in violenceLevel) {
      dataObject[key] = game.settings.get(MODULE_ID, key);
    }
    dataObject['fonts'] = splatFonts.fonts;
    dataObject['floorSplatFont'] = game.settings.get(MODULE_ID, 'floorSplatFont');
    dataObject['tokenSplatFont'] = game.settings.get(MODULE_ID, 'tokenSplatFont');
    dataObject['trailSplatFont'] = game.settings.get(MODULE_ID, 'trailSplatFont');
    return dataObject;
  }

  render(force, context = {}) {
    return super.render(force, context);
  }

  activateListeners(html) {
    super.activateListeners(html);

    const wipeButton = html.find('.advanced-config-wipe-pool');
    wipeButton.click((e) => {
      log(LogLevel.INFO, 'wipeButton: wiping sceneSplatPool');
      activeScene.setFlag(MODULE_ID, 'sceneSplatPool', null);
      globalThis.sceneSplatPool.forEach((poolObj) => {
        poolObj.splatContainer.destroy();
      });
      globalThis.sceneSplatPool = [];
      this.close();
    });
  }

  async _updateObject(event, formData) {
    for (const setting in formData) {
      game.settings.set(MODULE_ID, setting, formData[setting]);
    }
    return;
  }
}

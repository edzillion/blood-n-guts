import { log, LogLevel } from './logging';
import { MODULE_ID } from '../constants';
import * as violenceLevelSettings from '../data/violenceLevelSettings';
import * as splatFonts from '../data/splatFonts';

/**
 * FormApplication window for advanced configuration options.
 * @class
 * @extends FormApplication
 */
export class AdvancedConfig extends FormApplication {
  font: SplatFont;
  allAsciiCharacters: string;

  constructor(object: any, options?: FormApplicationOptions) {
    super(object, options);
    game.settings.sheet.close();
    game.users.apps.push(this);
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

  async getData(): Promise<any> {
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

  render(force: any, context = {}): any {
    return super.render(force, context);
  }

  activateListeners(html: any): any {
    super.activateListeners(html);

    const wipeButton = html.find('.advanced-config-wipe-scene-splats');
    if (canvas.scene.active) {
      wipeButton.click(() => {
        log(LogLevel.INFO, 'wipeButton: wiping sceneSplatPool');
        canvas.scene.setFlag(MODULE_ID, 'sceneSplatPool', null);
        globalThis.sceneSplatPool.forEach((poolObj) => {
          poolObj.splatContainer.destroy();
        });
        globalThis.sceneSplatPool = [];
        this.close();
      });
    } else wipeButton.attr('disabled', true);
  }

  async _updateObject(event: Event, formData: any): Promise<void> {
    for (const setting in formData) {
      game.settings.set(MODULE_ID, setting, formData[setting]);
    }
  }
}

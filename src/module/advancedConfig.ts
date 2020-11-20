import { log, LogLevel } from './logging';
import { MODULE_ID } from '../constants';
import { BloodNGuts } from '../blood-n-guts';
import { getRGBA } from './helpers';
import { getMergedViolenceLevelSettings } from './settings';

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
    const dataObject = {};
    const level = game.settings.get(MODULE_ID, 'violenceLevel');
    const mergedViolenceLevels = await getMergedViolenceLevelSettings;
    const violenceLevel = mergedViolenceLevels[level];
    for (const key in violenceLevel) {
      dataObject[key] = game.settings.get(MODULE_ID, key);
    }
    dataObject['fonts'] = BloodNGuts.allFonts;
    dataObject['floorSplatFont'] = game.settings.get(MODULE_ID, 'floorSplatFont');
    dataObject['tokenSplatFont'] = game.settings.get(MODULE_ID, 'tokenSplatFont');
    dataObject['trailSplatFont'] = game.settings.get(MODULE_ID, 'trailSplatFont');
    return dataObject;
  }

  render(force: any, context = {}): any {
    return super.render(force, context);
  }

  activateListeners(html: JQuery): any {
    super.activateListeners(html);
    const wipeButton = html.find('.advanced-config-wipe-scene-splats');
    if (canvas.scene.active) {
      wipeButton.click(() => {
        log(LogLevel.DEBUG, 'wipeButton: BloodNGuts.wipeSceneFlags()');
        BloodNGuts.wipeSceneFlags();
        $('.splat-container').remove();
      });
    } else wipeButton.attr('disabled', 'true');

    const splatButton = html.find('.advanced-config-splat-window');
    const appWindow = html.closest('.app.window-app.form#blood-n-guts');
    splatButton.click(() => {
      log(LogLevel.DEBUG, 'splatButton: BloodNGuts.wipeSceneFlags()');
      BloodNGuts.drawDOMSplats(
        appWindow[0],
        BloodNGuts.allFonts[game.settings.get(MODULE_ID, 'tokenSplatFont')],
        250,
        4,
        getRGBA('blood'),
      );
    });
  }

  async _updateObject(_event: Event, formData: any): Promise<void> {
    for (const setting in formData) {
      game.settings.set(MODULE_ID, setting, formData[setting]);
    }
  }
}

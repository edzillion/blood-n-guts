import { log, LogLevel } from '../module/logging';
import { MODULE_ID } from '../constants';
import { BloodNGuts } from '../blood-n-guts';
import { getHexColor } from '../module/helpers';
import { getMergedViolenceLevels } from '../module/settings';

/**
 * FormApplication window for advanced configuration options.
 * @class
 * @extends FormApplication
 */
export class AdvancedConfig extends FormApplication {
  font: SplatFont;
  allAsciiCharacters: string;
  mergedViolenceLevels: Record<string, ViolenceLevel>;
  baseViolenceLevel: string;
  dataObject: Record<string, unknown>;
  violenceLevelHTML: JQuery;

  constructor(object: Record<string, unknown>, options?: FormApplicationOptions) {
    super(object, options);
    game.settings.sheet.close();
    game.users.apps.push(this);
    this.dataObject = {};
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

  async getData(): Promise<Record<string, unknown>> {
    this.dataObject['violenceLevel'] = this.baseViolenceLevel = game.settings.get(MODULE_ID, 'violenceLevel');
    this.mergedViolenceLevels = await getMergedViolenceLevels;
    // we use 'Disabled' here only to iterate the obj keys
    for (const key in this.mergedViolenceLevels['Disabled']) {
      this.dataObject[key] = game.settings.get(MODULE_ID, key);
    }
    this.dataObject['fonts'] = BloodNGuts.allFonts;
    this.dataObject['floorSplatFont'] = game.settings.get(MODULE_ID, 'floorSplatFont');
    this.dataObject['tokenSplatFont'] = game.settings.get(MODULE_ID, 'tokenSplatFont');
    this.dataObject['trailSplatFont'] = game.settings.get(MODULE_ID, 'trailSplatFont');

    if (this.baseViolenceLevel === 'Custom') this.dataObject['sceneName'] = '{' + canvas.scene.name + '}';
    return this.dataObject;
  }

  render(force: boolean, context = {}): Application {
    return super.render(force, context);
  }

  activateListeners(html: JQuery): void {
    super.activateListeners(html);
    const wipeButton = html.find('.advanced-config-wipe-scene-splats');
    if (canvas.scene.active) {
      wipeButton.click(() => {
        log(LogLevel.DEBUG, 'wipeButton: BloodNGuts.wipeAllFlags()');
        BloodNGuts.wipeAllFlags();
        $('.splat-container').remove();
      });
    } else wipeButton.attr('disabled', 'true');

    const splatButton = html.find('.advanced-config-splat-window');
    const appWindow = html.closest('.app.window-app.form#blood-n-guts');
    splatButton.click(() => {
      log(LogLevel.DEBUG, 'splatButton: BloodNGuts.drawDOMSplats()');
      BloodNGuts.drawDOMSplats(
        appWindow[0],
        BloodNGuts.allFonts[game.settings.get(MODULE_ID, 'tokenSplatFont')],
        250,
        4,
        getHexColor('blood'),
      );
    });

    this.violenceLevelHTML = html.find('#violenceLevel');

    // add change handlers to detect changes from base violence Level
    const settingsFields = html.find('input[type=number]');
    settingsFields.on('input', (event: JQuery.ChangeEvent) => {
      this.dataObject[event.target.name] = event.target.value;
      this.dataObject['violenceLevel'] = 'Custom';
      this.violenceLevelHTML.text('Violence Level: Custom {' + canvas.scene.name + '}');
    });
  }

  async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
    for (const setting in formData) {
      game.settings.set(MODULE_ID, setting, formData[setting]);
    }
    game.settings.set(MODULE_ID, 'violenceLevel', this.dataObject['violenceLevel']);
    if (!canvas.scene.active)
      ui.notifications.notify(`Note: Blood 'n Guts does not work on non-active scenes!`, 'warning');
  }
}

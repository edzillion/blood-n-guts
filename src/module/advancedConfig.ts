import { log, LogLevel } from './logging';
import { MODULE_ID } from '../constants';

export class AdvancedConfig extends FormApplication {
  font: SplatFont;
  allAsciiCharacters: string;

  constructor(object: any, options?: FormApplicationOptions) {
    super(object, options);
    console.log(object, options);
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

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async getData() {}

  render(force, context = {}) {
    return super.render(force, context);
  }

  activateListeners(html) {
    super.activateListeners(html);

    // pre-select font dropdowns & add change listener
    const selects = html.find('.advanced-config-select-font');
    for (let i = 0; i < selects.length; i++) {
      for (let j = 0; j < selects[i].options.length; j++) {
        if (selects[i].options[j].value === game.settings.get(MODULE_ID, selects[i].name)) {
          selects[i].selectedIndex = j;
          break;
        }
      }
    }
    // pre-fill font size, density inputs
    const inputs = html.find('.advanced-config-font-details');
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].value = game.settings.get(MODULE_ID, inputs[i].name);
    }
  }

  async _updateObject(event, formData) {
    console.log(event, formData);
    for (const setting in formData) {
      game.settings.set(MODULE_ID, setting, formData[setting]);
    }
    return;
  }
}

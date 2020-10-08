import { log, LogLevel } from './logging';
import { MODULE_ID } from '../constants';

export class AdvancedConfig extends FormApplication {
  font: SplatFont;
  allAsciiCharacters: string;

  constructor(object: any, options?: FormApplicationOptions) {
    super(object, options);
    game.users.apps.push(this);
    //this.activities = game.settings.get("blood-n-guts", "activities");
    const allAsciiCharacters = Array.from(Array(127).keys())
      .slice(32)
      .map((a) => String.fromCharCode(a));
    console.log(allAsciiCharacters);
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

  async getData() {
    // const activities = this.activities;
    // return {
    //   activities,
    // };
  }

  render(force, context = {}) {
    return super.render(force, context);
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('.advanced-config-submit').click((event) => {
      return this.updateAdvancedSettings(html, event);
    });

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

  updateAdvancedSettings(html, event): void {
    const tags = html.find('.advanced-config-select-font, .advanced-config-font-details');
    log(LogLevel.DEBUG, 'updateSetting saving: ', event);
    for (let i = 0; i < tags.length; i++) {
      console.log(tags[i].name, tags[i].value);
      game.settings.set(MODULE_ID, tags[i].name, tags[i].value);
    }
  }

  async _updateObject(event, formData) {
    return;
  }
}

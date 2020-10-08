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
    console.log(globalThis.bngConfig);
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
    console.log('activateListeners', globalThis.bngConfig);
    // pre-select font dropdowns & add change listener
    const selects = html.find('.select-blood-n-guts-font');
    console.log('selects', selects);
    for (let i = 0; i < selects.length; i++) {
      selects[i].addEventListener('change', (event) => {
        return this.updateSetting(selects[i].name, event);
      });
      for (let j = 0; j < selects[i].options.length; j++) {
        console.log(j, selects[i].options[j].value, globalThis.bngConfig[selects[i].name].name);
        if (selects[i].options[j].value === globalThis.bngConfig[selects[i].name].name) {
          console.log(selects[i], 'selectedIndex' + j);
          selects[i].selectedIndex = j;
          break;
        }
      }
    }
    // pre-fill font size, density inputs
    const inputs = html.find('input-blood-n-guts-font-details');
    console.log('inputs', inputs);
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].change((event) => this.updateSetting(inputs[i].name, event));
      inputs[i].value === globalThis.bngConfig[inputs[i].name];
    }
  }

  updateSetting(name: string, event): void {
    log(LogLevel.DEBUG, 'updateSetting saving: ', name, event);
    globalThis.bngConfig[name] = event.target.value;
    game.settings.set(MODULE_ID, name, event.target.value);
  }

  async _updateObject(event, formData) {
    return;
  }
}

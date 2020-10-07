import { MODULE_ID } from '../blood-n-guts';

interface Font {
  name: string;
  size: number;
  availableGlyphs: Array<string>;
}

export class AdvancedConfig extends FormApplication {
  font: Font;
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

    const selector = html.find('.form-group');
    console.log(selector);
    selector.change((event) => this.changeFontDisplayed(event));
  }

  changeFontDisplayed(event) {
    // Set up some variables
    console.log(event);
    this.font.name = event.target.value;
  }

  async _updateObject(event, formData) {
    return;
  }
}

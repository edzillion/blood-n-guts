interface Font {
  name: string;
  size: number;
  availableGlyphs: Array<string>;  
}

export class AdvancedConfig extends FormApplication {

  font:Font;
  allAsciiCharacters:String;

  constructor(...args) {
    // @ts-ignore
    super(...args);
    game.users.apps.push(this);
    // @ts-ignore
    //this.activities = game.settings.get("blood-n-guts", "activities");
    let allAsciiCharacters = Array.from(Array(127).keys()).slice(32).map(a => String.fromCharCode(a));
    console.log(allAsciiCharacters);
  }

  
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.title = "Configure Blood n Guts Advanced Settings";
    options.id = "blood-n-guts";
    options.template = "modules/blood-n-guts/templates/advanced-config.html";
    options.closeOnSubmit = true;
    options.popOut = true;
    options.width = 600;
    options.height = "auto";
    return options;
  }

  async getData() {
    // @ts-ignore
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
    
    let selector = html.find(".select-blood-n-guts-font");
    selector.change((event) => this.changeFontDisplayed(event));
  }

  changeFontDisplayed(event) {
        // Set up some variables
    console.log(event)
    this.font.name = event.target.value;    
  }

  async _updateObject(event, formData) {
    return;
  }
}
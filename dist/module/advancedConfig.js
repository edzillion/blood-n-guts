var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class AdvancedConfig extends FormApplication {
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
    getData() {
        return __awaiter(this, void 0, void 0, function* () {
            // @ts-ignore
            // const activities = this.activities;
            // return {
            //   activities,
            // };
        });
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
        console.log(event);
        this.font.name = event.target.value;
    }
    _updateObject(event, formData) {
        return __awaiter(this, void 0, void 0, function* () {
            return;
        });
    }
}

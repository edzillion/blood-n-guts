import { getMergedViolenceLevels } from '../module/settings';
import { MODULE_ID } from '../constants';
import * as violenceLevelSettings from '../data/violenceLevelSettings';

export default class ViolenceConfig extends FormApplication {
  dataObject: Record<string, unknown>;
  violenceLevels: Record<string, ViolenceLevel | Partial<ViolenceLevel>>;
  currentViolenceSettings: ViolenceLevel | any;
  selectedLevel: string;
  inputMode: boolean;

  constructor(object: Record<string, unknown>, options?: FormApplicationOptions) {
    super(object, options);

    this.violenceLevels = duplicate(violenceLevelSettings.defaults);
    this.inputMode = false;

    const preset = game.settings.get(MODULE_ID, 'violenceLevel');
    if (preset === 'Disabled') this.selectedLevel === 'Kobold';
    else this.selectedLevel = preset;

    this.dataObject = {
      preset: this.selectedLevel,
      choices: {
        Shrieker: 'blood-n-guts.violence-levels.choices.Shrieker',
        Kobold: 'blood-n-guts.violence-levels.choices.Kobold',
        Ogre: 'blood-n-guts.violence-levels.choices.Ogre',
        Dracolich: 'blood-n-guts.violence-levels.choices.Dracolich',
        Hecatoncheires: 'blood-n-guts.violence-levels.choices.Hecatoncheires',
        New: 'blood-n-guts.violence-levels.choices.New',
      },
      button1: 'blood-n-guts.violence-config.button.Update',
      button1Disabled: 'disabled',
      button2: 'blood-n-guts.violence-config.button.Reset',
      button2Disabled: 'disabled',
      button3: 'blood-n-guts.violence-config.button.Submit',
      violence: {},
    };
  }

  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ['form'],
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: true,
      popOut: true,
      editable: game.user.isGM,
      width: 350,
      template: 'modules/blood-n-guts/templates/violence-config.html',
      id: 'violence-config',
      title: "Blood 'n Guts Violence Settings",
    });
  }

  /* -------------------------------------------- */

  /**
   * Obtain settings data and return to the FormApplication
   * @category Foundry
   * @function
   * @async
   * @returns {BrushSettings} - The data provided to the template when rendering the form
   * @override
   * @see {FormApplication#getData}
   */
  async getData(): Promise<Record<string, unknown>> {
    // Return data to the template

    if (this.inputMode) {
      this.currentViolenceSettings = this.violenceLevels['New'] ? this.violenceLevels['New'] : {};
      this.dataObject.button1 = 'blood-n-guts.violence-config.button.Save';
      this.dataObject.button2 = 'blood-n-guts.violence-config.button.Delete';
      this.dataObject.nameInputDisabled = '';
      this.dataObject.name = '';
    } else {
      this.dataObject.button1 = 'blood-n-guts.violence-config.button.Update';
      this.dataObject.button2 = 'blood-n-guts.violence-config.button.Reset';
      this.dataObject.nameInputDisabled = 'disabled';
      this.dataObject.name = this.selectedLevel;
    }

    this.dataObject.preset = this.selectedLevel;
    this.dataObject.violence = this.currentViolenceSettings;
    return this.dataObject;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Activate listeners on the form.
   * @category Foundry
   * @function
   * @param {JQuery} html - the form html
   * @override
   * @see {FormApplication#activateListeners}
   */
  activateListeners(html: JQuery): void {
    super.activateListeners(html);

    const form: HTMLFormElement = document.querySelector('form#violenceConfigForm');
    const nameInput = html.find('input#name');
    const presetSelect = html.find('select#preset');
    const formFields = html.find('input[type=number]');

    const button1 = html.find('button#button1');
    const button2 = html.find('button#button2');

    // // add change handlers to detect changes from base violence Level
    // const settingsFields = html.find('input[type=number]');
    presetSelect.on('change', async (event: JQuery.ChangeEvent) => {
      this.selectedLevel = event.target.value;
      this.currentViolenceSettings = duplicate(this.violenceLevels[this.selectedLevel]);

      // compare these settings to defaults
      if (
        JSON.stringify(this.currentViolenceSettings) !==
        JSON.stringify(violenceLevelSettings.defaults[this.selectedLevel])
      )
        this.dataObject.button2Disabled = '';
      else this.dataObject.button2Disabled = 'disabled';

      this.inputMode = event.target.value === 'New';

      this.render();
    });

    formFields.on('change', (event: JQuery.ChangeEvent) => {
      // if (!this.violenceLevels[this.selectedLevel]) this.violenceLevels[this.selectedLevel] = {};
      // this.violenceLevels[this.selectedLevel][event.target.id] = Number(event.target.value);

      this.currentViolenceSettings[event.target.id] = Number(event.target.value);

      // if current settings are unchanged from default
      if (
        JSON.stringify(this.currentViolenceSettings) ===
        JSON.stringify(violenceLevelSettings.defaults[this.selectedLevel])
      ) {
        // make the save and reset button disabled
        button1.prop('disabled', true);
        button2.prop('disabled', true);
      } else if (form.checkValidity()) {
        button1.prop('disabled', false);
        button2.prop('disabled', false);
      }
      // this.currentViolenceSettings[event.target.id] = event.target.value;
      // if (this.selectedLevel !== 'New')
      //   if (JSON.stringify(this.violenceLevels[this.selectedLevel]) === JSON.stringify(this.currentViolenceSettings))
      //     button1.prop('disabled', true);
      //   else button1.prop('disabled', false);
    });

    button1.click((e) => {
      //save to flags
      // for (const key in this.violenceLevels[this.selectedLevel]) {
      //   game.settings.set(MODULE_ID, key, this.currentViolenceSettings[key]);
      // }
      if (!form.checkValidity()) return;
      const customLevelName = nameInput.val() as string;
      //Add to levels
      this.violenceLevels[customLevelName] = this.currentViolenceSettings;
      //set current level
      this.selectedLevel = customLevelName;

      // need to make the reset button active
      button2.prop('disabled', false);
      // render
      //this.render();
    });

    // reset or delete button
    button2.click((e) => {
      if (!this.inputMode) this.currentViolenceSettings = duplicate(violenceLevelSettings.defaults[this.selectedLevel]);
      else {
        this.selectedLevel = 'Shrieker';
        this.currentViolenceSettings = this.violenceLevels[this.selectedLevel];
        this.inputMode = false;
      }
      this.render();
    });

    // resetButton.click(() => {
    //   Object.keys(canvas.blood.brushSettings).forEach(async (name: string) => {
    //     await canvas.scene.unsetFlag(MODULE_ID, name);
    //     canvas.blood.brushSettings = duplicate(canvas.blood.DEFAULTS_BRUSHSETTINGS);
    //   });
    //   this.render();
    // });
  }

  /**
   * This method is called upon form submission after form data is validated.
   * @category Foundry
   * @function
   * @async
   * @param {SubmitEvent} event - The initial triggering submission event
   * @param {BrushSettings} formData - The object of validated form data with which to update the object
   * @override
   * @see {FormApplication#_updateObject}
   */
  async _updateObject(event: SubmitEvent, formData: BrushSettings): Promise<void> {
    debugger;
    return;
  }
}

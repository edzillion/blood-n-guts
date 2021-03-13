import { getMergedViolenceLevels } from '../module/settings';
import { MODULE_ID } from '../constants';

export default class ViolenceConfig extends FormApplication {
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
  async getData(): any {
    // Return data to the template
    const choices = {};
    const violenceLevels: Record<string, ViolenceLevel> = await getMergedViolenceLevels;
    for (const levelName in violenceLevels) {
      choices[levelName] = levelName;
    }

    // getMergedViolenceLevels.then((mergedViolenceLevels: Record<string, ViolenceLevel>) => {
    //   const violenceLevelChoices = {};
    //   for (const level in mergedViolenceLevels) {
    //     violenceLevelChoices[level] = level;
    //   }

    const preset = game.settings.get(MODULE_ID, 'violenceLevel');
    if (preset === 'Disabled') preset === 'Kobold';

    const data = {
      preset: preset,
      choices: {
        Shrieker: 'blood-n-guts.violence-levels.choices.Shrieker',
        Kobold: 'blood-n-guts.violence-levels.choices.Kobold',
        Ogre: 'blood-n-guts.violence-levels.choices.Ogre',
        Dracolich: 'blood-n-guts.violence-levels.choices.Dracolich',
        Hecatoncheires: 'blood-n-guts.violence-levels.choices.Hecatoncheires',
        New: 'blood-n-guts.violence-levels.choices.New',
      },
      button1: 'blood-n-guts.violence-config.button.Update',
      button2: 'blood-n-guts.violence-config.button.Reset',
      button3: 'blood-n-guts.violence-config.button.Submit',
    };
    for (const [key, val] of Object.entries(violenceLevels[preset])) {
      data[key] = val;
    }
    return data;
    //});
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

    const presetSelect = html.find('select#preset');

    // // add change handlers to detect changes from base violence Level
    // const settingsFields = html.find('input[type=number]');
    presetSelect.on('input', (event: JQuery.ChangeEvent) => {
      if (event.target.value === 'New') {
        debugger;
      }
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
  }
}

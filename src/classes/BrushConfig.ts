import { MODULE_ID } from '../constants';

export default class BrushConfig extends FormApplication {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ['form'],
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: true,
      popOut: true,
      editable: game.user.isGM,
      width: 500,
      template: 'modules/blood-n-guts/templates/brush-config.html',
      id: 'brush-config',
      title: "Blood 'n Guts Brush Settings",
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
  getData(): BrushSettings {
    // Return data to the template
    return canvas.blood.brushSettings;
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
    const resetButton = html.find('.brush-config-reset-defaults');
    resetButton.click(() => {
      Object.keys(canvas.blood.brushSettings).forEach(async (name: string) => {
        await canvas.scene.unsetFlag(MODULE_ID, name);
        canvas.blood.brushSettings = duplicate(canvas.blood.DEFAULTS_BRUSHSETTINGS);
      });
      this.render();
    });
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
    if (event.submitter?.name) {
      Object.entries(formData).forEach(async ([name, val]: [string, number]) => {
        const saveToFlag = event.submitter?.name === 'saveDefaults';
        await canvas.blood.setSetting(saveToFlag, name, val);
      });

      canvas.blood.brushControls.render();

      // If save button was clicked, close app
      if (event.submitter?.name === 'submit') {
        Object.values(ui.windows).forEach((val) => {
          if (val.id === 'brush-config') val.close();
        });
      }
    } else {
      // close button was clicked, close without doing anything
      Object.values(ui.windows).forEach((val) => {
        if (val.id === 'brush-config') val.close();
      });
    }
  }
}

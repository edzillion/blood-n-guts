export default class BloodConfig extends FormApplication {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ['form'],
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: true,
      popOut: true,
      editable: game.user.isGM,
      width: 500,
      template: 'modules/blood-n-guts/templates/scene-config.html',
      id: 'blood-scene-config',
      title: "Blood 'n Guts Brush Settings",
    });
  }

  /* -------------------------------------------- */

  /**
   * Obtain module metadata and merge it with game settings which track current module visibility
   * @return {Object}   The data provided to the template when rendering the form
   */
  getData(): BrushSettings {
    // Return data to the template
    return canvas.blood.brushSettings;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  async _updateObject(event: SubmitEvent, formData: BrushSettings): Promise<void> {
    // drop the #
    //formData.brushRGBA = hexToRGBAString(formData.brushColor.slice(1), formData.brushAlpha);
    Object.entries(formData).forEach(async ([name, val]: [string, number]) => {
      const saveToFlag = event.submitter?.name === 'saveDefaults';
      await canvas.blood.setSetting(saveToFlag, name, val);
    });

    canvas.blood.brushControls.render();

    // If save button was clicked, close app
    if (event.submitter?.name === 'submit') {
      Object.values(ui.windows).forEach((val) => {
        if (val.id === 'blood-scene-config') val.close();
      });
    }
  }
}

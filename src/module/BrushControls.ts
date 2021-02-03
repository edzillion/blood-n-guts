import { hexToPercent, percentToHex } from './helpers';

export default class BrushControls extends FormApplication {
  current: { brushSize: number; brushAlpha: number; brushDensity: number; brushSpread: number };
  // constructor(object: any, options?: FormApplicationOptions) {
  //   super(object, options);
  //   // game.settings.sheet.close();
  //   // game.users.apps.push(this);
  // }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['form'],
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true,
      popOut: false,
      editable: game.user.isGM,
      template: 'modules/blood-n-guts/templates/brush-controls.html',
      id: 'filter-config',
      title: "Blood 'n Guts Options",
    });
  }

  /* -------------------------------------------- */

  /**
   * Obtain module metadata and merge it with game settings which track current module visibility
   * @return {Object}   The data provided to the template when rendering the form
   */
  getData() {
    return canvas.blood.brushSettings;
    // this.current = {
    //   brushSize: canvas.blood.findSetting('brushSize'),
    //   brushAlpha: canvas.blood.findSetting('brushAlpha'),
    //   brushDensity: canvas.blood.findSetting('brushDensity'),
    //   brushSpread: canvas.blood.findSetting('brushSpread'),
    // };

    // // Return data to the template
    // return this.current;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
  }

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  async _updateObject(event, formData) {
    const updated = diffObject(canvas.blood.brushSettings, formData);
    Object.entries(updated).map(([name, val]) => {
      canvas.blood.setSetting(false, name, val);
    });
    // update brush controls html
    this.render();
  }
}

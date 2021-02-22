import { BloodNGuts } from '../blood-n-guts';

export default class BrushControls extends FormApplication {
  current: { brushSize: number; brushAlpha: number; brushDensity: number; brushSpread: number };

  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ['form'],
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true,
      popOut: false,
      editable: game.user.isGM,
      template: 'modules/blood-n-guts/templates/brush-controls.html',
      id: 'brush-controls',
      title: "Blood 'n Guts Brush Settings",
    });
  }

  /* -------------------------------------------- */

  /**
   * Obtain module metadata and merge it with game settings which track current module visibility
   * @return {Object}   The data provided to the template when rendering the form
   */
  async getData(): Promise<BrushSettings> {
    await BloodNGuts.allFontsReady;
    return mergeObject(canvas.blood.brushSettings, { fonts: BloodNGuts.allFonts });
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html: JQuery): void {
    super.activateListeners(html);
  }

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  async _updateObject(_event: Event, formData: BrushSettings): Promise<void> {
    const updated = diffObject(canvas.blood.brushSettings, formData);
    Object.entries(updated).map(([name, val]) => {
      canvas.blood.setSetting(false, name, val);
    });
    // update brush controls html
    this.render();
  }
}

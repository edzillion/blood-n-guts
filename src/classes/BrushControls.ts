import { getCanvas } from 'src/module/settings';
import { BloodNGuts } from '../blood-n-guts';

export default class BrushControls extends FormApplication {

  static get defaultOptions(): FormApplication.Options {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
   * Obtain brush settings and merge with loaded fonts
   * @category Foundry
   * @function
   * @async
   * @returns {Promise<BrushSettings>} - The data provided to the template when rendering the form
   * @override
   * @see {FormApplication#getData}
   */
  async getData(): Promise<any> {
    await BloodNGuts.allFontsReady;
    return mergeObject(getCanvas().blood.brushSettings, { fonts: BloodNGuts.allFonts });
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
  }

  /**
   * This method is called upon form submission after form data is validated.
   * @category Foundry
   * @function
   * @async
   * @param {Event} _event - The initial triggering submission event
   * @param {BrushSettings} formData - The object of validated form data with which to update the object
   * @override
   * @see {FormApplication#_updateObject}
   */
  async _updateObject(_event: Event, formData: BrushSettings): Promise<void> {
    const updated = diffObject(getCanvas().blood.brushSettings, formData);
    Object.entries(updated).map(([name, val]) => {
      getCanvas().blood.setSetting(false, name, val);
    });
    // update brush controls html
    this.render();
  }
}

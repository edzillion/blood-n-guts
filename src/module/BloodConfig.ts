import { BloodNGuts } from '../blood-n-guts';
import BrushControls from './BrushControls';
import { webToHex, hexToWeb } from './helpers';

export default class BloodConfig extends FormApplication {
  static get defaultOptions() {
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
      title: "Blood 'n Guts Drawing Config",
    });
  }

  /* -------------------------------------------- */

  /**
   * Obtain module metadata and merge it with game settings which track current module visibility
   * @return {Object}   The data provided to the template when rendering the form
   */
  getData() {
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
  async _updateObject(event, formData) {
    // drop the #
    //formData.brushRGBA = hexToRGBAString(formData.brushColor.slice(1), formData.brushAlpha);
    Object.entries(formData).forEach(async ([name, val]: [string, number]) => {
      const saveToFlag = event.submitter?.name === 'saveDefaults';
      await canvas.blood.setSetting(saveToFlag, name, val);
    });

    canvas.blood.brushControls.render();

    // Object.entries(formData).forEach(async ([key, val]: [string, number]) => {
    //   // // If setting is an opacity slider, convert from 1-100 to 0-1
    //   // if (['gmAlpha', 'playerAlpha', 'vThreshold'].includes(key)) val /= 100;
    //   // // If setting is a color value, convert webcolor to hex before saving
    //   // if (['gmTint', 'playerTint'].includes(key)) val = webToHex(val);
    //   // Save settings to scene
    //   canvas.blood.setTempSetting(key, val);
    //   // If saveDefaults button clicked, also save to user's defaults
    // });

    // If save button was clicked, close app
    if (event.submitter?.name === 'submit') {
      Object.values(ui.windows).forEach((val) => {
        if (val.id === 'blood-scene-config') val.close();
      });
    }

    // // @ts-ignore

    // Update sight layer
    // canvas.sight.update();
  }
}

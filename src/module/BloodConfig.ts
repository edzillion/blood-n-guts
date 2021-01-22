import { BloodNGuts } from '../blood-n-guts';
import { webToHex, hexToWeb } from './helpers';

export default class BloodConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['form'],
      closeOnSubmit: false,
      submitOnChange: true,
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
    return {
      // gmAlpha: Math.round(canvas.blood.getSetting('gmAlpha') * 100),
      // gmTint: hexToWeb(canvas.blood.getSetting('gmTint')),
      brushAlpha: canvas.blood.getSetting('brushAlpha'),
      brushColor: canvas.blood.getSetting('brushColor'),
      visible: canvas.blood.getSetting('visible'),
      brushSize: canvas.blood.getSetting('brushSize'),
      previewAlpha: canvas.blood.getSetting('previewAlpha'),
      brushFont: canvas.blood.getSetting('brushFont'),
      fonts: BloodNGuts.allFonts,
      brushSpread: canvas.blood.getSetting('brushSpread'),
      brushDensity: canvas.blood.getSetting('brushDensity'),
      // playerAlpha: Math.round(canvas.blood.getSetting('playerAlpha') * 100),
      // playerTint: hexToWeb(canvas.blood.getSetting('playerTint')),
      // transition: canvas.blood.getSetting('transition'),
      // transitionSpeed: canvas.blood.getSetting('transitionSpeed'),
      // blurRadius: canvas.blood.getSetting('blurRadius'),
      // blurQuality: canvas.blood.getSetting('blurQuality'),
      // autoVisibility: canvas.blood.getSetting('autoVisibility'),
      // autoVisGM: canvas.blood.getSetting('autoVisGM'),
      // vThreshold: Math.round(canvas.blood.getSetting('vThreshold') * 100),
    };
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
    Object.entries(formData).forEach(async ([key, val]: [string, number]) => {
      // // If setting is an opacity slider, convert from 1-100 to 0-1
      // if (['gmAlpha', 'playerAlpha', 'vThreshold'].includes(key)) val /= 100;
      // // If setting is a color value, convert webcolor to hex before saving
      // if (['gmTint', 'playerTint'].includes(key)) val = webToHex(val);
      // Save settings to scene
      await canvas.blood.setSetting(key, val);
      // If saveDefaults button clicked, also save to user's defaults
      if (event.submitter?.name === 'saveDefaults') {
        canvas.blood.setUserSetting(key, val);
      }
    });

    // If save button was clicked, close app
    if (event.submitter?.name === 'submit') {
      Object.values(ui.windows).forEach((val) => {
        if (val.id === 'blood-scene-config') val.close();
      });
    }

    // Update sight layer
    // canvas.sight.update();
  }
}

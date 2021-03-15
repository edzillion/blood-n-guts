import { getMergedViolenceLevels } from '../module/settings';
import { MODULE_ID } from '../constants';
import * as violenceLevelSettings from '../data/violenceLevelSettings';

export default class ViolenceConfig2 extends FormApplication {
  dataObject: Record<string, unknown>;
  violenceLevels: Record<string, ViolenceLevel | Partial<ViolenceLevel>>;
  currentViolenceSettings: ViolenceLevel | any;
  currentLevel: string;
  inputMode: boolean;

  constructor(violenceLevel?: string, options?: FormApplicationOptions) {
    super(violenceLevel, options);
    this.currentLevel = violenceLevel || game.settings.get(MODULE_ID, 'violenceLevel');
  }

  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ['form'],
      closeOnSubmit: true,
      submitOnChange: false,
      submitOnClose: false,
      popOut: true,
      editable: game.user.isGM,
      width: 350,
      template: 'modules/blood-n-guts/templates/violence-config2.html',
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
    let violenceLevel;
    if (this.currentLevel === 'New') {
      this.currentLevel = '';
      violenceLevel = {};
    } else {
      violenceLevel =
        canvas.scene.getFlag(MODULE_ID, 'violenceLevels') != null &&
        canvas.scene.getFlag(MODULE_ID, 'violenceLevels')[this.currentLevel] != null
          ? canvas.scene.getFlag(MODULE_ID, 'violenceLevels')[this.currentLevel]
          : game.settings.get(MODULE_ID, 'violenceLevels')[this.currentLevel];
    }

    this.dataObject = {
      currentLevel: this.currentLevel,
      violenceLevel: violenceLevel,
      nameInputDisabled: true,
    };
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
    const nameInput = html.find('input#currentLevel');
    const formFields = html.find('input[type=number]');
    const cancelButton = html.find('button#cancelButton');

    if (this.currentLevel === '') {
      formFields.prop('disabled', true);
      nameInput.on('change', (event: JQuery.ChangeEvent) => {
        this.currentLevel = event.target.value;
        if (this.currentLevel.length > 3) formFields.prop('disabled', false);
        else formFields.prop('disabled', true);
      });
    } else nameInput.prop('disabled', true);

    formFields.on('change', (event: JQuery.ChangeEvent) => {
      return canvas.scene.setFlag(MODULE_ID, 'violenceLevels.' + event.target.id, event.target.id);
    });

    cancelButton.click((e) => {
      this.close();
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
    debugger;
    return;
  }
}

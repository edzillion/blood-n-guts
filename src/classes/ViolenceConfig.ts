import { MODULE_ID } from '../constants';
import * as violenceLevelSettings from '../data/violenceLevelSettings';
export default class ViolenceConfig2 extends FormApplication {
  dataObject: Record<string, unknown>;
  allViolenceLevels: Record<string, ViolenceLevel>;
  newViolenceLevel: Partial<ViolenceLevel>;
  currentLevel: string;
  newLevelMode: boolean;
  defaultLevel: true;

  constructor(violenceLevel?: string, options?: FormApplicationOptions) {
    super(violenceLevel, options);

    this.allViolenceLevels = game.settings.get(MODULE_ID, 'violenceLevels');

    if (violenceLevel === 'New') {
      this.currentLevel = '';
      this.newLevelMode = true;
      this.newViolenceLevel = {};
    } else {
      this.currentLevel = game.settings.get(MODULE_ID, 'violenceLevel');
      this.newLevelMode = false;
      if (violenceLevelSettings.defaults[this.currentLevel] != null) this.defaultLevel = true;
    }
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
    let violenceLevel, nameInputDisabled;
    if (this.newLevelMode) {
      violenceLevel = {};
      nameInputDisabled = '';
    } else {
      violenceLevel = game.settings.get(MODULE_ID, 'violenceLevels')[this.currentLevel];
      nameInputDisabled = 'disabled';
    }

    this.dataObject = {
      name: this.currentLevel,
      violenceLevel: violenceLevel,
      nameInputDisabled: nameInputDisabled,
      notNewLevelMode: !this.newLevelMode,
      defaultLevel: this.defaultLevel,
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

    const formFields = html.find('input[type=number]');
    const cancelButton = html.find('button#cancelButton');
    const resetButton = html.find('button#resetButton');
    const deleteButton = html.find('button#deleteButton');

    formFields.on('change', (event: JQuery.ChangeEvent) => {
      if (!this.newLevelMode)
        return canvas.scene.setFlag(MODULE_ID, 'violenceLevels.' + event.target.id, event.target.id);
    });

    cancelButton.on('click', () => {
      this.close();
    });

    resetButton.on('click', () => {
      this.allViolenceLevels[this.currentLevel] = duplicate(violenceLevelSettings.defaults[this.currentLevel]);
      game.settings.set(MODULE_ID, 'violenceLevels', this.allViolenceLevels);
      this.render();
    });

    deleteButton.on('click', () => {
      delete this.allViolenceLevels[this.currentLevel];
      game.settings.set(MODULE_ID, 'violenceLevels', this.allViolenceLevels);
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
  async _updateObject(event: SubmitEvent, formData: ViolenceLevel): Promise<void> {
    const name = formData.name;
    delete formData.name;
    this.allViolenceLevels[name] = formData;
    return game.settings.set(MODULE_ID, 'violenceLevels', this.allViolenceLevels);
  }
}

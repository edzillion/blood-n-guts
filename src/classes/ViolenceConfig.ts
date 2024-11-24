import { MODULE_ID } from '../constants';
import * as violenceLevelSettings from '../data/violenceLevelSettings';
import { BnGAdvancedConfig } from './BnGAdvancedConfig';
export default class ViolenceConfig extends FormApplication {
  allViolenceLevels: Record<string, ViolenceLevel>;
  newViolenceLevel: Partial<ViolenceLevel>;
  currentLevel: string;
  newLevelMode: boolean;
  defaultLevel: true;

  constructor(violenceLevel?: string, options?: FormApplication.Options) {
    super(violenceLevel, options);

    this.allViolenceLevels = <Record<string, ViolenceLevel>>game.settings.get(MODULE_ID, 'violenceLevels');

    if (violenceLevel === 'New') {
      this.currentLevel = '';
      this.newLevelMode = true;
      this.newViolenceLevel = {};
    } else {
      this.currentLevel = <string>game.settings.get(MODULE_ID, 'masterViolenceLevel');
      this.newLevelMode = false;
      this.newViolenceLevel = duplicate(this.allViolenceLevels[this.currentLevel]);
      if (violenceLevelSettings.defaults[this.currentLevel] != null) this.defaultLevel = true;
    }
  }

  static get defaultOptions(): FormApplication.Options {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
   * @returns {Promise<Record<string, unknown>>} - The data provided to the template when rendering the form
   * @override
   * @see {FormApplication#getData}
   */
  async getData(): Promise<any> {
    // Return data to the template
    let violenceLevel, nameInputDisabled, resetButtonDisabled;
    if (this.newLevelMode) {
      violenceLevel = {};
      nameInputDisabled = '';
    } else {
      this.allViolenceLevels = <Record<string, ViolenceLevel>>game.settings.get(MODULE_ID, 'violenceLevels');
      violenceLevel = this.allViolenceLevels[this.currentLevel];
      nameInputDisabled = 'disabled';
    }

    if (this.defaultLevel)
      if (isObjectEmpty(diffObject(violenceLevel, violenceLevelSettings.defaults[this.currentLevel])))
        resetButtonDisabled = 'disabled';
      else resetButtonDisabled = '';

    return {
      name: this.currentLevel,
      violenceLevel: violenceLevel,
      nameInputDisabled: nameInputDisabled,
      notNewLevelMode: !this.newLevelMode,
      defaultLevel: this.defaultLevel,
      resetButtonDisabled: resetButtonDisabled,
    };
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
      const val = Number(event.target.value);
      this.newViolenceLevel[event.target.id] = val;
      if (!this.newLevelMode) {
        const diff = diffObject(this.newViolenceLevel, violenceLevelSettings.defaults[this.currentLevel]);
        if (isObjectEmpty(diff)) resetButton.prop('disabled', true);
        else resetButton.prop('disabled', false);
        this.allViolenceLevels[this.currentLevel] = this.newViolenceLevel as ViolenceLevel;
        return game.settings.set(MODULE_ID, 'violenceLevels', this.allViolenceLevels);
      }
    });

    cancelButton.on('click', () => {
      this.close();
    });

    resetButton.on('click', async () => {
      this.allViolenceLevels[this.currentLevel] = duplicate(violenceLevelSettings.defaults[this.currentLevel]);
      this.newViolenceLevel = duplicate(violenceLevelSettings.defaults[this.currentLevel]);
      await game.settings.set(MODULE_ID, 'violenceLevels', this.allViolenceLevels);
      this.render();
    });

    deleteButton.on('click', async () => {
      delete this.allViolenceLevels[this.currentLevel];
      await game.settings.set(MODULE_ID, 'violenceLevels', this.allViolenceLevels);
      await game.settings.set(MODULE_ID, 'masterViolenceLevel', 'Shrieker');

      // render the SettingsConfig/BnGAdvancedConfig if it is currently open to update changes
      Object.values(ui.windows).forEach((app) => {
        if (app instanceof SettingsConfig || app instanceof BnGAdvancedConfig) app.render();
      });
      this.close();
    });
  }

  /**
   * This method is called upon form submission after form data is validated.
   * @category Foundry
   * @function
   * @async
   * @param {SubmitEvent} event - The initial triggering submission event
   * @param {ViolenceLevel} formData - The object of validated form data with which to update the object
   * @override
   * @see {FormApplication#_updateObject}
   */
  async _updateObject(event: SubmitEvent, formData: ViolenceLevel): Promise<void> {
    const name = formData.name || this.currentLevel;
    delete formData.name;
    this.allViolenceLevels[name] = formData;

    await game.settings.set(MODULE_ID, 'masterViolenceLevel', name);
    await game.settings.set(MODULE_ID, 'violenceLevels', this.allViolenceLevels);

    // render the SettingsConfig/BnGAdvancedConfig if it is currently open to update changes
    Object.values(ui.windows).forEach((app) => {
      if (app instanceof SettingsConfig || app instanceof BnGAdvancedConfig) app.render();
    });
    return;
  }
}

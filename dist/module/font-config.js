export class FontConfig extends FormApplication {
  constructor(...args) {
    super(...args);
    game.users.apps.push(this);
    this.fonts = game.settings.get("blood-n-guts", "fonts");
  }

  render(force, context = {}) {
    return super.render(force, context);
  }

  async _updateObject(event, formData) {
    return;
  }
}
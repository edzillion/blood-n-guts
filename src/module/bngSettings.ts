import { MODULE_ID } from '../constants';

export default class BnGProxy extends Object {
  token: Token;
  scene: Scene;
  settings: TokenSettings;

  constructor(token, settings) {
    super(...arguments);
    this.token = token;
    //this.scene = scene;
    this.settings = settings;

    return new Proxy(this, this.handler);
  }
  get handler() {
    return {
      get(target, property) {
        debugger;
        let returnData;
        let source;
        if (property !== 'bloodColor') {
          if (target.token.getFlag(MODULE_ID, property)) {
            returnData = target.token.getFlag(MODULE_ID, property);
            source = 'token flag';
          } else {
            returnData = game.settings.get(MODULE_ID, property);
            source = 'settings flag';
          }
        } else if (target.token.getFlag(MODULE_ID, property)) {
          returnData = target.token.getFlag(MODULE_ID, property);
          source = 'token flag';
        } else {
          returnData = target.settings[property];
          source = 'settings';
        }
        console.log('---> returning property', property, returnData, source);
        return returnData;
      },
      set(target, prop, value) {
        debugger;
        return true;
      },
      getPrototypeOf() {
        return BnGProxy.prototype;
      },
    };
  }
}

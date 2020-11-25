import { MODULE_ID } from '../constants';

export default class ProxyTokenSettings extends Object {
  token: Token;
  settings: TokenSettings;

  constructor(token, settings) {
    super(...arguments);
    this.token = token;
    this.settings = settings;
    return new Proxy(this, this.handler);
  }
  get handler() {
    return {
      get(target, property) {
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
      // set(target, prop, value) {
      //   return true;
      // },
      // getPrototypeOf() {
      //   return ProxyTokenSettings.prototype;
      // },
    };
  }
}

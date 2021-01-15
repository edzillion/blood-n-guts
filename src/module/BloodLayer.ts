/* eslint-disable @typescript-eslint/ban-ts-comment */
// import { FXCanvasAnimation } from '../module/canvasanimation.js';
// import { easeFunctions } from '../module/ease.js';

import { BloodNGuts } from '../blood-n-guts';
import { MODULE_ID } from '../constants';
import {
  alignSplatsGetOffsetAndDimensions,
  computeSightFromPoint,
  getRandomBoxMuller,
  getRandomGlyph,
  getRGBA,
  getUID,
} from './helpers';
import { log, LogLevel } from './logging';

// @ts-ignore
export default class BloodLayer extends TilesLayer {
  // _objects: [];
  // constructor() {
  //   super();
  //   this._objects = null;
  // }

  /** @override */
  static get layerOptions() {
    return mergeObject(super.layerOptions, {
      // @ts-ignore
      zIndex: 11,
      canDragCreate: false,
    });
  }
  // set objects(objects) {
  //   debugger;
  //   this._objects = objects;
  // }

  // get objects() {
  //   return this._objects;
  // }
}

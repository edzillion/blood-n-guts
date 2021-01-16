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
  dragging: boolean;
  // _objects: [];
  constructor() {
    super();
    this.dragging = false;
  }
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

  _onClickLeft(e) {
    // Don't allow new action if history push still in progress
    // @ts-ignore
    //   // if (this.historyBuffer.length > 0) return;
    //   // On left mouse button
    //   if (e.data.button === 0) {
    const p = e.data.getLocalPosition(canvas.app.stage);
    // Round positions to nearest pixel
    p.x = Math.round(p.x);
    p.y = Math.round(p.y);
    //     // this.op = true;
    //     // Check active tool
    //     // @ts-ignore
    switch (game.activeTool) {
      case 'tile':
        // Validate that the drop position is in-bounds and snap to grid
        if (!canvas.grid.hitArea.contains(p.x, p.y)) return false;

        // Create the Tile
        this.constructor.placeableClass.create(data);
        break;
      default:
        // Do nothing
        break;
    }
    //     // Call _pointermove so single click will still draw brush if mouse does not move
    //     // this._pointerMove(e);
    //   }
  }
  // _onDragLeftStart(e) {
  //   debugger;
  //   switch (game.activeTool) {
  //     case 'tile':
  //       this.dragging = true;
  //       break;
  //     case 'select':
  //       super._onDragLeftStart(e);
  //       break;
  //     default:
  //       break;
  //   }
  // }
}

// height: 1004
// ​
// img: "Bilius.jpeg"
// ​
// tileSize: 100
// ​
// type: "Tile"
// ​
// width: 736
// ​
// x: 200
// ​
// y: 200

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

export default class BloodLayer3 extends PlaceablesLayer {
  active: boolean;
  constructor() {
    super();
    // this._registerMouseListeners();
    //this.active = true;
    // this.effects = {};
    // this.weather = null;
    // this.specials = [];
    // this.loader = new PIXI.Loader();
  }

  static get layerOptions() {
    return mergeObject(super.layerOptions, {
      //@ts-ignore
      zIndex: 10,
      controllableObjects: true,
      objectClass: Tile,
      rotatableObjects: true,
      sheetClass: TileConfig,
      // objectClass: Tile,
      // rotatableObjects: true,
      // sheetClass: TileConfig,
      // canDragCreate: false,
    });
  }

  // async draw() {
  //   super.draw();
  // }

  /* -------------------------------------------- */
  /*  Methods
    /* -------------------------------------------- */

  static activate() {
    debugger;
    // Skipping Placeable Layers activate method
    // super.activate();
    CanvasLayer.prototype.activate.apply(this);
    return this;
  }

  // deactivate() {
  //   // Skipping Placeable Layers deactivate method
  //   // super.deactivate();
  //   CanvasLayer.prototype.deactivate.apply(this);
  //   return this;
  // }

  toggle() {
    if (this.active) this.deactivate();
    else this.activate();
    this.active = !this.active;
  }

  /**
   * Handle drop events for Tile data on the Tiles Layer
   * @param {DragEvent} event     The concluding drag event
   * @param {object} data         The extracted Tile data
   * @private
   */
  // async _onDropTileData(event, data) {
  //   if (!data.img) return;
  //   if (!this._active) this.activate();

  //   // Determine the tile size
  //   // const tex = await loadTexture(data.img);
  //   // const ratio = canvas.dimensions.size / (data.tileSize || canvas.dimensions.size);
  //   // data.width = tex.baseTexture.width * ratio;
  //   // data.height = tex.baseTexture.height * ratio;

  //   // Validate that the drop position is in-bounds and snap to grid
  //   if (!canvas.grid.hitArea.contains(data.x, data.y)) return false;
  //   data.x = data.x - data.width / 2;
  //   data.y = data.y - data.height / 2;
  //   if (!event.shiftKey) mergeObject(data, canvas.grid.getSnappedPosition(data.x, data.y));

  //   // Create the tile as hidden if the ALT key is pressed
  //   if (event.altKey) data.hidden = true;

  //   // Create the Tile
  //   return this.constructor.placeableClass.create(data);
  // }

  /** @override */
  static _onMouseWheel(event) {
    log(LogLevel.DEBUG, '_onMouseWheel');
    // Determine whether we have a hovered template?
    // const template = this._hover;
    // if (!template) return;

    // // Determine the incremental angle of rotation from event data
    // const snap = event.shiftKey ? 15 : 5;
    // const delta = snap * Math.sign(event.deltaY);
    // return template.rotate(template.data.direction + delta, snap);
  }

  _onWheel(event) {
    log(LogLevel.DEBUG, '_onWheel');
    // Determine whether we have a hovered template?
    // const template = this._hover;
    // if (!template) return;

    // // Determine the incremental angle of rotation from event data
    // const snap = event.shiftKey ? 15 : 5;
    // const delta = snap * Math.sign(event.deltaY);
    // return template.rotate(template.data.direction + delta, snap);
  }

  // _onClickLeft(event) {
  //   const [x, y] = [event.clientX, event.clientY];
  //   const t = canvas.stage.worldTransform;
  //   const canvasX = (x - t.tx) / canvas.stage.scale.x;
  //   const canvasY = (y - t.ty) / canvas.stage.scale.y;

  //   if (
  //     canvasX < canvas.dimensions.paddingX ||
  //     canvasX > canvas.dimensions.width - canvas.dimensions.paddingX ||
  //     canvasY < canvas.dimensions.paddingY ||
  //     canvasY > canvas.dimensions.height - canvas.dimensions.paddingY
  //   )
  //     return;

  //   log(LogLevel.DEBUG, 'onPaintSceneClick');

  //   const splatDataObj: Partial<SplatDataObject> = {};

  //   // scale the splats based on token size and severity
  //   const font = BloodNGuts.allFonts[game.settings.get(MODULE_ID, 'floorSplatFont')];
  //   splatDataObj.styleData = {
  //     fontFamily: font.name,
  //     fontSize: game.settings.get(MODULE_ID, 'floorSplatSize'),
  //     fill: getRGBA('blood'),
  //     align: 'center',
  //   };
  //   const style = new PIXI.TextStyle(splatDataObj.styleData);

  //   const spread = game.settings.get(MODULE_ID, 'splatSpread');
  //   const amount = game.settings.get(MODULE_ID, 'floorSplatDensity');
  //   // get a random glyph and then get a random (x,y) spread away from the token.
  //   const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
  //   const pixelSpreadX = canvas.grid.size * spread;
  //   const pixelSpreadY = canvas.grid.size * spread;
  //   log(LogLevel.DEBUG, 'generateFloorSplats amount', amount);
  //   log(LogLevel.DEBUG, 'generateFloorSplats pixelSpread', pixelSpreadX, pixelSpreadY);

  //   // create our splats for later drawing.
  //   splatDataObj.splats = glyphArray.map((glyph) => {
  //     const tm = PIXI.TextMetrics.measureText(glyph, style);
  //     const randX = getRandomBoxMuller() * pixelSpreadX - pixelSpreadX / 2;
  //     const randY = getRandomBoxMuller() * pixelSpreadY - pixelSpreadY / 2;
  //     return {
  //       x: Math.round(randX - tm.width / 2),
  //       y: Math.round(randY - tm.height / 2),
  //       angle: Math.round(Math.random() * 360),
  //       width: tm.width,
  //       height: tm.height,
  //       glyph: glyph,
  //     };
  //   });

  //   const { offset, width, height } = alignSplatsGetOffsetAndDimensions(splatDataObj.splats);
  //   splatDataObj.offset = offset;
  //   splatDataObj.x = offset.x;
  //   splatDataObj.y = offset.y;

  //   const maxDistance = Math.max(width, height);
  //   const clickPt = new PIXI.Point(canvasX, canvasY);
  //   const sight = computeSightFromPoint(clickPt, maxDistance);

  //   // since we don't want to add the mask to the container yet (as that will
  //   // screw up our alignment) we need to move it by editing the x,y points directly
  //   for (let i = 0; i < sight.length; i += 2) {
  //     sight[i] -= splatDataObj.offset.x;
  //     sight[i + 1] -= splatDataObj.offset.y;
  //   }

  //   splatDataObj.x += clickPt.x;
  //   splatDataObj.y += clickPt.y;
  //   splatDataObj.maskPolygon = sight;
  //   splatDataObj.id = getUID();
  //   BloodNGuts.scenePool.push({ data: <SplatDataObject>splatDataObj });
  //   BloodNGuts.saveScene();
  // }

  /** @override */
  _onClickLeft(event) {
    log(LogLevel.INFO, '_onClickLeft');
  }

  public static _onClickLeft2() {
    log(LogLevel.INFO, '_onClickLeft2');
  }
}

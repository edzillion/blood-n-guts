import { MODULE_ID } from '../constants';
import { log, LogLevel } from './logging';
import Splat from './Splat';
import { SplatTile } from './SplatTile';

export default class BloodLayer extends PlaceablesLayer {
  dataArray: any;
  defaults: {
    img: string;
    width: number;
    height: number;
    scale: number;
    x: number;
    y: number;
    z: number;
    rotation: number;
    hidden: boolean;
    locked: boolean;
  };
  layer: PIXI.Container;
  // _objects: [];
  constructor() {
    super();
    //this._registerMouseListeners();
    //this.dataArray = 'flags["blood-n-guts"].sceneSplats';
    this.defaults = {
      img: 'Chiyomaru.jpeg',
      width: 100,
      height: 100,
      scale: 1,
      x: 500,
      y: 500,
      z: 370,
      rotation: 45,
      hidden: false,
      locked: true,
    };

    // this.layer = BloodLayer.getCanvasContainer();
    // this.addChild(this.layer);
  }

  // static getCanvasContainer() {
  //   const container = new PIXI.Container();
  //   const d = canvas.dimensions;
  //   container.width = d.width;
  //   container.height = d.height;
  //   container.x = 0;
  //   container.y = 0;
  //   container.zIndex = 0;
  //   return container;
  // }

  // /**
  //  * Adds the mouse listeners to the layer
  //  */
  // _registerMouseListeners() {
  //   this.addListener('pointerdown', this._pointerDown);
  //   // this.addListener('pointerup', this._pointerUp);
  //   // this.addListener('pointermove', this._pointerMove);
  //   // this.dragging = false;
  //   // this.brushing = false;
  // }

  /** @override */
  static get layerOptions() {
    return mergeObject(super.layerOptions, {
      //@ts-expect-error definition missing
      zIndex: 11,
      canDragCreate: false,
      objectClass: Splat,
      sortActiveTop: false,
      rotatableObjects: true,
      sheetClass: TileConfig,
      controllableObjects: true,
    });
  }

  _onClickLeft(e) {
    const p = e.data.getLocalPosition(canvas.app.stage);
    // Round positions to nearest pixel
    p.x = Math.round(p.x);
    p.y = Math.round(p.y);
    const d = duplicate(this.defaults);
    d.x = p.x;
    d.y = p.y;
    const obj: Splat = new Splat(d, canvas.scene);
    obj.zIndex = this.defaults.z || 0;
    //@ts-expect-error definition missing
    this.objects.addChild(obj);

    obj.draw();
  }
  //return this.constructor.placeableClass.create(this.defaults);
  //this.createObject(this.defaults);
  // const t = new Tile(this.defaults, canvas.scene);
  // SplatTile(t).then((st) => {
  //   debugger;
  // });

  /** @override */
  async draw(): Promise<any> {
    //await super.draw();

    // Create objects container which can be sorted
    //@ts-expect-error definition missing
    this.objects = this.addChild(new PIXI.Container());
    //@ts-expect-error definition missing
    this.objects.sortableChildren = true;

    // Create preview container which is always above objects
    //@ts-expect-error definition missing
    this.preview = this.addChild(new PIXI.Container());

    // Create and draw objects
    const dataArray = [this.defaults]; //[canvas.scene.data['flags'][MODULE_ID].sceneSplats] || [];

    const promises = dataArray.map((data) => {
      const obj = this.createObject(data);
      //@ts-expect-error definition missing
      return obj.draw();
    });

    // Wait for all objects to draw
    this.visible = true;
    return Promise.all(promises);
  }

  /** @override */
  activate() {
    //super.activate();
    CanvasLayer.prototype.activate.apply(this);
    //@ts-expect-error definition missing
    this.objects.visible = true;
    this.placeables.forEach((l) => l.refresh());
    return this;
  }

  /* -------------------------------------------- */

  /** @override */
  deactivate() {
    CanvasLayer.prototype.deactivate.apply(this);
    //@ts-expect-error definition missing
    if (this.objects) this.objects.visible = true;
    //@ts-expect-error definition missing
    this.releaseAll();
    this.placeables.forEach((l) => l.refresh());
    if (this.preview) this.preview.removeChildren();
    return this;
  }
}

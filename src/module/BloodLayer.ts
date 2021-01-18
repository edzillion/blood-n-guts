import { MODULE_ID } from '../constants';
import { log, LogLevel } from './logging';
import Splat from './Splat';
import { SplatTile } from './SplatTile';

//@ts-expect-error missing definition
export default class BloodLayer extends TilesLayer {
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
  collection: any[];
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

    this.collection = [];

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
      // //@ts-expect-error definition missing
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
    this.collection.push(obj.data);
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
      //@ts-expect-error missing definition
      const obj = this.createObject(data);
      // //@ts-expect-error definition missing
      return obj.draw();
    });

    // Wait for all objects to draw
    //@ts-expect-error missing definition
    this.visible = true;
    return Promise.all(promises);
  }

  /** @override */
  activate() {
    //super.activate();
    CanvasLayer.prototype.activate.apply(this);
    //@ts-expect-error definition missing
    this.objects.visible = true;
    //@ts-expect-error missing definition
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
    //@ts-expect-error missing definition
    this.placeables.forEach((l) => l.refresh());
    //@ts-expect-error missing definition
    if (this.preview) this.preview.removeChildren();
    return this;
  }

  async updateMany(data, options = {} as any) {
    const user = game.user;
    options = mergeObject({ diff: true }, options);

    //   // Structure the update data
    const pending = new Map();
    data = data instanceof Array ? data : [data];
    for (const d of data) {
      if (!d._id) throw new Error('You must provide an id for every Embedded Entity in an update operation');
      pending.set(d._id, d);
    }

    // Difference each update against existing data
    const updates = this.collection.reduce((arr, d) => {
      if (!pending.has(d._id)) return arr;
      let update = pending.get(d._id);

      // Diff the update against current data
      if (options.diff) {
        update = diffObject(d, expandObject(update));
        if (isObjectEmpty(update)) return arr;
        update['_id'] = d._id;
      }

      //     // Call pre-update hooks to ensure the update is allowed to proceed
      // if (!options.noHook) {
      //   const allowed = Hooks.call(`preUpdate${embeddedName}`, this, d, update, options, user._id);
      //   if (allowed === false) {
      //     console.debug(`${vtt} | ${embeddedName} update prevented by preUpdate hook`);
      //     return arr;
      //   }
      // }

      // Stage the update
      arr.push(update);
      return arr;
    }, []);
    if (!updates.length) return [];

    updates.forEach((update) => {
      debugger;
      //@ts-expect-error definition missing
      const s = this.get(update._id);
      s.data = mergeObject(s.data, update);
    });
    // //@ts-expect-error definition missing
  }

  // }

  // addSplatsToCollection(splatDatas) {
  //   // Prepare created Entities
  //   const entities = splatDatas.map((data) => {
  //     // Create the Entity instance
  //     const entity = new this(data);
  //     if (temporary) return entity;

  //     // Add it to the EntityCollection
  //     this.collection.insert(entity);

  //     // Trigger follow-up actions and return
  //     entity._onCreate(data, options, userId);
  //     Hooks.callAll(`create${type}`, entity, options, userId);
  //     return entity;
  //   });

  //   // Log creation
  //   let msg = entities.length === 1 ? `Created ${type}` : `Created ${entities.length} ${type}s`;
  //   if (entities.length === 1) msg += ` with id ${entities[0].id}`;
  //   else if (entities.length <= 5) msg += ` with ids: [${entities.map((d) => d.id)}]`;
  //   console.log(`${vtt} | ${msg}`);

  //   // Re-render the parent EntityCollection
  //   if (options.render !== false) {
  //     this.collection.render(false, { entityType: this.entity, action: 'create', entities: entities, data: result });
  //   }

  //   // Return the created Entities
  //   return entities;
  // }
}

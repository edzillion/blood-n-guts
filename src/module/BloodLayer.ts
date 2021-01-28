import { BloodNGuts } from '../blood-n-guts';
import { MODULE_ID } from '../constants';
import TileDrawingSplat from './TileDrawingSplat';
import { getRGBA } from './helpers';
import { log, LogLevel } from './logging';
import TileSplat from './TileSplat';

//@ts-expect-error missing definition
export default class BloodLayer extends TilesLayer {
  dataArray: any;
  defaults: any;
  layer: PIXI.Container;
  collection: TileSplatData[];
  splatData: any;
  DEFAULTS: {
    visible: boolean;
    brushSize: number;
    brushAlpha: number;
    previewAlpha: number;
    brushColor: string;
    brushFont: string;
    brushSpread: number;
    brushDensity: number;
  };
  // _objects: [];
  constructor() {
    super();
    //this._registerMouseListeners();
    //this.dataArray = 'flags["blood-n-guts"].sceneSplats';

    this.splatData = {
      splats: [
        {
          x: 52,
          y: 4,
          angle: 303,
          width: 115.16417694091797,
          height: 141,
          glyph: 'c',
        },
        {
          x: 49,
          y: 0,
          angle: 89,
          width: 72.37313079833984,
          height: 141,
          glyph: 'S',
        },
        {
          x: 38,
          y: 4,
          angle: 315,
          width: 44.55223846435547,
          height: 141,
          glyph: '*',
        },
        {
          x: 0,
          y: 16,
          angle: 65,
          width: 70.07462310791016,
          height: 141,
          glyph: 'u',
        },
      ],
      styleData: {
        fontFamily: 'WC Rhesus A Bta',
        fontSize: 110,
        fill: 'rgba(138, 7, 7, 0.7)',
        align: 'center',
      },
      offset: {
        x: -35,
        y: -86,
      },
      x: 1015,
      y: 64,
      maskPolygon: [
        -201.37014619445802,
        85.99999999999997,
        -200.07528580178825,
        61.292591855942646,
        -196.20489138520793,
        36.85588324586928,
        -189.80136779587735,
        12.95760786302165,
        -180.93487337826457,
        -10.140399786470027,
        -169.7025513006422,
        -32.18507309722908,
        -156.22746523420733,
        -52.934886015318256,
        -140.65725104174658,
        -72.16249924822966,
        -123.16249924822955,
        -89.65725104174669,
        -103.93488601531817,
        -105.22746523420733,
        -83.18507309722895,
        -118.70255130064228,
        -61.14039978646997,
        -129.93487337826463,
        -38.042392136978265,
        -138.80136779587738,
        -14.144116754130664,
        -145.20489138520796,
        10.292591855942646,
        -149.07528580178825,
        35,
        -150.370146194458,
        59.707408144057354,
        -149.07528580178823,
        84.14411675413066,
        -145.20489138520796,
        108.04239213697838,
        -138.80136779587735,
        131.14039978646997,
        -129.93487337826463,
        153.18507309722918,
        -118.70255130064223,
        173.93488601531817,
        -105.22746523420733,
        193.16249924822978,
        -89.65725104174663,
        210.6572510417468,
        -72.16249924822961,
        226.22746523420733,
        -52.934886015318256,
        239.7025513006422,
        -32.18507309722895,
        250.93487337826468,
        -10.140399786469914,
        259.80136779587747,
        12.957607863021764,
        266.20489138520793,
        36.85588324586931,
        270.07528580178814,
        61.29259185594279,
        271.3701461944579,
        86.00000000000011,
        270.07528580178814,
        110.7074081440573,
        266.20489138520793,
        135.14411675413078,
        259.80136779587724,
        159.04239213697844,
        250.93487337826468,
        182.14039978647,
        239.7025513006422,
        204.18507309722906,
        226.22746523420733,
        224.93488601531828,
        210.65725104174658,
        244.16249924822966,
        193.16249924822955,
        261.6572510417467,
        173.93488601531817,
        277.22746523420733,
        153.18507309722895,
        290.7025513006423,
        131.14039978646997,
        301.9348733782646,
        108.04239213697838,
        310.80136779587735,
        84.14411675413066,
        317.204891385208,
        59.707408144057126,
        321.07528580178825,
        35,
        322.370146194458,
        10.292591855942646,
        321.07528580178825,
        -14.144116754130778,
        317.20489138520793,
        -38.042392136978265,
        310.80136779587735,
        -61.140399786470084,
        301.93487337826457,
        -83.18507309722906,
        290.70255130064226,
        -103.9348860153184,
        277.2274652342072,
        -123.16249924822978,
        261.6572510417466,
        -140.6572510417467,
        244.1624992482296,
        -156.22746523420744,
        224.93488601531806,
        -169.7025513006423,
        204.1850730972289,
        -180.93487337826468,
        182.14039978646994,
        -189.80136779587747,
        159.04239213697815,
        -196.20489138520793,
        135.1441167541306,
        -200.07528580178825,
        110.70740814405724,
      ],
      id: 'bng__177066395c4_0.844fc02d550df8',
    };

    this.DEFAULTS = {
      visible: true,
      brushSize: 50,
      brushAlpha: 0.7,
      previewAlpha: 0.4,
      brushColor: '#8A0707',
      brushFont: 'splatter',
      brushSpread: 1.0,
      brushDensity: 1,
    };

    // React to changes to current scene
    // Hooks.on('updateScene', (scene, data) => this.updateSceneHandler(scene, data));
    // this.layer = BloodLayer.getCanvasContainer();
    // this.addChild(this.layer);
  }

  initialize(): void {
    this.collection = canvas.scene.getFlag(MODULE_ID, 'sceneSplats') || [];
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
      canDragCreate: true,
      objectClass: TileSplat,
      sortActiveTop: false,
      rotatableObjects: true,
      sheetClass: TileConfig,
      snapToGrid: false,
      controllableObjects: true,
    });
  }

  // /**
  //  * Handler called when scene data updated. Draws splats from scene data flags.
  //  * @category GMandPC
  //  * @function
  //  * @param scene - reference to the current scene
  //  * @param changes - changes
  //  */
  // public updateSceneHandler(scene, changes): void {
  //   if (!scene.active || BloodNGuts.disabled || !changes.flags || changes.flags[MODULE_ID]?.sceneSplats === undefined)
  //     return;
  //   log(LogLevel.DEBUG, 'updateSceneHandler');
  //   if (changes.flags[MODULE_ID]?.sceneSplats === null) {
  //     BloodNGuts.wipeSceneSplats();
  //     return;
  //   }
  //   this.collection = BloodNGuts.trimTileSplatData(duplicate(changes.flags[MODULE_ID]?.sceneSplats));
  // }

  // _onClickLeft(e) {
  //   const p = e.data.getLocalPosition(canvas.app.stage);
  //   // Round positions to nearest pixel
  //   p.x = Math.round(p.x);
  //   p.y = Math.round(p.y);

  //   const tileSplatData: TileSplatData = {
  //     // img: string; //not used
  //     width: 100,
  //     height: 100,
  //     scale: 1,
  //     x: p.x,
  //     y: p.y,
  //     // z: number;
  //     rotation: 0,
  //     hidden: false,
  //     locked: false,
  //     drips: this.splatData.splats,
  //     styleData: this.splatData.styleData,
  //     offset: this.splatData.offset,
  //     maskPolygon: this.splatData.maskPolygon,
  //   };
  //   const obj: TileSplat = new TileSplat(tileSplatData, canvas.scene);
  //   obj.zIndex = obj.z || 0;
  //   this.collection.push(tileSplatData);

  //   //@ts-expect-error definition missing
  //   this.objects.addChild(obj);

  //   obj.draw();
  // }

  /** @override */
  _onClickLeft(event) {
    const p = event.data.getLocalPosition(canvas.app.stage);
    // Round positions to nearest pixel
    p.x = Math.round(p.x);
    p.y = Math.round(p.y);

    if (game.activeTool === 'brush') {
      const data = this._getNewDrawingData(event.data.origin);
      const drawing = new TileDrawingSplat(data);
      this.collection.push(data);
      this.draw();
      ////@ts-expect-error definition missing
      // event.data.preview = this.preview.addChild(drawing);
      // drawing.draw();
    }

    // Standard left-click handling
    super._onClickLeft(event);
  }

  //return this.constructor.placeableClass.create(this.defaults);
  //this.createObject(this.defaults);
  // const t = new Tile(this.defaults, canvas.scene);
  // SplatTile(t).then((st) => {
  //   debugger;
  // });

  /** @override */
  _onDragLeftStart(event) {
    // super._onDragLeftStart(event);
    //@ts-expect-error definition missing
    const grandparentCall = PlaceablesLayer.prototype._onDragLeftStart.bind(this);
    grandparentCall(event);
    //super.__proto__.__proto__.__proto__._onDragLeftStart(event);
    const data = this._getNewDrawingData(event.data.origin);

    const drawing = new TileDrawingSplat(data);
    //@ts-expect-error definition missing
    event.data.preview = this.preview.addChild(drawing);
    drawing.draw();
    // const tile = Tile.createPreview(event.data.origin);
    // event.data.preview = this.preview.addChild(tile);
    // this.preview._creating = false;
  }

  /** @override */
  _onDragLeftMove(event) {
    const { preview, createState } = event.data;
    if (!preview) return;
    if (preview.parent === null) {
      // In theory this should never happen, but rarely does
      // @ts-expect-error missing def
      this.preview.addChild(preview);
    }
    if (createState >= 1) {
      preview._onMouseDraw(event);
    }
  }

  /**
   * Conclude a left-click drag workflow originating from the Canvas stage.
   * @see {Canvas#_onDragLeftDrop}
   */
  _onDragLeftDrop(event) {
    const object = event.data.preview;
    if (object) {
      const tileSplatData: TileSplatData = {
        // img: string; //not used
        width: 100,
        height: 100,
        scale: 1,
        x: object.data.x,
        y: object.data.y,
        // z: number;
        rotation: 0,
        hidden: false,
        locked: false,
        drips: [],
        styleData: this.splatData.styleData,
        offset: this.splatData.offset,
        maskPolygon: this.splatData.maskPolygon,
      };

      // Begin iteration
      for (let i = 0; i < object.data.points.length; i++) {
        const dripData: SplatDripData = {
          x: object.data.points[i][0],
          y: object.data.points[i][1],
          angle: 0,
          width: 100,
          height: 100,
          glyph: 'a',
        };

        tileSplatData.drips.push(dripData);
      }

      const obj: TileSplat = new TileSplat(tileSplatData, canvas.scene);
      obj.zIndex = obj.z || 0;
      this.collection.push(object.data);
      this.draw();
      // this.constructor.placeableClass.create(object.data);
    }
  }

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
    //const dataArray = [this.defaults]; //[canvas.scene.data['flags'][MODULE_ID].sceneSplats] || [];
    if (!this.collection || !this.collection.length) return;

    const promises = this.collection.map((data) => {
      const obj = this.createObject(data);
      return obj.draw();
    });

    // Wait for all objects to draw
    //@ts-expect-error missing definition
    this.visible = true;
    return Promise.all(promises);
  }

  /**
   * Draw a single placeable object
   * @return {PlaceableObject}
   */
  createObject(data) {
    const obj = new TileDrawingSplat(data);
    obj.zIndex = data.z || 0;
    // @ts-expect-error missing def
    this.objects.addChild(obj);
    return obj;
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
    // //@ts-expect-error definition missing
    this.updateNonEmbeddedEntity(data, options);
  }

  async deleteMany(data, options = {}) {
    const collection = this.collection;
    const user = game.user;

    // Structure the input data
    data = data instanceof Array ? data : [data];
    const ids = new Set(data);

    this.collection = collection.filter((splat) => !ids.has(splat._id));

    // // Iterate over elements of the collection
    // const deletions = collection.reduce((arr, d) => {
    //   if (!ids.has(d._id)) return arr;

    //   // Add the id to the pending array
    //   arr.push(d._id);
    //   return arr;
    // }, []);
    this.draw();
    //if (!deletions.length) return [];
  }

  public updateNonEmbeddedEntity(data, options = {} as any) {
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
      //@ts-expect-error definition missing
      const s = this.get(update._id);
      s.data = mergeObject(s.data, update);
      s.refresh();
    });
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

  getSetting(name) {
    let setting = canvas.scene.getFlag(MODULE_ID, name);
    // if (setting === undefined) setting = this.getUserSetting(name);
    if (setting === undefined) setting = this.DEFAULTS[name];
    return this.DEFAULTS[name]; //setting;
  }

  async setSetting(name, value) {
    const v = await canvas.scene.setFlag(MODULE_ID, name, value);
    return v;
  }

  getUserSetting(name) {
    let setting = game.user.getFlag(MODULE_ID, name);
    if (setting === undefined) setting = this.DEFAULTS[name];
    return setting;
  }

  async setUserSetting(name, value) {
    const v = await game.user.setFlag(MODULE_ID, name, value);
    return v;
  }

  /**
   * Get initial data for a new drawing.
   * Start with some global defaults, apply user default config, then apply mandatory overrides per tool.
   * @param {Object} origin     The initial coordinate
   * @return {Object}           The new drawing data
   * @private
   */
  _getNewDrawingData(origin): any {
    const tool = game.activeTool;

    // Update with User Defaults

    // Get User Settings
    //const saved = game.settings.get('core', this.constructor.DEFAULT_CONFIG_SETTING);

    // Get defaults
    //const defaults = mergeObject(CONST.DRAWING_DEFAULT_VALUES, saved, { inplace: false });

    const data = {
      author: '',
      bezierFactor: 0,
      fillAlpha: 0.5,
      fillColor: '#ffffff',
      fillType: 0,
      fontFamily: 'Signika',
      fontSize: 48,
      height: 0,
      hidden: false,
      locked: false,
      mltDisabled: false,
      mltIn: false,
      mltLevel: false,
      mltMacroEnter: false,
      mltMacroLeave: false,
      mltMacroMove: false,
      mltOut: false,
      mltSource: false,
      mltTarget: false,
      mltTintColor: '',
      points: [],
      rotation: 0,
      strokeAlpha: 1,
      strokeColor: '#ffffff',
      strokeWidth: 1,
      text: '',
      textAlpha: 1,
      textColor: '#FFFFFF',
      texture: '',
      type: 'f',
      width: 0,
      x: origin.x,
      y: origin.y,
      z: 0,
    };

    // Optional client overrides
    // const data = mergeObject(
    //   defaults,
    //   {
    //     fillColor: game.user.color,
    //     strokeColor: game.user.color,
    //     fontFamily: CONFIG.defaultFontFamily,
    //   },
    //   { overwrite: false },
    // );

    // Mandatory additions
    data.author = game.user._id;

    // Tool-based settings
    // switch (tool) {
    //   case 'brush':
    //     data.type = CONST.DRAWING_TYPES.FREEHAND;
    //     data.points = [[0, 0]];
    //     data.bezierFactor = 0.5;
    //     break;
    // }
    return data;
  }
}

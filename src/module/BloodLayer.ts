import { BloodNGuts } from '../blood-n-guts';
import { MODULE_ID } from '../constants';
import TileSplat from './TileSplat';
import { getRGBA } from './helpers';
import { log, LogLevel } from './logging';
import * as splatFonts from '../data/splatFonts';
import BrushControls from './BrushControls';

//@ts-expect-error missing definition
export default class BloodLayer extends TilesLayer {
  layer: PIXI.Container;
  collection: TileSplatData[];
  DEFAULTS: BrushSettings;
  DEFAULTS_TILESPLAT: TileSplatData;
  brushControls: BrushControls;
  brushSettings: BrushSettings;
  objects: PIXI.Container;
  preview: PIXI.Container;
  visible: boolean;
  constructor() {
    super();

    this.brushSettings = this.DEFAULTS = {
      brushAlpha: 0.7,
      brushColor: '#8A0707',
      brushDensity: 1,
      brushFlow: 75,
      brushFont: 'splatter',
      brushOpacity: 0,
      brushRGBA: 0,
      brushSize: 50,
      brushSpread: 1.0,
      fonts: BloodNGuts.allFonts,
      previewAlpha: 0.4,
      visible: true,
    };

    this.DEFAULTS_TILESPLAT = {
      alpha: 0.7,
      width: 0,
      height: 0,
      // @ts-expect-error bad def
      scale: 1,
      x: 0,
      y: 0,
      rotation: 0,
      hidden: false,
      locked: false,
      drips: [],
      styleData: {
        fontFamily: 'splatter',
        fontSize: 50,
        fill: getRGBA('blood'),
        align: 'center',
      },
      offset: new PIXI.Point(0),
      maskPolygon: [],
      brushSettings: this.brushSettings,
    };

    // React to changes to current scene
    // Hooks.on('updateScene', (scene, data) => this.updateSceneHandler(scene, data));
    // this.layer = BloodLayer.getCanvasContainer();
    // this.addChild(this.layer);
  }

  initialize(): void {
    this.collection = canvas.scene.getFlag(MODULE_ID, 'sceneSplats') || [];

    // Create objects container which can be sorted
    const objCont = new PIXI.Container();
    objCont.name = 'Object Container';
    //@ts-expect-error definition missing
    this.objects = this.addChild(objCont);
    this.objects.sortableChildren = true;

    // Create preview container which is always above objects
    const prevCont = new PIXI.Container();
    prevCont.name = 'Preview Container';
    //@ts-expect-error definition missing
    this.preview = this.addChild(prevCont) as PIXI.Container;
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

  /** @override */
  static get layerOptions(): LayerOptions {
    return mergeObject(super.layerOptions, {
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

  /** @override */
  _onClickLeft(event: InteractionEvent): void {
    log(LogLevel.INFO, '_onClickLeft createState', event.data.createState);
    const position = event.data.getLocalPosition(canvas.app.stage);
    // Round positions to nearest pixel
    position.x = Math.round(position.x);
    position.y = Math.round(position.y);

    if (game.activeTool === 'brush') {
      const data = this.getNewDrawingData(position);
      this.collection.push(data);
      this.draw();
    }

    // Standard left-click handling
    super._onClickLeft(event);
  }

  /** @override */
  _onDragLeftStart(event: InteractionEvent): void {
    log(LogLevel.INFO, '_onDragLeftStart createState', event.data.createState);

    // @ts-expect-error definition missing
    const grandparentCall = PlaceablesLayer.prototype._onDragLeftStart.bind(this);
    grandparentCall(event);

    // the last TileSplat in the collection should be the one just created by _onClickLeft
    const data = this.collection.pop();

    // recreate it as our preview
    const previewSplat = new TileSplat(data);
    previewSplat.name = 'Preview Splat';
    event.data.preview = this.preview.addChild(previewSplat);
    previewSplat.draw();
  }

  /** @override */
  _onDragLeftMove(event: InteractionEvent): void {
    const { preview, createState } = event.data;
    log(LogLevel.INFO, '_onDragLeftMove createState', createState);
    if (!preview) return;
    if (preview.parent === null) {
      // In theory this should never happen, but rarely does
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
  _onDragLeftDrop(event: InteractionEvent): void {
    const object = event.data.preview;
    if (object) {
      object.zIndex = object.z || 0;
      this.collection.push(object.data);
      this.draw();
    }
    // now that we have saved the finished splat we wipe our preview
    this.preview.removeChildren().forEach((c: PIXI.Container) => c.destroy({ children: true }));
  }

  /** @override */
  async draw(): Promise<BloodLayer> {
    this.objects.removeChildren().forEach((c: PIXI.Container) => c.destroy({ children: true }));
    // Create and draw objects
    if (!this.collection || !this.collection.length) return;

    const promises = this.collection.map((data) => {
      const obj = this.createObject(data);
      return obj.draw();
    });

    // Wait for all objects to draw
    this.visible = true;
    await Promise.all(promises);
    return this;
  }

  /**
   * Draw a single placeable object
   * @return {PlaceableObject}
   */
  createObject(data: TileSplatData): TileSplat {
    const obj = new TileSplat(data);
    obj.zIndex = data.z || 0;
    this.objects.addChild(obj);
    log(LogLevel.DEBUG, 'createObject', obj.id, obj.data._id);
    return obj;
  }

  /**
   * Toggles visibility of primary layer
   */
  toggle() {
    const v = this.getSetting(false, 'visible');
    this.visible = !v;
    this.setSetting(true, 'visible', !v);
  }

  /**
   * Wipes all Blood Layer splats
   */
  wipe(): void {
    this.objects.removeChildren().forEach((c: PIXI.Container) => c.destroy({ children: true }));
    this.preview.removeChildren().forEach((c: PIXI.Container) => c.destroy({ children: true }));
    this.collection = [];
  }

  /** @override */
  async activate(): Promise<BloodLayer> {
    this.loadSceneSettings();

    // const promises = [];
    // Object.keys(this.DEFAULTS).map((key: string) => {
    //   promises.push(game.user.unsetFlag(MODULE_ID, key), canvas.scene.unsetFlag(MODULE_ID, key));
    // });

    // await Promise.all(promises);

    // Set default flags if they dont exist already
    // if (game.user.isGM) {
    //   Object.keys(this.DEFAULTS).forEach((key) => {
    //     // Check for existing scene specific setting
    //     if (this.getSetting(key) !== undefined) return;
    //     // Check for custom default
    //     const def = this.getUserSetting(key);
    //     // If user has custom default, set it for scene
    //     if (def !== undefined) this.setSetting(key, def);
    //     // Otherwise fall back to module default
    //     else this.setSetting(key, this.DEFAULTS[key]);
    //   });
    // }

    CanvasLayer.prototype.activate.apply(this);
    this.objects.visible = true;
    this.objects.children.forEach((t: TileSplat) => t.refresh());
    return this;
  }

  /* -------------------------------------------- */

  /** @override */
  deactivate(): BloodLayer {
    CanvasLayer.prototype.deactivate.apply(this);
    if (this.objects) this.objects.visible = true;
    //@ts-expect-error definition missing
    this.releaseAll();
    this.objects.children.forEach((t: TileSplat) => t.refresh());
    if (this.preview) this.preview.removeChildren();
    return this;
  }

  async deleteMany(data: string[] | string, options = {}): Promise<void> {
    const collection = this.collection;
    const user = game.user;

    // Structure the input data
    data = data instanceof Array ? data : [data];
    const ids = new Set(data);

    this.collection = collection.filter((splat) => !ids.has(splat._id));
    this.draw();
  }

  async updateMany(data: Partial<TileSplatData>, options = {} as { diff: boolean }): Promise<void> {
    this.updateNonEmbeddedEntity(data, options);
  }

  public updateNonEmbeddedEntity(
    data: Partial<TileSplatData> | Partial<TileSplatData>[],
    options = {} as { diff: boolean },
  ): void {
    const user = game.user;
    options = mergeObject({ diff: true }, options);

    // Structure the update data
    const pending = new Map();
    const updateData = data instanceof Array ? data : [data];
    for (const d of updateData) {
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

      // Stage the update
      arr.push(update);
      return arr;
    }, []);
    if (!updates.length) return;

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

  get brushStyle(): SplatStyle {
    return {
      fontFamily: this.brushSettings.brushFont,
      fontSize: this.brushSettings.brushSize,
      fill: hexToRGBAString(parseInt(this.brushSettings.brushColor.slice(1), 16), this.brushSettings.brushAlpha),
      align: 'center',
    };
  }

  getSetting(getFromFlag: boolean, name: string): any {
    if (!getFromFlag) {
      log(LogLevel.INFO, 'getSetting', name, this.brushSettings[name]);
      return this.brushSettings[name];
    }
    const setting = canvas.scene.getFlag(MODULE_ID, name);
    log(LogLevel.INFO, 'getSetting getFromFlag', name, setting);
    return setting;
  }

  async setSetting(saveToFlag: boolean, name: string, value: any): Promise<Scene> {
    this.brushSettings[name] = value;
    log(LogLevel.INFO, 'setSetting brushSettings', name, value);
    if (!saveToFlag) return;
    log(LogLevel.INFO, 'setSetting setFlag');
    return await canvas.scene.setFlag(MODULE_ID, name, value);
  }

  loadSceneSettings(): void {
    Object.keys(this.DEFAULTS).forEach((name) => {
      if (this.getSetting(true, name) !== undefined) this.brushSettings[name] = this.getSetting(true, name);
    });
  }

  /**
   * Get initial data for a new drawing.
   * Start with some global defaults, apply user default config, then apply mandatory overrides per tool.
   * @param {Object} origin     The initial coordinate
   * @return {Object}           The new drawing data
   * @private
   */
  getNewDrawingData(origin: PIXI.Point): TileSplatData {
    const textStyle = new PIXI.TextStyle(this.brushStyle);
    const font = splatFonts.fonts[this.brushStyle.fontFamily];
    const defaults = duplicate(this.DEFAULTS_TILESPLAT);

    const tileData = mergeObject(defaults, {
      // each splat has at least one drip
      drips: BloodNGuts.generateDrips(
        textStyle,
        font,
        this.brushSettings.brushDensity,
        this.brushSettings.brushSpread,
        new PIXI.Point(0),
      ),
      styleData: this.brushStyle,
      x: origin.x,
      y: origin.y,
    } as TileSplatData);

    // Mandatory additions
    tileData.author = game.user._id;
    return tileData;
  }

  createBrushControls(): void {
    // @ts-expect-error bad def
    this.brushControls = new BrushControls().render(true);
  }
}

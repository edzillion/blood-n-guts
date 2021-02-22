import { BloodNGuts } from '../blood-n-guts';
import { MODULE_ID } from '../constants';
import TileSplat from './TileSplat';
import { getPointOnCurve, getRandomBoxMuller, getRandomGlyph, getRGBA, getUID } from '../module/helpers';
import { log, LogLevel } from '../module/logging';
import * as splatFonts from '../data/splatFonts';
import BrushControls from './BrushControls';
import SplatToken from './SplatToken';

//@ts-expect-error missing definition
export default class BloodLayer extends TilesLayer {
  layer: PIXI.Container;
  DEFAULTS: BrushSettings;
  DEFAULTS_TILESPLAT: TileSplatData;
  brushControls: BrushControls;
  brushSettings: BrushSettings;
  objects: PIXI.Container;
  preview: PIXI.Container;
  visible: boolean;
  pointer: number;
  historyBuffer: Array<TileSplatData>;
  lock: boolean;
  commitTimer: NodeJS.Timeout;
  zOrderCounter: number;
  constructor() {
    super();

    this._registerKeyboardListeners();

    this.zOrderCounter = 0;

    this.pointer = 0;
    this.historyBuffer = [];

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
      alpha: 1,
      width: 1,
      height: 1,
      // @ts-expect-error bad def
      scale: 1,
      x: 0,
      y: 0,
      z: 0,
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
    Hooks.on('updateScene', (scene, data) => this.updateSceneHandler(scene, data));
    // this.layer = BloodLayer.getCanvasContainer();
    // this.addChild(this.layer);
  }

  initialize(): void {
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
    this.preview.alpha = this.DEFAULTS.previewAlpha;
  }

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
    // Don't allow new action if history push still in progress
    if (this.historyBuffer.length > 0) return;

    const position = event.data.getLocalPosition(canvas.app.stage);
    // Round positions to nearest pixel
    position.x = Math.round(position.x);
    position.y = Math.round(position.y);

    if (game.activeTool === 'brush') {
      const spread = new PIXI.Point(canvas.grid.size * this.brushSettings.brushSpread);
      const amount = this.brushSettings.brushDensity;
      const font = splatFonts.fonts[this.brushStyle.fontFamily];

      const data = this.getNewSplatData(amount, font, position, spread, this.brushStyle);
      log(LogLevel.INFO, 'adding tileSplat to historyBuffer, id: ', data.id);
      this.historyBuffer.push(data);
      this.commitTimer = setTimeout(() => {
        this.commitHistory();
      }, 300);
    }

    // Standard left-click handling
    super._onClickLeft(event);
  }

  /** @override */
  _onDragLeftStart(event: InteractionEvent): void {
    log(LogLevel.INFO, '_onDragLeftStart createState', event.data.createState);

    clearTimeout(this.commitTimer);

    // @ts-expect-error definition missing
    const grandparentCall = PlaceablesLayer.prototype._onDragLeftStart.bind(this);
    grandparentCall(event);

    // the first TileSplat in the buffer should be the one just created by _onClickLeft
    const data = this.historyBuffer[0];
    this.objects.children.forEach((splat: TileSplat) => {
      if (data.id === splat.id) this.objects.removeChild(splat);
    });

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
      this.historyBuffer.push(object.data);
      this.commitHistory();
    }
    // now that we have saved the finished splat we wipe our preview
    this.preview.removeChildren().forEach((c: PIXI.Container) => c.destroy({ children: true }));
  }

  /** @override */
  async draw(): Promise<BloodLayer> {
    this.objects.removeChildren().forEach((c: PIXI.Container) => c.destroy({ children: true }));
    // Create and draw objects
    const history = canvas.scene.getFlag(MODULE_ID, 'history');
    if (!history || history.events.length === 0) return;
    const promises = history.events.map((data) => {
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
    if (data.z != null) {
      obj.zIndex = data.z;
    } else log(LogLevel.ERROR, 'createObject missing z property!');

    this.objects.addChild(obj);
    log(LogLevel.DEBUG, 'createObject', obj.id, obj.data._id);
    return obj;
  }

  /**
   * Toggles visibility of primary layer
   */
  toggle(): void {
    const v = this.getSetting(false, 'visible');
    this.visible = !v;
    this.setSetting(true, 'visible', !v);
  }

  /** @override */
  async activate(): Promise<BloodLayer> {
    this.loadSceneSettings();

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

  async deleteMany(data: string[] | string): Promise<void> {
    // todo: do I need to check splat ownership before deleting
    // const user = game.user;

    await this.deleteFromHistory(data);

    // @ts-expect-error todo this
    if (this.hud) this.hud.clear();
    // @ts-expect-error todo this
    this.releaseAll();
  }

  async updateMany(data: Partial<TileSplatData>, options = {} as { diff: boolean }): Promise<void> {
    this.updateNonEmbeddedEntity(data, options);
  }

  public updateNonEmbeddedEntity(
    data: Partial<TileSplatData> | Partial<TileSplatData>[],
    options = {} as { diff: boolean },
  ): void {
    // todo: do I need to check splat ownership before updating
    // const user = game.user;
    options = mergeObject({ diff: true }, options);

    // Structure the update data
    const pending = new Map();
    const updateData = data instanceof Array ? data : [data];
    for (const d of updateData) {
      if (!d._id) throw new Error('You must provide an id for every Embedded Entity in an update operation');
      pending.set(d._id, d);
    }

    // Difference each update against existing data
    const history = canvas.scene.getFlag(MODULE_ID, 'history');
    const updates = history.events.reduce((arr, d) => {
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
      s._onUpdate(update);
    });
  }

  get brushStyle(): SplatStyle {
    return {
      fontFamily: this.brushSettings.brushFont,
      fontSize: this.brushSettings.brushSize,
      fill: hexToRGBAString(parseInt(this.brushSettings.brushColor.slice(1), 16), this.brushSettings.brushAlpha),
      align: 'center',
    };
  }

  getSetting(getFromFlag: boolean, name: string): unknown {
    if (!getFromFlag) {
      log(LogLevel.INFO, 'getSetting', name, this.brushSettings[name]);
      return this.brushSettings[name];
    }
    const setting = canvas.scene.getFlag(MODULE_ID, name);
    log(LogLevel.INFO, 'getSetting getFromFlag', name, setting);
    return setting;
  }

  async setSetting(saveToFlag: boolean, name: string, value: unknown): Promise<Scene> {
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
  private getNewSplatData(
    amount: number,
    font: SplatFont,
    origin: PIXI.Point,
    spread: PIXI.Point,
    style: SplatStyle,
  ): TileSplatData {
    const defaults = duplicate(this.DEFAULTS_TILESPLAT);

    const tileData = mergeObject(defaults, {
      // each splat has at least one drip
      drips: this.generateDrips(new PIXI.TextStyle(style), font, amount, spread, new PIXI.Point(0)),
      styleData: style,
      x: origin.x,
      y: origin.y,
      z: 100 + this.zOrderCounter++,
      id: getUID(),
    } as TileSplatData);

    // Mandatory additions
    tileData.author = game.user._id;
    return tileData;
  }

  createBrushControls(): void {
    // @ts-expect-error bad def
    this.brushControls = new BrushControls().render(true);
  }

  /**
   * Generate splats on the floor beneath a token.
   * @category GMOnly
   * @function
   * @param {Token} token - the token to generate splats for.
   * @param {SplatFont} font - the font to use for splats.
   * @param {number} size - the size of splats.
   * @param {number} density - the amount of splats.
   * @param {number} spread - the distance from centre point to spread the splats.
   */
  public generateFloorSplats(
    color: string,
    font: SplatFont,
    size: number,
    amount: number,
    spread: PIXI.Point,
    origin: PIXI.Point,
  ): TileSplatData {
    if (amount < 1) return;
    log(LogLevel.DEBUG, 'generateFloorSplats fontSize', size);
    const styleData = {
      fontFamily: font.name,
      fontSize: size,
      fill: color,
      align: 'center',
    };
    const tileSplatData: TileSplatData = this.getNewSplatData(amount, font, origin, spread, styleData);
    tileSplatData.name = 'Floor Splat';
    log(LogLevel.INFO, 'adding tileSplat to historyBuffer, id: ', tileSplatData.id);
    this.historyBuffer.push(tileSplatData);
  }

  /**
   * Generate splats in a trail on the floor behind a moving token.
   * @category GMOnly
   * @function
   * @param {Token} token - the token to generate splats for.
   * @param {SplatFont} font - the font to use for splats.
   * @param {number} size - the size of splats.
   * @param {number[]} distances - distances along the trail from 0 to 1.
   * @param {number} spread - the distance from centre point to spread the splats.
   */
  public generateTrailSplats(
    splatToken: SplatToken,
    font: SplatFont,
    size: number,
    amount: number,
    spread: number,
  ): void {
    if (amount < 1) return;
    log(LogLevel.DEBUG, 'generateTrailSplats');

    const tileSplatData: Partial<TileSplatData> = {};
    tileSplatData.drips = [];
    tileSplatData.styleData = {
      fontFamily: font.name,
      fontSize: size,
      fill: splatToken.tokenSettings.bloodColor,
      align: 'center',
    };
    const style = new PIXI.TextStyle(tileSplatData.styleData);

    const distances: number[] = [];
    for (let i = 1 / amount; i <= 1; i += 1 / amount) {
      distances.push(i);
    }

    const randSpread = getRandomBoxMuller() * spread - spread / 2;
    const start = new PIXI.Point(-splatToken.movePos.x / 2, -splatToken.movePos.y / 2);
    const control = new PIXI.Point(splatToken.direction.y * randSpread, splatToken.direction.x * randSpread);
    const end = new PIXI.Point(splatToken.movePos.x / 2, splatToken.movePos.y / 2);
    log(LogLevel.INFO, 'generateTrailSplats ', start, control, end, randSpread);

    // randomise endPt of curve
    const forwardOffset = Math.abs(getRandomBoxMuller() * canvas.grid.size - canvas.grid.size / 2);
    const lateralOffset = getRandomBoxMuller() * forwardOffset - forwardOffset / 2;
    if (splatToken.direction.x === 0 || splatToken.direction.y == 0) {
      end.x += lateralOffset * splatToken.direction.y;
      end.y += lateralOffset * splatToken.direction.x;
    } else {
      end.x += lateralOffset * splatToken.direction.x;
      end.y += lateralOffset * -splatToken.direction.y;
    }
    end.x = Math.round(end.x);
    end.y = Math.round(end.y);

    // get random glyphs
    const glyphArray: Array<string> = Array.from({ length: distances.length }, () => getRandomGlyph(font));

    // create our drips for later drawing.
    for (let i = 0; i < glyphArray.length; i++) {
      const glyph = glyphArray[i];
      const tm = PIXI.TextMetrics.measureText(glyph, style);
      const pt = getPointOnCurve(start, control, end, distances[i]);
      tileSplatData.drips.push({
        x: Math.round(pt.x),
        y: Math.round(pt.y),
        angle: Math.round(Math.random() * 360),
        width: tm.width,
        height: tm.height,
        glyph: glyph,
      });
    }
    log(LogLevel.DEBUG, 'generateTrailSplats tileSplatData.drips', tileSplatData.drips);

    const tokenCenter = splatToken.getCenter();
    tileSplatData.offset = new PIXI.Point(0);
    tileSplatData.x = tokenCenter.x - splatToken.movePos.x / 2;
    tileSplatData.y = tokenCenter.y - splatToken.movePos.y / 2;
    tileSplatData.z = 100 + this.zOrderCounter++;
    tileSplatData.height = 1;
    tileSplatData.width = 1;
    tileSplatData.id = getUID();

    tileSplatData.name = 'Trail Splat';
    log(LogLevel.INFO, 'adding tileSplat to historyBuffer, id: ', tileSplatData.id);
    this.historyBuffer.push(tileSplatData as TileSplatData);
  }

  /**
   * Generate splats on the floor beneath a token.
   * @category GMOnly
   * @function
   * @param {Token} token - the token to generate splats for.
   * @param {SplatFont} font - the font to use for splats.
   * @param {number} size - the size of splats.
   * @param {number} density - the amount of splats.
   * @param {number} spread - the distance from centre point to spread the splats.
   */
  public generateDrips(
    style: PIXI.TextStyle,
    font: SplatFont,
    amount: number,
    spread: PIXI.Point,
    origin: PIXI.Point,
  ): SplatDripData[] {
    if (amount < 1) return;
    log(LogLevel.DEBUG, 'generateDrips');

    const drips: SplatDripData[] = [];

    // get a random glyph and then get a random (x,y) spread away from the token.
    const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
    log(LogLevel.DEBUG, 'generateDrips density', amount);
    log(LogLevel.DEBUG, 'generateDrips pixelSpread', spread.x, spread.y);

    // create our splats for later drawing.
    glyphArray.forEach((glyph) => {
      const tm = PIXI.TextMetrics.measureText(glyph, style);
      const randX = (getRandomBoxMuller() * 2 - 1) * spread.x;
      const randY = (getRandomBoxMuller() * 2 - 1) * spread.y;
      const dripData: SplatDripData = {
        x: Math.round(origin.x + randX),
        y: Math.round(origin.y + randY),
        angle: Math.round(Math.random() * 360),
        width: Math.round(tm.width),
        height: Math.round(tm.height),
        glyph: glyph,
      };
      drips.push(dripData);
    });

    return drips;
  }

  /**
   * Gets a brush using the given parameters, renders it to mask and saves the event to history
   * @param data {Object}       A collection of brush parameters
   * @param save {Boolean}      If true, will add the operation to the history buffer
   */
  renderTileSplat(data: TileSplatData, save = true): void {
    this.createObject(data).draw();
    if (save) this.historyBuffer.push(data);
  }

  /**
   * Renders the history stack to the layer
   * @param history {Array}       A collection of history events
   * @param start {Number}        The position in the history stack to begin rendering from
   * @param start {Number}        The position in the history stack to stop rendering
   */
  renderHistory(
    history = canvas.scene.getFlag(MODULE_ID, 'history'),
    start = this.pointer,
    stop = canvas.scene.getFlag(MODULE_ID, 'history.pointer'),
  ): void {
    // If history is blank, do nothing
    if (history === undefined) return;
    // If history is zero, reset scene fog
    if (history.events.length === 0) this.wipeLayer(false);
    if (start === undefined) start = 0;
    if (stop === undefined) stop = history.events.length;
    // If pointer preceeds the stop, reset and start from 0
    if (stop <= start) {
      this.wipeLayer(false);
      start = 0;
    }

    const updatedSplatTokenIds = [];
    log(LogLevel.INFO, `Rendering from: ${start} to ${stop}`);
    // Render all ops starting from pointer
    for (let i = start; i < stop; i += 1) {
      // skip TokenSplats
      if (history.events[i].tokenId) {
        updatedSplatTokenIds.push(history.events[i].tokenId);
        continue;
      }
      this.renderTileSplat(history.events[i], false);
    }
    new Set(updatedSplatTokenIds).forEach((id) => {
      const st = BloodNGuts.splatTokens[id];
      st.draw();
    });

    // Update local pointer
    this.pointer = stop;
  }

  /**
   * Add buffered history stack to scene flag and clear buffer
   */
  async commitHistory(): Promise<void> {
    // Do nothing if no history to be committed, otherwise get history
    if (this.historyBuffer.length === 0) return;
    if (this.lock) return;
    this.lock = true;
    let history = canvas.scene.getFlag(MODULE_ID, 'history');
    const maxPoolSize = game.settings.get(MODULE_ID, 'sceneSplatPoolSize');
    // If history storage doesnt exist, create it
    if (!history) {
      history = {
        events: [],
        pointer: 0,
      };
    }
    // Push the new history buffer to the scene
    history.events.push(...this.historyBuffer);
    history.pointer = history.events.length;

    if (history.events.length > maxPoolSize) {
      // remove the oldest splats
      const numToRemove = history.events.length - maxPoolSize;
      log(LogLevel.INFO, 'renderHistory truncating history ', numToRemove);
      history.events
        .splice(0, numToRemove)
        .filter((e) => e.tokenId)
        .forEach((e) => {
          const splatToken = BloodNGuts.splatTokens[e.tokenId];
          // this will wipe all splats on the splatToken but any remaining will be readded on renderHistory()
          splatToken.wipeSplats();
        });
      // setting the pointer to <= this.pointer will reset the history and render all
      history.pointer = history.events.length;
    }

    const startFadingPointer = Math.round(maxPoolSize * 0.85);
    const startVeryFadingPointer = Math.round(maxPoolSize * 0.95);
    if (history.events.length > startFadingPointer) {
      const numToFade = history.events.length - startFadingPointer;
      let numToVeryFade = history.events.length - startVeryFadingPointer;
      if (numToVeryFade < 1) numToVeryFade = 1;
      history.events.slice(0, numToVeryFade).forEach((event) => {
        event.alpha = 0.15;
        this.pointer = history.pointer;
      });
      history.events.slice(numToVeryFade, numToVeryFade + numToFade).forEach((event) => {
        event.alpha = 0.45;
        this.pointer = history.pointer;
      });
    }

    await canvas.scene.unsetFlag(MODULE_ID, 'history');
    await canvas.scene.setFlag(MODULE_ID, 'history', history);
    log(LogLevel.INFO, `Pushed ${this.historyBuffer.length} updates.`);
    // Clear the history buffer
    this.historyBuffer = [];
    this.lock = false;
  }

  async deleteFromHistory(data: string[] | string): Promise<void> {
    // Structure the input data
    data = data instanceof Array ? data : [data];
    if (data.length < 1) return;
    const ids = new Set(data);

    const history = canvas.scene.getFlag(MODULE_ID, 'history');
    history.events = history.events.filter((splat) => !ids.has(splat.id) && !ids.has(splat.tokenId));
    history.pointer = history.events.length;

    await canvas.scene.unsetFlag(MODULE_ID, 'history');
    await canvas.scene.setFlag(MODULE_ID, 'history', history);
    log(LogLevel.INFO, `deleteFromHistory: size now ${history.events.length}.`);
  }

  /**
   * Wipes all blood splats from the layer
   * @param save {Boolean} If true, also wipes the layer history
   */
  async wipeLayer(save: boolean): Promise<void> {
    this.objects.removeChildren().forEach((c: PIXI.Container) => c.destroy({ children: true }));
    this.preview.removeChildren().forEach((c: PIXI.Container) => c.destroy({ children: true }));
    if (save) {
      await canvas.scene.unsetFlag(MODULE_ID, 'history');
      await canvas.scene.setFlag(MODULE_ID, 'history', { events: [], pointer: 0 });
      this.pointer = 0;
    }
  }

  /**
   * Steps the history buffer back X steps and redraws
   * @param steps {Integer} Number of steps to undo, default 1
   */
  async undo(steps = 1): Promise<void> {
    log(LogLevel.INFO, `Undoing ${steps} steps.`);
    // Grab existing history
    // Todo: this could probably just grab and set the pointer for a slight performance improvement
    let history = canvas.scene.getFlag(MODULE_ID, 'history');
    if (!history) {
      history = {
        events: [],
        pointer: 0,
      };
    }
    let newpointer = this.pointer - steps;
    if (newpointer < 0) newpointer = 0;

    // Set new pointer & update history
    history.pointer = newpointer;

    // If pointer is less than history length (f.x. user undo), truncate history
    if (history.events.length > history.pointer) {
      // if any are TokenSplats then remove from SplatToken
      const tokenSplatsToRemove = {};
      history.events.slice(history.pointer).forEach((s) => {
        if (!tokenSplatsToRemove[s.tokenId]) tokenSplatsToRemove[s.tokenId] = [s.id];
        else tokenSplatsToRemove[s.tokenId].push(s.id);
      });

      for (const tokenId in tokenSplatsToRemove) {
        const splatToken = BloodNGuts.splatTokens[tokenId];
        if (!splatToken) log(LogLevel.ERROR, 'undo() token not found!');
        const splats = splatToken.tokenSplats.filter((s) => !tokenSplatsToRemove[tokenId].includes(s.id));
        splatToken.token.update({ flags: { [MODULE_ID]: { splats: splats } } }, { diff: false });
      }
      history.events = history.events.slice(0, history.pointer);
    }

    await canvas.scene.unsetFlag(MODULE_ID, 'history');
    await canvas.scene.setFlag(MODULE_ID, 'history', history);
  }

  /**
   * Adds the keyboard listeners to the layer
   */
  _registerKeyboardListeners(): void {
    $(document).keydown((event: JQuery.KeyDownEvent) => {
      // Only react if simplefog layer is active
      // @ts-expect-error missing def
      if (ui.controls.activeControl !== 'blood') return;
      // Don't react if game body isn't target
      if (event.target.tagName !== 'BODY') return;
      // if (event.which === 219 && game.activeTool === 'brush') {
      //   const s = this.getUserSetting('brushSize');
      //   this.setBrushSize(s * 0.8);
      // }
      // if (event.which === 221 && this.activeTool === 'brush') {
      //   const s = this.getUserSetting('brushSize');
      //   this.setBrushSize(s * 1.25);
      // }
      // React to ctrl+z
      if (event.which === 90 && event.ctrlKey) {
        event.stopPropagation();
        this.undo();
      }
    });
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * React to updates of canvas.scene flags
   */
  updateSceneHandler(scene: Scene, data: Record<string, unknown>): void {
    // Check if update applies to current viewed scene
    // @ts-expect-error missing definition
    if (!scene._view) return;
    // React to visibility change
    if (hasProperty(data, `flags.${MODULE_ID}.visible`)) {
      canvas.blood.visible = data.flags[MODULE_ID].visible;
    }
    // React to composite history change
    if (hasProperty(data, `flags.${MODULE_ID}.history`)) {
      canvas.blood.renderHistory(data.flags[MODULE_ID].history);
    }
  }
}

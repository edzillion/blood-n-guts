import { BloodNGuts } from '../blood-n-guts';
import { MODULE_ID } from '../constants';
import TileSplat from './TileSplat';
import { getPointOnCurve, getRandomBoxMuller, getRandomGlyph, getHexColor, getUID } from '../module/helpers';
import { log, LogLevel } from '../module/logging';
import * as splatFonts from '../data/splatFonts';
import BrushControls from './BrushControls';
import SplatToken from './SplatToken';

//@ts-expect-error missing definition
export default class BloodLayer extends TilesLayer {
  DEFAULTS_BRUSHSETTINGS: BrushSettings;
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

    this.DEFAULTS_BRUSHSETTINGS = {
      brushColor: '#8A0707',
      brushDensity: 1,
      brushFlow: 75,
      brushFont: 'splatter',
      brushSize: 50,
      brushSpread: 1.0,
      previewAlpha: 0.4,
      visible: true,
    };

    this.brushSettings = duplicate(this.DEFAULTS_BRUSHSETTINGS);

    this.DEFAULTS_TILESPLAT = {
      alpha: 0.75,
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
        fill: getHexColor('blood'),
        align: 'center',
      },
      offset: new PIXI.Point(0),
    };

    // React to changes to current scene
    Hooks.on('updateScene', (scene, data) => this.updateSceneHandler(scene, data));
  }

  /**
   * Initialize blood layer, creates containers and adds them to layer.
   * Called on `canvasInit`.
   * @category GMOnly
   * @function
   */
  initialize(): void {
    log(LogLevel.INFO, 'Initializing Blood Layer');
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
    this.preview = this.addChild(prevCont);
    this.preview.alpha = this.DEFAULTS_BRUSHSETTINGS.previewAlpha;

    this.cleanHistory();
  }

  /**
   * Get layerOptions, used by Foundry
   * @category Foundry
   * @function
   * @returns {LayerOptions}
   * @override
   * @see {TilesLayer#layerOptions}
   */
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

  /**
   * Accessor to get current brush style.
   * @category GMOnly
   * @function
   * @returns {SplatStyle}
   */
  get brushStyle(): SplatStyle {
    return {
      fontFamily: this.brushSettings.brushFont,
      fontSize: this.brushSettings.brushSize,
      fill: this.brushSettings.brushColor,
      align: 'center',
    };
  }

  /**
   * Draw the blood layer, only called by Foundry.
   * @category Foundry
   * @function
   * @async
   * @returns {Promise<BloodLayer>}
   * @override
   * @see {PlaceablesLayer#draw}
   */
  async draw(): Promise<BloodLayer> {
    // it seems that we need to initialize every time we draw()
    this.initialize();
    this.objects.removeChildren().forEach((c: PIXI.Container) => c.destroy({ children: true }));
    // Create and draw objects
    const history = canvas.scene.getFlag(MODULE_ID, 'history');
    log(LogLevel.INFO, 'BloodLayer draw: history size ' + history?.events?.length);
    if (!history || history.events.length === 0) return;
    const promises = history.events.map((data) => {
      if (data.tokenId) return;
      const obj = this.createObject(data);
      return obj.draw();
    });

    // Wait for all objects to draw
    this.visible = true;
    await Promise.all(promises);
    this.pointer = history.events.length;
    return this;
  }

  /**
   * Draw a single TileSplat
   * @category GMandPC
   * @function
   * @param {TileSplatData} data
   * @returns {TileSplat}
   * @override
   * @see {PlaceablesLayer#createObject}
   */
  createObject(data: TileSplatData): TileSplat {
    if (this.objects.children.map((splat: TileSplat) => splat.id).includes(data.id)) {
      log(LogLevel.WARN, 'createObject: TileSplat already present!', data.id);
      return;
    }
    // if (alreadyAdded) debugger;
    const obj = new TileSplat(data);
    if (data.zIndex == null) {
      log(LogLevel.ERROR, 'createObject missing zIndex property!');
    }
    this.objects.addChild(obj);
    log(LogLevel.DEBUG, 'createObject', obj.id);
    return obj;
  }

  /**
   * Toggle blood layer visiblity, does not affect TileSplats as they are on SplatTokens
   * @category GMOnly
   * @function
   */
  toggle(): void {
    const v = this.getSetting(false, 'visible');
    this.visible = !v;
    this.setSetting(true, 'visible', !v);
  }

  /**
   * Activate blood layer, called by Foundry when nagivating to blood layer.
   * @category Foundry
   * @function
   * @async
   * @returns {Promise<BloodLayer>}
   * @override
   * @see {PlaceablesLayer#activate}
   */
  async activate(): Promise<BloodLayer> {
    this.loadSceneSettings();
    CanvasLayer.prototype.activate.apply(this);
    this.objects.visible = true;
    this.objects.children.forEach((t: TileSplat) => t.refresh());
    return this;
  }

  /**
   * Deactivate blood layer, called by Foundry when nagivating away from blood layer.
   * @category Foundry
   * @function
   * @returns {BloodLayer}
   * @override
   * @see {TilesLayer#deactivate}
   */
  deactivate(): BloodLayer {
    CanvasLayer.prototype.deactivate.apply(this);
    if (this.objects) this.objects.visible = true;
    //@ts-expect-error definition missing
    this.releaseAll();
    this.objects.children.forEach((t: TileSplat) => t.refresh());
    if (this.preview) this.preview.removeChildren();
    return this;
  }

  /**
   * Create and render the `BrushControls` onto the canvas. Called when navigating to the blood layer.
   * @category GMOnly
   * @function
   */
  createBrushControls(): void {
    log(LogLevel.DEBUG, 'createBrushControls');
    // @ts-expect-error bad def
    this.brushControls = new BrushControls().render(true);
  }

  /**
   * Delete Splats from history, close hud and release control of all splats.
   * @category GMOnly
   * @function
   * @async
   * @param {string|string[]} data - list of splat ids to delete
   * @override
   * @see {PlaceablesLayer#deleteMany}
   */
  async deleteMany(data: string[] | string): Promise<void> {
    log(LogLevel.DEBUG, 'deleteMany');
    // todo: do I need to check splat ownership before deleting
    // const user = game.user;

    await this.deleteFromHistory(data);

    // @ts-expect-error missing definition
    if (this.hud) this.hud.clear();
    // @ts-expect-error missing definition
    this.releaseAll();
  }

  /**
   * Update TileSplats on the blood layer, calls `updateNonEmbeddedEnties()`.
   * @category Foundry
   * @function
   * @param {Partial<TileSplatData>|Partial<TileSplatData>[]} data - update data
   * @param options - update options
   * @override
   * @see {PlaceablesLayer#updateMany}
   */
  public updateMany(data: Partial<TileSplatData>, options = {} as { diff: boolean }): void {
    this.updateNonEmbeddedEnties(data, options);
  }

  /**
   * Update TileSplats on the blood layer. Calls `_onUpdate` on each updated `TileSplat`.
   * @category Foundry
   * @function
   * @param {Partial<TileSplatData>|Partial<TileSplatData>[]} data - updated TileSplatDatas
   * @param options - update options
   */
  public updateNonEmbeddedEnties(
    data: Partial<TileSplatData> | Partial<TileSplatData>[],
    options = {} as { diff: boolean },
  ): void {
    log(LogLevel.DEBUG, 'updateNonEmbeddedEnties');
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
      log(LogLevel.DEBUG, 'updateNonEmbeddedEnties, updating:', update._id);
      //@ts-expect-error definition missing
      const splat = this.get(update._id);
      splat.data = mergeObject(splat.data, update);
      splat._onUpdate(update);
    });
  }

  /* -------------------------------------------- */
  /*  Layer Settings                              */
  /* -------------------------------------------- */

  /**
   * Get blood brush settings.
   * @category GMOnly
   * @function
   * @param {boolean} getFromFlag - get setting from scene flag
   * @param {string} name - setting name
   * @returns {unknown} - the setting value
   */
  getSetting(getFromFlag: boolean, name: string): unknown {
    log(LogLevel.DEBUG, 'getSetting brushSettings', name, this.brushSettings[name], 'getFromFlag:' + getFromFlag);
    if (!getFromFlag) {
      return this.brushSettings[name];
    }
    const setting = canvas.scene.getFlag(MODULE_ID, name);
    return setting;
  }

  /**
   * Set blood brush setting.
   * @category GMOnly
   * @function
   * @async
   * @param {boolean} saveToFlag - save setting to scene flag
   * @param {string} name - setting name
   * @param {unknown} value - setting value
   * @returns {Promise<Scene>}
   */
  async setSetting(saveToFlag: boolean, name: string, value: unknown): Promise<Scene> {
    log(LogLevel.DEBUG, 'setSetting brushSettings', name, value, 'saveToFlag:' + saveToFlag);
    this.brushSettings[name] = value;
    if (!saveToFlag) return;
    return await canvas.scene.setFlag(MODULE_ID, name, value);
  }

  /**
   * Loads all current brush settings from scene flags, falling back to defaults.
   * @category GMOnly
   * @function
   */
  loadSceneSettings(): void {
    Object.keys(this.DEFAULTS_BRUSHSETTINGS).forEach((name) => {
      const val = this.getSetting(true, name);
      if (val !== undefined) this.brushSettings[name] = val;
    });
  }

  /* -------------------------------------------- */
  /*  Generators                                  */
  /* -------------------------------------------- */

  /**
   * Get initial data for a new TileSplat.
   * @category GMOnly
   * @function
   * @param {number} amount - amount of drips
   * @param {SplatFont} font - splat font
   * @param {PIXI.Point} origin - splat position
   * @param {PIXI.Point} spread - splat spread
   * @param {SplatStyle} style - splat style
   * @return {TileSplatData} - The new TileSplatData
   * @private
   */
  private getNewSplatData(
    amount: number,
    font: SplatFont,
    origin: PIXI.Point,
    spread: PIXI.Point,
    style: SplatStyle,
  ): TileSplatData {
    log(LogLevel.DEBUG, 'getNewSplatData');
    const defaults = duplicate(this.DEFAULTS_TILESPLAT);
    const zIndex = 100 + this.zOrderCounter++;
    const tileData = mergeObject(defaults, {
      // each splat has at least one drip
      drips: this.generateDrips(new PIXI.TextStyle(style), font, amount, spread, new PIXI.Point(0)),
      styleData: style,
      x: origin.x,
      y: origin.y,
      z: zIndex,
      zIndex: zIndex,
      id: getUID(),
    } as TileSplatData);

    // Mandatory additions
    tileData.author = game.user._id;
    return tileData;
  }

  /**
   * Generate splats on the floor beneath a token.
   * @category GMOnly
   * @function
   * @param {string} color - blood color in hex format.
   * @param {SplatFont} font - the font to use for splats.
   * @param {number} size - the size of splats.
   * @param {number} amount - the amount of splats.
   * @param {PIXI.Point} spread - the distance from centre point to spread the splats.
   * @param {PIXI.Point} origin - splat position.
   */
  public generateFloorSplats(
    color: string,
    font: SplatFont,
    size: number,
    amount: number,
    spread: PIXI.Point,
    origin: PIXI.Point,
  ): void {
    if (amount < 1) return;
    log(LogLevel.DEBUG, 'generateFloorSplats');
    const styleData = {
      fontFamily: font.name,
      fontSize: size,
      fill: color,
      align: 'center',
    };
    const tileSplatData: TileSplatData = this.getNewSplatData(amount, font, origin, spread, styleData);
    tileSplatData.name = 'Floor Splat';
    log(LogLevel.DEBUG, 'adding tileSplat to historyBuffer, id: ', tileSplatData.id);
    this.historyBuffer.push(tileSplatData);
  }

  /**
   * Generate splats in a trail on the floor behind a moving token.
   * @category GMOnly
   * @function
   * @param {SplatToken} splatToken - the token to generate splats for.
   * @param {SplatFont} font - the font to use for splats.
   * @param {number} size - the size of splats.
   * @param {number} amount - the amount of splats.
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
    tileSplatData.z = tileSplatData.zIndex = 100 + this.zOrderCounter++;
    tileSplatData.height = 1;
    tileSplatData.width = 1;
    tileSplatData.alpha = 0.75;
    tileSplatData.id = getUID();

    tileSplatData.name = 'Trail Splat';
    log(LogLevel.DEBUG, 'adding tileSplat to historyBuffer, id: ', tileSplatData.id);
    this.historyBuffer.push(tileSplatData as TileSplatData);
  }

  /**
   * Generate drips for a TileSplat.
   * @category GMOnly
   * @function
   * @param {PIXI.TextStyle} style - drip splat style.
   * @param {SplatFont} font - the font to use for drips.
   * @param {number} amount - the amount of drips.
   * @param {PIXI.Point} spread - the distance from centre point to spread the drips.
   * @param {PIXI.Point} origin - position.
   * @returns {SplatDripData[]}
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

  /* -------------------------------------------- */
  /*  Layer History                               */
  /* -------------------------------------------- */

  /**
   * Creates and draws a TileSplat to the blood layer, and optionally saves to scene flags.
   * @category GMandPC
   * @function
   * @param {TileSplatData} data
   * @param {Boolean} [save=true] - If true, will add the operation to the history buffer
   */
  renderTileSplat(data: TileSplatData, save = true): void {
    log(LogLevel.DEBUG, 'renderTileSplat creating id:', data.id);
    this.createObject(data).draw();
    if (save) this.historyBuffer.push(data);
  }

  /**
   * Renders the history stack to the blood layer and SplatTokens.
   * @category GMandPC
   * @function
   * @param {Array<TileSplatData|TokenSplatData>} [history=canvas.scene.getFlag(MODULE_ID, 'history')] - A collection of history events, including `TileSplatData` and `TokenSplatData`
   * @param {number} [start=this.pointer] - The position in the history stack to begin rendering from
   * @param {number} [stop=canvas.scene.getFlag(MODULE_ID, 'history.pointer')] - The position in the history stack to stop rendering
   */
  renderHistory(
    history = canvas.scene.getFlag(MODULE_ID, 'history'),
    start = this.pointer,
    stop = canvas.scene.getFlag(MODULE_ID, 'history.pointer'),
  ): void {
    log(LogLevel.DEBUG, 'renderHistory: size:' + history.events.length);

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
    log(LogLevel.INFO, `renderHistory from: ${start} to ${stop}`);
    // Render all ops starting from pointer
    for (let i = start; i < stop; i += 1) {
      // if it's a TokenSplat don't render instead save id for later draw()
      if (history.events[i].tokenId) {
        updatedSplatTokenIds.push(history.events[i].tokenId);
        continue;
      }
      this.renderTileSplat(history.events[i], false);
    }
    // draw each SplatToken that has entries in history
    new Set(updatedSplatTokenIds).forEach((id) => {
      const st = BloodNGuts.splatTokens[id];
      st.draw();
    });

    // Update local pointer
    this.pointer = stop;
  }

  /**
   * Adds historyBuffer to history, trims history over `maxPoolSize`, fades oldest
   * splats and saves history to scene flags.
   * @category GMOnly
   * @function
   * @async
   */
  async commitHistory(): Promise<void> {
    log(LogLevel.DEBUG, `commitHistory: buffer size ${this.historyBuffer.length}.`);
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
      log(LogLevel.DEBUG, 'commitHistory truncating history ', numToRemove);
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
        // setting the pointer to <= this.pointer will reset the history and render all
        this.pointer = history.pointer;
      });
      history.events.slice(numToVeryFade, numToVeryFade + numToFade).forEach((event) => {
        event.alpha = 0.45;
        // setting the pointer to <= this.pointer will reset the history and render all
        this.pointer = history.pointer;
      });
    }

    await canvas.scene.unsetFlag(MODULE_ID, 'history');
    await canvas.scene.setFlag(MODULE_ID, 'history', history);
    log(LogLevel.DEBUG, `Pushed ${this.historyBuffer.length} updates.`);
    // Clear the history buffer
    this.historyBuffer = [];
    this.lock = false;
  }

  /**
   * Deletes TileSplats and TokenSplats from history, saves to scene flags and resets history.pointer.
   * @category GMOnly
   * @function
   * @async
   * @param {string|string[]} data - list of splat ids
   */
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
    log(LogLevel.DEBUG, `deleteFromHistory: size now ${history.events.length}.`);
  }

  /**
   * Removes all splats from history that are not present in the scene. Does not save to flag.
   * @category GMOnly
   * @function
   * @param {history=canvas.scene.getFlag(MODULE_ID, 'history')} history - layer history
   */
  cleanHistory(history = canvas.scene.getFlag(MODULE_ID, 'history')): void {
    log(LogLevel.DEBUG, 'cleanHistory: size:' + history.events.length);

    // If history is blank, do nothing
    if (history === undefined || history.events.length === 0) return;
    history.events = history.events.filter((e) => !e.tokenId || canvas.tokens.get(e.tokenId));
    history.pointer = history.events.length;
  }

  /**
   * Wipes all blood splats from blood layer.
   * @category GMOnly
   * @function
   * @async
   * @param {boolean} save - If true, also wipes the layer history
   */
  async wipeLayer(save: boolean): Promise<void> {
    log(LogLevel.INFO, 'wipeLayer: wipe history', save);
    this.objects.removeChildren().forEach((c: PIXI.Container) => c.destroy({ children: true }));
    this.preview.removeChildren().forEach((c: PIXI.Container) => c.destroy({ children: true }));
    if (save) {
      await canvas.scene.unsetFlag(MODULE_ID, 'history');
      await canvas.scene.setFlag(MODULE_ID, 'history', { events: [], pointer: 0 });
      this.pointer = 0;
    }
  }

  /**
   * Steps the history buffer back X steps and saves to scene flags.
   * @category GMOnly
   * @function
   * @async
   * @param {number} [steps=1] - Number of steps to undo, default 1
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
        // wipes all splats on the splatToken, but any remaining in history will be redrawn on next renderHistory()
        splatToken.wipeSplats();
      }
      history.events = history.events.slice(0, history.pointer);
    }

    await canvas.scene.unsetFlag(MODULE_ID, 'history');
    await canvas.scene.setFlag(MODULE_ID, 'history', history);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle left click on blood layer, note that left drag will trigger this handler
   * before it triggers the `_onDragLeftStart` handler.
   * @category GMOnly
   * @function
   * @param {InteractionEvent} event
   * @override
   * @see {PlaceablesLayer#_onClickLeft}
   */
  _onClickLeft(event: InteractionEvent): void {
    log(LogLevel.DEBUG, '_onClickLeft');
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
      data.name = 'Brush Splat';
      log(LogLevel.DEBUG, 'adding tileSplat to historyBuffer, id: ', data.id);
      this.historyBuffer.push(data);
      // commit this click unless we upgrade it to a drag
      this.commitTimer = setTimeout(() => {
        this.commitHistory();
      }, 300);
    }

    // Standard left-click handling
    super._onClickLeft(event);
  }

  /**
   * Start a left-click drag workflow originating from the blood layer.
   * @category GMOnly
   * @function
   * @param {InteractionEvent} event
   * @override
   * @see {TilesLayer#_onDragLeftStart}
   */
  _onDragLeftStart(event: InteractionEvent): void {
    log(LogLevel.DEBUG, '_onDragLeftStart');
    // clear our commit timer as we upgrade a click to a drag
    clearTimeout(this.commitTimer);

    // @ts-expect-error definition missing
    const grandparentCall = PlaceablesLayer.prototype._onDragLeftStart.bind(this);
    grandparentCall(event);

    // the first TileSplat in the buffer should be the one just created by _onClickLeft
    const data = this.historyBuffer[0];
    // remove it from objects
    this.objects.children.forEach((splat: TileSplat) => {
      if (data.id === splat.id) this.objects.removeChild(splat);
    });
    // and recreate it as our preview
    const previewSplat = new TileSplat(data);
    previewSplat.name = 'Preview Splat';
    event.data.preview = this.preview.addChild(previewSplat);
    previewSplat.draw();
  }

  /**
   * Continue a left-click drag workflow originating from the blood layer.
   * @category GMOnly
   * @function
   * @param {InteractionEvent} event
   * @override
   * @see {TilesLayer#_onDragLeftStart}
   */
  _onDragLeftMove(event: InteractionEvent): void {
    log(LogLevel.DEBUG, '_onDragLeftMove');
    const { preview, createState } = event.data;
    if (!preview) return;
    if (preview.parent === null) {
      // In theory this should never happen, but sometimes does
      this.preview.addChild(preview);
    }
    if (createState >= 1) {
      preview._onMouseDraw(event);
    }
  }

  /**
   * Conclude a left-click drag workflow originating from the blood layer.
   * @category GMOnly
   * @function
   * @param {InteractionEvent} event
   * @override
   * @see {Canvas#_onDragLeftDrop}
   */
  _onDragLeftDrop(event: InteractionEvent): void {
    log(LogLevel.DEBUG, '_onDragLeftDrop');
    const object = event.data.preview;
    if (object) {
      this.commitHistory();
    }
    // now that we have saved the finished splat we wipe our preview
    this.preview.removeChildren().forEach((c: PIXI.Container) => c.destroy({ children: true }));
  }

  /**
   * Adds the ctrl-z undo keyboard listener to the blood layer.
   * @category GMOnly
   * @function
   */
  _registerKeyboardListeners(): void {
    log(LogLevel.DEBUG, '_registerKeyboardListeners');
    $(document).keydown((event: JQuery.KeyDownEvent) => {
      // Only react if blood layer is active
      // @ts-expect-error missing def
      if (ui.controls.activeControl !== 'blood') return;
      // Don't react if game body isn't target
      if (event.target.tagName !== 'BODY') return;
      // React to ctrl+z
      if (event.which === 90 && event.ctrlKey) {
        event.stopPropagation();
        this.undo();
      }
    });
  }

  /**
   * Handler called when scene data updated. Calls `renderHistory()` on history change.
   * @category GMandPC
   * @function
   * @param {Scene} scene - reference to the current scene
   * @param {Record<string, unknown>} data - data updates
   */
  updateSceneHandler(scene: Scene, data: Record<string, unknown>): void {
    log(LogLevel.DEBUG, 'updateSceneHandler', data);
    // Check if update applies to current viewed scene
    // @ts-expect-error missing definition
    if (!scene._view) return;
    // React to visibility change
    if (hasProperty(data, `flags.${MODULE_ID}.visible`)) {
      this.visible = data.flags[MODULE_ID].visible;
    }
    // React to composite history change
    if (hasProperty(data, `flags.${MODULE_ID}.history`)) {
      this.renderHistory(data.flags[MODULE_ID].history);
    }
  }
}

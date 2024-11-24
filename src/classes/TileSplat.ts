import { computeSightFromPoint } from '../module/helpers';
import { log, LogLevel } from '../module/logging';
import * as splatFonts from '../data/splatFonts';
import BloodLayer from './BloodLayer';
import { getCanvas } from '../module/settings';

/**
 * A Splat is an implementation of PlaceableObject which represents a static piece of artwork or prop within the Scene.
 * Tiles are drawn above the {@link BackroundLayer} but below the {@link TokenLayer}.
 * @extends {PlaceableObject}
 *
 * @example
 * Splat.create({
 *   img: "path/to/tile-artwork.png",
 *   width: 300,
 *   height: 300,
 *   scale: 1,
 *   x: 1000,
 *   y: 1000,
 *   z: 370,
 *   rotation: 45,
 *   hidden: false,
 *   locked: true
 * });
 *
 * @see {@link TilesLayer}
 * @see {@link TileSheet}
 * @see {@link TileHUD}
 */

export default class TileSplat extends Tile {
  private _drawTime: number;

  constructor(data: TileSplatData, scene = getCanvas().scene) {
    super(data, scene);

    /**
     * Internal timestamp for the previous freehand draw time, to limit sampling
     * @type {number}
     * @private
     */
    this._drawTime = 0;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.data._id = this.data.id;
    //todo: why is this necessary?
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (this.data.alpha != null) this.alpha = this.data.alpha;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.style = new PIXI.TextStyle(this.data.styleData);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.font = splatFonts.fonts[this.data.styleData.fontFamily];
  }

  /**
   * Provide a reference to the canvas layer which contains placeable objects of this type
   * @category Foundry
   * @function
   * @returns {PlaceablesLayer}
   * @override
   * @see {PlaceableObject#layer}
   */
  static get layer(): PlaceablesLayer {
    return getCanvas().blood;
  }

  /**
   * Draw the TileSplat
   * @category GMandPC
   * @function
   * @async
   * @returns {Promise<TileSplat>}
   * @override
   * @see {Tile#draw}
   */
  async draw(): Promise<any> {
    log(LogLevel.DEBUG, 'TileSplat draw', this.id);
    this.clear();
    // Create the outer frame for the border and interaction handles
    this.frame = this.addChild(new PIXI.Container());
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.frame.border = this.frame.addChild(new PIXI.Graphics());
    // @ts-expect-error missing definition
    this.frame.handle = this.frame.addChild(new ResizeHandle([1, 1]));

    // Create the tile container and it's child elements
    this.tile = this.addChild(new PIXI.Container());

    this.texture = null;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.tile.img = null;

    this.drawBlood();

    const bounds = this.tile.getLocalBounds();
    const maxDistance = Math.max(bounds.width, bounds.height);
    const center = new PIXI.Point(this.data.x, this.data.y);
    const sight = computeSightFromPoint(center, maxDistance);
    const sightMask = new PIXI.Graphics();
    sightMask.beginFill(1, 1);
    sightMask.drawPolygon(sight);
    sightMask.endFill();
    this.tile.addChild(sightMask);
    this.tile.mask = sightMask;

    // Refresh the current display
    this.refresh();
    // Enable interactivity, only if the Splat is not a preview?
    this.activateListeners();
    return this;
  }

  /**
   * Refresh the current display state of the TileSplat
   * @category GMandPC
   * @function
   * @returns {TileSplat}
   * @override
   * @see {Tile#refresh}
   */
  refresh(): any {
    log(LogLevel.DEBUG, 'TileSplat refresh', this.id);
    // Determine shape bounds and update the frame
    if (this.tile) {
      const bounds = this.tile.getLocalBounds();
      if (this.id && this._controlled) this.refreshFrame(bounds);
      else this.frame.visible = false;

      // Set Tile position & Toggle visibility
      this.position.set(this.data.x, this.data.y);
      this.hitArea = bounds;
      this.width = bounds.width;
      this.height = bounds.height;
    }

    if (this.data.hidden) {
      if (this.alpha === 0.75) this.alpha = 0.5;
    } else if (this.alpha === 0.5) this.alpha = 0.75;

    this.visible = !this.data.hidden || game.user.isGM;
    return this;
  }

  /**
   * Refresh the boundary frame which outlines the TileSplat
   * @category GMandPC
   * @function
   * @param {{ x, y, width, height }}
   */
  private refreshFrame({ x, y, width, height }): void {
    // Determine the border color
    const colors = getCanvas().dispositionColors;
    let bc = colors.INACTIVE;
    if (this._controlled) {
      bc = this.data.locked ? colors.HOSTILE : colors.CONTROLLED;
    }

    // Draw the border
    const pad = 6;
    const t = getCanvas().objectBorderThickness;
    const h = Math.round(t / 2);
    const o = Math.round(h / 2) + pad;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.frame.border
      .clear()
      .lineStyle(t, 0x000000)
      .drawRect(x - o, y - o, width + 2 * o, height + 2 * o)
      .lineStyle(h, bc)
      .drawRect(x - o, y - o, width + 2 * o, height + 2 * o);

    // Draw the handle
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.frame.handle.position.set(x + width + o, y + height + o);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.frame.handle
      .clear()
      .beginFill(0x000000, 1.0)
      .lineStyle(h, 0x000000)
      .drawCircle(0, 0, pad + h)
      .lineStyle(h, bc)
      .drawCircle(0, 0, pad);
    this.frame.visible = true;
  }

  /* -------------------------------------------- */

  /**
   * Draw blood drips to the TileSplat
   * @category GMandPC
   * @function
   */
  drawBlood(): void {
    log(LogLevel.DEBUG, 'TileSplat drawBlood');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    for (let i = 0; i < this.data.drips.length; i++) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const drip = this.data.drips[i];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const text = new PIXI.Text(drip.glyph, this.style);
      text.x = drip.x;
      text.y = drip.y;
      text.pivot.set(drip.width / 2, drip.height / 2);
      text.angle = drip.angle;
      this.tile.addChild(text);
    }
  }

  /**
   * Add blood drips to the TileSplat data.
   * @category GMOnly
   * @function
   * @param {PIXI.Point} position
   */
  private addDrips(position: PIXI.Point): void {
    const drips = getCanvas().blood.generateDrips(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.style,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.font,
      getCanvas().blood.brushSettings.brushDensity,
      new PIXI.Point(getCanvas().blood.brushSettings.brushSpread * getCanvas().grid.size),
      position,
    );
    log(LogLevel.DEBUG, 'addDrips', drips[0].x, drips[0].y);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    drips.forEach((drip) => this.data.drips.push(drip));
  }

  /* -------------------------------------------- */

  /**
   * Get's the name of the embedded entity. Not sure if it's actually required.
   * @category Foundry
   * @function
   * @returns {string}
   * @override
   * @see {Tile#embeddedName}
   */
  static get embeddedName(): any {
    return 'TileSplat';
  }

  /**
   * Update this TileSplat
   * @category GMOnly
   * @function
   * @async
   * @param {TileSplatData} data
   * @param options
   * @returns {Promise<TileSplat>}
   * @override
   * @see {Tile#update}
   */
  async update(data: DeepPartial<TileSplatData>, options = {}): Promise<any> {
    data['_id'] = this.id;
    await getCanvas().blood.updateNonEmbeddedEnties(data, options);
    return this;
  }

  /**
   * Called on TileSplat.update().
   * @category GMOnly
   * @function
   * @param {Partial<TileSplatData>} data
   * @returns {Promise<TileSplat>}
   */
  _onUpdate(data: Partial<TileSplatData>): Promise<TileSplat> {
    const changed = new Set(Object.keys(data));
    if (changed.has('z')) {
      this.zIndex = data.z || 0;
    }

    // Release control if the Tile was locked
    if (data.locked) this.release();

    // Full re-draw or partial refresh
    if (changed.has('img')) return this.draw();
    this.refresh();

    // Update the sheet, if it's visible
    if (this._sheet && this._sheet.rendered) this.sheet.render();
  }

  /* interaction */

  /**
   * Handle click on this TileSplat
   * @category Foundry
   * @function
   * @param {InteractionEvent} event
   * @returns {boolean}
   * @override
   * @see {PlaceableObject#_onClickLeft}
   */
  _onClickLeft(event: InteractionEvent): boolean {
    if (game.activeTool === 'brush') return false;
    return super._onClickLeft(event);
  }

  /**
   * Handle dragging TileSplat
   * @category Foundry
   * @function
   * @param {InteractionEvent} event
   * @returns {any}
   * @override
   * @see {Tile#_onDragLeftDrop}
   */
  _onDragLeftDrop(event: InteractionEvent): any {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (this._dragHandle) return this._onHandleDragDrop(event);
    return this._onSplatDragDrop(event);
  }

  /**
   * Conclude dragging a TileSplat
   * @category GMOnly
   * @function
   * @param {InteractionEvent} event
   * @returns {boolean}
   */
  _onSplatDragDrop(event: InteractionEvent): boolean {
    const clones = event.data.clones || [];

    // Ensure the destination is within bounds
    const dest = event.data.destination;
    if (!getCanvas().grid.hitArea.contains(dest.x, dest.y)) return false;

    // Compute the final dropped positions
    const updates = clones.map((c) => {
      let dest = { x: c.data.x, y: c.data.y };
      if (!event.data.originalEvent.shiftKey) {
        dest = getCanvas().grid.getSnappedPosition(c.data.x, c.data.y, getCanvas().blood.options.gridPrecision);
      }
      return { _id: c._original.id, x: dest.x, y: dest.y, rotation: c.data.rotation };
    });
    this.update(updates);
    return true;
  }

  /**
   * Handle mouse movement which modifies the dimensions of the drawn shape
   * @category GMOnly
   * @function
   * @param {InteractionEvent} event
   * @see {Drawing._onMouseDraw}
   */
  _onMouseDraw(event: InteractionEvent): void {
    const { destination } = event.data;

    // Determine position
    const position = new PIXI.Point(
      Math.round(parseInt(destination.x) - this.x),
      Math.round(parseInt(destination.y) - this.y),
    );
    const now = Date.now();

    // If the time since any drawing activity last occurred exceeds the sample rate - then add drips
    if (now - this._drawTime >= getCanvas().blood.getSetting(false, 'brushFlow')) {
      this.addDrips(position);
      this._drawTime = Date.now();
      this.draw();
    }

    // Refresh the display
    //this.refresh();
  }

  /**
   * Define additional steps taken when an existing placeable object of this type is deleted
   * @category Foundry
   * @function
   * @override
   * @see {PlaceableObject#_onDelete}
   */
  _onDelete(): void {
    this.release({ trigger: false });
    const layer = getCanvas().blood;
    if (layer._hover === this) layer._hover = null;
  }
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
import { BloodNGuts } from '../blood-n-guts';
import { getUID } from './helpers';
import { log, LogLevel } from './logging';
import * as splatFonts from '../data/splatFonts';
import BloodLayer from './BloodLayer';

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

// @ts-expect-error incorrect extends
export default class TileDrawingSplat extends Tile {
  frame: any;
  data: any;
  _drawTime: number;
  _sampleTime: number;
  SAMPLE_RATE: number;
  style: any;
  font: any;
  tile: any;
  texture: any;
  position: any;
  hitArea: any;
  _controlled: any;
  alpha: number;
  visible: any;
  drips: any;
  _dragHandle: any;
  x: number;
  y: number;
  constructor(data: TileSplatData, scene = canvas.scene) {
    super(data, scene);

    // /**
    //  * The Splat image container
    //  * @type {PIXI.Container|null}
    //  */
    // //this.container = new PIXI.Container();

    this.data._id = getUID();

    /**
     * Internal timestamp for the previous freehand draw time, to limit sampling
     * @type {number}
     * @private
     */
    this._drawTime = 0;
    this._sampleTime = 0;
    this.SAMPLE_RATE = 75;

    // @ts-expect-error bad def
    const font = this.layer.getSetting('brushFont');

    const styleData = {
      fontFamily: font,
      // @ts-expect-error bad def
      fontSize: this.layer.getSetting('brushSize'),
      // @ts-expect-error bad def
      fill: this.layer.getSetting('brushColor'),
      align: 'center',
    };
    this.style = new PIXI.TextStyle(styleData);
    this.font = splatFonts.fonts[font];

    this.drips =
      this.data.drips ||
      BloodNGuts.generateFloorSplats2(
        this.style,
        this.font,
        //@ts-expect-error definitions wrong
        this.layer.getSetting('brushDensity'),
        //@ts-expect-error definitions wrong
        this.layer.getSetting('brushSpread'),
        new PIXI.Point(0, 0),
      );
  }

  /** @override */
  async draw(): Promise<any> {
    this.clear();

    // Create the outer frame for the border and interaction handles
    this.frame = this.addChild(new PIXI.Container());
    this.frame.border = this.frame.addChild(new PIXI.Graphics());
    //@ts-expect-error missing definition
    this.frame.handle = this.frame.addChild(new ResizeHandle([1, 1]));

    // Create the tile container and it's child elements
    this.tile = this.addChild(new PIXI.Container());
    // if (this.data.img) {
    //   this.texture = await loadTexture(this.data.img, { fallback: 'icons/svg/hazard.svg' });
    //   this.tile.img = this.tile.addChild(this._drawPrimarySprite(this.texture));
    //   this.tile.bg = null;
    // } else {
    this.texture = null;
    this.tile.img = null;
    //this.tile.bg = this.addChild(new PIXI.Graphics());
    // }

    const container = new PIXI.Container();

    const style = new PIXI.TextStyle(this.data.styleData);
    // all scene drips have a .maskPolgyon.
    if (this.data.maskPolygon) {
      this.data.drips.forEach((drip) => {
        const text = new PIXI.Text(drip.glyph, style);
        text.x = drip.x + drip.width / 2;
        text.y = drip.y + drip.height / 2;
        text.pivot.set(drip.width / 2, drip.height / 2);
        text.angle = drip.angle;
        container.addChild(text);
        return text;
      });

      log(LogLevel.DEBUG, 'drawSceneSplats: data.maskPolygon');
      const sightMask = new PIXI.Graphics();
      sightMask.beginFill(1, 1);
      sightMask.drawPolygon(this.data.maskPolygon);
      sightMask.endFill();
      container.addChild(sightMask);
      container.mask = sightMask;

      // this.container.x = this.data.x;
      // this.container.y = this.data.y;
      // this.container.alpha = this.data.alpha || 1;
      // we don't want to save alpha to flags
      //delete this.data.alpha;
      this.tile = this.addChild(this.container);

      //   //if it's in the pool already update it otherwise add new entry
      //   if (existingIds.includes(data.id))
      //     BloodNGuts.scenePool.find((p) => p.data.id === data.id).container = container;
      //   else BloodNGuts.scenePool.push({ data: data, container: container });
      // } else {
      //   log(LogLevel.ERROR, 'drawSceneSplats: dataObject has no .maskPolygon!');
      // }
    }

    // Refresh the current display
    this.refresh();
    // Enable interactivity, only if the Splat is not a preview?
    this.activateListeners();
    //if (this.id) this.activateListeners();
    return this;
  }

  /** @override */
  refresh(): any {
    this.drawBlood();

    // Determine shape bounds and update the frame
    const bounds = this.tile.getLocalBounds();
    if (this.id && this._controlled) this._refreshFrame(bounds);
    else this.frame.visible = false;

    // Toggle visibility
    this.position.set(this.data.x, this.data.y);
    this.hitArea = bounds;
    this.alpha = this.data.hidden ? 0.5 : 1.0;
    this.visible = !this.data.hidden || game.user.isGM;

    // Set Tile position
    //this.position.set(this.data.x, this.data.y);

    // // Draw the sprite image
    // //const bounds = new NormalizedRectangle(0, 0, this.data.width, this.data.height);
    // const bounds = this.tile.getLocalBounds();

    // if (this.id && this._controlled) this._refreshFrame(bounds);
    // else this.frame.visible = false;

    // // Allow some extra padding to detect handle hover interactions
    // this.hitArea = bounds; //this._controlled ? bounds.clone().pad(20) : bounds;

    // // Update border frame
    // this._refreshBorder(bounds);
    // this._refreshHandle(bounds);

    // // Set visibility
    // this.alpha = 1;
    // this.visible = !this.data.hidden || game.user.isGM;
    // return this;
  }

  /**
   * Refresh the boundary frame which outlines the Drawing shape
   * @private
   */
  _refreshFrame({ x, y, width, height }) {
    // Determine the border color
    const colors = CONFIG.Canvas.dispositionColors;
    let bc = colors.INACTIVE;
    if (this._controlled) {
      bc = this.data.locked ? colors.HOSTILE : colors.CONTROLLED;
    }

    // Draw the border
    const pad = 6;
    const t = CONFIG.Canvas.objectBorderThickness;
    const h = Math.round(t / 2);
    const o = Math.round(h / 2) + pad;
    this.frame.border
      .clear()
      .lineStyle(t, 0x000000)
      .drawRect(x - o, y - o, width + 2 * o, height + 2 * o)
      .lineStyle(h, bc)
      .drawRect(x - o, y - o, width + 2 * o, height + 2 * o);

    // Draw the handle
    this.frame.handle.position.set(x + width + o, y + height + o);
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
   * Draw freehand shapes with bezier spline smoothing
   * @private
   */
  drawBlood() {
    // Get drawing drips
    const drips = this.drips;

    const styleData = {
      // @ts-expect-error bad def
      fontFamily: this.layer.getSetting('brushFont'),
      // @ts-expect-error bad def
      fontSize: this.layer.getSetting('brushSize'),
      // @ts-expect-error bad def
      fill: this.layer.getSetting('brushColor'),
      align: 'center',
    };
    const style = new PIXI.TextStyle(styleData);
    // Begin iteration
    for (let i = 0; i < drips.length; i++) {
      log(LogLevel.INFO, drips[i].x, drips[i].y);
      const text = new PIXI.Text(drips[i].glyph, style);
      text.x = drips[i].x; // + splat.width / 2;
      text.y = drips[i].y; // + splat.height / 2;
      text.pivot.set(drips[i].width / 2, drips[i].height / 2);
      text.angle = drips[i].angle;
      this.tile.addChild(text);
    }
  }

  _addDrips(position) {
    const drips = BloodNGuts.generateFloorSplats2(
      this.style,
      this.font,
      //@ts-expect-error definitions wrong
      this.layer.getSetting('brushDensity'),
      //@ts-expect-error definitions wrong
      this.layer.getSetting('brushSpread'),
      position,
    );
    drips.forEach((drip) => this.drips.push(drip));
  }

  /* -------------------------------------------- */

  /** @override */
  static get embeddedName() {
    return 'Splat';
  }

  /**
   * Provide a reference to the canvas layer which contains placeable objects of this type
   * @type {BloodLayer}
   */
  static get layer(): BloodLayer {
    return canvas.blood;
  }

  /** @override */
  async update(data, options = {}): Promise<any> {
    data['_id'] = this.id;
    //@ts-expect-error todo: why does it not recognise that layer is returning a BloodLayer?
    await this.layer.updateNonEmbeddedEntity(data, options);
    return this;
  }

  /* interaction */

  _onDragLeftDrop(event): any {
    if (this._dragHandle) return this._onHandleDragDrop(event);
    return this._onDragLeftDrop2(event);
  }
  _onHandleDragDrop(event: any) {
    throw new Error('Method not implemented.');
  }

  /**
   * Callback actions which occur on a mouse-move operation.
   * @param {PIXI.interaction.InteractionEvent} event
   * @private
   */
  _onDragLeftDrop2(event) {
    const clones = event.data.clones || [];

    // Ensure the destination is within bounds
    const dest = event.data.destination;
    if (!canvas.grid.hitArea.contains(dest.x, dest.y)) return false;

    // Compute the final dropped positions
    const updates = clones.map((c) => {
      let dest = { x: c.data.x, y: c.data.y };
      if (!event.data.originalEvent.shiftKey) {
        dest = canvas.grid.getSnappedPosition(c.data.x, c.data.y, this.layer.options.gridPrecision);
      }
      return { _id: c._original.id, x: dest.x, y: dest.y, rotation: c.data.rotation };
    });
    this.update(updates);
    // this.refresh();
  }

  /**
   * Handle mouse movement which modifies the dimensions of the drawn shape
   * @param {PIXI.interaction.InteractionEvent} event
   * @private
   */
  _onMouseDraw(event) {
    const { destination, originalEvent } = event.data;

    // Determine position
    const position = { x: parseInt(destination.x) - this.x, y: parseInt(destination.y) - this.y };
    console.log('draw pos', position);
    const now = Date.now();

    // If the time since any drawing activity last occurred exceeds the sample rate - upgrade the prior point
    if (now - this._drawTime >= this.SAMPLE_RATE) {
      this._sampleTime = now;
    }

    // Determine whether the new point should be permanent based on the time since last sample
    const takeSample = now - this._drawTime >= this.SAMPLE_RATE;
    //this._addPoint(position, !takeSample);
    console.log('adddrips', position);
    this._addDrips(position);

    // Refresh the display
    this.refresh();
  }
}

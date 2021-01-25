import { BloodNGuts } from '../blood-n-guts';
import BloodLayer from './BloodLayer';
import { getRGBA } from './helpers';
import { log, LogLevel } from './logging';
import * as splatFonts from '../data/splatFonts';

/**
 * The Drawing object is an implementation of the :class:`PlaceableObject` container.
 * Each Drawing is a placeable object in the :class:`DrawingsLayer`.
 * @extends {PlaceableObject}
 *
 * @example
 * Drawing.create({
 *   type: CONST.DRAWING_TYPES.RECTANGLE,
 *   author: game.user._id,
 *   x: 1000,
 *   y: 1000,
 *   width: 800,
 *   height: 600,
 *   fillType: CONST.DRAWING_FILL_TYPES.SOLID,
 *   fillColor: "#0000FF",
 *   fillAlpha: 0.5,
 *   strokeWidth: 4,
 *   strokeColor: "#FF0000",
 *   strokeAlpha: 0.75,
 *   texture: "ui/parchment.jpg",
 *   textureAlpha: 0.5,
 *   text: "HELLO DRAWINGS!",
 *   fontSize: 48,
 *   textColor: "#00FF00",
 *   points: []
 * });
 */
export default class BloodDrawing extends PlaceableObject {
  drawing: any;
  frame: any;
  _drawTime: number;
  _sampleTime: number;
  _fixedPoints: any;
  _onkeydown: any;
  _creating: any;
  _dragHandle: any;
  _original: any;
  SAMPLE_RATE: number;
  splatData: {
    splats: { x: number; y: number; angle: number; width: number; height: number; glyph: string }[];
    styleData: { fontFamily: string; fontSize: number; fill: string; align: string };
    offset: { x: number; y: number };
    x: number;
    y: number;
    maskPolygon: number[];
    id: string;
  };
  drips: SplatDripData[];
  style: PIXI.TextStyle;
  font: any;
  constructor(...args) {
    //@ts-expect-error why this args problem?
    super(...args);

    /**
     * The inner drawing container
     * @type {PIXI.Container}
     */
    this.drawing = null;

    /**
     * The Graphics outer frame and handles
     * @type {PIXI.Container}
     */
    this.frame = null;

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
        fontFamily: 'Signika',
        fontSize: 50,
        fill: '#FFFFFF',
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

    const startDrip = BloodNGuts.generateFloorSplats2(
      this.style,
      this.font,
      //@ts-expect-error definitions wrong
      this.layer.getSetting('brushDensity'),
      //@ts-expect-error definitions wrong
      this.layer.getSetting('brushSpread'),
      new PIXI.Point(0, 0),
    );

    this.drips = this.data.drips || startDrip;
  }

  /* -------------------------------------------- */

  /** @override */
  static get embeddedName() {
    return 'Drawing';
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * A reference to the User who created the Drawing object
   * @type {User}
   */
  get author() {
    return game.users.get(this.data.author);
  }

  /* -------------------------------------------- */

  /**
   * A flag for whether the current user has full control over the Drawing object
   * @type {User}
   */
  get owner() {
    return game.user.isGM || this.data.author === game.user._id;
  }

  /**
   * Provide a reference to the canvas layer which contains placeable objects of this type
   * @type {BloodLayer}
   */
  static get layer(): BloodLayer {
    return canvas.blood;
  }

  /* -------------------------------------------- */
  /* Rendering                                    */
  /* -------------------------------------------- */

  /** @override */
  async draw(): Promise<PlaceableObject> {
    this.clear();

    // todo: perhaps the font loading should go here
    // Load the background texture, if one is defined
    // if (this.data.texture) {
    //   this.texture = await loadTexture(this.data.texture, { fallback: 'icons/svg/hazard.svg' });
    // } else {
    //   this.texture = null;
    // }

    // Create the inner Drawing container
    this._createDrawing();

    // Control Border
    this._createFrame();

    // Render Appearance
    this.refresh();

    // Enable Interactivity, if this is a true Drawing
    if (this.id) this.activateListeners();
    // @ts-expect-error I think this is caused by bad definitions
    return this as PlaceableObject;
  }

  /* -------------------------------------------- */

  /**
   * Create the components of the drawing element, the drawing container, the drawn shape, and the overlay text
   */
  _createDrawing() {
    // Drawing container
    this.drawing = this.addChild(new PIXI.Container());
  }

  /* -------------------------------------------- */

  /**
   * Create elements for the Drawing border and handles
   * @private
   */
  _createFrame() {
    this.frame = this.addChild(new PIXI.Container());
    this.frame.border = this.frame.addChild(new PIXI.Graphics());
    //@ts-expect-error missing definition
    this.frame.handle = this.frame.addChild(new ResizeHandle([1, 1]));
  }

  /* -------------------------------------------- */

  /** @override */
  // @ts-expect-error definition wrong
  refresh() {
    if (this._destroyed) return;

    this._drawFreehand();

    // Determine shape bounds and update the frame
    const bounds = this.drawing.getLocalBounds();
    if (this.id && this._controlled) this._refreshFrame(bounds);
    else this.frame.visible = false;

    // Toggle visibility
    this.position.set(this.data.x, this.data.y);
    this.drawing.hitArea = bounds;
    this.alpha = this.data.hidden ? 0.5 : 1.0;
    this.visible = !this.data.hidden || game.user.isGM;
  }

  /* -------------------------------------------- */

  /**
   * Draw freehand shapes with bezier spline smoothing
   * @private
   */
  _drawFreehand() {
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
      this.drawing.addChild(text);
    }
  }

  /* -------------------------------------------- */

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
   * Add a new polygon point to the drawing, ensuring it differs from the last one
   * @private
   */
  _addPoint(position, temporary = true) {
    const point = [position.x - this.data.x, position.y - this.data.y];
    this.data.points = this._fixedPoints.concat([point]);
    if (!temporary) {
      this._fixedPoints = this.data.points;
      this._drawTime = Date.now();
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

  /**
   * Remove the last fixed point from the polygon
   * @private
   */
  _removePoint() {
    if (this._fixedPoints.length) this._fixedPoints.pop();
    this.data.points = this._fixedPoints;
  }

  /* -------------------------------------------- */

  // /** @override */
  // _onControl(options) {
  //   super._onControl(options);
  //   if (this.data.type === CONST.DRAWING_TYPES.TEXT) {
  //     this._onkeydown = this._onDrawingTextKeydown.bind(this);
  //     if (!options.isNew) this._pendingText = this.data.text;
  //     document.addEventListener('keydown', this._onkeydown);
  //   }
  // }

  /* -------------------------------------------- */

  // todo: perhaps remove
  /** @override */
  _onRelease(options) {
    super._onRelease(options);
    if (this._onkeydown) {
      document.removeEventListener('keydown', this._onkeydown);
      this._onkeydown = null;
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onDelete(...args) {
    //@ts-expect-error missing definitions
    super._onDelete(...args);
    if (this._onkeydown) document.removeEventListener('keydown', this._onkeydown);
  }

  /* -------------------------------------------- */

  /* -------------------------------------------- */
  /*  Socket Listeners and Handlers               */
  /* -------------------------------------------- */

  /** @override */
  _onUpdate(data) {
    const changed = new Set(Object.keys(data));
    if (changed.has('z')) this.zIndex = parseInt(data.z) || 0;

    // Fully re-draw when certain core aspects are changed
    const redraw = ['type', 'text', 'texture', 'fontFamily', 'fontSize', 'textColor'];
    if (redraw.some((k) => changed.has(k))) {
      this.draw().then(() => super._onUpdate(data));
    }

    // Otherwise simply refresh the existing drawing
    else {
      this.refresh();
      super._onUpdate(data);
    }
  }

  /* -------------------------------------------- */
  /*  Permission Controls                         */
  /* -------------------------------------------- */

  /** @override */
  _canControl(user, event) {
    if (this._creating) {
      // Allow one-time control immediately following creation
      delete this._creating;
      return true;
    }
    if (this._controlled) return true;
    if (game.activeTool !== 'select') return false;
    return user.isGM || user.id === this.data.author;
  }

  /* -------------------------------------------- */

  /** @override */
  _canHUD(user, event) {
    return this._controlled;
  }

  /* -------------------------------------------- */

  /** @override */
  _canConfigure(user, event) {
    return this._controlled;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  activateListeners() {
    super.activateListeners();
    this.frame.handle
      .off('mouseover')
      .off('mouseout')
      .off('mousedown')
      .on('mouseover', this._onHandleHoverIn.bind(this))
      .on('mouseout', this._onHandleHoverOut.bind(this))
      .on('mousedown', this._onHandleMouseDown.bind(this));
    this.frame.handle.interactive = true;
  }

  /* -------------------------------------------- */

  _onMouseClick(event) {
    const position = event.data.origin;
    this._addDrips(position);

    // Refresh the display
    this.refresh();
  }
  /* -------------------------------------------- */

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

  /* -------------------------------------------- */
  /*  Interactivity                               */
  /* -------------------------------------------- */

  /** @override */
  _onDragLeftStart(event) {
    if (this._dragHandle) return this._onHandleDragStart(event);
    return super._onDragLeftStart(event);
  }

  /* -------------------------------------------- */

  /** @override */
  _onDragLeftMove(event) {
    if (this._dragHandle) return this._onHandleDragMove(event);
    return super._onDragLeftMove(event);
  }

  /* -------------------------------------------- */

  /** @override */
  _onDragLeftDrop(event) {
    if (this._dragHandle) return this._onHandleDragDrop(event);

    //todo: wrapup
    //const maxDistance = Math.max(dripsWidth, dripsHeight);
    //const sight = computeSightFromPoint(origin, maxDistance);
    // since we don't want to add the mask to the container yet (as that will
    // screw up our alignment) we need to move it by editing the x,y points directly
    // for (let i = 0; i < sight.length; i += 2) {
    //   sight[i] -= tileSplatData.offset.x;
    //   sight[i + 1] -= tileSplatData.offset.y;
    // }

    // tileSplatData.x += origin.x;
    // tileSplatData.y += origin.y;
    // tileSplatData.maskPolygon = sight;
    // tileSplatData.id = getUID();

    // Update each dragged Drawing, confirming pending text
    const clones = event.data.clones || [];
    const updates = clones.map((c) => {
      const dest = { x: c.data.x, y: c.data.y };

      // Define the update
      const update = {
        _id: c._original.id,
        x: dest.x,
        y: dest.y,
        rotation: c.data.rotation,
        text: 'A',
      };

      // Hide the original until after the update processes
      c._original.visible = false;
      return update;
    });
    //@ts-expect-error definitions wrong
    return this.layer.updateNonEmbeddedEntity(updates, { diff: false });
  }

  /* -------------------------------------------- */

  /** @override */
  _onDragLeftCancel(event) {
    if (this._dragHandle) return this._onHandleDragCancel(event);
    return super._onDragLeftCancel(event);
  }

  /* -------------------------------------------- */
  /*  Resize Handling                             */
  /* -------------------------------------------- */

  /**
   * Handle mouse-over event on a control handle
   * @param {PIXI.interaction.InteractionEvent} event   The mouseover event
   * @private
   */
  _onHandleHoverIn(event) {
    const handle = event.target;
    handle.scale.set(1.5, 1.5);
    event.data.handle = event.target;
  }

  /* -------------------------------------------- */

  /**
   * Handle mouse-out event on a control handle
   * @param {PIXI.interaction.InteractionEvent} event   The mouseout event
   * @private
   */
  _onHandleHoverOut(event) {
    event.data.handle.scale.set(1.0, 1.0);
  }

  /* -------------------------------------------- */

  /**
   * When we start a drag event - create a preview copy of the Tile for re-positioning
   * @param {PIXI.interaction.InteractionEvent} event   The mousedown event
   * @private
   */
  _onHandleMouseDown(event) {
    if (!this.data.locked) {
      this._dragHandle = true;
      this._original = duplicate(this.data);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle the beginning of a drag event on a resize handle
   * @param event
   * @private
   */
  _onHandleDragStart(event) {
    const handle = event.data.handle;
    const aw = Math.abs(this.data.width);
    const ah = Math.abs(this.data.height);
    const x0 = this.data.x + handle.offset[0] * aw;
    const y0 = this.data.y + handle.offset[1] * ah;
    event.data.origin = { x: x0, y: y0, width: aw, height: ah };
  }

  /* -------------------------------------------- */

  /**
   * Handle mousemove while dragging a tile scale handler
   * @param {PIXI.interaction.InteractionEvent} event   The mousemove event
   * @private
   */
  _onHandleDragMove(event) {
    const { destination, origin, originalEvent } = event.data;

    // Pan the canvas if the drag event approaches the edge
    canvas._onDragCanvasPan(originalEvent);

    // Update Drawing dimensions
    const dx = destination.x - origin.x;
    const dy = destination.y - origin.y;
    const update = this._rescaleDimensions(this._original, dx, dy);
    mergeObject(this.data, update);
    this.refresh();
  }

  /* -------------------------------------------- */

  /**
   * Handle mouseup after dragging a tile scale handler
   * @param {PIXI.interaction.InteractionEvent} event   The mouseup event
   * @private
   */
  _onHandleDragDrop(event) {
    const { destination, origin } = event.data;

    // Update dimensions
    const dx = destination.x - origin.x;
    const dy = destination.y - origin.y;
    const update = this._rescaleDimensions(this._original, dx, dy);

    // Commit the update
    this.data = this._original;
    return this.update(update, { diff: false });
  }

  /* -------------------------------------------- */

  /**
   * Handle cancellation of a drag event for one of the resizing handles
   * @private
   */
  _onHandleDragCancel(event) {
    this.data = this._original;
    this._dragHandle = false;
    delete this._original;
    this.refresh();
  }

  /* -------------------------------------------- */

  /**
   * Apply a vectorized rescaling transformation for the drawing data
   * @param {Object} original     The original drawing data
   * @param {number} dx           The pixel distance dragged in the horizontal direction
   * @param {number} dy           The pixel distance dragged in the vertical direction
   * @private
   */
  _rescaleDimensions(original, dx, dy) {
    const { points, width, height } = original;

    // Normalize the shape
    //@ts-expect-error todo: how to deal with .constructor props?
    const update = this.constructor.normalizeShape({
      x: original.x,
      y: original.y,
      width: width + dy,
      height: height + dx,
      points: points,
    });
    return update;
  }

  /* -------------------------------------------- */

  /**
   * Adjust the location, dimensions, and points of the Drawing before committing the change
   * @param {Object} data   The Drawing data pending update
   * @return {Object}       The adjusted data
   * @private
   */
  static normalizeShape(data) {
    // Adjust shapes with an explicit points array
    let points = data.points;
    if (points && points.length) {
      // De-dupe any points which were repeated in sequence
      points = points.reduce((arr, p1) => {
        const p0 = arr.length ? arr[arr.length - 1] : null;
        if (!p0 || !p1.equals(p0)) arr.push(p1);
        return arr;
      }, []);

      // Adjust points for the minimal x and y values
      const [xs, ys] = data.points.reduce(
        (arr, p) => {
          arr[0].push(p[0]);
          arr[1].push(p[1]);
          return arr;
        },
        [[], []],
      );

      // Determine minimal and maximal points
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      // Normalize points
      points = points.map((p) => [p[0] - minX, p[1] - minY]);

      // Update data
      data.x += minX;
      data.y += minY;
      data.width = maxX - minX;
      data.height = maxY - minY;
      data.points = points;
    }

    // Adjust rectangles
    else {
      const { x, y, width, height } = data;
      const adjusted = new NormalizedRectangle(x, y, width, height);
      data.x = adjusted.x;
      data.y = adjusted.y;
      data.width = adjusted.width;
      data.height = adjusted.height;
    }
    return data;
  }
}

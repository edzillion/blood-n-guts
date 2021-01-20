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
  constructor(...args) {
    //@ts-expect-error why this args problem?
    super(...args);

    /**
     * The inner drawing container
     * @type {PIXI.Container}
     */
    this.drawing = null;

    /**
     * The primary drawing shape
     * @type {PIXI.Graphics}
     */
    this.shape = null;

    /**
     * Text content, if included
     * @type {PIXI.Text}
     */
    this.text = null;

    /**
     * The Graphics outer frame and handles
     * @type {PIXI.Container}
     */
    this.frame = null;

    /**
     * Internal timestamp for the previous freehand draw time, to limit sampling
     * @type {number}
     * @private
     */
    this._drawTime = 0;
    this._sampleTime = 0;

    /**
     * Internal flag for the permanent points of the polygon
     * @type {boolean}
     * @private
     */
    this._fixedPoints = duplicate(this.data.points || []);
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

  /* -------------------------------------------- */

  /**
   * A Boolean flag for whether or not the Drawing utilizes a tiled texture background
   * @type {boolean}
   */
  get isTiled() {
    return this.data.fillType === CONST.DRAWING_FILL_TYPES.PATTERN;
  }

  /* -------------------------------------------- */

  /**
   * A Boolean flag for whether or not the Drawing is a Polygon type (either linear or freehand)
   * @type {boolean}
   */
  get isPolygon() {
    return [CONST.DRAWING_TYPES.POLYGON, CONST.DRAWING_TYPES.FREEHAND].includes(this.data.type);
  }

  /* -------------------------------------------- */
  /* Rendering                                    */
  /* -------------------------------------------- */

  /** @override */
  async draw() {
    this.clear();
    this._pendingText = this.data.text ?? '';

    // Load the background texture, if one is defined
    if (this.data.texture) {
      this.texture = await loadTexture(this.data.texture, { fallback: 'icons/svg/hazard.svg' });
    } else {
      this.texture = null;
    }

    // Create the inner Drawing container
    this._createDrawing();

    // Control Border
    this._createFrame();

    // Render Appearance
    this.refresh();

    // Enable Interactivity, if this is a true Drawing
    if (this.id) this.activateListeners();
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Create the components of the drawing element, the drawing container, the drawn shape, and the overlay text
   */
  _createDrawing() {
    // Drawing container
    this.drawing = this.addChild(new PIXI.Container());

    // Drawing Shape
    this.shape = this.drawing.addChild(new PIXI.Graphics());

    // Overlay Text
    const hasText = this.data.type === CONST.DRAWING_TYPES.TEXT || this.data.text;
    this.text = hasText ? this.drawing.addChild(this._createText()) : null;
  }

  /* -------------------------------------------- */

  /**
   * Create elements for the foreground text
   * @private
   */
  _createText() {
    if (this.text && !this.text._destroyed) {
      this.text.destroy();
      this.text = null;
    }
    const isText = this.data.type === CONST.DRAWING_TYPES.TEXT;
    const stroke = Math.max(Math.round(this.data.fontSize / 32), 2);

    // Define the text style
    const textStyle = new PIXI.TextStyle({
      fontFamily: this.data.fontFamily || CONFIG.defaultFontFamily,
      fontSize: this.data.fontSize,
      fill: this.data.textColor || '#FFFFFF',
      stroke: '#111111',
      strokeThickness: stroke,
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: Math.max(Math.round(this.data.fontSize / 16), 2),
      dropShadowAngle: 0,
      dropShadowDistance: 0,
      align: isText ? 'left' : 'center',
      wordWrap: !isText,
      wordWrapWidth: 1.5 * this.data.width,
      padding: stroke,
    });

    // Create the text container
    return new PreciseText(this.data.text, textStyle);
  }

  /* -------------------------------------------- */

  /**
   * Create elements for the Drawing border and handles
   * @private
   */
  _createFrame() {
    this.frame = this.addChild(new PIXI.Container());
    this.frame.border = this.frame.addChild(new PIXI.Graphics());
    this.frame.handle = this.frame.addChild(new ResizeHandle([1, 1]));
  }

  /* -------------------------------------------- */

  /** @override */
  refresh() {
    if (this._destroyed || this.shape._destroyed) return;
    const isTextPreview = this.data.type === CONST.DRAWING_TYPES.TEXT && this._controlled;
    this.shape.clear();

    // Outer Stroke
    if (this.data.strokeWidth || isTextPreview) {
      const sc = colorStringToHex(this.data.strokeColor || '#FFFFFF');
      this.shape.lineStyle(this.data.strokeWidth || 8, sc, this.data.strokeAlpha || 1);
    }

    // Fill Color or Texture
    if (this.data.fillType || isTextPreview) {
      const fc = colorStringToHex(this.data.fillColor || '#FFFFFF');
      if (this.data.fillType === CONST.DRAWING_FILL_TYPES.PATTERN && this.texture) {
        this.shape.beginTextureFill({
          texture: this.texture,
          color: fc || 0xffffff,
          alpha: fc ? this.data.fillAlpha : 1,
        });
      } else {
        const fa = isTextPreview ? 0.25 : this.data.fillAlpha;
        this.shape.beginFill(fc, fa);
      }
    }

    // Draw the shape
    switch (this.data.type) {
      case CONST.DRAWING_TYPES.RECTANGLE:
      case CONST.DRAWING_TYPES.TEXT:
        this._drawRectangle();
        break;
      case CONST.DRAWING_TYPES.ELLIPSE:
        this._drawEllipse();
        break;
      case CONST.DRAWING_TYPES.POLYGON:
        this._drawPolygon();
        break;
      case CONST.DRAWING_TYPES.FREEHAND:
        this._drawFreehand();
        break;
    }

    // Conclude fills
    this.shape.lineStyle(0x000000, 0.0).closePath();
    this.shape.endFill();

    // Set shape rotation, pivoting about the non-rotated center
    this.shape.pivot.set(this.data.width / 2, this.data.height / 2);
    this.shape.position.set(this.data.width / 2, this.data.height / 2);
    this.shape.rotation = toRadians(this.data.rotation || 0);

    // Update text position and visibility
    if (this.text) {
      this.text.alpha = this.data.textAlpha || 1.0;
      this.text.pivot.set(this.text.width / 2, this.text.height / 2);
      this.text.position.set(
        this.text.width / 2 + (this.data.width - this.text.width) / 2,
        this.text.height / 2 + (this.data.height - this.text.height) / 2,
      );
      this.text.rotation = this.shape.rotation;
    }

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
   * Draw rectangular shapes
   * @private
   */
  _drawRectangle() {
    const hs = this.data.strokeWidth / 2;
    this.shape.drawRect(hs, hs, this.data.width - 2 * hs, this.data.height - 2 * hs);
  }

  /* -------------------------------------------- */

  /**
   * Draw ellipsoid shapes
   * @private
   */
  _drawEllipse() {
    const hw = this.data.width / 2,
      hh = this.data.height / 2,
      hs = this.data.strokeWidth / 2;
    this.shape.drawEllipse(hw, hh, Math.abs(hw) - hs, Math.abs(hh) - hs);
  }

  /* -------------------------------------------- */

  /**
   * Draw polygonal shapes
   * @private
   */
  _drawPolygon() {
    const points = this.data.points || [];
    if (points.length < 2) return;
    else if (points.length === 2) this.shape.endFill();

    // Get drawing points
    const last = points[points.length - 1];
    const isClosed = points[0].equals(last);

    // If the polygon is closed, or if we are filling it, we can shortcut using the drawPolygon helper
    if (points.length > 2 && (isClosed || this.data.fillType)) this.shape.drawPolygon(points.deepFlatten());
    // Otherwise, draw each line individually
    else {
      this.shape.moveTo(...points[0]);
      for (const p of points.slice(1)) {
        this.shape.lineTo(...p);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Draw freehand shapes with bezier spline smoothing
   * @private
   */
  _drawFreehand() {
    const factor = this.data.bezierFactor ?? 0.5;

    // Get drawing points
    let points = this.data.points;
    const last = points[points.length - 1];
    const isClosed = points[0].equals(last);

    // Handle edge cases
    this.shape.moveTo(...points[0]);
    if (points.length < 2) return;
    else if (points.length === 2) {
      this.shape.lineTo(...points[1]);
      return;
    }

    // Set initial conditions
    let [previous, point] = points.slice(0, 2);
    if (this.data.fillType) points = points.concat([previous, point]);
    let cp0 = this._getBezierControlPoints(factor, last, previous, point).next_cp0;
    let cp1, next_cp0, next;

    // Begin iteration
    for (let i = 1; i < points.length; i++) {
      next = points[i + 1];
      if (next) {
        const bp = this._getBezierControlPoints(factor, previous, point, next);
        cp1 = bp.cp1;
        next_cp0 = bp.next_cp0;
      }

      // First point
      if (i === 1 && !isClosed) {
        this.shape.quadraticCurveTo(cp1.x, cp1.y, point[0], point[1]);
      }

      // Last Point
      else if (i === points.length - 1 && !isClosed) {
        this.shape.quadraticCurveTo(cp0.x, cp0.y, point[0], point[1]);
      }

      // Bezier points
      else {
        this.shape.bezierCurveTo(cp0.x, cp0.y, cp1.x, cp1.y, point[0], point[1]);
      }

      // Increment
      previous = point;
      point = next;
      cp0 = next_cp0;
    }
  }

  /* -------------------------------------------- */

  /**
   * Attribution: The equations for how to calculate the bezier control points are derived from Rob Spencer's article:
   * http://scaledinnovation.com/analytics/splines/aboutSplines.html
   * @param {number} factor       The smoothing factor
   * @param {number[]} previous   The prior point
   * @param {number[]} point      The current point
   * @param {number[]} next       The next point
   * @private
   */
  _getBezierControlPoints(factor, previous, point, next) {
    // Calculate distance vectors
    const vector = { x: next[0] - previous[0], y: next[1] - previous[1] },
      preDistance = Math.hypot(previous[0] - point[0], previous[1] - point[1]),
      postDistance = Math.hypot(next[0] - point[0], next[1] - point[1]),
      distance = preDistance + postDistance;

    // Compute control point locations
    const cp0d = distance === 0 ? 0 : factor * (preDistance / distance),
      cp1d = distance === 0 ? 0 : factor * (postDistance / distance);

    // Return points
    return {
      cp1: {
        x: point[0] - vector.x * cp0d,
        y: point[1] - vector.y * cp0d,
      },
      next_cp0: {
        x: point[0] + vector.x * cp1d,
        y: point[1] + vector.y * cp1d,
      },
    };
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

  /** @override */
  _onControl(options) {
    super._onControl(options);
    if (this.data.type === CONST.DRAWING_TYPES.TEXT) {
      this._onkeydown = this._onDrawingTextKeydown.bind(this);
      if (!options.isNew) this._pendingText = this.data.text;
      document.addEventListener('keydown', this._onkeydown);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onRelease(options) {
    super._onRelease(options);
    if (this._onkeydown) {
      document.removeEventListener('keydown', this._onkeydown);
      this._onkeydown = null;
    }
    if (this.data.type === DRAWING_TYPES.TEXT) {
      const text = this._pendingText ?? this.data.text;
      if (text === '') return this.delete();
      if (this._pendingText) {
        // Submit pending text
        this.update({ text: this._pendingText, width: this.data.width, height: this.data.height });
        this._pendingText = '';
      }
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onDelete(...args) {
    super._onDelete(...args);
    if (this._onkeydown) document.removeEventListener('keydown', this._onkeydown);
  }

  /* -------------------------------------------- */

  /**
   * Handle text entry in an active text tool
   * @param {KeyboardEvent} event
   * @private
   */
  _onDrawingTextKeydown(event) {
    // Ignore events when an input is focused, or when ALT or CTRL modifiers are applied
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (game.keyboard.hasFocus) return;

    // Track refresh or conclusion conditions
    const conclude = ['Escape', 'Enter'].includes(event.key);
    let refresh = false;

    // Submitting the change, update or delete
    if (event.key === 'Enter') {
      if (this._pendingText) {
        const updateData = { text: this._pendingText, width: this.data.width, height: this.data.height };
        return this.update(updateData, { diff: false }).then(() => this.release());
      } else return this.delete();
    }

    // Cancelling the change
    else if (event.key === 'Escape') {
      this._pendingText = this.data.text;
      refresh = true;
    }

    // Deleting a character
    else if (event.key === 'Backspace') {
      this._pendingText = this._pendingText.slice(0, -1);
      refresh = true;
    }

    // Typing text (any single char)
    else if (/^.$/.test(event.key)) {
      this._pendingText += event.key;
      refresh = true;
    }

    // Stop propagation if the event was handled
    if (refresh || conclude) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Refresh the display
    if (refresh) {
      this.text.text = this._pendingText;
      this.data.width = this.text.width + 100;
      this.data.height = this.text.height + 50;
      this.refresh();
    }

    // Conclude the workflow
    if (conclude) {
      this.release();
    }
  }

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

  /**
   * Handle mouse movement which modifies the dimensions of the drawn shape
   * @param {PIXI.interaction.InteractionEvent} event
   * @private
   */
  _onMouseDraw(event) {
    const { destination, originalEvent } = event.data;
    const isShift = originalEvent.shiftKey;
    const isAlt = originalEvent.altKey;

    // Determine position
    let position = destination;
    if (!isShift && this.data.type !== CONST.DRAWING_TYPES.FREEHAND) {
      position = canvas.grid.getSnappedPosition(position.x, position.y, this.layer.gridPrecision);
    } else {
      position = { x: parseInt(position.x), y: parseInt(position.y) };
    }

    // Drag differently depending on shape type
    switch (this.data.type) {
      // Freehand Shapes
      case CONST.DRAWING_TYPES.FREEHAND:
        const now = Date.now();

        // If the time since any drawing activity last occurred exceeds the sample rate - upgrade the prior point
        if (now - this._drawTime >= this.constructor.FREEHAND_SAMPLE_RATE) {
          this._sampleTime = now;
        }

        // Determine whether the new point should be permanent based on the time since last sample
        const takeSample = now - this._drawTime >= this.constructor.FREEHAND_SAMPLE_RATE;
        this._addPoint(position, !takeSample);
        break;

      // Polygon Shapes
      case CONST.DRAWING_TYPES.POLYGON:
        this._addPoint(position, true);
        break;

      // Geometric Shapes
      default:
        let dx = position.x - this.data.x || canvas.dimensions.size * Math.sign(this.data.width) * 0.5;
        let dy = position.y - this.data.y || canvas.dimensions.size * Math.sign(this.data.height) * 0.5;
        if (isAlt) {
          dx = Math.abs(dy) < Math.abs(dx) ? Math.abs(dy) * Math.sign(dx) : dx;
          dy = Math.abs(dx) < Math.abs(dy) ? Math.abs(dx) * Math.sign(dy) : dy;
        }
        this.data.width = dx;
        this.data.height = dy;
    }

    // Refresh the display
    this.refresh();
  }

  /* -------------------------------------------- */
  /*  Interactivity                               */
  /* -------------------------------------------- */

  /** @override */
  _onDragLeftStart(event) {
    if (this._dragHandle) return this._onHandleDragStart(event);
    if (this._pendingText) this.data.text = this._pendingText;
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

    // Update each dragged Drawing, confirming pending text
    const clones = event.data.clones || [];
    const updates = clones.map((c) => {
      let dest = { x: c.data.x, y: c.data.y };
      if (!event.data.originalEvent.shiftKey) {
        dest = canvas.grid.getSnappedPosition(c.data.x, c.data.y, this.layer.options.gridPrecision);
      }

      // Define the update
      const update = {
        _id: c._original.id,
        x: dest.x,
        y: dest.y,
        rotation: c.data.rotation,
        text: c._original._pendingText ? c._original._pendingText : c.data.text,
      };

      // Commit pending text
      if (c._original._pendingText) {
        update.text = c._original._pendingText;
      }

      // Hide the original until after the update processes
      c._original.visible = false;
      return update;
    });
    return canvas.scene.updateEmbeddedEntity(this.constructor.name, updates, { diff: false });
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
    let { destination, handle, origin, originalEvent } = event.data;
    if (!originalEvent.shiftKey) {
      destination = canvas.grid.getSnappedPosition(destination.x, destination.y, this.layer.gridPrecision);
    }

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
    let { points, width, height } = original;
    width += dx;
    height += dy;

    // Rescale polygon points
    if (this.isPolygon) {
      const scaleX = 1 + dx / original.width;
      const scaleY = 1 + dy / original.height;
      points = points.map((p) => [p[0] * scaleX, p[1] * scaleY]);
    }

    // Constrain drawing bounds by the contained text size
    if (this.data.text) {
      const textBounds = this.text.getLocalBounds();
      width = Math.max(textBounds.width + 16, width);
      height = Math.max(textBounds.height + 8, height);
    }

    // Normalize the shape
    const update = this.constructor.normalizeShape({
      x: original.x,
      y: original.y,
      width: width,
      height: height,
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

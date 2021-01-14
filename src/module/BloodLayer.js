/* eslint-disable no-undef */
/**
 * The Tiles canvas layer which provides a container for {@link Tile} objects which are rendered immediately above the
 * {@link BackgroundLayer} and below the {@link GridLayer}.
 *
 * @extends {PlaceablesLayer}
 *
 * @see {@link Tile}
 */
export class BloodLayer extends PlaceablesLayer {
  /** @override */
  static get layerOptions() {
    return mergeObject(super.layerOptions, {
      zIndex: 10,
      controllableObjects: true,
      objectClass: Tile,
      rotatableObjects: true,
      sheetClass: TileConfig,
    });
  }

  /* -------------------------------------------- */

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /** @override */
  deactivate() {
    super.deactivate();
    if (this.objects) this.objects.visible = true;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  _onDragLeftStart(event) {
    super._onDragLeftStart(event);

    //drawing with brush here
  }

  /* -------------------------------------------- */

  /** @override */
  _onDragLeftMove(event) {
    const { destination, createState, preview, origin, originalEvent } = event.data;
    if (createState === 0) return;

    // Determine the drag distance
    const dx = destination.x - origin.x;
    const dy = destination.y - origin.y;
    const dist = Math.min(Math.abs(dx), Math.abs(dy));

    // Update the drawing here

    // Confirm the creation state
    event.data.createState = 2;
  }

  /* -------------------------------------------- */

  /** @override */
  _onDragLeftDrop(event) {
    const { createState, preview } = event.data;
    if (createState !== 2) return;

    // Require a minimum created size
    const distance = Math.hypot(preview.width, preview.height);
    if (distance < canvas.dimensions.size / 2) return;

    // // Render the preview sheet for confirmation
    // preview.sheet.render(true);
    // preview.sheet.preview = this.preview;
    // this.preview._creating = true;
  }

  /* -------------------------------------------- */

  /** @override */
  _onDragLeftCancel(event) {
    if (this.preview._creating) return;
    return super._onDragLeftCancel(event);
  }

  /* -------------------------------------------- */

  /**
   * Handle drop events for Tile data on the Tiles Layer
   * @param {DragEvent} event     The concluding drag event
   * @param {object} data         The extracted Tile data
   * @private
   */
  async _onDropTileData(event, data) {
    if (!data.img) return;
    if (!this._active) this.activate();

    // Determine the tile size
    // const tex = await loadTexture(data.img);
    // const ratio = canvas.dimensions.size / (data.tileSize || canvas.dimensions.size);
    // data.width = tex.baseTexture.width * ratio;
    // data.height = tex.baseTexture.height * ratio;

    // Validate that the drop position is in-bounds and snap to grid
    if (!canvas.grid.hitArea.contains(data.x, data.y)) return false;
    data.x = data.x - data.width / 2;
    data.y = data.y - data.height / 2;
    if (!event.shiftKey) mergeObject(data, canvas.grid.getSnappedPosition(data.x, data.y));

    // Create the tile as hidden if the ALT key is pressed
    if (event.altKey) data.hidden = true;

    // Create the Tile
    return this.constructor.placeableClass.create(data);
  }
}

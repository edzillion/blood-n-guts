/* eslint-disable @typescript-eslint/ban-ts-comment */
import { getUID } from './helpers';
import { log, LogLevel } from './logging';

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
  container: any;
  frame: any;
  data: any;
  constructor(data: TileSplatData, scene) {
    super(data, scene);

    /**
     * The Splat image container
     * @type {PIXI.Container|null}
     */
    this.container = new PIXI.Container();

    this.data._id = getUID();
  }

  /** @override */
  async draw() {
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

    const style = new PIXI.TextStyle(this.data.styleData);
    // all scene drips have a .maskPolgyon.
    if (this.data.maskPolygon) {
      this.data.drips.forEach((drip) => {
        const text = new PIXI.Text(drip.glyph, style);
        text.x = drip.x + drip.width / 2;
        text.y = drip.y + drip.height / 2;
        text.pivot.set(drip.width / 2, drip.height / 2);
        text.angle = drip.angle;
        this.container.addChild(text);
        return text;
      });

      log(LogLevel.DEBUG, 'drawSceneSplats: data.maskPolygon');
      const sightMask = new PIXI.Graphics();
      sightMask.beginFill(1, 1);
      sightMask.drawPolygon(this.data.maskPolygon);
      sightMask.endFill();
      this.container.addChild(sightMask);
      this.container.mask = sightMask;

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
  refresh() {
    // Set Tile position
    this.position.set(this.data.x, this.data.y);

    // Draw the sprite image
    const bounds = new NormalizedRectangle(0, 0, this.data.width, this.data.height);

    // Allow some extra padding to detect handle hover interactions
    this.hitArea = this._controlled ? bounds.clone().pad(20) : bounds;

    // Update border frame
    this._refreshBorder(bounds);
    this._refreshHandle(bounds);

    // Set visibility
    this.alpha = 1;
    this.visible = !this.data.hidden || game.user.isGM;
    return this;
  }

  /* -------------------------------------------- */

  /** @override */
  static get embeddedName() {
    return 'Splat';
  }

  /**
   * Provide a reference to the canvas layer which contains placeable objects of this type
   * @type {PlaceablesLayer}
   */
  static get layer() {
    return canvas.blood;
  }

  /** @override */
  async update(data, options = {}) {
    data['_id'] = this.id;
    //@ts-expect-error todo: why does it not recognise that layer is returning a BloodLayer?
    await this.layer.updateNonEmbeddedEntity(data, options);
    return this;
  }

  _onDragLeftDrop(event) {
    if (this._dragHandle) return this._onHandleDragDrop(event);
    return this._onDragLeftDrop2(event);
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

  //todo: move this to a hook
  /** @override */
  _onUpdate = (data) => {
    log(LogLevel.INFO, '_onUpdate data', data);
    const changed_keys = new Set(Object.keys(data));
    log(LogLevel.INFO, '_onUpdate changed', changed_keys);

    // Release control if the Tile was locked
    if (data.locked) this.tile.release();

    // update flags with data
    changed_keys.forEach((ck) => {
      switch (ck) {
        case 'initial':
          // mergeObject(tile.data.parallaxia.initial, data.initial);
          // paraldbg('Saving initial state changes:', tile.data.parallaxia.initial);

          // // save this new state into the Tile entity flags
          // console.log('Pre-safe: ', tile.data.parallaxia.initial.texture.path);
          // if (game.user.isGM) {
          //   const texPath = data.initial?.texture?.path;
          //   if (texPath && tile.data.img !== texPath) tile.update({ img: texPath });
          //   tile._saveInitialState().then((r) => {
          //     paraldbg('Saving complete.', r);
          //   });
          // }
          break;

        // these come not from configuring the tile from our side, but
        // from foundry, e.g. dragging a tile. We want to pick up on those
        // by overriding our own config
        // case 'x':
        //   tile.data.parallaxia.initial.position.x = data.x;
        //   // tile.data.parallaxia.current.position.x = data.x;
        //   break;
        // case 'y':
        //   tile.data.parallaxia.initial.position.y = data.y;
        //   // tile.data.parallaxia.current.position.y = data.y;
        //   break;
        // case 'rotation':
        //   tile.data.parallaxia.initial.rotation.z = toRadians(data.rotation);
        //   // tile.data.parallaxia.current.rotation.z = toRadians(data.rotation);
        //   break;
        // case 'img':
        //   // texture swapping should happen here?
        //   paraldbg('img update with', data.img);
        //   break;
        case '_id':
          break;
      }
    });

    // if image path has changed, swap out the texture!
    // if (changed_keys.has('initial') && data.initial.texture && data.initial.texture.path) {
    //   if (tile.data.img !== data.initial.texture.path) {
    //     paraldbg(`Swapping "${tile.data.img}" to "${data.initial.texture.path}".`);
    //     tile._loadTexture(data.initial.texture.path).then((texture) => {
    //       tile._swapTexture(texture);
    //     });
    //   }
    // }

    // tile._resetCurrentState();
    // tile._advanceState(Date.now(), 0);

    // if (changed_keys.has('ptransform')) {
    //   paraldbg('Custom tile update function changed _onUpdate!');
    //   tile._ptransformSetup(data['ptransform']);
    //   if (game.user.isGM) tile.setFlag('parallaxia', 'ptransform', data.ptransform);
    // }

    // // Update the sheet if it's visible. In contrast to the current values being updated, this
    // // completely re-renders, updating also the initial state and other fields.
    // if (tile._sheet && tile._sheet.rendered) tile.sheet.render();
  };
}

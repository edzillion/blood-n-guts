/* eslint-disable @typescript-eslint/ban-ts-comment */
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

export default class Splat extends Tile {
  container: any;
  frame: any;
  data: any;
  constructor(data = {}, scene) {
    super(data, scene);

    /**
     * The Splat image container
     * @type {PIXI.Container|null}
     */
    this.container = new PIXI.Container();

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

    const style = new PIXI.TextStyle(this.splatData.styleData);
    // all scene splats have a .maskPolgyon.
    if (this.splatData.maskPolygon) {
      this.splatData.splats.forEach((splat) => {
        const text = new PIXI.Text(splat.glyph, style);
        text.x = splat.x + splat.width / 2;
        text.y = splat.y + splat.height / 2;
        text.pivot.set(splat.width / 2, splat.height / 2);
        text.angle = splat.angle;
        this.container.addChild(text);
        return text;
      });

      log(LogLevel.DEBUG, 'drawSceneSplats: splatDataObj.maskPolygon');
      const sightMask = new PIXI.Graphics();
      sightMask.beginFill(1, 1);
      sightMask.drawPolygon(this.splatData.maskPolygon);
      sightMask.endFill();
      this.container.addChild(sightMask);
      this.container.mask = sightMask;

      // this.container.x = this.splatData.x;
      // this.container.y = this.splatData.y;
      // this.container.alpha = this.splatData.alpha || 1;
      // we don't want to save alpha to flags
      //delete this.splatData.alpha;
      this.tile = this.addChild(this.container);

      //   //if it's in the pool already update it otherwise add new entry
      //   if (existingIds.includes(data.id))
      //     BloodNGuts.scenePool.find((p) => p.data.id === data.id).container = container;
      //   else BloodNGuts.scenePool.push({ data: data, container: container });
      // } else {
      //   log(LogLevel.ERROR, 'drawSceneSplats: splatDataObject has no .maskPolygon!');
      // }
    }

    // Refresh the current display
    this.refresh();

    // Enable interactivity, only if the Tile has a true ID
    if (this.id) this.activateListeners();
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
    debugger;
    return canvas.blood;
  }

  /** @override */
  _onUpdate = (data) => {
    debugger;
    log(LogLevel.INFO, '_onUpdate data', data);
    const changed_keys = new Set(Object.keys(data));
    log(LogLevel.INFO, '_onUpdate changed', changed_keys);

    // Release control if the Tile was locked
    if (data.locked) this.tile.release();

    // update flags with data
    changed_keys.forEach((ck) => {
      debugger;
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

  // static getEmbeddedCollection(embeddedName) {
  //   //@ts-expect-error missing def
  //   return super.getEmbeddedCollection(embeddedName);
  // }

  // /** @override */
  // async draw() {
  //   this.clear();

  //   // Create the outer frame for the border and interaction handles
  //   this.frame = this.addChild(new PIXI.Container());
  //   this.frame.border = this.frame.addChild(new PIXI.Graphics());
  //   //@ts-ignore
  //   this.frame.handle = this.frame.addChild(new ResizeHandle([1, 1]));

  //   // Create the tile container and it's child elements
  //   this.container = this.addChild(new PIXI.Container());
  //   const style = new PIXI.TextStyle(this.splatData.styleData);
  //   // all scene splats have a .maskPolgyon.
  //   if (this.splatData.maskPolygon) {
  //     this.splatData.splats.forEach((splat) => {
  //       const text = new PIXI.Text(splat.glyph, style);
  //       text.x = splat.x + splat.width / 2;
  //       text.y = splat.y + splat.height / 2;
  //       text.pivot.set(splat.width / 2, splat.height / 2);
  //       text.angle = splat.angle;
  //       this.container.addChild(text);
  //       return text;
  //     });

  //     log(LogLevel.DEBUG, 'drawSceneSplats: splatDataObj.maskPolygon');
  //     const sightMask = new PIXI.Graphics();
  //     sightMask.beginFill(1, 1);
  //     sightMask.drawPolygon(this.splatData.maskPolygon);
  //     sightMask.endFill();
  //     this.container.addChild(sightMask);
  //     this.container.mask = sightMask;

  //     this.container.x = this.splatData.x;
  //     this.container.y = this.splatData.y;
  //     this.container.alpha = this.splatData.alpha || 1;
  //     // we don't want to save alpha to flags
  //     // delete this.splatData.alpha;
  //   }

  //   // Refresh the current display
  //   this.refresh();

  //   // Enable interactivity, only if the Splat has a true ID
  //   if (this.id) this.activateListeners();
  //   return this;
  // }
}

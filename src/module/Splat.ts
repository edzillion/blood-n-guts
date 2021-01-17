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

    this.data = {
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
    const style = new PIXI.TextStyle(this.data.styleData);
    // all scene splats have a .maskPolgyon.
    if (this.data.maskPolygon) {
      this.data.splats.forEach((splat) => {
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
      sightMask.drawPolygon(this.data.maskPolygon);
      sightMask.endFill();
      this.container.addChild(sightMask);
      this.container.mask = sightMask;

      // this.container.x = this.data.x;
      // this.container.y = this.data.y;
      // this.container.alpha = this.data.alpha || 1;
      // we don't want to save alpha to flags
      //delete this.data.alpha;
      canvas.blood.addChild(this.container);

      //   //if it's in the pool already update it otherwise add new entry
      //   if (existingIds.includes(data.id))
      //     BloodNGuts.scenePool.find((p) => p.data.id === data.id).container = container;
      //   else BloodNGuts.scenePool.push({ data: data, container: container });
      // } else {
      //   log(LogLevel.ERROR, 'drawSceneSplats: splatDataObject has no .maskPolygon!');
      // }
    }
  }

  /* -------------------------------------------- */

  /** @override */
  static get embeddedName() {
    return 'Splat';
  }

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
  //   const style = new PIXI.TextStyle(this.data.styleData);
  //   // all scene splats have a .maskPolgyon.
  //   if (this.data.maskPolygon) {
  //     this.data.splats.forEach((splat) => {
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
  //     sightMask.drawPolygon(this.data.maskPolygon);
  //     sightMask.endFill();
  //     this.container.addChild(sightMask);
  //     this.container.mask = sightMask;

  //     this.container.x = this.data.x;
  //     this.container.y = this.data.y;
  //     this.container.alpha = this.data.alpha || 1;
  //     // we don't want to save alpha to flags
  //     // delete this.data.alpha;
  //   }

  //   // Refresh the current display
  //   this.refresh();

  //   // Enable interactivity, only if the Splat has a true ID
  //   if (this.id) this.activateListeners();
  //   return this;
  // }
}

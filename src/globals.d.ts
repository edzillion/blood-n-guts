interface SplatFont {
  name: string;
  availableGlyphs: Array<string>;
}

interface ViolenceLevel {
  trailSplatDensity: number;
  floorSplatDensity: number;
  tokenSplatDensity: number;
  trailSplatSize: number;
  floorSplatSize: number;
  tokenSplatSize: number;
  splatSpread: number;
  splatPoolSize: number;
}

interface TokenSaveObject {
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  hp: number;
}
interface SplatPoolObject {
  save: SplatSaveObject;
  splatContainer: PIXI.Container;
}
interface SplatSaveObject {
  x: number;
  y: number;
  styleData: any;
  splats: Array<Splat>;
  maskPolygon: Array<number>;
}

interface Splat {
  glyph: string;
  x: number;
  y: number;
}

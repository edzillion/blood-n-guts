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
  damageThreshold: number;
  deathMultiplier: number;
  sceneSplatPoolSize: number;
}

interface SplatPoolObject {
  data: SplatDataObject;
  container?: PIXI.Container;
}

interface SplatDataObject {
  id: string;
  x: number;
  y: number;
  styleData: any;
  splats: Array<Splat>;
  offset: PIXI.Point;
  maskPolygon?: Array<number>;
  tokenId?: string;
  alpha?: number;
}

interface Splat {
  glyph: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

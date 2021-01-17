interface Window {
  BloodNGuts: any;
}

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
  healthThreshold: number;
  damageThreshold: number;
  deathMultiplier: number;
  sceneSplatPoolSize: number;
}

interface TokenSettings extends ViolenceLevel {
  floorSplatFont: string;
  tokenSplatFont: string;
  trailSplatFont: string;
  violenceLevel: string;
  bloodColor: string;
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
  splats: Array<any>;
  offset: PIXI.Point;
  maskPolygon?: Array<number>;
  tokenId?: string;
  alpha?: number;
}

// interface Splat {
//   glyph: string;
//   x: number;
//   y: number;
//   angle: number;
//   width?: number;
//   height?: number;
// }

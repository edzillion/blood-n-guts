import { StringifyOptions } from 'querystring';

interface Global {
  sceneSplatPool: Array<SplatPoolObject>;
}

interface SplatFont {
  name: string;
  availableGlyphs: Array<string>;
}

interface SplatAlignment {
  offset: PIXI.Point;
  width: number;
  height: number;
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
  sceneSplatPoolSize: number;
}

interface TokenStateObject {
  id: string;
  x: number;
  y: number;
  hp: number;
  severity: number;
  splatsContainerZIndex: number;
}

interface SplatPoolObject {
  state: SplatStateObject;
  splatsContainer: PIXI.Container;
}

interface SplatStateObject {
  id: string;
  x: number;
  y: number;
  styleData: any;
  splats: Array<Splat>;
  offset: PIXI.Point;
  maskPolygon?: Array<number>;
  tokenId?: string;
}

interface TokenSplatStateObject {
  id: string;
  styleData: any;
  splats: Array<Splat>;
  offset: PIXI.Point;
}

interface Splat {
  glyph: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

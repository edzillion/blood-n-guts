export interface SplatFont {
  name: string;
  availableGlyphs: Array<string>;
}

export interface Splat {
  text: PIXI.Text;
  container?: PIXI.Container;
  tileData?: any;
  sightMask?: any;
  origin?: PIXI.Point;
  token: Token;
}

export interface ViolenceLevel {
  trailDensity: number;
  floorDensity: number;
  tokenDensity: number;
  trailSplatSize: number;
  floorSplatSize: number;
  tokenSplatSize: number;
  spread: number;
}

export interface SaveObject {
  x: number;
  y: number;
  hp: number;
}

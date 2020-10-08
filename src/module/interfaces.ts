interface SplatFont {
  name: string;
  availableGlyphs: Array<string>;
}

interface Splat {
  text: PIXI.Text;
  container?: PIXI.Container;
  tileData?: any;
  sightMask?: any;
  origin?: PIXI.Point;
  token: Token;
}

interface ViolenceLevel {
  trailSplatDensity: number;
  floorSplatDensity: number;
  tokenSplatDensity: number;
  trailSplatSize: number;
  floorSplatSize: number;
  tokenSplatSize: number;
  spread: number;
}

interface SaveObject {
  x: number;
  y: number;
  hp: number;
}

interface Config {
  trailSplatFont: SplatFont;
  floorSplatFont: SplatFont;
  tokenSplatFont: SplatFont;
  violenceLevel: ViolenceLevel;
}

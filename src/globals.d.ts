// eslint-disable-next-line no-var
declare var bngConfig: BloodNGutsConfig;

interface Window {
  bloodNGutsConfig: BloodNGutsConfig;
  testypoo: string;
  violenceLevel: ViolenceLevel;
}

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
  splatSpread: number;
}

interface SaveObject {
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  hp: number;
}

interface BloodNGutsConfig {
  trailSplatFont: SplatFont;
  floorSplatFont: SplatFont;
  tokenSplatFont: SplatFont;
  violenceLevel: ViolenceLevel;
}

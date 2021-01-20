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

type SplatData = TileSplatData | TokenSplatData;

interface SplatDripData {
  glyph: string;
  x: number;
  y: number;
  angle: number;
  width?: number;
  height?: number;
}

interface TileSplatData {
  _id?: string;
  id?: string;
  alpha?: number;
  img?: string; //not used
  width: number;
  height: number;
  scale: number;
  x: number;
  y: number;
  z?: number;
  rotation: number;
  hidden: boolean;
  locked: boolean;
  drips: SplatDripData[];
  styleData: SplatStyleData;
  offset: PIXI.Point;
  maskPolygon: number[];
}

interface TokenSplatData {
  _id?: string;
  id?: string;
  alpha?: number;
  tokenId: string;
  drips: SplatDripData[];
}

interface SplatStyleData {
  fontFamily: string;
  fontSize: number;
  fill: string;
  align: string;
}

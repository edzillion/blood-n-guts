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

interface TileSplatData extends Tile {
  drips: SplatDripData[];
  styleData: SplatStyle;
  offset: PIXI.Point;
  maskPolygon: number[];
  brushSettings: BrushSettings;
}

// interface TileSplatData {
//   _id?: string;
//   id?: string;
//   alpha?: number;
//   img?: string; //not used
//   width: number;
//   height: number;
//   scale: number;
//   x: number;
//   y: number;
//   z?: number;
//   rotation: number;
//   hidden: boolean;
//   locked: boolean;
//   drips: SplatDripData[];
//   styleData: SplatStyle;
//   offset: PIXI.Point;
//   maskPolygon: number[];
// }

interface TokenSplatData {
  _id?: string;
  id?: string;
  alpha?: number;
  tokenId: string;
  drips: SplatDripData[];
}

interface SplatStyle {
  fontFamily: string;
  fontSize: number;
  fill: string;
  align: string;
}

interface BrushSettings {
  brushAlpha: number;
  brushColor: string;
  brushDensity: number;
  brushFlow: number;
  brushFont: string;
  brushOpacity: number;
  brushRGBA: number;
  brushSize: number;
  brushSpread: number;
  fonts: SplatFont[];
  previewAlpha: number;
  visible: boolean;
}

interface SubmitEvent extends Event {
  submitter: any;
}

interface InteractionEvent extends PIXI.interaction.InteractionEvent {
  data: any;
}

interface HTMLFormElement {
  onsubmit: (this: GlobalEventHandlers, ev: SubmitEvent) => any | null;
}

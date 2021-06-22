interface Window {
  BloodNGuts: any;
}

interface SplatFont {
  name: string;
  availableGlyphs: Array<string>;
}

interface ViolenceLevel {
  name?: string;
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

interface TokenSettings {
  floorSplatFont: string;
  tokenSplatFont: string;
  trailSplatFont: string;
  tokenViolenceLevel: string;
  bloodColor: string;
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

interface TileSplatData extends Tile.Data {
  id: string;
  drips: SplatDripData[];
  styleData: SplatStyle;
  offset: PIXI.Point;
  brushSettings: BrushSettings;
  z: number;
  zIndex?: number;
  alpha?: number;
  name?: string;
  author?: string;
}

interface TokenSplatData extends TileSplatData {
  tokenId: string;
  name?: string;
  alpha?: number;
}

interface SplatStyle {
  fontFamily: string;
  fontSize: number;
  fill: string;
  align: string;
}

interface BrushSettings {
  brushColor: string;
  brushDensity: number;
  brushFlow: number;
  brushFont: string;
  brushSize: number;
  brushSpread: number;
  previewAlpha: number;
}

interface SubmitEvent extends Event {
  submitter: any;
}

interface InteractionEvent extends PIXI.InteractionEvent {
  data: any;
}

interface HTMLFormElement {
  onsubmit: (this: GlobalEventHandlers, ev: SubmitEvent) => any | null;
}

interface System {
  id: string;
  supportedTypes: Array<string>;
  customAttributePaths?: Array<string>;
  ascendingDamage?: boolean;
  currentHP: (token: Token, actorType?: string) => number;
  maxHP: (token: Token, actorType?: string) => number;
  currentHPChange: (changes: Record<string, any>, actorType?: string) => number | void;
  maxHPChange: (changes: Record<string, any>, actorType?: string) => number | void;
  creatureType: (token: Token, bloodColorSettings?: Record<string, string>) => string | void;
}

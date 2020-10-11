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
}

interface SaveObject {
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  hp: number;
}

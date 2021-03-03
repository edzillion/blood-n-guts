import { log, LogLevel } from './logging';
import { MODULE_ID } from '../constants';
import { getMergedBloodColorSettings } from './settings';
import { BloodNGuts } from '../blood-n-guts';

/**
 * Helper functions.
 * @module Helpers
 */

/**
 * Get the lowest x,y position of an array of `Splat`, align all splats with that
 * point and return the offset, the width and height of the area of all splats.
 * @category helpers
 * @function
 * @param {Array<Splat>} splats - array of `Splat` to be aligned.
 * @returns {PIXI.Point, number, number} - offset, width, height
 */
export const alignDripsGetOffsetAndDimensions = (
  splats: Array<any>,
): { dripsOffset: PIXI.Point; dripsWidth: number; dripsHeight: number } => {
  let lowestX = canvas.dimensions.sceneWidth;
  let lowestY = canvas.dimensions.sceneHeight;
  let highestX = 0;
  let highestY = 0;
  for (let i = 0; i < splats.length; i++) {
    const splat = splats[i];
    if (splat.x < lowestX) lowestX = splat.x;
    if (splat.y < lowestY) lowestY = splat.y;
    if (splat.x + splat.width > highestX) highestX = splat.x + splat.width;
    if (splat.y + splat.height > highestY) highestY = splat.y + splat.height;
  }
  for (let j = 0; j < splats.length; j++) {
    splats[j].x -= lowestX;
    splats[j].y -= lowestY;
  }
  return {
    dripsOffset: new PIXI.Point(lowestX, lowestY),
    dripsWidth: highestX - lowestX,
    dripsHeight: highestY - lowestY,
  };
};

/**
 * Uses `computeSight()` to create a LOS polygon from a given point. Note that `computeSight()`
 * returns a polygon positoned absolutely. We would prefer it to be aligned with (0,0) so we
 * subtract `fromPoint` from each polygon vertex.
 * @category helpers
 * @function
 * @param {PIXI.Point} fromPoint - the point to determine LOS from.
 * @param {PIXI.Point} range - how far to look (in canvas pixels).
 * @returns {Array<number>} - 1d array with alternating (x,y) positions. e.g. [x1,y1,x2,y2...]
 */
export const computeSightFromPoint = (fromPoint: PIXI.Point, range: number): [number] => {
  const walls: Array<any> = canvas.walls.blockMovement;
  const minAngle = 360,
    maxAngle = 360;
  const cullDistance = 5; //tiles?
  const cullMult = 2; //default
  const density = 6; //default

  const sight = canvas.sight.constructor.computeSight(
    fromPoint,
    range,
    minAngle,
    maxAngle,
    cullDistance,
    cullMult,
    density,
    walls,
  );

  let lowestX = canvas.dimensions.sceneWidth;
  let lowestY = canvas.dimensions.sceneHeight;

  for (let i = 0; i < sight.fov.points.length; i += 2) {
    lowestX = sight.fov.points[i] < lowestX ? sight.fov.points[i] : lowestX;
    lowestY = sight.fov.points[i + 1] < lowestY ? sight.fov.points[i + 1] : lowestY;
  }

  // we do this to recenter the points on (0,0) for convenience in alignment
  for (let j = 0; j < sight.fov.points.length; j += 2) {
    sight.fov.points[j] -= fromPoint.x;
    sight.fov.points[j + 1] -= fromPoint.y;
  }
  return sight.fov.points;
};

/**
 * Creates and returns a unique identifier.
 * @category helpers
 * @function
 */
export const getUID = (typeCode?: string): string => {
  const d = Date.now().toString(16);
  const r = Math.random().toString(16);
  const prefix = 'bng';

  return [prefix, typeCode, d, r].join('_');
};

/**
 * Checks user to see if the current user is the first registered GM.
 * @category helpers
 * @function
 * @returns {Boolean} - whether the user is the first GM
 */
export const isFirstActiveGM = (): boolean => {
  const firstGm = game.users.find((u) => u.isGM && u.active);
  if (firstGm && game.user === firstGm) {
    return true;
  }
  return false;
};

/**
 * Debug helper to draw a rectangle border around a container.
 * @category helpers
 * @function
 * @param {PIXI.Container} container - the actor to lookup color for.
 * @param {number} [width=2] - optional border width.
 * @param {number} [color=0xff00ff] - optional border color.
 */
export const drawDebugRect = (container: PIXI.Container, width = 2, color = 0xff0000): void => {
  const rect = new PIXI.Graphics();
  rect.lineStyle(width, color).drawRect(container.x, container.y, container.width, container.height);
  canvas.drawings.addChild(rect);
  log(LogLevel.DEBUG, 'drawDebugRect: ', container);
};

/**
 * Debug helper to draw a rectangle border around a container.
 * @category helpers
 * @function
 * @param {PIXI.Container} container - the actor to lookup color for.
 * @param {number} [width=2] - optional border width.
 * @param {number} [color=0xff00ff] - optional border color.
 */
export const drawDebugRect2 = (x, y, w, h, width = 2, color = 0xff0000): void => {
  const rect = new PIXI.Graphics();
  rect.lineStyle(width, color).drawRect(x, y, w, h);
  canvas.drawings.addChild(rect);
};

// MATHS

/**
 * Gets the direction between two points, normalised from (-1,-1) to (1,1)
 * @function
 * @category helpers
 * @param {Actor} lastPosition - the start position.
 * @param {Actor} currentPosition - the end position.
 * @returns {PIXI.Point} - normalised direction: (1,0) is east, (-1,1) is south-west etc.
 */
export const getDirectionNrml = (lastPosition: PIXI.Point, currentPosition: PIXI.Point): PIXI.Point => {
  let x = Number(currentPosition.x > lastPosition.x);
  let y = Number(currentPosition.y > lastPosition.y);
  if (!x) x = -Number(currentPosition.x < lastPosition.x);
  if (!y) y = -Number(currentPosition.y < lastPosition.y);
  return new PIXI.Point(x, y);
};

/**
 * Gets a random character (glyph) from the `.availableGlyphs` in a `SplatFont`
 * @category helpers
 * @function
 * @param {SplatFont} font - the font to choose a random glyph from.
 * @returns {string} - the chosen glyph.
 */
export const getRandomGlyph = (font: SplatFont): string => {
  const glyph = font.availableGlyphs[Math.floor(Math.random() * font.availableGlyphs.length)];
  log(LogLevel.DEBUG, 'getRandomGlyph: ' + glyph);
  return glyph;
};

/**
 * Get point along a quadratic Bézier curve.
 * @category helpers
 * @function
 * @param {PIXI.Point} p1 - start point.
 * @param {PIXI.Point} pc - control point.
 * @param {PIXI.Point} p2 - end point.
 * @param {number} t - time in the curve (between 0 and 1).
 * @returns {PIXI.Point} - x,y position along the curve.
 */
export function getPointOnCurve(p1: PIXI.Point, pc: PIXI.Point, p2: PIXI.Point, t: number): PIXI.Point {
  let x = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * pc.x + t * t * p2.x;
  let y = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * pc.y + t * t * p2.y;

  x = Math.round(x);
  y = Math.round(y);
  return new PIXI.Point(x, y);
}

/**
 * Get derivative along a quadratic Bézier curve.
 * @category helpers
 * @function
 * @param {PIXI.Point} p1 - start point.
 * @param {PIXI.Point} pc - control point.
 * @param {PIXI.Point} p2 - end point.
 * @param {number} t - time in the curve (between 0 and 1).
 * @returns {number, number} - x,y derivative along the curve.
 */
export function getDerivativeAt(p1: PIXI.Point, pc: PIXI.Point, p2: PIXI.Point, t: number): { x: number; y: number } {
  const d1 = { x: 2 * (pc.x - p1.x), y: 2 * (pc.y - p1.y) };
  const d2 = { x: 2 * (p2.x - pc.x), y: 2 * (p2.y - pc.y) };

  const x = (1 - t) * d1.x + t * d2.x;
  const y = (1 - t) * d1.y + t * d2.y;

  return { x, y };
}

/**
 * Use Box-Muller transform to return a random number of normal distribution between 0 and 1.
 * @category helpers
 * @function
 * @returns {number} - random number between 0 and 1.
 */
export const getRandomBoxMuller = (): number => {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) return getRandomBoxMuller(); // resample between 0 and 1
  return num;
};

/**
 * Returns the distance between two Points.
 * @function
 * @param {Point} pt1
 * @param {Point} pt2
 * @returns number
 */
export function distanceBetween(pt1: PIXI.Point, pt2: PIXI.Point): number {
  const x = pt1.x - pt2.x;
  const y = pt1.y - pt2.y;
  return Math.sqrt(x * x + y * y);
}

// COLORS

/**
 * Get hex color string given a color name
 * @category helpers
 * @function
 * @param {string} colorName - name of color (all CSS3 colors plus a few extra).
 * @returns {string} - color in hex format.
 */
export function getHexColor(colorName: string): string {
  const customColor = colors[colorName];
  if (customColor) return customColor;
}

/**
 * Gets the color associated with a `Token`. Only used if `ClientSetting` `blood-n-guts.useBloodColor'
 * is set to true. If the token is a PC then look up race, if it's an NPC then look up type for it's
 * associated color which is read from `data/bloodColorSettings.js` and `Data/blood-n-guts/customBloodColorSettings`.
 * @function
 * @async
 * @category helpers
 * @param {Token} token - the token to lookup color for.
 * @returns {Promise<string>} - color in hex format.
 */
export const lookupTokenBloodColor = async (token: Token): Promise<string> => {
  const bloodColorEnabled = game.settings.get(MODULE_ID, 'useBloodColor');
  if (!token.actor || !token.actor.data) {
    log(LogLevel.WARN, 'lookupTokenBloodColor missing actor data for token!', token);
    return getHexColor('blood');
  } else if (!bloodColorEnabled) return getHexColor('blood'); // if useBloodColor is disabled then all blood is blood red

  const mergedBloodColorSettings = await getMergedBloodColorSettings;
  const creatureType = await BloodNGuts.system.creatureType(token, mergedBloodColorSettings);
  if (!creatureType) {
    log(LogLevel.WARN, 'lookupTokenBloodColor missing creatureType for token:', token.data.name);
    log(LogLevel.WARN, 'is ' + game.system.id + " compatible with Blood 'n Guts?");
    return getHexColor('blood');
  }

  // bloodColorSettings can return either a hex string, a color string or 'name' which looks up the
  // color based on it's name. e.g. 'Purple Ooze'
  const bloodColor = mergedBloodColorSettings[creatureType.toLowerCase()];
  if (!bloodColor) {
    log(LogLevel.INFO, 'No custom color defined for:', creatureType);
    return getHexColor('blood');
  }
  let hexColor: string;
  if (bloodColor[0] === '#') return bloodColor;
  else if (bloodColor === 'none') return 'none';
  else if (bloodColor === 'name') {
    hexColor = getColorByActorName(token.actor);
    log(LogLevel.DEBUG, 'lookupTokenBloodColor name:', bloodColor, hexColor);
  } else if (getHexColor(bloodColor)) {
    hexColor = getHexColor(bloodColor);
    log(LogLevel.DEBUG, 'lookupTokenBloodColor getHexColor:', bloodColor, hexColor);
  } else {
    log(LogLevel.ERROR, 'lookupTokenBloodColor color not recognized!', bloodColor, hexColor);
  }

  log(LogLevel.INFO, 'lookupTokenBloodColor: ' + hexColor);
  return hexColor || getHexColor('blood');
};

/**
 * Gets the color associated with an `Actor` based on it's name. Useful for monsters such as
 * 'Blue Dragon', 'Grey Ooze' etc.
 * @category helpers
 * @function
 * @param {Actor} actor - the actor to lookup color for.
 * @returns {string} - color in hex format
 */
export const getColorByActorName = (actor: Actor): string => {
  log(LogLevel.DEBUG, 'getColorByActorName:' + actor.data.name);
  const wordsInName: Array<string> = actor.data.name.toLowerCase().split(' ');
  for (let i = 0; i < wordsInName.length; i++) {
    const word = wordsInName[i].toLowerCase();
    if (getHexColor(word)) return getHexColor(word);
  }
};

/**
 * lookup table from color name to hex Color
 * @category helpers
 * @constant
 *
 * @returns {string}
 */
export const colors = {
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#00ffff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  black: '#000000',
  blanchedalmond: '#ffebcd',
  blood: '#8A0707',
  blue: '#0000ff',
  blueviolet: '#8a2be2',
  brass: '#BB8265',
  bronze: '#CD7F32',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  copper: '#B87333',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgreen: '#006400',
  darkgrey: '#a9a9a9',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#ff00ff',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  gray: '#808080',
  green: '#008000',
  greenyellow: '#adff2f',
  grey: '#808080',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgreen: '#90ee90',
  lightgrey: '#d3d3d3',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  lime: '#00ff00',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  maroon: '#800000',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  navy: '#000080',
  ochre: '#D47723',
  oldlace: '#fdf5e6',
  olive: '#808000',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  purple: '#800080',
  rebeccapurple: '#663399',
  red: '#ff0000',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  teal: '#008080',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  white: '#ffffff',
  whitesmoke: '#f5f5f5',
  yellow: '#ffff00',
  yellowgreen: '#9acd32',
};

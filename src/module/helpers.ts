/* eslint-disable @typescript-eslint/ban-ts-comment */
import { log, LogLevel } from './logging';
import { MODULE_ID } from '../constants';
import { getMergedBloodColorSettings } from './settings';

const rgbaOnlyRegex = /rgba\((\d{1,3}%?),\s*(\d{1,3}%?),\s*(\d{1,3}%?),\s*(\d*(?:\.\d+)?)\)/gi;

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
export const alignSplatsGetOffsetAndDimensions = (
  splats: Array<Splat>,
): { offset: PIXI.Point; width: number; height: number } => {
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
    offset: new PIXI.Point(lowestX, lowestY),
    width: highestX - lowestX,
    height: highestY - lowestY,
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
  sight.fov.points;
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
 * Gets the color associated with a `Token`. Only used if `ClientSetting` `blood-n-guts.useBloodColor'
 * is set to true. If the token is a PC then look up race, if it's an NPC then look up type for it's
 * associated color which is read from `data/bloodColorSettings.js` and `Data/blood-n-guts/customBloodColorSettings`.
 * @function
 * @async
 * @category helpers
 * @param {Token} token - the token to lookup color for.
 * @returns {Promise<string>} - color in rgba string format, e.g. 'rgba(125, 125, 7, 0.7)'.
 */
export const lookupTokenBloodColor = async (token: Token): Promise<string> => {
  const bloodColorEnabled = game.settings.get(MODULE_ID, 'useBloodColor');
  log(LogLevel.INFO, 'lookupTokenBloodColor enabled?: ' + bloodColorEnabled);
  if (!token.actor || !token.actor.data) {
    log(LogLevel.ERROR, 'lookupTokenBloodColor missing actor data for token!', token);
    return getRGBA('blood');
  } else if (!bloodColorEnabled) return getRGBA('blood'); // if useBloodColor is disabled then all blood is blood red

  const actorType: string = token.actor.data.type;
  let creatureType: string;
  if (actorType === 'character') {
    creatureType = token.actor.data.data.details.ancestry?.value || token.actor.data.data.details.race;
  } else if (actorType === 'npc') {
    creatureType = token.actor.data.data.details.type || token.actor.data.data.details.creatureType;
  }

  log(LogLevel.INFO, 'lookupTokenBloodColor: ', token.name, actorType, creatureType);
  if (!creatureType) {
    log(LogLevel.ERROR, 'lookupTokenBloodColor missing creatureType', token);
    return getRGBA('blood');
  }

  const mergedBloodColorSettings = await getMergedBloodColorSettings;
  const bloodColor = mergedBloodColorSettings[creatureType.toLowerCase()];

  if (!bloodColor) return getRGBA('blood');
  if (bloodColor === 'none') return 'none';

  // bloodSettings can return either an rbga string, a color string or 'name' which looks up the
  // color based on it's name. e.g. 'Purple Ooze'
  let rgba: string;
  if (bloodColor === 'name') {
    rgba = getActorColorByName(token.actor);
    log(LogLevel.DEBUG, 'lookupTokenBloodColor name:', bloodColor, rgba);
  } else if (rgbaOnlyRegex.test(bloodColor)) {
    rgba = bloodColor;
    log(LogLevel.DEBUG, 'lookupTokenBloodColor rgbaOnlyRegex:', bloodColor, rgba);
  } else if (getRGBA(bloodColor)) {
    rgba = getRGBA(bloodColor);
    log(LogLevel.DEBUG, 'lookupTokenBloodColor getRGBA:', bloodColor, rgba);
  } else {
    log(LogLevel.ERROR, 'lookupTokenBloodColor color not recognized!', bloodColor, rgba);
    rgba = getRGBA('blood');
  }

  log(LogLevel.INFO, 'lookupTokenBloodColor: ' + rgba);
  return rgba;
};

/**
 * Gets the color associated with an `Actor` based on it's name. Useful for monsters such as
 * 'Blue Dragon', 'Grey Ooze' etc.
 * @category helpers
 * @function
 * @param {Actor} actor - the actor to lookup color for.
 * @returns {string} - color in rgba format, e.g. '[125, 125, 7, 0.7]'.
 */
export const getActorColorByName = (actor: Actor): string => {
  log(LogLevel.DEBUG, 'getActorColorByName:' + actor.data.name);
  let color: Array<number>;
  let colorString: string;
  const wordsInName: Array<string> = actor.data.name.toLowerCase().split(' ');
  for (let i = 0; i < wordsInName.length; i++) {
    const word = wordsInName[i];
    if (colors[word]) {
      color = colors[word];
      log(LogLevel.DEBUG, 'color found!: ' + color);
      break;
    }
  }
  if (!color) log(LogLevel.ERROR, 'unable to find actor color!');
  else colorString = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.7)`;
  return colorString;
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

export const changeColorPickerOpacityHack = (opacity) => {
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    // @ts-ignore
    if (sheet.ownerNode?.attributes?.href?.value === 'modules/blood-n-guts/blood-n-guts.css') {
      for (let j = 0; j < sheet.rules.length; j++) {
        const rule = sheet.rules[j];
        // @ts-ignore
        if (rule.selectorText === '::-moz-color-swatch' || rule.selectorText === '::-webkit-color-swatch') {
          // @ts-ignore
          if (rule.style.opacity != opacity) {
            log(LogLevel.DEBUG, 'changeColorPickerOpacityHack opacity', opacity);
            // @ts-ignore
            rule.style.opacity = opacity;
          }
        }
      }
    }
  }
};

export const rgbaStringToHexStringAndOpacity = (rgbaString: string): { hexString: string; opacity: string } => {
  const rgbaArray = rgbaString
    .slice(rgbaString.indexOf('(') + 1, rgbaString.indexOf(')'))
    .split(',')
    .map((num) => num.trim());
  const opacity = rgbaArray[3];
  const normalisedRGBAArray = rgbaArray.map((val) => +val / 255);
  const hexString = '#' + rgbToHex(normalisedRGBAArray).toString(16);
  return { hexString: hexString, opacity: opacity };
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

// colors

/**
 * Get an rbga color string given a color name
 * @category helpers
 * @function
 * @param {string} colorName - name of color (all CSS3 colors plus a few extra).
 * @param {number} [alpha=0.7] - optional alpha setting.
 * @returns {string} - color in rgba format, e.g. '[125, 125, 7, 0.7]'.
 */
export function getRGBA(colorName: string, alpha = 0.7): string {
  if (rgbaOnlyRegex.test(colorName)) return colorName;
  const rgbArray: Array<number> = colors[colorName];
  if (!rgbArray) return;
  return `rgba(${rgbArray[0]}, ${rgbArray[1]}, ${rgbArray[2]}, ${alpha})`;
}

/**
 * lookup table from color name to [r, g, b]
 * @category helpers
 * @constant
 *
 * @type {Array<number>}
 */
export const colors = {
  aliceblue: [240, 248, 255],
  antiquewhite: [250, 235, 215],
  aqua: [0, 255, 255],
  aquamarine: [127, 255, 212],
  azure: [240, 255, 255],
  beige: [245, 245, 220],
  bisque: [255, 228, 196],
  black: [0, 0, 0],
  blood: [138, 7, 7],
  blanchedalmond: [255, 235, 205],
  blue: [0, 0, 255],
  blueviolet: [138, 43, 226],
  brass: [181, 166, 66],
  brown: [165, 42, 42],
  bronze: [205, 127, 50],
  burlywood: [222, 184, 135],
  cadetblue: [95, 158, 160],
  chartreuse: [127, 255, 0],
  chocolate: [210, 105, 30],
  coral: [255, 127, 80],
  cornflowerblue: [100, 149, 237],
  cornsilk: [255, 248, 220],
  crimson: [220, 20, 60],
  cyan: [0, 255, 255],
  darkblue: [0, 0, 139],
  darkcyan: [0, 139, 139],
  darkgoldenrod: [184, 134, 11],
  darkgray: [169, 169, 169],
  darkgreen: [0, 100, 0],
  darkgrey: [169, 169, 169],
  darkkhaki: [189, 183, 107],
  darkmagenta: [139, 0, 139],
  darkolivegreen: [85, 107, 47],
  darkorange: [255, 140, 0],
  darkorchid: [153, 50, 204],
  darkred: [139, 0, 0],
  darksalmon: [233, 150, 122],
  darkseagreen: [143, 188, 143],
  darkslateblue: [72, 61, 139],
  darkslategray: [47, 79, 79],
  darkslategrey: [47, 79, 79],
  darkturquoise: [0, 206, 209],
  darkviolet: [148, 0, 211],
  deeppink: [255, 20, 147],
  deepskyblue: [0, 191, 255],
  dimgray: [105, 105, 105],
  dimgrey: [105, 105, 105],
  dodgerblue: [30, 144, 255],
  firebrick: [178, 34, 34],
  floralwhite: [255, 250, 240],
  forestgreen: [34, 139, 34],
  fuchsia: [255, 0, 255],
  gainsboro: [220, 220, 220],
  ghostwhite: [248, 248, 255],
  gold: [255, 215, 0],
  goldenrod: [218, 165, 32],
  gray: [128, 128, 128],
  green: [0, 128, 0],
  greenyellow: [173, 255, 47],
  grey: [128, 128, 128],
  honeydew: [240, 255, 240],
  hotpink: [255, 105, 180],
  indianred: [205, 92, 92],
  indigo: [75, 0, 130],
  ivory: [255, 255, 240],
  khaki: [240, 230, 140],
  lavender: [230, 230, 250],
  lavenderblush: [255, 240, 245],
  lawngreen: [124, 252, 0],
  lemonchiffon: [255, 250, 205],
  lightblue: [173, 216, 230],
  lightcoral: [240, 128, 128],
  lightcyan: [224, 255, 255],
  lightgoldenrodyellow: [250, 250, 210],
  lightgray: [211, 211, 211],
  lightgreen: [144, 238, 144],
  lightgrey: [211, 211, 211],
  lightpink: [255, 182, 193],
  lightsalmon: [255, 160, 122],
  lightseagreen: [32, 178, 170],
  lightskyblue: [135, 206, 250],
  lightslategray: [119, 136, 153],
  lightslategrey: [119, 136, 153],
  lightsteelblue: [176, 196, 222],
  lightyellow: [255, 255, 224],
  lime: [0, 255, 0],
  limegreen: [50, 205, 50],
  linen: [250, 240, 230],
  magenta: [255, 0, 255],
  maroon: [128, 0, 0],
  mediumaquamarine: [102, 205, 170],
  mediumblue: [0, 0, 205],
  mediumorchid: [186, 85, 211],
  mediumpurple: [147, 112, 219],
  mediumseagreen: [60, 179, 113],
  mediumslateblue: [123, 104, 238],
  mediumspringgreen: [0, 250, 154],
  mediumturquoise: [72, 209, 204],
  mediumvioletred: [199, 21, 133],
  midnightblue: [25, 25, 112],
  mintcream: [245, 255, 250],
  mistyrose: [255, 228, 225],
  moccasin: [255, 228, 181],
  navajowhite: [255, 222, 173],
  navy: [0, 0, 128],
  oldlace: [253, 245, 230],
  olive: [128, 128, 0],
  olivedrab: [107, 142, 35],
  orange: [255, 165, 0],
  orangered: [255, 69, 0],
  orchid: [218, 112, 214],
  palegoldenrod: [238, 232, 170],
  palegreen: [152, 251, 152],
  paleturquoise: [175, 238, 238],
  palevioletred: [219, 112, 147],
  papayawhip: [255, 239, 213],
  peachpuff: [255, 218, 185],
  peru: [205, 133, 63],
  pink: [255, 192, 203],
  plum: [221, 160, 221],
  powderblue: [176, 224, 230],
  purple: [128, 0, 128],
  rebeccapurple: [102, 51, 153],
  red: [255, 0, 0],
  rosybrown: [188, 143, 143],
  royalblue: [65, 105, 225],
  saddlebrown: [139, 69, 19],
  salmon: [250, 128, 114],
  sandybrown: [244, 164, 96],
  seagreen: [46, 139, 87],
  seashell: [255, 245, 238],
  sienna: [160, 82, 45],
  silver: [192, 192, 192],
  skyblue: [135, 206, 235],
  slateblue: [106, 90, 205],
  slategray: [112, 128, 144],
  slategrey: [112, 128, 144],
  snow: [255, 250, 250],
  springgreen: [0, 255, 127],
  steelblue: [70, 130, 180],
  tan: [210, 180, 140],
  teal: [0, 128, 128],
  thistle: [216, 191, 216],
  tomato: [255, 99, 71],
  turquoise: [64, 224, 208],
  violet: [238, 130, 238],
  wheat: [245, 222, 179],
  white: [255, 255, 255],
  whitesmoke: [245, 245, 245],
  yellow: [255, 255, 0],
  yellowgreen: [154, 205, 50],
};

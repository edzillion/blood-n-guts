/* eslint-disable @typescript-eslint/ban-ts-comment */
import { log, LogLevel } from './logging';
import { MODULE_ID } from '../constants';
import { getMergedBloodColorSettings } from './settings';
/**
 * Helper functions.
 * @module Helpers
 */

// Types
export const isTokenSplatData = (splatData: SplatData): splatData is TokenSplatData => {
  return (splatData as TokenSplatData).tokenId !== undefined;
};

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
  // @ts-ignore
  return game.users.find((e) => e.isGM).data._id === game.user.data._id;
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
 * Get hex color string given a color name
 * @category helpers
 * @function
 * @param {string} colorName - name of color (all CSS3 colors plus a few extra).
 * @returns {string} - color in hex format.
 */
export function getHexColor(colorName: string): string {
  const customColor = colors[colorName];
  if (customColor) return customColor;
  else {
    // test whether this is a valid CSS color name
    const style = new Option().style;
    style.color = colorName;
    // if it is not a valid color this will be blank
    return style.color;
  }
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
  log(LogLevel.INFO, 'lookupTokenBloodColor enabled?: ' + bloodColorEnabled);
  if (!token.actor || !token.actor.data) {
    log(LogLevel.ERROR, 'lookupTokenBloodColor missing actor data for token!', token);
    return getHexColor('blood');
  } else if (!bloodColorEnabled) return getHexColor('blood'); // if useBloodColor is disabled then all blood is blood red

  const actorType: string = token.actor.data.type;
  let creatureType: string;
  if (actorType === 'character') {
    creatureType = token.actor.data.data.details.ancestry?.value || token.actor.data.data.details.race;
  } else if (actorType === 'npc') {
    creatureType = token.actor.data.data.details.type || token.actor.data.data.details.creatureType;
  }

  log(LogLevel.INFO, 'lookupTokenBloodColor: ', token.name, actorType, creatureType);
  if (!creatureType) {
    log(LogLevel.WARN, 'lookupTokenBloodColor missing creatureType for token:', token.data.name);
    return getHexColor('blood');
  }

  const mergedBloodColorSettings = await getMergedBloodColorSettings;
  const bloodColor = mergedBloodColorSettings[creatureType.toLowerCase()];

  if (!bloodColor) return getHexColor('blood');
  if (bloodColor === 'none') return 'none';

  // bloodColorSettings can return either a hex string, a color string or 'name' which looks up the
  // color based on it's name. e.g. 'Purple Ooze'
  let hexColor: string;
  if (bloodColor === 'name') {
    hexColor = getColorByActorName(token.actor);
    log(LogLevel.DEBUG, 'lookupTokenBloodColor name:', bloodColor, hexColor);
  } else if (getHexColor(bloodColor)) {
    hexColor = getHexColor(bloodColor);
    log(LogLevel.DEBUG, 'lookupTokenBloodColor getHexColor:', bloodColor, hexColor);
  } else {
    log(LogLevel.ERROR, 'lookupTokenBloodColor color not recognized!', bloodColor, hexColor);
    hexColor = getHexColor('blood');
  }

  log(LogLevel.INFO, 'lookupTokenBloodColor: ' + hexColor);
  return hexColor;
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
  let hexColor: string;
  const wordsInName: Array<string> = actor.data.name.toLowerCase().split(' ');
  for (let i = 0; i < wordsInName.length; i++) {
    const word = wordsInName[i];
    if (getHexColor(word)) {
      hexColor = getHexColor(word);
      log(LogLevel.DEBUG, 'color found!: ' + hexColor);
      return hexColor;
    }
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
  blood: '#8A0707',
  brass: '#BB8265',
  bronze: '#CD7F32',
  copper: '#B87333',
  ochre: '#D47723',
};

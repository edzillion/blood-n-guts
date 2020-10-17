import { log, LogLevel } from './logging';
import * as bloodColorSettings from '../data/bloodColorSettings';
import { colors, getRGBA } from './colors';
import { MODULE_ID } from '../constants';

/**
 * Get the lowest x,y position of an array of `Splat`, align all splats with that
 * point and return the offset, the width and height of the area of all splats.
 * @category helpers
 * @function
 * @param {Array<Splat>} splats - array of `Splat` to be aligned.
 * @returns {PIXI.Point, number, number} - offset, width, height
 */
export const alignSplatsGetOffsetAndDimensions = (splats: Array<Splat>): SplatAlignment => {
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
export const randomBoxMuller = (): number => {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) return randomBoxMuller(); // resample between 0 and 1
  return num;
};

/**
 * Gets the color associated with a `Token`. Only used if `ClientSetting` `blood-n-guts.useBloodColor'
 * is set to true. If the token is a PC then look up race, if it's an NPC then look up type for it's
 * associated color which is read from `data/bloodColorSettings.js`.
 * @function
 * @category helpers
 * @param {Token} token - the token to lookup color for.
 * @returns {string} - color in rgba format, e.g. '[125, 125, 7, 0.7]'.
 */
export const lookupTokenBloodColor = (token: Token): string => {
  const enabled = game.settings.get(MODULE_ID, 'useBloodColor');
  log(LogLevel.INFO, 'lookupTokenBloodColor enabled?: ' + enabled);

  const actor: Actor = token.actor;
  const actorType: string = actor.data.type;
  const type: string = actorType === 'npc' ? actor.data.data.details.type : actor.data.data.details.race;

  log(LogLevel.DEBUG, 'lookupTokenBloodColor: ', token.name, actorType, type);
  let bloodColor: string;
  const rgbaOnlyRegex = /rgba\((\d{1,3}%?),\s*(\d{1,3}%?),\s*(\d{1,3}%?),\s*(\d*(?:\.\d+)?)\)/gi;

  // if useBloodColor is disabled then all blood is blood red
  bloodColor = enabled ? bloodColorSettings.color[type] : 'blood';

  // bloodSettings can return either an rbga string, a color string or 'name' which looks up the
  // color based on it's name. e.g. 'Purple Ooze'
  let rgba;
  if (bloodColor === 'name') {
    rgba = getActorColorByName(actor);
    log(LogLevel.DEBUG, 'lookupTokenBloodColor name:', bloodColor, rgba);
  } else if (getRGBA(bloodColor)) {
    rgba = getRGBA(bloodColor);
    log(LogLevel.DEBUG, 'lookupTokenBloodColor getRGBA:', bloodColor, rgba);
  } else if (rgbaOnlyRegex.test(bloodColor)) {
    rgba = bloodColor;
    log(LogLevel.DEBUG, 'lookupTokenBloodColor rgbaOnlyRegex:', bloodColor, rgba);
  } else {
    log(LogLevel.ERROR, 'lookupTokenBloodColor color not recognized!', bloodColor, rgba);
  }

  bloodColor = rgba;

  log(LogLevel.INFO, 'lookupTokenBloodColor: ' + bloodColor);
  return bloodColor;
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

import { log, LogLevel } from './logging';
import * as bloodColorSettings from '../data/bloodColorSettings';
import { colors, getRGBA } from './colors';
import { MODULE_ID } from '../constants';

export const alignSplatsGetOffsetAndDimensions = (splats: Array<Splat>) => {
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
    const t = splats[j];
    t.x -= lowestX;
    t.y -= lowestY;
  }
  return {
    offset: new PIXI.Point(lowestX, lowestY),
    width: highestX - lowestX,
    height: highestY - lowestY,
  };
};

export const computeSightFromPoint = (origin: Point, range: number): [number] => {
  const walls: Array<any> = canvas.walls.blockMovement;
  const minAngle = 360,
    maxAngle = 360;
  const cullDistance = 5; //tiles?
  const cullMult = 2; //default
  const density = 6; //default

  const sight = canvas.sight.constructor.computeSight(
    origin,
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
  for (let j = 0; j < sight.fov.points.length; j += 2) {
    sight.fov.points[j] -= origin.x;
    sight.fov.points[j + 1] -= origin.y;
  }
  return sight.fov.points;
};

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

export const drawDebugRect = (container: PIXI.Container, width = 2, color = 0xff0000): void => {
  const rect = new PIXI.Graphics();
  rect.lineStyle(width, color).drawRect(container.x, container.y, container.width, container.height);
  canvas.drawings.addChild(rect);
  log(LogLevel.DEBUG, 'drawDebugRect: ', container);
};

export const getDirectionNrml = (lastPosition: Point, changes: any): PIXI.Point => {
  let x = Number(changes.x > lastPosition.x);
  let y = Number(changes.y > lastPosition.y);
  if (!x) x = -Number(changes.x < lastPosition.x);
  if (!y) y = -Number(changes.y < lastPosition.y);
  return new PIXI.Point(x, y);
};

export const getRandomGlyph = (font: SplatFont): string => {
  const glyph = font.availableGlyphs[Math.floor(Math.random() * font.availableGlyphs.length)];
  log(LogLevel.DEBUG, 'getRandomGlyph: ' + glyph);
  return glyph;
};

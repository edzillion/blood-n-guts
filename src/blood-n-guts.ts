/**
 * Author: edzillion
 * Content License: [copyright and-or license] If using an existing system
 * 					you may want to put a (link to a) license or copyright
 * 					notice here (e.g. the OGL).
 * Software License: [your license] Put your desired license here, which
 * 					 determines how others may use and modify your module
 */

//CONFIG.debug.hooks = true
//CONFIG.logLevel = 2;

// Import JavaScript modules
import { registerSettings } from './module/settings';
import { preloadTemplates } from './module/preloadTemplates';
import { log, LogLevel } from './module/logging';
import { colors, getRGBA } from './module/colors';
import { getPointAt } from './module/bezier'
import { SplatFont, Splat, ViolenceLevel, SaveObject } from './module/interfaces';

import * as bloodColorSettings from './data/bloodColorSettings';
import * as violenceLevelSettings from './data/violenceLevelSettings';
import * as splatFonts from './data/splatFonts';

let trailSplatFont:SplatFont; 
let floorSplatFont:SplatFont;
let tokenSplatFont:SplatFont;

let violenceLevel:ViolenceLevel;
const tokenSplats:Array<Splat> = [];
const lastTokenState:Array <Partial <SaveObject>> = [];

(document as any).fonts.ready.then(() => {
  log(LogLevel.DEBUG, 'All fonts in use by visible text have loaded.');  
});
(document as any).fonts.onloadingdone = (fontFaceSetEvent) => {
  log(LogLevel.DEBUG, 'onloadingdone we have ' + fontFaceSetEvent.fontfaces.length + ' font faces loaded');
  const check = (document as any).fonts.check('1em splatter');  
  log(LogLevel.DEBUG, 'splatter loaded? ' + check );  // true  
};

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async () => {

	log(LogLevel.INFO, 'Initializing blood-n-guts');

  // Assign custom classes and constants here
	
	// Register custom module settings
	registerSettings();
	
	// Preload Handlebars templates
	await preloadTemplates();

	// Register custom sheets (if any)
});

/* ------------------------------------ */
/* Setup module							*/
/* ------------------------------------   */
Hooks.once('setup', () => {
	// Do anything after initialization but before
  // ready
  initSettings();
});

Hooks.on('closeSettingsConfig', () => {
  initSettings()
});

function initSettings() {
  const level:number = game.settings.get('blood-n-guts', 'violenceLevel');     
  console.log(violenceLevelSettings)
  violenceLevel = violenceLevelSettings.level[level];

  log(LogLevel.DEBUG, 'set violence level:', violenceLevel)
  floorSplatFont = splatFonts.fonts['splatter'];
  tokenSplatFont = splatFonts.fonts['splatter'];
  trailSplatFont = splatFonts.fonts['WC Rhesus A Bta'];
}

/* ------------------------------------ */
/* When ready							              */
/* ------------------------------------ */
Hooks.once('ready', () => {

  log(LogLevel.DEBUG, 'ready, inserting preload stub');
  // Insert a div that uses the font so that it preloads
  const stub = document.createElement('div');
  stub.style.cssText = "visibility:hidden; font-family: 'splatter';"
  stub.innerHTML = "A"; 
  const stub2 = document.createElement('div');
  stub2.style.cssText = "visibility:hidden; font-family: 'WC Rhesus A Bta';"
  stub2.innerHTML = "A"; 
  document.body.appendChild(stub);
  document.body.appendChild(stub2);

  const canvasTokens = canvas.tokens.placeables;
  for (let i=0; i<canvasTokens.length; i++) {
    saveTokenState(canvasTokens[i].data);    
  }
});

Hooks.on('createToken', (_scene, token) => {
  saveTokenState(token);
});

Hooks.once('canvasReady', () => {
  log(LogLevel.INFO, 'canvasReady');
  if (CONFIG.logLevel > LogLevel.DEBUG) {
    document.addEventListener("click", (event) => {
      const [x, y] = [event.clientX, event.clientY];
      const t = canvas.stage.worldTransform;
      const xx = (x - t.tx) / canvas.stage.scale.x;
      const yy = (y - t.ty) / canvas.stage.scale.y;
      log(LogLevel.DEBUG, xx,yy);
    }, false);  
  }
});

Hooks.on("updateToken", (scene, token, changes, options, uid) => {
  log(LogLevel.DEBUG, token, changes, uid, );
  checkForMovement(token, changes);
  checkForDamage(token, changes.actorData);
  saveTokenState(token);
});

Hooks.on('updateActor', (actor, changes, diff ) => {
  log(LogLevel.DEBUG, actor, changes, diff);
  
  const tokens = canvas.tokens.placeables.filter(t => t.actor.id === actor.id);
  if (tokens.length !== 1)
    log(LogLevel.ERROR, 'updateActor token not found, or too many (?)')

  checkForMovement(tokens[0], changes);
  checkForDamage(tokens[0], changes);
  saveTokenState(actor.data.token);
});


async function checkForMovement(token, changes) {
  if (changes.x || changes.y) {    
    log(LogLevel.DEBUG, 'checkForMovement id:' + token._id);    
      
    // is this token bleeding?
    if (await canvas.tokens.placeables.find(t => t.id === token._id).getFlag('blood-n-guts', 'bleeding')) {
      log(LogLevel.DEBUG, 'checkForMovement id:' + token._id + ' - bleeding');
      const splats = generateSplats(token, trailSplatFont, violenceLevel.trailSplatSize, violenceLevel.trailDensity);
      const startPtCentered = centerOnGrid(lastTokenState[token._id].x, lastTokenState[token._id].y);
      const endPtCentered = centerOnGrid(token.x, token.y);
      splatTrail(splats, startPtCentered, endPtCentered);
    }
  }
}

async function checkForDamage(token, actorDataChanges) {
  log(LogLevel.DEBUG, 'last saves:', lastTokenState);
    
  if (!actorDataChanges?.data?.attributes?.hp)
    return; 

  const tokenId = (token.data?._id) ? token.data._id : token._id; 
  const currentHP = actorDataChanges.data.attributes.hp.value;
  const lastHP = lastTokenState[tokenId].hp;
  
  if (currentHP < lastHP) {
    log(LogLevel.DEBUG, 'checkForDamage id:' + tokenId + ' - hp down');    

    let splats = generateSplats(token, floorSplatFont, violenceLevel.floorSplatSize, violenceLevel.floorDensity);
    splatFloor(splats);
    splats = generateSplats(token, tokenSplatFont, violenceLevel.tokenSplatSize, violenceLevel.tokenDensity);
    splatToken(splats);
    
    await canvas.tokens.placeables.find(t => t.id === tokenId).setFlag('blood-n-guts', 'bleeding', true);
    log(LogLevel.DEBUG, 'checkForDamage id:' + tokenId + ' - bleeding:true');
    
    if (actorDataChanges.data.attributes.hp.value == 0)  {
      log(LogLevel.DEBUG, 'checkForDamage id:' + tokenId + ' - death');    
      splats = generateSplats(token, floorSplatFont, violenceLevel.floorSplatSize, violenceLevel.floorDensity);
    }    
  }
  else if (currentHP > lastHP) {
    await canvas.tokens.placeables.find(t => t.id === tokenId).unsetFlag('blood-n-guts', 'bleeding');
    log(LogLevel.DEBUG, 'checkForDamage id:' + tokenId + ' - bleeding:unset');
  }
}



function generateSplats(token:Token, font:SplatFont, size:number, density:number): Array<Splat>{
  if (density === 0) return;

  log(LogLevel.INFO, 'generateSplats')

  const glyphArray:Array<string> = Array.from({length:density},()=> (getRandomGlyph(font)));

  

  const style:PIXI.TextStyle = new PIXI.TextStyle({
    fontFamily: font.name,
    fontSize: size,
    fill: lookupTokenBloodColor(token),
    align :  'center'
  });

  const origin:Point = {x: token.x + canvas.grid.size/2, y: token.y + canvas.grid.size/2};

  const splats:Array<Splat> = glyphArray.map( glyph => {
    const tm = PIXI.TextMetrics.measureText(glyph, style);
  
    return { 
      text: new PIXI.Text(glyph, style),
      token: token,
      tileData: {
        img: "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
        width: tm.width,
        height: tm.height,
        x: origin.x - tm.width/2,
        y: origin.y - tm.height/2,        
      }
    }
  });

  for (let i=0; i<splats.length; i++) {
    const splat = splats[i];

    log(LogLevel.DEBUG, 'generateSplats splat.tileData: ', splat.tileData)

    const sight = computeSightFromPoint(origin, Math.max(splat.tileData.width, splat.tileData.height));
    const sightMask = new PIXI.Graphics();
    sightMask.moveTo(origin.x, origin.y);
    sightMask.beginFill(1,1);
    sightMask.drawPolygon(sight);
    sightMask.endFill();
    canvas.tiles.addChild(sightMask); //? Why do I have to add this?  
    splat.sightMask = sightMask;
  }

  return splats;
}


function  saveTokenState(token) {
  log(LogLevel.DEBUG, 'saveTokenState:', token);
  log(LogLevel.DEBUG, 'saveTokenState id:' + token.name);

  //check if linked token and then 
  let saveObj:Partial<SaveObject> = {};
  if (token.x) saveObj.x = token.x;
  if (token.y) saveObj.y = token.y;
  if (token.actorData.data?.attributes?.hp?.value) {
    saveObj.hp = token.actorData.data.attributes.hp.value;
  }
  else {
    saveObj.hp = game.actors.get(token.actorId).data.data.attributes.hp.value;
  }
  
  saveObj = JSON.parse(JSON.stringify(saveObj));
  log(LogLevel.DEBUG, 'saveTokenState clonedSaveObj:', saveObj);

  lastTokenState[token._id] = Object.assign(saveObj); 
}

function getDirectionNrml(lastPosition:Point, changes:any): PIXI.Point {
  let x = Number(changes.x > lastPosition.x);
  let y = Number(changes.y > lastPosition.y);
  if (!x) x = -Number(changes.x < lastPosition.x);
  if (!y) y = -Number(changes.y < lastPosition.y);
  return new PIXI.Point(x,y);
}

function getRandomGlyph(font:SplatFont): string {
  const glyph = font.availableGlyphs[Math.floor(Math.random()*font.availableGlyphs.length)];
  log(LogLevel.DEBUG, 'getRandomGlyph: ' + glyph);
  return glyph;
}


async function splatFloor(splats:Array<Splat>) {
  
  log(LogLevel.INFO, 'splatFloor');
  generateTiles(splats);
}

async function splatTrail(splats:Array<Splat>, startPtCentered:PIXI.Point, endPtCentered:PIXI.Point, spread?:number) {
  log(LogLevel.INFO, 'splatTrail: (start), (end) ', startPtCentered, endPtCentered)
  const direction = getDirectionNrml(startPtCentered, endPtCentered);

  const pixelSpread = (spread) ? canvas.grid.size * spread : canvas.grid.size * violenceLevel.spread;
  const rand = (randomBoxMuller() * pixelSpread) - pixelSpread/2;

  log(LogLevel.DEBUG, 'splatTrail pixelSpread', pixelSpread, rand);
  log(LogLevel.DEBUG, 'splatTrail: direction ', direction);

  // first go half the distance in the direction we are going  
  const controlPt:PIXI.Point = new PIXI.Point (
    startPtCentered.x + direction.x*(canvas.grid.size/2),
    startPtCentered.y + direction.y*(canvas.grid.size/2)
  );
  // then swap direction y,x to give us an position to the side
  controlPt.set(
    controlPt.x + direction.y*(rand),
    controlPt.y + direction.x*(rand)
  );

  for (let i=0,j=0; i<splats.length; i++,j+=1/violenceLevel.trailDensity) {
    [{x: splats[i].tileData.x, y: splats[i].tileData.y}] = [getPointAt(startPtCentered, controlPt, endPtCentered, j)];
    splats[i].tileData.x -= splats[i].tileData.width/2;
    splats[i].tileData.y -= splats[i].tileData.height/2;
  }

 generateTiles(splats);

}



async function splatToken(splats:Array<Splat>) {
  if (!splats)
    return;

  log(LogLevel.INFO, 'splatToken')

  // @ts-ignore
  const imgPath = splats[0].token.img;
  const tokenSprite = PIXI.Sprite.from(imgPath);
  const maskSprite =  PIXI.Sprite.from(imgPath);

  // scale sprite down to grid bounds
  if (tokenSprite.width > tokenSprite.height) {
    const w = canvas.grid.size / tokenSprite.width;
    tokenSprite.height *= w;
    tokenSprite.width = canvas.grid.size;
  }
  else {
    const h = canvas.grid.size / tokenSprite.height;
    tokenSprite.width *= h;
    tokenSprite.height = canvas.grid.size
  }
  
  maskSprite.width = tokenSprite.width;
  maskSprite.height = tokenSprite.height;  

  const textureContainer = new PIXI.Container();
  const maskContainer = new PIXI.Container();
  
  textureContainer.addChild(maskSprite);
   
  const bwMatrix = new PIXI.filters.ColorMatrixFilter();
  const negativeMatrix = new PIXI.filters.ColorMatrixFilter();  
  maskSprite.filters = [bwMatrix, negativeMatrix];
  bwMatrix. brightness (0,false);
  negativeMatrix.negative(false);

  const renderTexture = new PIXI.RenderTexture(
    new PIXI.BaseRenderTexture({
      width:tokenSprite.width, 
      height:tokenSprite.height,
      // scaleMode: PIXI.SCALE_MODES.LINEAR,
      // resolution: 1      
    }
  ));
    

    const renderSprite = new PIXI.Sprite(renderTexture);    
    renderSprite.x -= canvas.grid.size / 2;
    renderSprite.y -= canvas.grid.size / 2;
    maskContainer.mask = renderSprite;
    maskContainer.addChild(renderSprite);

    //canvas.effects.addChild(maskContainer)
    canvas.app.renderer.render(textureContainer, renderTexture)

    splats.map((splat) => {
      //add some randomness
      const randX = (Math.random()*60)-30;
      const randY = (Math.random()*60)-30;
      log(LogLevel.DEBUG, 'rand', randX, randY)
      splat.text.x -= randX;
      splat.text.y -= randY;

      maskContainer.addChild(splat.text);
      const tokenCenterPt = centerOnGrid(new PIXI.Point(splat.token.x, splat.token.y));
      maskContainer.x = tokenCenterPt.x;
      maskContainer.y = tokenCenterPt.y;
      canvas.effects.addChild(maskContainer);
      splat.container = maskContainer;
      tokenSplats.push(splat);
      log(LogLevel.DEBUG, 'splatToken: maskContainer (x,y): ', maskContainer.x, maskContainer.y);
    });
}


// this could be in functional style
function centerOnGrid(pointOrX:PIXI.Point | number, y?:number): PIXI.Point {
  if (y && typeof pointOrX == 'number')  {
    return new PIXI.Point(pointOrX + canvas.grid.size/2, y + canvas.grid.size/2);
  }
  const p = <PIXI.Point>pointOrX;
  p.set(p.x += canvas.grid.size/2, p.y += canvas.grid.size/2)  
  return p;
}

async function generateTiles(splats: any[]) {
  log(LogLevel.INFO, 'generateTiles')

  splats.map(async (splat) => {
    const tile:Tile = await Tile.create(splat.tileData);    
      
    log(LogLevel.DEBUG, 'generateTiles splat.tileData: ', splat.tileData)

    if (CONFIG.logLevel > LogLevel.DEBUG) {
      const myRect = new PIXI.Graphics();
      myRect.lineStyle(2, 0xff00ff).drawRect(tile.x, tile.y, tile.width, tile.height);
      canvas.drawings.addChild(myRect);
      log(LogLevel.DEBUG, 'generateTiles: added Rect');
    }

    tile.mask = splat.sightMask;
    tile.addChild(splat.text);  
    canvas.tiles.addChild(tile);    
  });     
}

function computeSightFromPoint(origin:Point, range:number): [number]  {
  const walls:Array<any> = canvas.walls.blockMovement;
  const minAngle = 360, maxAngle = 360;
  const cullDistance = 5; //tiles?
  const cullMult = 2; //default
  const density = 6; //default
  
  const sight = canvas.sight.constructor.computeSight(origin, range, minAngle, maxAngle, cullDistance, cullMult, density, walls);
  return sight.fov.points;
}

function randomBoxMuller(): number {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) return randomBoxMuller(); // resample between 0 and 1
  return num;
}

function lookupTokenBloodColor(token) {
  log(LogLevel.INFO, 'lookupTokenBloodColor: ' + token.name);

  const actor:Actor = (token.actor) ? token.actor : game.actors.get(token.actorId)
  const actorType:string = actor.data.type
  const type:string = (actorType === 'npc') ? actor.data.data.details.type : actor.data.data.details.race;
  
  log(LogLevel.DEBUG, 'lookupTokenBloodColor: ', actorType, type);
  let bloodColor:string;  
  const rgbaOnlyRegex = /rgba\((\d{1,3}%?),\s*(\d{1,3}%?),\s*(\d{1,3}%?),\s*(\d*(?:\.\d+)?)\)/ig;
  bloodColor = bloodColorSettings.color[type];
  let rgba;
  if (bloodColor === 'name') {
    rgba = getActorColorByName(actor);
    log(LogLevel.DEBUG, 'lookupTokenBloodColor name:', bloodColor, rgba);
  }
  else if (getRGBA(bloodColor)) {        
    rgba = getRGBA(bloodColor);
    log(LogLevel.DEBUG, 'lookupTokenBloodColor getRGBA:', bloodColor, rgba);
  }
  else if (rgbaOnlyRegex.test(bloodColor)) {
    rgba = bloodColor;
    log(LogLevel.DEBUG, 'lookupTokenBloodColor rgbaOnlyRegex:', bloodColor, rgba);
  }
  else {
    log(LogLevel.ERROR, 'lookupTokenBloodColor color not recognized!', bloodColor, rgba);
  }
  
  bloodColor = rgba;

  log(LogLevel.INFO, 'lookupTokenBloodColor: ' + bloodColor);
  return bloodColor;
}



function getActorColorByName(actor): string {
  log(LogLevel.DEBUG, 'getActorColorByName:' + actor.data.name);
  let color:Array<number>;
  let colorString:string
  const wordsInName:Array<string> = actor.data.name.toLowerCase().split(' ');
  for (let i=0; i<wordsInName.length; i++) {    
    const word = wordsInName[i];
    if (colors[word]) {
      color = colors[word];      
      log(LogLevel.DEBUG, 'color found!: ' + color);
      break;
    }
  }
  if (!color) log(LogLevel.ERROR, 'unable to find actor color!')
  else colorString = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.7)`;
  return colorString;
}



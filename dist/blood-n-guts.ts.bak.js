/**
 * This is your JavaScript entry file for Foundry VTT.
 * Register custom settings, sheets, and constants using the Foundry API.
 * Change this heading to be more descriptive to your module, or remove it.
 * Author: [your name]
 * Content License: [copyright and-or license] If using an existing system
 * 					you may want to put a (link to a) license or copyright
 * 					notice here (e.g. the OGL).
 * Software License: [your license] Put your desired license here, which
 * 					 determines how others may use and modify your module
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// CONFIG.debug.hooks = true
var fonts = [{ name: 'splatter', availableGlyphs: [...'cABCDEFGHIJKLMNOPQRSTUVQ'] }];
var bleeding = [];
var lastPosition;
var currentFont;
var bleedingFont;
var tokenSelected;
// Import JavaScript modules
import { registerSettings } from './module/settings.js';
import { preloadTemplates } from './module/preloadTemplates.js';
document.fonts.ready.then(function () {
    console.log('All fonts in use by visible text have loaded.');
    console.log('splatter loaded? ' + document.fonts.check('1em splatter')); // true
});
document.fonts.onloadingdone = function (fontFaceSetEvent) {
    console.log('onloadingdone we have ' + fontFaceSetEvent.fontfaces.length + ' font faces loaded');
    let check = document.fonts.check('1em splatter');
    console.log('splatter loaded? ' + check); // true  
};
/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', function () {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('blood-n-guts | Initializing blood-n-guts');
        // Assign custom classes and constants here
        // Register custom module settings
        registerSettings();
        // Preload Handlebars templates
        yield preloadTemplates();
        // Register custom sheets (if any)
    });
});
/* ------------------------------------ */
/* Setup module							*/
/* ------------------------------------ */
Hooks.once('setup', function () {
    // Do anything after initialization but before
    // ready
    let bloodSplatSize = game.settings.get("blood-n-guts", "bloodSplatSize");
    let bloodTrailSplatSize = game.settings.get("blood-n-guts", "bloodTrailSplatSize");
    currentFont = { name: 'splatter', size: bloodSplatSize, availableGlyphs: [...'cABCDEFGHIJKLMNOPQRSTUVQ'] };
    bleedingFont = { name: 'WC Rhesus A Bta', size: bloodTrailSplatSize, availableGlyphs: [...'!\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxzy{|}~¡¢£¥§ ̈©ª«¬® ̄°± ́¶· ̧º»¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜßàáâãäåæçèéêëìíîïñòóôõö÷øùúûüÿiŒœŸƒ'] };
});
/* ------------------------------------ */
/* When ready							              */
/* ------------------------------------ */
Hooks.once('ready', function () {
    console.log('ready, inserting preload stub');
    // Insert a div that uses the font so that it preloads
    var stub = document.createElement('div');
    stub.style.cssText = "visibility:hidden; font-family: 'splatter';";
    stub.innerHTML = "A";
    var stub2 = document.createElement('div');
    stub2.style.cssText = "visibility:hidden; font-family: 'WC Rhesus A Bta';";
    stub2.innerHTML = "A";
    document.body.appendChild(stub);
    document.body.appendChild(stub2);
});
Hooks.once('canvasReady', function (canvas) {
    console.log('canvasReady');
    document.addEventListener("click", (event) => {
        const [x, y] = [event.clientX, event.clientY];
        const t = canvas.stage.worldTransform;
        let xx = (x - t.tx) / canvas.stage.scale.x;
        let yy = (y - t.ty) / canvas.stage.scale.y;
        console.log(xx, yy);
    }, false);
});
Hooks.on("updateToken", (scene, token, changes, options, uid) => {
    console.log(changes);
    let tokenCenter = centerOnGrid(new PIXI.Point(token.x, token.y));
    if (changes.actorData && changes.actorData.data && changes.actorData.data.attributes && changes.actorData.data.attributes.hp) {
        console.log('updateToken: hp change');
        if (changes.actorData.data.attributes.hp.value == 0) {
            console.log('updateToken: death');
            bleeding.push(token.actorId);
            splatPath(lastPosition, tokenCenter, currentFont, game.settings.get("blood-n-guts", "bloodSplatSize"));
        }
    }
    if (changes.x || changes.y) {
        if (!lastPosition) {
            lastPosition = centerOnGrid(new PIXI.Point(token.x, token.y));
        }
        console.log(token);
        tokenSelected = token;
        console.log('movement');
        splatPath(lastPosition, tokenCenter, bleedingFont, game.settings.get("blood-n-guts", "bloodTrailSplatSize"), game.settings.get("blood-n-guts", "bloodTrailDensity"));
        //is this token bleeding??
        //if (bleeding.includes(token.actorId)) {
        //splatPath(token, direction, bleedingFont);
        //}
        tokenCenter.copyTo(lastPosition);
    }
});
function getDirectionNrml(lastPosition, changes) {
    let x = Number(changes.x > lastPosition.x);
    let y = Number(changes.y > lastPosition.y);
    if (!x)
        x = -Number(changes.x < lastPosition.x);
    if (!y)
        y = -Number(changes.y < lastPosition.y);
    return new PIXI.Point(x, y);
}
function getRandomGlyph(font) {
    const glyph = font.availableGlyphs[Math.floor(Math.random() * font.availableGlyphs.length)];
    console.log('getRandomGlyph', glyph);
    return glyph;
}
function splat(token, font) {
    return __awaiter(this, void 0, void 0, function* () {
        const glyph = getRandomGlyph(font);
        const style = new PIXI.TextStyle({
            fontFamily: font.name,
            fontSize: font.size,
            fill: `rgba(255, 0, 0, 0.7)`,
            align: 'center'
        });
        const richText = new PIXI.Text(glyph, style);
        const textMetrics = PIXI.TextMetrics.measureText(glyph, style);
        const origin = { x: token.x + canvas.grid.size / 2, y: token.y + canvas.grid.size / 2 };
        const tileData = {
            img: "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
            width: 1,
            height: 1,
            x: origin.x - textMetrics.width / 2,
            y: origin.y - textMetrics.height / 2
        };
        // let myRect = new PIXI.Graphics();
        // myRect.lineStyle(2, 0xffffff).drawRect(tileData.x, tileData.y, textMetrics.width, textMetrics.height);
        // canvas.drawings.addChild(myRect);
        // console.log('added Rect')
        let sight = computeSightFromPoint(origin, Math.max(textMetrics.width, textMetrics.height));
        let sightPolygon = new PIXI.Graphics();
        sightPolygon.moveTo(origin.x, origin.y);
        sightPolygon.beginFill(1, 1);
        sightPolygon.drawPolygon(sight);
        sightPolygon.endFill();
        canvas.drawings.addChild(sightPolygon); //? Why do I have to add this?
        let tile = yield Tile.create(tileData);
        tile.mask = sightPolygon;
        yield tile.addChild(richText);
    });
}
function splatPath(startPt, endPt, font, size, density = 1) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('splatpath', startPt.x, startPt.y, endPt.x, endPt.y);
        const style = new PIXI.TextStyle({
            fontFamily: font.name,
            fontSize: size,
            fill: `rgba(255, 0, 0, 0.7)`,
            align: 'center'
        });
        // since we are given the current x,y of the token lets work backward from there
        let glyphArray = Array.from({ length: density }, () => (getRandomGlyph(font)));
        let splats = glyphArray.map(glyph => {
            return {
                text: new PIXI.Text(glyph, style),
                textMetrics: PIXI.TextMetrics.measureText(glyph, style)
            };
        });
        let direction = getDirectionNrml(startPt, endPt);
        // for (let i=0; i<splats.length; i++) {
        //   splats[i].origin.x -= direction.x * (distance * i);
        //   splats[i].origin.y -= direction.y * (distance * i);
        // }
        let cheapNormalDistrib = (canvas.grid.size / 100) * (Math.random() * 25) + (canvas.grid.size / 100) * (Math.random() * 25) + (canvas.grid.size / 100) * (Math.random() * 25) + (canvas.grid.size / 100) * (Math.random() * 25);
        cheapNormalDistrib -= canvas.grid.size / 2;
        console.log('start', startPt, 'end', endPt, 'direction', direction);
        console.log(cheapNormalDistrib);
        // first go half the distance in the direction we are going  
        let controlPt = new PIXI.Point(startPt.x + direction.x * (canvas.grid.size / 2), startPt.y + direction.y * (canvas.grid.size / 2));
        console.log(controlPt);
        // then swap direction y,x to give us an position to the side
        controlPt.set(controlPt.x + direction.y * (cheapNormalDistrib), controlPt.y + direction.x * (cheapNormalDistrib));
        console.log(controlPt);
        console.log(splats);
        for (let i = 0, j = 0; i < splats.length; i++, j += 1 / density) {
            splats[i].position = getPointAt(startPt, controlPt, endPt, j);
        }
        // last one should be centered
        //splats[splats.length].origin = {x:token.x + canvas.grid.size/2, y: token.y + canvas.grid.size/2};
        splats[0].text.x = endPt.x - splats[0].textMetrics.width / 2;
        splats[0].text.y = endPt.y - splats[0].textMetrics.height / 2;
        let imgPath = tokenSelected.img;
        let sprite = PIXI.Sprite.from(imgPath);
        console.log(imgPath, sprite);
        if (sprite.width > sprite.height) {
            let w = canvas.grid.size / sprite.width;
            sprite.height *= w;
            sprite.width = canvas.grid.size;
        }
        else {
            let h = canvas.grid.size / sprite.height;
            sprite.width *= h;
            sprite.height = canvas.grid.size;
        }
        //sprite.tint = 0x000000;
        // canvas.effects.addChild(sprite);
        //canvas.addChild(sprite);
        // let spriteDataURL = canvas.app.renderer.plugins.extract.base64(sprite, 'image/png');    
        // console.log(spriteDataURL); 
        // let renderer = PIXI.autoDetectRenderer();
        // const renderTexture = PIXI.RenderTexture.create({width:sprite.width, height:sprite.height});
        // sprite.position.x = sprite.width/2;
        // sprite.position.y = sprite.height/2;
        // sprite.anchor.x = 0.5;
        // sprite.anchor.y = 0.5;
        let testSprite = PIXI.Sprite.from(imgPath);
        let masko = PIXI.Sprite.from(imgPath);
        masko.width = sprite.width;
        masko.height = sprite.height;
        testSprite.width = sprite.width;
        testSprite.height = sprite.height;
        //let masking = canvas.app.renderer.render(sprite, renderTexture);
        //console.log('masking', masking)
        // let masker =  PIXI.Sprite.from(spriteDataURL);
        // console.log(masker)
        // canvas.app.loader.add(spriteDataURL).load((whatsthis) => {
        //   console.log('whatsthis', whatsthis)
        // });
        const container = new PIXI.Container();
        let myRect = new PIXI.Graphics();
        myRect.lineStyle(100, 0x22ff22).drawRect(20, 20, 250, 250);
        //container.addChild(myRect);
        console.log('added Rect');
        console.log('loaded');
        container.addChild(testSprite);
        container.addChild(masko);
        let bwMatrix = new PIXI.filters.ColorMatrixFilter();
        let contrastMatrix = new PIXI.filters.ColorMatrixFilter();
        let thirdmatrix = new PIXI.filters.ColorMatrixFilter();
        masko.filters = [bwMatrix, contrastMatrix];
        testSprite.filters = [bwMatrix];
        testSprite.x += 70;
        bwMatrix.brightness(0, true);
        //thirdmatrix.contrast(1, true)
        contrastMatrix.negative(true);
        //colorMatrix.negative(false);
        // bunny.height = 256;  
        // bunny.width = 256;
        //container.mask = masko;
        canvas.app.stage.addChild(container);
        let cont = new PIXI.Container();
        //cont.addChild(sprite);
        //cont.addChild(masko);
        testSprite.x += 140;
        cont.addChild(testSprite);
        //Create a Texture that will render each of the reels
        var texture = new PIXI.RenderTexture(new PIXI.BaseRenderTexture({
            width: sprite.width * 3,
            height: sprite.height,
            scaleMode: PIXI.SCALE_MODES.LINEAR,
            resolution: 1
        }));
        let ssss = new PIXI.Sprite(texture);
        let ssss2 = new PIXI.Sprite(texture);
        ssss2.y += 140;
        canvas.app.stage.addChild(ssss);
        canvas.app.stage.addChild(ssss2);
        canvas.app.renderer.render(cont, texture);
        //Render the stage
        //renderer.render(stage);
        // const renderTexture = PIXI.RenderTexture.create({width:sprite.width, height:sprite.height});
        // const renderTextureSprite = new PIXI.Sprite(renderTexture);
        // renderTextureSprite.x += 140
        // canvas.app.renderer.render(masko, renderTexture);
        // canvas.app.stage.addChild(renderTextureSprite);
        // //divOverlay.innerHTML = glyphArray[0];
        // // divOverlay.style.maskImage = spriteDataURL;
        // divOverlay.style.fontFamily = font.name;
        // divOverlay.style.fontSize = String(font.size);
        // divOverlay.style.fill = `rgba(255, 0, 0, 0.7)`;
        // divOverlay.style.alignContent = 'center';
        // divOverlay.innerHTML = glyphArray[0];
        // tempCanvas.width = sprite.width;
        // tempCanvas.height = sprite.height;
        // document.body.appendChild(tempCanvas);
        // let tempContext = tempCanvas.getContext('2d');
        //let imageData = tempContext.getImageData(sprite.x, sprite.y, sprite.width, sprite.height);
        // const update = await canvas.scene.updateEmbeddedEntity(Token.embeddedName, {
        //   tint: '#FFFFFF',
        //   _id: (tokenSelected as any)._id,
        // });
        // console.log(update)
        // let container:PIXI.Container = new PIXI.Container();
        // container.addChild(splats[0].text);
        // container.mask = sprite;
        // canvas.effects.addChild(container);
        //await generateTiles(splats);
    });
}
// this could be in functional style
function centerOnGrid(point) {
    return new PIXI.Point(point.x + canvas.grid.size / 2, point.y + canvas.grid.size / 2);
}
function generateTiles(splats) {
    return __awaiter(this, void 0, void 0, function* () {
        const promises = splats.map((splat) => __awaiter(this, void 0, void 0, function* () {
            let sight = computeSightFromPoint(splat.position, Math.max(splat.textMetrics.width, splat.textMetrics.height));
            let sightPolygon = new PIXI.Graphics();
            sightPolygon.moveTo(splat.position.x, splat.position.y);
            sightPolygon.beginFill(1, 1);
            sightPolygon.drawPolygon(sight);
            sightPolygon.endFill();
            canvas.drawings.addChild(sightPolygon); //? Why do I have to add this?
            let tileData = {
                img: "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
                width: 1,
                height: 1,
                x: splat.position.x - splat.textMetrics.width / 2,
                y: splat.position.y - splat.textMetrics.height / 2
            };
            let myRect = new PIXI.Graphics();
            myRect.lineStyle(2, 0xffffff).drawRect(tileData.x, tileData.y, splat.textMetrics.width, splat.textMetrics.height);
            canvas.drawings.addChild(myRect);
            console.log('added Rect');
            let tile = yield Tile.create(tileData);
            tile.mask = sightPolygon;
            return tile.addChild(splat.text);
        }));
        yield Promise.all(promises);
    });
}
function computeSightFromPoint(origin, range) {
    let walls = canvas.walls.blockMovement;
    let minAngle, maxAngle = 360;
    let cullDistance = 5; //tiles?
    let cullMult = 2; //default
    let density = 6; //default
    let sight = canvas.sight.constructor.computeSight(origin, range, minAngle, maxAngle, cullDistance, cullMult, density, walls);
    return sight.fov.points;
}
// these methods are only for quadratic curves
// p1: {x,y} start point
// pc: {x,y} control point    
// p2: {x,y} end point
// t: (float between 0 and 1) time in the curve
function getPointAt(p1, pc, p2, t) {
    const x = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * pc.x + t * t * p2.x;
    const y = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * pc.y + t * t * p2.y;
    return { x, y };
}
function getDerivativeAt(t, p1, pc, p2) {
    const d1 = { x: 2 * (pc.x - p1.x), y: 2 * (pc.y - p1.y) };
    const d2 = { x: 2 * (p2.x - pc.x), y: 2 * (p2.y - pc.y) };
    const x = (1 - t) * d1.x + t * d2.x;
    const y = (1 - t) * d1.y + t * d2.y;
    return { x, y };
}

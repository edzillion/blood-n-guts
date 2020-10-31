import { log, LogLevel } from '../module/logging';
import { BloodNGuts } from '../blood-n-guts';
import { MODULE_ID } from '../constants';
import {
  lookupTokenBloodColor,
  getRandomGlyph,
  getRandomBoxMuller,
  alignSplatsGetOffsetAndDimensions,
  getDirectionNrml,
  getUID,
} from './helpers';
import * as splatFonts from '../data/splatFonts';

export default class SplatToken {
  token: Token;
  splatsContainer: PIXI.Container;
  id: string;
  x: number;
  y: number;
  spriteWidth: number;
  spriteHeight: number;
  direction: PIXI.Point;
  hp: number;
  maxHP: number;

  bloodColor: string;

  bleedingCount: number;
  hitSeverity: number;
  bleedingSeverity: number;

  tokenSplats: Array<SplatStateObject>;

  constructor(token: Token) {
    // @ts-ignore
    this.id = token.id || token.actor.data._id;
    this.token = token;
    this.spriteWidth = token.data.width * canvas.grid.size * token.data.scale;
    this.spriteHeight = token.data.height * canvas.grid.size * token.data.scale;
    this.bloodColor = lookupTokenBloodColor(token);
    this.saveState(token);
    this.bleedingSeverity = this.token.getFlag(MODULE_ID, 'bleedingSeverity');
    this.tokenSplats = this.token.getFlag(MODULE_ID, 'splats') || [];
    this.splatsContainer = new PIXI.Container();
  }

  public async createMask(): Promise<void> {
    // @ts-ignore
    const maskTexture = await PIXI.Texture.fromURL(this.token.data.img);
    const maskSprite = PIXI.Sprite.from(maskTexture);
    maskSprite.width = this.spriteWidth;
    maskSprite.height = this.spriteHeight;

    const textureContainer = new PIXI.Container();
    textureContainer.addChild(maskSprite);
    const bwMatrix = new PIXI.filters.ColorMatrixFilter();
    const negativeMatrix = new PIXI.filters.ColorMatrixFilter();
    maskSprite.filters = [bwMatrix, negativeMatrix];
    bwMatrix.brightness(0, false);
    negativeMatrix.negative(false);
    const renderTexture = new PIXI.RenderTexture(
      new PIXI.BaseRenderTexture({
        width: this.spriteWidth,
        height: this.spriteHeight,
        // scaleMode: PIXI.SCALE_MODES.LINEAR,
        // resolution: 1
      }),
    );

    const renderSprite = new PIXI.Sprite(renderTexture);
    canvas.app.renderer.render(textureContainer, renderTexture);

    this.splatsContainer.addChild(renderSprite);
    this.splatsContainer.mask = renderSprite;

    this.splatsContainer.pivot.set(this.spriteWidth / 2, this.spriteHeight / 2);
    this.splatsContainer.position.set(
      (this.token.data.width * canvas.grid.size) / 2,
      (this.token.data.height * canvas.grid.size) / 2,
    );
    this.splatsContainer.angle = this.token.data.rotation;
  }

  public updateSplats(updatedSplats): void {
    this.tokenSplats = updatedSplats || [];
    this.draw();
  }

  public async updateChanges(changes): Promise<void> {
    if (
      changes.rotation === undefined &&
      changes.x === undefined &&
      changes.y === undefined &&
      changes.actorData?.data?.attributes?.hp === undefined
    )
      return;

    this.updateDamage(changes);
    this.updateMovement(changes);
    this.updateBleeding();

    if (this.hitSeverity > 0) {
      this.bleedFloor();
      this.bleedToken();
    } else if (this.hitSeverity < 0) {
      this.healToken();
    }
    if (this.direction && this.bleedingSeverity) this.bleedTrail();

    this.updateRotation(changes);

    this.saveState(this.token);

    const flags = {
      [MODULE_ID]: { bleedingSeverity: this.bleedingSeverity, splats: duplicate(this.tokenSplats) },
    };

    await this.token.update({ flags }, { diff: false });
  }

  private updateDamage(changes): void {
    if (changes.actorData === undefined || changes.actorData.data.attributes?.hp === undefined) return;
    this.setSeverity(this.getDamageSeverity(changes));
  }

  private updateMovement(changes): void {
    if (changes.x === undefined && changes.y === undefined) return;

    const posX = changes.x === undefined ? this.x : changes.x;
    const posY = changes.y === undefined ? this.y : changes.y;
    const currPos = new PIXI.Point(posX, posY);
    const lastPos = new PIXI.Point(this.x, this.y);
    log(LogLevel.DEBUG, 'checkForMovement pos: l,c:', lastPos, currPos);

    this.direction = getDirectionNrml(lastPos, currPos);
  }

  private updateBleeding(): void {
    if (!this.direction || !this.bleedingSeverity) return;

    const density = game.settings.get(MODULE_ID, 'trailSplatDensity');
    if (!--this.bleedingCount) this.bleedingCount = Math.round(1 / density);
  }

  private updateRotation(changes): void {
    if (changes.rotation === undefined) return;
    log(LogLevel.DEBUG, 'updateTokenOrActorHandler updating rotation', changes.rotation);
    this.splatsContainer.angle = changes.rotation;
  }

  private bleedFloor(): void {
    const density = game.settings.get(MODULE_ID, 'floorSplatDensity');
    if (!density) return;
    log(LogLevel.DEBUG, 'updateTokenOrActorHandler damageScale > 0:' + this.id + ' - bleeding:true');
    BloodNGuts.generateFloorSplats(
      this,
      splatFonts.fonts[game.settings.get(MODULE_ID, 'floorSplatFont')],
      game.settings.get(MODULE_ID, 'floorSplatSize'),
      Math.round(density),
    );
  }

  private bleedTrail(): void {
    const density = game.settings.get(MODULE_ID, 'trailSplatDensity');
    if (!density) return;
    if (density > 0 && density < 1) {
      if (this.bleedingCount === 0) {
        BloodNGuts.generateFloorSplats(
          this,
          splatFonts.fonts[game.settings.get(MODULE_ID, 'trailSplatFont')],
          game.settings.get(MODULE_ID, 'trailSplatSize'),
          1, //one splat per 1/density grid squares
        );
      }
    } else {
      BloodNGuts.generateTrailSplats(
        this,
        splatFonts.fonts[game.settings.get(MODULE_ID, 'trailSplatFont')],
        game.settings.get(MODULE_ID, 'trailSplatSize'),
        density,
      );
    }
  }

  private async bleedToken(): Promise<void> {
    const splatStateObj: Partial<SplatStateObject> = {};
    const density = game.settings.get(MODULE_ID, 'tokenSplatDensity');
    if (density === 0) return;

    const font = splatFonts.fonts[game.settings.get(MODULE_ID, 'tokenSplatFont')];

    // scale the splats based on token size and severity
    const fontSize = Math.round(
      game.settings.get(MODULE_ID, 'trailSplatSize') *
        ((this.spriteWidth + this.spriteHeight) / canvas.grid.size / 2) *
        this.hitSeverity,
    );
    log(LogLevel.DEBUG, 'bleedToken fontSize', fontSize);
    splatStateObj.styleData = {
      fontFamily: font.name,
      fontSize: fontSize,
      fill: this.bloodColor,
      align: 'center',
    };
    const style = new PIXI.TextStyle(splatStateObj.styleData);
    // amount of splats is based on density and severity
    const amount = Math.round(density * this.hitSeverity);
    if (amount === 0) return;
    // get a random glyph and then get a random (x,y) spread away from the token.
    const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
    const pixelSpreadX = this.spriteWidth * game.settings.get(MODULE_ID, 'splatSpread');
    const pixelSpreadY = this.spriteHeight * game.settings.get(MODULE_ID, 'splatSpread');
    log(LogLevel.DEBUG, 'bleedToken amount', amount);
    log(LogLevel.DEBUG, 'bleedToken pixelSpread', pixelSpreadX, pixelSpreadY);

    // create our splats for later drawing.
    splatStateObj.splats = glyphArray.map((glyph) => {
      const tm = PIXI.TextMetrics.measureText(glyph, style);
      const randX = getRandomBoxMuller() * pixelSpreadX - pixelSpreadX / 2;
      const randY = getRandomBoxMuller() * pixelSpreadY - pixelSpreadY / 2;
      return {
        x: Math.round(randX - tm.width / 2),
        y: Math.round(randY - tm.height / 2),
        width: tm.width,
        height: tm.height,
        glyph: glyph,
      };
    });
    const { offset } = alignSplatsGetOffsetAndDimensions(splatStateObj.splats);
    splatStateObj.offset = offset;
    splatStateObj.splats.forEach((s) => {
      s.x += offset.x + this.spriteHeight / 2;
      s.y += offset.y + this.spriteWidth / 2;
    });

    splatStateObj.id = getUID();
    splatStateObj.tokenId = this.id;

    this.tokenSplats.push(<SplatStateObject>splatStateObj);
    BloodNGuts.scenePool.push({ state: <SplatStateObject>splatStateObj, splatsContainer: this.splatsContainer });

    //await this.token.setFlag(MODULE_ID, 'splats', this.tokenSplats);
  }

  private async healToken(): Promise<void> {
    if (!this.tokenSplats) return;
    // make positive for sanity purposes
    let tempSeverity = this.hitSeverity * -1;
    // deal with scale/healthThreshold > 1. We can only heal to 100%
    if (tempSeverity > 1) tempSeverity = 1;
    log(LogLevel.DEBUG, 'healToken allTokensSplats:');
    let removeAmount = Math.ceil(this.tokenSplats.length * tempSeverity);
    log(LogLevel.DEBUG, 'healToken removeAmount:', removeAmount);
    while (removeAmount-- > 0) {
      const state = this.tokenSplats.shift();
      BloodNGuts.scenePool = BloodNGuts.scenePool.filter((poolObj) => poolObj.state.id != state.id);
    }
    //await this.token.setFlag(MODULE_ID, 'splats', this.tokenSplats);
  }

  private saveState(token): void {
    this.x = token.x;
    this.y = token.y;
    this.hp = token.actor.data.data.attributes.hp.value;
    this.maxHP = token.actor.data.data.attributes.hp.max;
    // reset hit severity and direction for next round.
    this.hitSeverity = null;
    this.direction = null;
  }

  private async setSeverity(severity: number): Promise<void> {
    this.hitSeverity = severity;
    if (this.hitSeverity > (this.bleedingSeverity ?? 0) + 1) {
      this.bleedingSeverity = this.hitSeverity;
      //await this.token.setFlag(MODULE_ID, 'bleedingSeverity', severity);
    } else if (this.hitSeverity < 0) {
      this.bleedingSeverity = null;
      //await this.token.setFlag(MODULE_ID, 'bleedingSeverity', null);
    }
  }
  /**
   * Get severity, a number between -1 and 2:
   * * > -1[full health or fully healed] to  0[minimal heal]
   * * > 1 + (0[minimal damage] and 0.5[all HP in one hit])* 2 [if dead]
   * * or 0 if not hit at all.
   * @category GMOnly
   * @function
   * @param {Token} token - the token to check.
   * @param {any} changes - the token.actor changes object.
   * @returns {number} - the damage severity.
   */
  private getDamageSeverity(changes): number {
    log(LogLevel.INFO, 'getDamageSeverity', changes.actorData);
    const currentHP = changes.actorData.data.attributes.hp.value;

    //fully healed, return -1
    if (currentHP === this.maxHP) return -1;

    const healthThreshold = game.settings.get(MODULE_ID, 'healthThreshold');
    const damageThreshold = game.settings.get(MODULE_ID, 'damageThreshold');
    const lastHP = this.hp;
    const fractionOfMax = currentHP / this.maxHP;
    const changeFractionOfMax = (lastHP - currentHP) / this.maxHP;

    if (currentHP && currentHP < lastHP) {
      if (fractionOfMax > healthThreshold) {
        log(LogLevel.DEBUG, 'getDamageSeverity below healthThreshold', fractionOfMax);
        return 0;
      }
      if (changeFractionOfMax < damageThreshold) {
        log(LogLevel.DEBUG, 'getDamageSeverity below damageThreshold', fractionOfMax);
        return 0;
      }
    }

    // healing
    if (changeFractionOfMax < 0) {
      //renormalise scale based on threshold.
      return changeFractionOfMax / healthThreshold;
    }
    // dead, multiply by 2.
    const deathMultiplier = currentHP === 0 ? 2 : 1;
    const severity = 1 + (changeFractionOfMax / 2) * deathMultiplier;

    log(LogLevel.DEBUG, 'getDamageSeverity severity', severity);
    return severity;
  }

  private wipe(): void {
    let counter = 0;
    // delete everything except the sprite mask
    while (this.splatsContainer.children.length > 1) {
      const displayObj = this.splatsContainer.children[counter];
      if (!displayObj.isMask) displayObj.destroy();
      else counter++;
    }
  }

  public wipeAll(): void {
    this.wipe();
    this.tokenSplats = [];
    this.token.setFlag(MODULE_ID, 'splats', null);
  }

  public removeState(id): void {
    this.tokenSplats = this.tokenSplats.filter((stateObj) => stateObj.id !== id);
  }

  public draw(): void {
    log(LogLevel.DEBUG, 'drawSplats: splatStateObj.tokenId');
    this.wipe();
    // @ts-ignore
    if (!this.tokenSplats || this.tokenSplats === 'wipe') return;
    BloodNGuts.allFontsReady.then(() => {
      this.tokenSplats.forEach((splatState) => {
        splatState.splats.forEach((splat) => {
          const text = new PIXI.Text(splat.glyph, splatState.styleData);
          text.x = splat.x;
          text.y = splat.y;
          this.splatsContainer.addChild(text);
        });
      });
    });
  }
}

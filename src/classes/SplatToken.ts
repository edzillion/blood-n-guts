import { log, LogLevel } from '../module/logging';
import { BloodNGuts } from '../blood-n-guts';
import { MODULE_ID } from '../constants';
import {
  getRandomGlyph,
  getRandomBoxMuller,
  alignDripsGetOffsetAndDimensions,
  getDirectionNrml,
  getUID,
  distanceBetween,
  lookupTokenBloodColor,
} from '../module/helpers';
import { getBaseTokenSettings } from '../module/settings';

/**
 * Extends `Token` and adds a layer to display token splats.
 * @class
 */
export default class SplatToken {
  public id: string;
  public actorType: string;
  public x: number;
  public y: number;
  public hp: number;
  public maxHP: number;
  public disabled: boolean;

  public spriteWidth: number;
  public spriteHeight: number;
  public direction: PIXI.Point;
  public bleedingSeverity: number;
  public movePos: PIXI.Point;
  public container: PIXI.Container;

  public token: Token;
  private bleedingDistance: number;

  // todo: typing a Proxy is complicated
  public tokenSettings: any;

  public violenceLevels: Record<string, ViolenceLevel>;
  public defaultBloodColor: string;

  constructor(token: Token) {
    if (!token.id) log(LogLevel.ERROR, 'SplatToken constructor() missing token.id');
    this.id = token.id;
    this.actorType = token.actor.data.type.toLowerCase();
    log(LogLevel.DEBUG, 'SplatToken constructor for ' + this.id);
    this.token = token;
    this.spriteWidth = token.data.width * canvas.grid.size * token.data.scale;
    this.spriteHeight = token.data.height * canvas.grid.size * token.data.scale;
    this.saveState(token);
    this.bleedingSeverity = this.token.getFlag(MODULE_ID, 'bleedingSeverity') || 0;
    this.bleedingDistance = 0;
    this.disabled = false;
  }

  /**
   * Get all TokenSplats owned by this SplatToken from history.
   * @category GMandPC
   * @function
   * @returns {Array<TokenSplatData>}
   */
  public get tokenSplats(): Array<TokenSplatData> {
    const history = canvas.scene.getFlag(MODULE_ID, 'history');
    if (!history) return [];
    else return history.events.filter((e) => e.tokenId === this.id);
  }

  /**
   * Async constructor adjunct to await looking up token blood color and then create mask.
   * @category GMandPC
   * @function
   * @async
   * @returns {Promise<SplatToken>} - the created SplatToken.
   */
  public async create(): Promise<SplatToken> {
    log(LogLevel.DEBUG, 'creating SplatToken');
    this.violenceLevels = game.settings.get(MODULE_ID, 'violenceLevels');
    this.defaultBloodColor = await lookupTokenBloodColor(this.token);
    const baseTokenSettings = await getBaseTokenSettings(this.token);

    const tokenSettingsHandler = {
      get: (target, property) => {
        if (property === 'bloodColor') return target[property] || this.defaultBloodColor;
        else if (['tokenSplatFont', 'floorSplatFont', 'trailSplatFont'].includes(property))
          return target[property] || game.settings.get(MODULE_ID, property);
        else
          return (
            target[property] ||
            game.settings.get(MODULE_ID, 'violenceLevels')[game.settings.get(MODULE_ID, 'currentViolenceLevel')][
              property
            ]
          );
      },
      set: (target, property, value) => {
        target[property] = value;
        if (property === 'violenceLevel' && value) target = Object.assign(target, this.violenceLevels[value]);
        return true;
      },
    };

    this.tokenSettings = new Proxy(baseTokenSettings, tokenSettingsHandler);

    if (this.tokenSettings.bloodColor === 'none' || this.tokenSettings.violenceLevel === 'Disabled') {
      this.disabled = true;
      return this;
    }

    this.container = new PIXI.Container();
    this.container.name = 'TokenSplats Container';
    await this.createMask();
    return this;
  }

  /**
   * Creates a transparency mask from the token icon and adds it to it's splat container.
   * @category GMandPC
   * @function
   * @async
   */
  public async createMask(): Promise<void> {
    if (this.disabled) return;
    // @ts-expect-error missing definition
    const maskTexture = await loadTexture(this.token.data.img, { fallback: CONST.DEFAULT_TOKEN });
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
      }),
    );

    const renderSprite = new PIXI.Sprite(renderTexture);
    canvas.app.renderer.render(textureContainer, renderTexture);

    this.container.addChild(renderSprite);
    this.container.mask = renderSprite;

    this.container.pivot.set(this.spriteWidth / 2, this.spriteHeight / 2);
    this.container.position.set(
      (this.token.data.width * canvas.grid.size) / 2,
      (this.token.data.height * canvas.grid.size) / 2,
    );
    this.container.angle = this.token.data.rotation;
  }

  /**
   * Run once after constructor and createMask() to add blood to tokens on a newly loaded scene.
   * Calls `bleedToken()` which adds to `historyBuffer` so `commitHistory()` should be run afterward.
   * @category GMandPC
   * @function
   */
  public preSplat(): void {
    if (this.tokenSplats.length === 0) {
      const currentHP = this.hp;
      const lastHP = BloodNGuts.system.ascendingDamage ? 0 : this.maxHP;
      const maxHP = this.maxHP;

      const initSeverity = this.getDamageSeverity(currentHP, lastHP, maxHP);
      if (initSeverity <= 0) return;
      log(LogLevel.DEBUG, 'preSplat', this.token.data.name);
      this.bleedingSeverity = initSeverity;
      this.bleedToken(initSeverity);
    }
  }

  /**
   * Checks for token movement and damage, generates splats and saves updates.
   * Adds to `historyBuffer` so `commitHistory()` should be run afterward.
   * @category GMOnly
   * @param changes - the latest token changes.
   * @function
   * @returns {boolean} - whether there have been changes to the scene or not
   */
  public trackChanges(changes: Record<string, any>): boolean {
    log(LogLevel.DEBUG, 'trackChanges');
    if (changes.flags) {
      // we only care about bleedingSeverity flag in SplatToken constructor
      if (changes.flags[MODULE_ID]?.bleedingSeverity != null) {
        if (Object.entries(changes.flags[MODULE_ID]).length === 1) return false;
      }
      for (const setting in changes.flags[MODULE_ID]) {
        this.tokenSettings[setting] = changes.flags[MODULE_ID][setting];
      }
    }

    if (changes.hidden != null) {
      log(LogLevel.DEBUG, 'hidden', changes.hidden);
      // need to redraw to update alpha levels on TokenSplats
      this.draw();
      return false;
    }

    if (this.tokenSettings.bloodColor === 'none' || this.tokenSettings.violenceLevel === 'Disabled') {
      this.disabled = true;
    } else this.disabled = false;

    if (this.disabled)
      // todo: perhaps a system-based check for hp here?
      // ||
      //   (changes.rotation === undefined &&
      //     changes.x === undefined &&
      //     changes.y === undefined &&
      //     changes.actorData?.data?.attributes?.hp === undefined)
      // )
      return false;

    let newBleedingSeverity;
    const hitSeverity = this.getUpdatedDamage(changes);
    if (hitSeverity > this.bleedingSeverity) this.bleedingSeverity = newBleedingSeverity = hitSeverity;
    else if (hitSeverity <= 0 && this.bleedingSeverity !== 0) this.bleedingSeverity = newBleedingSeverity = 0;
    this.direction = this.getUpdatedMovement(changes);

    if (hitSeverity > 0) {
      this.bleedFloor(hitSeverity);
      this.bleedToken(hitSeverity);
    } else if (hitSeverity < 0 && this.tokenSplats.length) {
      this.healToken(hitSeverity);
    }

    const bloodTrail = this.direction && this.bleedingSeverity ? this.bleedTrail() : false;

    this.saveState(this.token, newBleedingSeverity, changes);
    canvas.blood.commitHistory();

    return bloodTrail || newBleedingSeverity != null;
  }

  /**
   * Checks for token damage and returns severity.
   * @category GMOnly
   * @function
   * @param changes - the latest token changes.
   * @returns {number} - the damage severity.
   */
  private getUpdatedDamage(changes): number {
    // todo: perhaps a system based guard here?
    if (changes.actorData === undefined) return;
    const currHPChange = BloodNGuts.system.currentHPChange(changes, this.actorType);
    const currHP = BloodNGuts.system.currentHP(this.token, this.actorType);
    const currentHP = currHPChange != undefined ? currHPChange : currHP;
    const lastHP = this.hp;
    const maxHP = this.maxHP;
    const severity = this.getDamageSeverity(currentHP, lastHP, maxHP);
    log(LogLevel.DEBUG, 'getUpdatedDamage: severity', severity);
    return severity;
  }

  /**
   * Checks for token movement and returns direction.
   * @category GMOnly
   * @function
   * @param changes - the latest token changes.
   * @returns {PIXI.Point} - the direction normalised from {-1,-1} to {0,0} or null if no movement
   */
  private getUpdatedMovement(changes): PIXI.Point {
    if (changes.x === undefined && changes.y === undefined) return;

    const posX = changes.x === undefined ? this.x : changes.x;
    const posY = changes.y === undefined ? this.y : changes.y;
    const currPos = new PIXI.Point(posX, posY);
    const lastPos = new PIXI.Point(this.x, this.y);
    this.movePos = new PIXI.Point(currPos.x - lastPos.x, currPos.y - lastPos.y);

    const direction = getDirectionNrml(lastPos, currPos);
    log(LogLevel.DEBUG, 'getUpdatedMovement: direction', direction);
    return direction;
  }

  /**
   * Updates splat container rotation.
   * @category GMandPC
   * @function
   * @param changes - the latest token changes.
   */
  public updateRotation(changes): void {
    if (changes.rotation === undefined) return;
    log(LogLevel.DEBUG, 'updateTokenOrActorHandler updating rotation', changes.rotation);
    this.container.angle = changes.rotation;
  }

  /**
   * Generates blood splatter on the floor under this token and adds to `historyBuffer`
   * @category GMOnly
   * @param {number} hitSeverity
   * @function
   */
  private bleedFloor(hitSeverity: number): void {
    if (this.tokenSettings.floorSplatDensity === 0 || this.token.data.hidden) return;
    log(LogLevel.DEBUG, 'bleedFloor: ' + this.id);

    // scale the splats based on token size and severity
    const fontSize = Math.round(
      this.tokenSettings.floorSplatSize * ((this.spriteWidth + this.spriteHeight) / canvas.grid.size / 2) * hitSeverity,
    );

    const spreadPt = new PIXI.Point(
      Math.round((this.spriteWidth * this.tokenSettings.splatSpread) / 2),
      Math.round((this.spriteHeight * this.tokenSettings.splatSpread) / 2),
    );

    const amountOfDrips = Math.round(this.tokenSettings.floorSplatDensity * hitSeverity);

    canvas.blood.generateFloorSplats(
      this.tokenSettings.bloodColor,
      BloodNGuts.allFonts[this.tokenSettings.floorSplatFont],
      fontSize,
      amountOfDrips,
      spreadPt,
      this.getCenter(),
    );
  }

  /**
   * Generates a blood trail behind this token and adds to `historyBuffer`.
   * @category GMOnly
   * @function
   * @returns {boolean} - whether a blood trail has been created.
   */
  private bleedTrail(): boolean {
    if (this.tokenSettings.trailSplatDensity === 0 || this.token.data.hidden) return false;

    const amount = this.tokenSettings.trailSplatDensity * this.bleedingSeverity;

    const distTravelled = distanceBetween(new PIXI.Point(), this.movePos) + this.bleedingDistance;
    this.bleedingDistance = Math.round((1 / amount) * canvas.grid.size);
    const numSplats = distTravelled / this.bleedingDistance;
    this.bleedingDistance = distTravelled % this.bleedingDistance;

    if (numSplats < 1) return;

    // scale the drips based on token size and severity
    const fontSize = Math.round(
      this.tokenSettings.trailSplatSize *
        ((this.spriteWidth + this.spriteHeight) / canvas.grid.size / 2) *
        this.bleedingSeverity,
    );

    log(LogLevel.DEBUG, 'generateTrailSplats fontSize', fontSize);

    //todo: improve this
    //horiz or vert movement
    const pixelSpread = this.direction.x
      ? this.spriteWidth * this.tokenSettings.splatSpread * 2
      : this.spriteHeight * this.tokenSettings.splatSpread * 2;

    canvas.blood.generateTrailSplats(
      this,
      BloodNGuts.allFonts[this.tokenSettings.trailSplatFont],
      fontSize,
      numSplats,
      pixelSpread,
    );
    return true;
  }

  /**
   * Generates a blood splat on this token and adds to `historyBuffer`.
   * @category GMOnly
   * @function
   * @param {number} hitSeverity
   */
  private bleedToken(hitSeverity: number): void {
    const tokenSplatData: Partial<TokenSplatData> = {};
    tokenSplatData.name = 'Token Splat';
    tokenSplatData.alpha = 0.85;
    const density = this.tokenSettings.tokenSplatDensity;
    if (density === 0) return;

    const font = BloodNGuts.allFonts[this.tokenSettings.tokenSplatFont];

    // scale the splats based on token size and severity
    const fontSize = Math.round(
      this.tokenSettings.trailSplatSize * ((this.spriteWidth + this.spriteHeight) / canvas.grid.size / 2) * hitSeverity,
    );
    log(LogLevel.DEBUG, 'bleedToken fontSize', fontSize);
    tokenSplatData.styleData = {
      fontFamily: font.name,
      fontSize: fontSize,
      fill: this.tokenSettings.bloodColor,
      align: 'center',
    };
    const style = new PIXI.TextStyle(tokenSplatData.styleData);
    // amount of splats is based on density and severity
    const amount = Math.round(density * hitSeverity);
    if (amount === 0) return;
    // get a random glyph and then get a random (x,y) spread away from the token.
    const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
    // 0.8 because most sprites have a transparent surrounding
    const pixelSpreadX = this.spriteWidth * 0.7 * this.tokenSettings.splatSpread;
    const pixelSpreadY = this.spriteHeight * 0.7 * this.tokenSettings.splatSpread;

    // create our splats for later drawing.
    tokenSplatData.drips = glyphArray.map((glyph) => {
      const tm = PIXI.TextMetrics.measureText(glyph, style);
      const randX = getRandomBoxMuller() * pixelSpreadX - pixelSpreadX / 2;
      const randY = getRandomBoxMuller() * pixelSpreadY - pixelSpreadY / 2;
      return {
        x: Math.round(randX - tm.width / 2),
        y: Math.round(randY - tm.height / 2),
        angle: Math.round(Math.random() * 360),
        width: tm.width,
        height: tm.height,
        glyph: glyph,
      };
    });
    const { dripsOffset, dripsHeight, dripsWidth } = alignDripsGetOffsetAndDimensions(tokenSplatData.drips);
    tokenSplatData.offset = dripsOffset;
    tokenSplatData.height = dripsHeight;
    tokenSplatData.width = dripsWidth;
    tokenSplatData.drips.forEach((s) => {
      s.x += dripsOffset.x + this.spriteHeight / 2;
      s.y += dripsOffset.y + this.spriteWidth / 2;
    });
    tokenSplatData.id = getUID();
    tokenSplatData.tokenId = this.id;

    log(LogLevel.DEBUG, 'adding tokenSplat to historyBuffer, id: ', tokenSplatData.id);
    canvas.blood.historyBuffer.push(tokenSplatData);
  }

  /**
   * Removes token splats from history based on scale of healing.
   * @category GMOnly
   * @function
   * @param {number} hitSeverity
   */
  private healToken(hitSeverity: number): void {
    // make positive for sanity purposes
    const tempSeverity = hitSeverity * -1;
    // deal with scale/healthThreshold > 1. We can only heal to 100%
    const removeAmount =
      tempSeverity >= 1 ? this.tokenSplats.length : Math.floor(this.tokenSplats.length * tempSeverity);
    log(LogLevel.DEBUG, 'healToken removeAmount:', removeAmount);
    if (removeAmount === 0) return;
    const splatIds = this.tokenSplats.slice(0, removeAmount).map((t) => t.id);
    canvas.blood.deleteFromHistory(splatIds);
    // wipe all splats, if there are any remaining in history then they will be drawn on the next renderHistory()
    this.wipeSplats();
  }

  /**
   * Saves the state of this SplatToken at the end of an update round.
   * @category GMOnly
   * @function
   * @async
   * @param token - token data to save.
   * @param bleedingSeverity - bleedingSeverity update to save.
   * @param changes - changes to save.
   */
  private async saveState(token, bleedingSeverity?, changes?): Promise<void> {
    log(LogLevel.DEBUG, 'saveState token ', token.id);
    //local state
    this.x = changes?.x || token.data.x;
    this.y = changes?.y || token.data.y;
    this.hp =
      BloodNGuts.system.currentHPChange(changes, this.actorType) ||
      BloodNGuts.system.currentHP(this.token, this.actorType);
    this.maxHP =
      BloodNGuts.system.maxHPChange(changes, this.actorType) || BloodNGuts.system.maxHP(this.token, this.actorType);
    //flag state
    if (bleedingSeverity != null) {
      await this.token.setFlag(MODULE_ID, 'bleedingSeverity', bleedingSeverity);
    }

    // reset direction for next round.
    this.direction = null;
    this.movePos = null;
  }

  /**
   * Get severity, a representation of the scale of damage done to this Token in the
   * form of a number between -1 and 2+:
   * * -1[full health or fully healed] to  0[minimal heal]
   * * 1[minimal hit] to 2+[maximal hit]
   * * or 0 if not hit at all.
   * @category GMOnly
   * @function
   * @param {Token} currentHP - current health.
   * @param {any} lastHP - health last round.
   * @param {any} maxHP - max health / maximum health value.
   * @param {ascending=false} ascending - does damage count up or down?
   * @returns {number} - the damage severity.
   */
  private getDamageSeverity(currentHP, lastHP, maxHP, ascending = false): number {
    log(LogLevel.DEBUG, 'getDamageSeverity');

    if (ascending || BloodNGuts.system.ascendingDamage) {
      currentHP = maxHP - currentHP;
      lastHP = maxHP - lastHP;
    }

    //fully healed, return -1
    if (currentHP === maxHP) return -1;
    if (currentHP > maxHP || currentHP < 0) return 0;

    const fractionOfMax = currentHP / maxHP;
    const changeFractionOfMax = (lastHP - currentHP) / maxHP;

    if (currentHP && changeFractionOfMax > 0) {
      if (fractionOfMax > this.tokenSettings.healthThreshold) {
        log(LogLevel.DEBUG, 'getDamageSeverity above healthThreshold', fractionOfMax);
        return 0;
      }
      if (changeFractionOfMax < this.tokenSettings.damageThreshold) {
        log(LogLevel.DEBUG, 'getDamageSeverity below damageThreshold', fractionOfMax);
        return 0;
      }
    }

    // healing
    if (changeFractionOfMax < 0) {
      //renormalise scale based on threshold.
      return -fractionOfMax / this.tokenSettings.healthThreshold;
    }

    // dead, multiply splats.
    const deathMultiplier = currentHP === 0 ? this.tokenSettings.deathMultiplier : 1;
    const severity = 1 + (changeFractionOfMax / 2) * deathMultiplier;

    log(LogLevel.DEBUG, 'getDamageSeverity severity', severity);
    return severity;
  }

  /**
   * Get center point of this token.
   * @category GMOnly
   * @function
   * @returns {PIXI.Point} - the center point.
   */
  public getCenter(): PIXI.Point {
    return this.token.center;
  }

  /**
   * Wipes all splat tokens but leaves the data and mask alone.
   * @category GMandPC
   * @function
   */
  public wipeSplats(): void {
    let counter = 0;
    // delete everything except the sprite mask
    while (this.container?.children?.length > 1) {
      const displayObj = this.container.children[counter];
      if (!displayObj.isMask) displayObj.destroy();
      else counter++;
    }
  }

  /**
   * Wipes all splat tokens and token data. There are issues with running this on multiple
   * tokens, see https://github.com/edzillion/blood-n-guts/issues/153 - instead use `token.update(updatesArray)`
   * @category GMOnly
   * @function
   */
  public async wipeCustomSettings(): Promise<Entity[]> {
    const promises: Promise<Entity>[] = [];
    promises.push(this.token.unsetFlag(MODULE_ID, 'floorSplatFont'));
    promises.push(this.token.unsetFlag(MODULE_ID, 'trailSplatFont'));
    promises.push(this.token.unsetFlag(MODULE_ID, 'tokenSplatFont'));
    promises.push(this.token.unsetFlag(MODULE_ID, 'bloodColor'));
    promises.push(this.token.unsetFlag(MODULE_ID, 'currentViolenceLevel'));
    return Promise.all(promises);
  }

  /**
   * Wipes and draws all splats on this token.
   * @category GMandPC
   * @function
   */
  public draw(): Promise<void> {
    log(LogLevel.DEBUG, 'tokenSplat: draw');
    this.wipeSplats();

    if (!this.tokenSplats || !this.tokenSplats.length) return;

    BloodNGuts.allFontsReady.then(() => {
      this.tokenSplats.forEach((splatData) => {
        splatData.drips.forEach((drip) => {
          const text = new PIXI.Text(drip.glyph, splatData.styleData);
          text.alpha = this.token.data.hidden ? splatData.alpha / 2 : splatData.alpha;
          text.x = drip.x + drip.width / 2;
          text.y = drip.y + drip.height / 2;
          text.pivot.set(drip.width / 2, drip.height / 2);
          text.angle = drip.angle;
          this.container.addChild(text);
        });
      });
    });
  }
}

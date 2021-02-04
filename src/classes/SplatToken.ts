/* eslint-disable @typescript-eslint/ban-ts-comment */
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
import { getBaseTokenSettings, getMergedViolenceLevels } from '../module/settings';

/**
 * Extends `Token` and adds a layer to display token splats.
 * @class
 */
export default class SplatToken {
  public id: string;
  public x: number;
  public y: number;
  public hp: number;
  public maxHP: number;
  public disabled: boolean;

  public spriteWidth: number;
  public spriteHeight: number;
  public direction: PIXI.Point;
  public hitSeverity: number;
  public bleedingSeverity: number;
  public currPos: PIXI.Point;
  public lastPos: PIXI.Point;
  public movePos: PIXI.Point;
  public container: PIXI.Container;

  public token: Token;
  private tokenSplats: Array<SplatDataObject>;
  private bleedingDistance: number;

  public tokenSettings: any;

  public violenceLevels: any;
  public defaultBloodColor: string;

  constructor(token: Token) {
    // @ts-ignore
    this.id = token.id || token.actor.data._id;
    log(LogLevel.INFO, 'SplatToken constructor for ' + this.id);
    this.token = token;
    this.spriteWidth = token.data.width * canvas.grid.size * token.data.scale;
    this.spriteHeight = token.data.height * canvas.grid.size * token.data.scale;
    this.saveState(token);
    this.bleedingSeverity = this.token.getFlag(MODULE_ID, 'bleedingSeverity');
    this.bleedingDistance = 0;
    this.tokenSplats = this.token.getFlag(MODULE_ID, 'splats') || [];
    this.disabled = false;
  }

  /**
   * Async constructor adjunct to await looking up token blood color and then create mask.
   * @category GMandPC
   * @function
   * @async
   * @returns {Promise<SplatToken>} - the created SplatToken.
   */
  public async create(): Promise<SplatToken> {
    this.violenceLevels = await getMergedViolenceLevels;
    this.defaultBloodColor = await lookupTokenBloodColor(this.token);
    const baseTokenSettings = await getBaseTokenSettings(this.token);

    const tokenSettingsHandler = {
      get: (target, property) => {
        if (property === 'bloodColor') return target[property] || this.defaultBloodColor;
        else return target[property] || game.settings.get(MODULE_ID, property);
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
   * @category GMandPC
   * @param updatedSplats - the latest token splat data.
   * @function
   */
  public preSplat(): void {
    log(LogLevel.DEBUG, 'preSpat', this.token.data.name);
    if (!this.tokenSplats.length) {
      const currentHP = this.hp;
      const lastHP = this.maxHP * this.tokenSettings.healthThreshold;
      const maxHP = this.maxHP;
      const severity = this.getDamageSeverity(currentHP, lastHP, maxHP);
      if (severity <= 0) return;

      this.bleedingSeverity = this.hitSeverity = severity;

      const tempSplats = this.bleedToken();
      this.token.update(
        { flags: { [MODULE_ID]: { splats: tempSplats, bleedingSeverity: this.bleedingSeverity } } },
        { diff: false },
      );
    }
  }

  /**
   * Saves updated splats to tokenSplats and calls draw() if changed.
   * @category GMandPC
   * @param updatedSplats - the latest token splat data.
   * @function
   */
  public updateSplats(updatedSplats: SplatDataObject[]): void {
    if (this.disabled || JSON.stringify(updatedSplats) === JSON.stringify(this.tokenSplats)) return;
    this.tokenSplats = updatedSplats || [];
    this.draw();
  }

  /**
   * Checks for token movement and damage, generates splats and saves updates.
   * @category GMOnly
   * @param changes - the latest token changes.
   * @function
   * @returns {boolean} - whether there have been changes to the scene or not
   */
  public updateChanges(changes): boolean {
    log(LogLevel.DEBUG, 'updateChanges');
    if (changes.flags) {
      // todo: Proxy objects don't work with Object.assign?
      // this.tokenSettings = Object.assign(this.tokenSettings, changes.flags[MODULE_ID]?.violenceLevel);
      for (const setting in changes.flags[MODULE_ID]) {
        this.tokenSettings[setting] = changes.flags[MODULE_ID][setting];
      }
    }

    this.disabled = this.tokenSettings.bloodColor === 'none' || this.tokenSettings.violenceLevel === 'Disabled';

    if (
      this.disabled ||
      (changes.rotation === undefined &&
        changes.x === undefined &&
        changes.y === undefined &&
        changes.actorData?.data?.attributes?.hp === undefined)
    )
      return false;

    const updates = { bleedingSeverity: null, splats: null };
    [this.hitSeverity, updates.bleedingSeverity] = this.getUpdatedDamage(changes);
    if (updates.bleedingSeverity !== null) this.bleedingSeverity = updates.bleedingSeverity;
    else delete updates.bleedingSeverity;
    this.direction = this.getUpdatedMovement(changes);

    if (this.hitSeverity > 0) {
      this.bleedFloor();
      updates.splats = this.bleedToken();
    } else if (this.hitSeverity < 0 && this.tokenSplats.length) {
      updates.splats = this.healToken();
    } else delete updates.splats;

    const bloodTrail = this.direction && this.bleedingSeverity ? this.bleedTrail() : false;

    this.updateRotation(changes);

    this.saveState(this.token, updates, changes);

    return bloodTrail || (updates && Object.keys(updates).length > 0);
  }

  /**
   * Checks for token damage and returns severities.
   * @category GMOnly
   * @function
   * @param changes - the latest token changes.
   * @returns {number, number} - the hitSeverity and bleedingSeverity
   */
  private getUpdatedDamage(changes): [number, number] {
    if (changes.actorData === undefined || changes.actorData.data.attributes?.hp === undefined) return [null, null];
    const currentHP = changes.actorData.data.attributes.hp.value;
    const lastHP = this.hp;
    const maxHP = this.maxHP;
    return this.updateSeverities(this.getDamageSeverity(currentHP, lastHP, maxHP));
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
    this.currPos = new PIXI.Point(posX, posY);
    this.lastPos = new PIXI.Point(this.x, this.y);
    this.movePos = new PIXI.Point(this.currPos.x - this.lastPos.x, this.currPos.y - this.lastPos.y);
    log(LogLevel.DEBUG, 'checkForMovement pos: l,c:', this.lastPos, this.currPos);

    return getDirectionNrml(this.lastPos, this.currPos);
  }

  /**
   * Updates splat container rotation.
   * @category GMOnly
   * @function
   * @param changes - the latest token changes.
   */
  private updateRotation(changes): void {
    if (changes.rotation === undefined) return;
    log(LogLevel.DEBUG, 'updateTokenOrActorHandler updating rotation', changes.rotation);
    this.container.angle = changes.rotation;
  }

  /**
   * Generates blood splatter on the floor under this token.
   * @category GMOnly
   * @function
   */
  private bleedFloor(): void {
    const density = this.tokenSettings.floorSplatDensity;
    if (!density) return;
    log(LogLevel.DEBUG, 'updateTokenOrActorHandler damageScale > 0:' + this.id + ' - bleeding:true');
    BloodNGuts.generateFloorSplats(
      this,
      BloodNGuts.allFonts[this.tokenSettings.floorSplatFont],
      this.tokenSettings.floorSplatSize,
      Math.round(density),
      this.tokenSettings.splatSpread,
    );
  }

  /**
   * Generates a blood trail behind this token.
   * @category GMOnly
   * @function
   * @returns {boolean} - whether a blood trail has been created.
   */
  private bleedTrail(): boolean {
    const density = this.tokenSettings.trailSplatDensity;
    if (!density) return false;

    const amount = density * this.bleedingSeverity;

    const distTravelled = distanceBetween(new PIXI.Point(), this.movePos) + this.bleedingDistance;
    this.bleedingDistance = Math.round((1 / amount) * canvas.grid.size);
    const numSplats = distTravelled / this.bleedingDistance;
    this.bleedingDistance = distTravelled % this.bleedingDistance;

    if (numSplats < 1) return;

    const distances: number[] = [];
    for (let i = 1 / numSplats; i <= 1; i += 1 / numSplats) {
      distances.push(i);
    }
    BloodNGuts.generateTrailSplats(
      this,
      BloodNGuts.allFonts[this.tokenSettings.trailSplatFont],
      this.tokenSettings.trailSplatSize,
      distances,
      this.tokenSettings.splatSpread,
    );
    return true;
  }

  /**
   * Generates a blood trail on this token and returns the `SplatDataObject`s
   * @category GMOnly
   * @function
   * @returns {SplatDataObject[]} - the array of updated `SplatDataObject`s
   */
  private bleedToken(): SplatDataObject[] {
    const splatDataObj: Partial<SplatDataObject> = {};
    const density = this.tokenSettings.tokenSplatDensity;
    if (density === 0) return;

    const font = BloodNGuts.allFonts[this.tokenSettings.tokenSplatFont];

    // scale the splats based on token size and severity
    const fontSize = Math.round(
      this.tokenSettings.trailSplatSize *
        ((this.spriteWidth + this.spriteHeight) / canvas.grid.size / 2) *
        this.hitSeverity,
    );
    log(LogLevel.DEBUG, 'bleedToken fontSize', fontSize);
    splatDataObj.styleData = {
      fontFamily: font.name,
      fontSize: fontSize,
      fill: this.tokenSettings.bloodColor,
      align: 'center',
    };
    const style = new PIXI.TextStyle(splatDataObj.styleData);
    // amount of splats is based on density and severity
    const amount = Math.round(density * this.hitSeverity);
    if (amount === 0) return;
    // get a random glyph and then get a random (x,y) spread away from the token.
    const glyphArray: Array<string> = Array.from({ length: amount }, () => getRandomGlyph(font));
    const pixelSpreadX = this.spriteWidth * this.tokenSettings.splatSpread;
    const pixelSpreadY = this.spriteHeight * this.tokenSettings.splatSpread;
    log(LogLevel.DEBUG, 'bleedToken amount', amount);
    log(LogLevel.DEBUG, 'bleedToken pixelSpread', pixelSpreadX, pixelSpreadY);

    // create our splats for later drawing.
    splatDataObj.splats = glyphArray.map((glyph) => {
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
    const { dripsOffset } = alignDripsGetOffsetAndDimensions(splatDataObj.splats);
    splatDataObj.offset = dripsOffset;
    splatDataObj.splats.forEach((s) => {
      s.x += dripsOffset.x + this.spriteHeight / 2;
      s.y += dripsOffset.y + this.spriteWidth / 2;
    });

    splatDataObj.id = getUID();
    splatDataObj.tokenId = this.id;

    const updatedSplats = duplicate(this.tokenSplats);
    updatedSplats.push(<SplatDataObject>splatDataObj);
    return updatedSplats;
  }

  /**
   * Removes token splats from our splat container based on scale of healing.
   * @category GMOnly
   * @function
   * @returns {SplatDataObject[]} - the array of updated `SplatDataObject`s
   */
  private healToken(): SplatDataObject[] {
    // make positive for sanity purposes
    const tempSeverity = this.hitSeverity * -1;
    // deal with scale/healthThreshold > 1. We can only heal to 100%
    if (tempSeverity >= 1) return [];
    log(LogLevel.DEBUG, 'healToken allTokensSplats:');
    const removeAmount = Math.floor(this.tokenSplats.length * tempSeverity);
    log(LogLevel.DEBUG, 'healToken removeAmount:', removeAmount);
    const updatedSplats = duplicate(this.tokenSplats);
    updatedSplats.splice(0, removeAmount);

    return updatedSplats;
  }

  /**
   * Saves the state of this SplatToken at the end of an update round.
   * @category GMOnly
   * @function
   * @async
   * @param token - token data to save.
   * @param updates - updates to save.
   * @param changes - changes to save.
   */
  private async saveState(token, updates?, changes?): Promise<void> {
    if (!token.actor?.data?.data?.attributes) {
      log(LogLevel.ERROR, 'saveState missing token actor data', token);
      return;
    }
    //local state
    this.x = changes?.x || token.x;
    this.y = changes?.y || token.y;
    this.hp = changes?.actorData?.data?.attributes?.hp?.value || token.actor.data.data.attributes.hp.value;
    this.maxHP = changes?.actorData?.data?.attributes?.hp?.max || token.actor.data.data.attributes.hp.max;
    //flag state
    if (updates && Object.keys(updates).length > 0) {
      const flags = {
        [MODULE_ID]: updates,
      };

      await this.token.update({ flags }, { diff: false });
    }

    // reset hit severity and direction for next round.
    this.hitSeverity = null;
    this.direction = null;
    this.movePos = null;
  }

  /**
   * Takes the new damage severity and determines the hitSeverity and bleedingSeverity.
   * hitSeverity is always the severity of the last hit. bleedingSeverity is set to
   * hitSeverity if hitSeverity > bleedingSeverity.
   * @category GMOnly
   * @function
   * @param {number} damageSeverity - the updated damage severity.
   * @returns {number, number} - the hitSeverity and bleedingSeverity.
   */
  private updateSeverities(damageSeverity: number): [number, number] {
    if (damageSeverity > (this.bleedingSeverity ?? 0) + 1) {
      return [damageSeverity, damageSeverity];
    } else if (damageSeverity < 0) {
      return [damageSeverity, 0];
    }
    return [damageSeverity, this.bleedingSeverity];
  }

  /**
   * Get severity, a representation of the scale of damage done to this Token in the
   * form of a number between -1 and 2+:
   * * -1[full health or fully healed] to  0[minimal heal]
   * * 1[minimal hit] to 2+[maximal hit]
   * * or 0 if not hit at all.
   * @category GMOnly
   * @function
   * @param {Token} token - the token to check.
   * @param {any} changes - the token.actor changes object.
   * @returns {number} - the damage severity.
   */
  private getDamageSeverity(currentHP, lastHP, maxHP): number {
    log(LogLevel.DEBUG, 'getDamageSeverity');

    //fully healed, return -1
    if (currentHP === maxHP) return -1;

    const healthThreshold = this.tokenSettings.healthThreshold;
    const damageThreshold = this.tokenSettings.damageThreshold;
    const fractionOfMax = currentHP / maxHP;
    const changeFractionOfMax = (lastHP - currentHP) / maxHP;

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
      return -fractionOfMax / healthThreshold;
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
  public async wipeCustomSettings() {
    const promises: Promise<Entity>[] = [];
    promises.push(this.token.unsetFlag(MODULE_ID, 'floorSplatFont'));
    promises.push(this.token.unsetFlag(MODULE_ID, 'trailSplatFont'));
    promises.push(this.token.unsetFlag(MODULE_ID, 'tokenSplatFont'));
    promises.push(this.token.unsetFlag(MODULE_ID, 'bloodColor'));
    promises.push(this.token.unsetFlag(MODULE_ID, 'violenceLevel'));
    return Promise.all(promises);
  }

  /**
   * Removes a token splat based on id.
   * @category GMOnly
   * @function
   * @param {string} - the id of the splat to remove.
   */
  public removeSplat(id: string): void {
    this.tokenSplats = this.tokenSplats.filter((s) => s.id !== id);
  }

  /**
   * Wipes and draws all splats on this token.
   * @category GMandPC
   * @function
   */
  public draw(): void {
    log(LogLevel.DEBUG, 'tokenSplat: draw');
    this.wipeSplats();
    // @ts-ignore
    if (!this.tokenSplats || !this.tokenSplats.length) return;
    const extantTokenSplatIds = this.tokenSplats.map((ts) => ts.id);
    BloodNGuts.scenePool = BloodNGuts.scenePool.filter(
      (p) => p.data.tokenId !== this.id || (p.data.tokenId === this.id && extantTokenSplatIds.includes(p.data.id)),
    );
    const extantScenePoolSplatIds = BloodNGuts.scenePool.map((p) => p.data.id);
    BloodNGuts.allFontsReady.then(() => {
      this.tokenSplats.forEach((splatData) => {
        splatData.splats.forEach((splat) => {
          const text = new PIXI.Text(splat.glyph, splatData.styleData);
          text.x = splat.x + splat.width / 2;
          text.y = splat.y + splat.height / 2;
          text.pivot.set(splat.width / 2, splat.height / 2);
          text.angle = splat.angle;
          this.container.addChild(text);
        });
        if (!extantScenePoolSplatIds.includes(splatData.id))
          BloodNGuts.scenePool.push({ data: splatData, container: this.container });
      });
    });
  }
}

import { log, LogLevel } from '../module/logging';
// ['pf1', 'pf2e', , 'dcc', 'archmage'];
export default {
  // Toolkit13 (13th Age Compatible)
  archmage: {
    supportedTypes: ['character', 'npc'],
    currentHP: (token: Token): number => token.actor.data.data.attributes.hp.value,
    maxHP: (token: Token): number => token.actor.data.data.attributes.hp.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.attributes?.hp?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.attributes?.hp?.max,
    creatureType: (token: Token): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'character') {
        creatureType = token.actor.data.data.details.race?.value;
      } else if (actorType === 'npc') {
        creatureType = token.actor.data.data.details.type?.value;
      }
      log(LogLevel.INFO, 'creatureType archmage: ', token.name, actorType, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  dcc: {
    supportedTypes: ['player', 'npc'],
    currentHP: (token: Token): number => token.actor.data.data.attributes.hp.value,
    maxHP: (token: Token): number => token.actor.data.data.attributes.hp.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.attributes?.hp?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.attributes?.hp?.max,
    creatureType: (token: Token, bloodColorSettings?: Record<string, string>): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'player') {
        creatureType = token.actor.data.data.details.sheetClass;
      } else if (actorType === 'npc') {
        // DCC does not have monster types so the best we can do is try to get it from the npc's name
        const wordsInName: Array<string> = token.actor.data.name.toLowerCase().split(' ');
        for (let i = 0; i < wordsInName.length; i++) {
          const word = wordsInName[i].toLowerCase();
          if (bloodColorSettings[word]) return word;
        }
      }

      log(LogLevel.INFO, 'creatureType dcc: ', token.name, actorType, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  dnd5e: {
    supportedTypes: ['character', 'npc'],
    currentHP: (token: Token): number => token.actor.data.data.attributes.hp.value,
    maxHP: (token: Token): number => token.actor.data.data.attributes.hp.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.attributes?.hp?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.attributes?.hp?.max,
    creatureType: (token: Token): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'character') {
        creatureType = token.actor.data.data.details.race;
      } else if (actorType === 'npc') {
        creatureType = token.actor.data.data.details.type;
      }
      log(LogLevel.INFO, 'creatureType dnd5e: ', token.name, actorType, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  pf1: {
    supportedTypes: ['character', 'npc'],
    currentHP: (token: Token): number => token.actor.data.data.attributes.hp.value,
    maxHP: (token: Token): number => token.actor.data.data.attributes.hp.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.attributes?.hp?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.attributes?.hp?.max,
    creatureType: (token: Token): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'character') {
        // @ts-expect-error bad definition
        creatureType = token.actor.data.items.find((i) => i.type === 'race').name;
      } else if (actorType === 'npc') {
        // @ts-expect-error bad definition
        creatureType = token.actor.data.items.find((i) => i.type === 'class').name;
      }

      log(LogLevel.INFO, 'creatureType pf1: ', token.name, actorType, creatureType);
      return creatureType.toLowerCase();
    },
  },
  pf2e: {
    supportedTypes: ['character', 'npc', 'hazard', 'familiar'],
    currentHP: (token: Token): number => token.actor.data.data.attributes.hp.value,
    maxHP: (token: Token): number => token.actor.data.data.attributes.hp.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.attributes?.hp?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.attributes?.hp?.max,
    creatureType: (token: Token, bloodColorSettings?: Record<string, string>): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'character') {
        creatureType = token.actor.data.data.details.ancestry.value;
      } else if (actorType === 'familiar') {
        // familiars do not have a creatureType so the best we can do is this
        creatureType = token.actor.data.data.details.creature.value;
      } else if (actorType === 'npc' || actorType === 'hazard') {
        if (token.actor.data.data.traits.traits.value) {
          // PF2E has an array of traits that represent creatureType
          creatureType = token.actor.data.data.traits.traits.value[0];
          for (let i = 0; i < token.actor.data.data.traits.traits.value.length; i++) {
            const word = token.actor.data.data.traits.traits.value[i].toLowerCase();
            if (bloodColorSettings[word]) creatureType = word;
          }
        } else creatureType = token.actor.data.data.details.creatureType;
      }
      log(LogLevel.INFO, 'creatureType pf2e: ', token.name, actorType, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  'uesrpg-d100': {
    supportedTypes: ['character', 'npc'],
    currentHP: (token: Token): number => token.actor.data.data.hp.value,
    maxHP: (token: Token): number => token.actor.data.data.hp.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.hp?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.hp?.max,
    creatureType: (token: Token): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'character') {
        creatureType = token.actor.data.data.race;
      } else if (actorType === 'npc') {
        creatureType = token.actor.data.data.race;
      }
      log(LogLevel.INFO, 'creatureType uesrpg-d100: ', token.name, actorType, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  wfrp4e: {
    supportedTypes: ['character', 'npc', 'creature'],
    currentHP: (token: Token): number => token.actor.data.data.status.wounds.value,
    maxHP: (token: Token): number => token.actor.data.data.status.wounds.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.status?.wounds?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.status?.wounds?.max,
    creatureType: (token: Token): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'character') {
        creatureType = token.actor.data.data.details.species.value;
      } else if (actorType === 'npc' || actorType === 'creature') {
        creatureType = token.actor.data.data.details.species.value;
      }
      log(LogLevel.INFO, 'creatureType wfrp4e: ', token.name, actorType, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  swade: {
    supportedTypes: ['character', 'npc'],
    currentHP: (token: Token): number => token.actor.data.data.wounds.value,
    maxHP: (token: Token): number => token.actor.data.data.wounds.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.wounds?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.wounds?.max,
    creatureType: (token: Token, bloodColorSettings?: Record<string, string>): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'character') {
        creatureType = token.actor.data.data.details.species.name;
      } else if (actorType === 'npc') {
        // No such thing as monster type or species in SWADE unfortunately
        // Instead just search through the name for possible creature type
        const wordsInName: Array<string> = token.actor.data.name.replace(',', ' ').split(' ');
        for (let i = 0; i < wordsInName.length; i++) {
          const word = wordsInName[i].toLowerCase();
          if (bloodColorSettings[word]) creatureType = word;
        }
      }
      log(LogLevel.INFO, 'creatureType swade: ', token.name, actorType, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  'dark-heresy': {
    supportedTypes: ['acolyte', 'npc'],
    currentHP: (token: Token): number => token.actor.data.data.wounds.value,
    maxHP: (token: Token): number => token.actor.data.data.wounds.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.wounds?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.wounds?.max,
    creatureType: (token: Token, bloodColorSettings?: Record<string, string>): string | void => {
      let creatureType: string;
      // No races or creatureTypes in Dark Heresy apparently
      // Instead just search through the name for possible creature type
      const wordsInName: Array<string> = token.actor.data.name.replace(',', ' ').split(' ');
      for (let i = 0; i < wordsInName.length; i++) {
        const word = wordsInName[i].toLowerCase();
        if (bloodColorSettings[word]) creatureType = word;
      }
      log(LogLevel.INFO, 'creatureType dark-heresy: ', token.name, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  twodsix: {
    supportedTypes: ['traveller'],
    currentHP: (token: Token): number => token.actor.data.data.hits.value,
    maxHP: (token: Token): number => token.actor.data.data.hits.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.hits?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.hits?.max,
    creatureType: (token: Token): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'traveller') {
        creatureType = token.actor.data.data.species;
      }
      log(LogLevel.INFO, 'creatureType twodsix:', token.name, actorType, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  cyberpunkred: {
    supportedTypes: ['character', 'npc'],
    currentHP: (token: Token): number => token.actor.data.data.combatstats.healthpool.value,
    maxHP: (token: Token): number => token.actor.data.data.combatstats.healthpool.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.combatstats?.healthpool?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.combatstats?.healthpool?.max,
    creatureType: (token: Token, bloodColorSettings?: Record<string, string>): string | void => {
      let creatureType: string;
      // No races or creatureTypes in Cyberpunk Red apparently
      // Instead just search through the name for possible creature type
      const wordsInName: Array<string> = token.actor.data.name.replace(',', ' ').split(' ');
      for (let i = 0; i < wordsInName.length; i++) {
        const word = wordsInName[i].toLowerCase();
        if (bloodColorSettings[word]) creatureType = word;
      }
      log(LogLevel.INFO, 'creatureType cyberpunkred: ', token.name, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  // WIP - not fully functional
  gurps4e: {
    // no actorType so no supportedTypes either !
    currentHP: (token: Token): number => token.actor.data.data.tracked.hp.value,
    maxHP: (token: Token): number => token.actor.data.data.tracked.hp.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.tracked?.hp?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.tracked?.hp?.max,
    creatureType: (token: Token, bloodColorSettings?: Record<string, string>): string | void => {
      let creatureType: string;
      // No races or creatureTypes in GURPS apparently
      // Instead just search through the name for possible creature type
      const wordsInName: Array<string> = token.actor.data.name.replace(',', ' ').split(' ');
      for (let i = 0; i < wordsInName.length; i++) {
        const word = wordsInName[i].toLowerCase();
        if (bloodColorSettings[word]) creatureType = word;
      }
      log(LogLevel.INFO, 'creatureType gurps4e: ', token.name, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  D35E: {
    supportedTypes: ['character', 'npc'],
    currentHP: (token: Token): number => token.actor.data.data.attributes.hp.value,
    maxHP: (token: Token): number => token.actor.data.data.attributes.hp.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.attributes?.hp?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.attributes?.hp?.max,
    creatureType: (token: Token): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'character') {
        // @ts-expect-error bad definition
        creatureType = token.actor.data.items.find((i) => i.type === 'race').name;
      } else if (actorType === 'npc') {
        creatureType = token.actor.data.data.attributes.creatureType;
      }

      log(LogLevel.INFO, 'creatureType D35E:', token.name, actorType, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  lotfp: {
    supportedTypes: ['character', 'monster'],
    currentHP: (token: Token): number => token.actor.data.data.hp.value,
    maxHP: (token: Token): number => token.actor.data.data.hp.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.hp?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.hp?.max,
    creatureType: (token: Token, bloodColorSettings?: Record<string, string>): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'character') {
        creatureType = token.actor.data.data.details.class;
      } else if (actorType === 'monster') {
        // No creatureType
        // Instead just search through the name for possible creature type
        const wordsInName: Array<string> = token.actor.data.name.replace(',', ' ').split(' ');
        for (let i = 0; i < wordsInName.length; i++) {
          const word = wordsInName[i].toLowerCase();
          if (bloodColorSettings[word]) creatureType = word;
        }
      }

      log(LogLevel.INFO, 'creatureType lotfp:', token.name, actorType, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  shadowrun5e: {
    supportedTypes: ['character', 'spirit', 'critter'],
    currentHP: (token: Token): number => token.actor.data.data.track.physical.value,
    maxHP: (token: Token): number => token.actor.data.data.track.physical.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.track?.physical?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.track?.physical?.max,
    creatureType: (token: Token, bloodColorSettings?: Record<string, string>): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'character') {
        creatureType = token.actor.data.data.metatype;
      } else if (actorType === 'spirit') {
        creatureType = token.actor.data.data.spiritType + '-spirit';
      } else if (actorType === 'critter') {
        //no critterType
        // Instead just search through the name for possible creature type
        const wordsInName: Array<string> = token.actor.data.name.replace(',', ' ').split(' ');
        for (let i = 0; i < wordsInName.length; i++) {
          const word = wordsInName[i].toLowerCase();
          if (bloodColorSettings[word]) creatureType = word;
        }
      }

      log(LogLevel.INFO, 'creatureType shadowrun5e:', token.name, actorType, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  starwarsffg: {
    supportedTypes: ['character', 'minion'],
    currentHP: (token: Token): number => token.actor.data.data.stats.wounds.value,
    maxHP: (token: Token): number => token.actor.data.data.stats.wounds.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.stats?.wounds?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.stats?.wounds?.max,
    creatureType: (token: Token, bloodColorSettings?: Record<string, string>): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'character') {
        creatureType = token.actor.data.data.species.value;
      } else if (actorType === 'minion') {
        // no minion species ...
        // Instead just search through the name for possible creature type
        const wordsInName: Array<string> = token.actor.data.name.replace(',', ' ').split(' ');
        for (let i = 0; i < wordsInName.length; i++) {
          const word = wordsInName[i].toLowerCase();
          if (bloodColorSettings[word]) creatureType = word;
        }
      }

      log(LogLevel.INFO, 'creatureType starwarsffg:', token.name, actorType, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
  // WIP - lancer stores both mech hp and pilot hp in the same actor.data
  // that means we would need to change the structure of BnG to accommodate this
  // so for the moment only mech works.
  lancer: {
    supportedTypes: ['pilot', 'npc'],
    currentHP: (token: Token): number => token.actor.data.data.mech.hp.value,
    maxHP: (token: Token): number => token.actor.data.data.mech.hp.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.mech?.hp?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.mech?.hp?.max,
    creatureType: (token: Token): string | void => {
      // both pilot and npc types are mechs
      const actorType: string = token.actor.data.type.toLowerCase();
      const creatureType = 'mech';

      log(LogLevel.INFO, 'creatureType lancer:', token.name, actorType, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
};

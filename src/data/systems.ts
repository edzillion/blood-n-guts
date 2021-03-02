import { getCreatureByActorName, getCreatureFromArray } from '../module/helpers';
import { log, LogLevel } from '../module/logging';
// ['pf1', 'pf2e', , 'dcc', 'archmage'];
export default {
  // Toolkit13 (13th Age Compatible)
  archmage: {
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
        return getCreatureByActorName(token.actor, bloodColorSettings);
      }

      log(LogLevel.INFO, 'creatureType dcc: ', token.name, actorType, creatureType);
      return creatureType.toLowerCase();
    },
  },
  dnd5e: {
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
    currentHP: (token: Token): number => token.actor.data.data.attributes.hp.value,
    maxHP: (token: Token): number => token.actor.data.data.attributes.hp.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.attributes?.hp?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.attributes?.hp?.max,
    creatureType: (token: Token, bloodColorSettings?: Record<string, string>): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'character') {
        creatureType = token.actor.data.data.details.ancestry.value;
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
    currentHP: (token: Token): number => token.actor.data.data.status.wounds.value,
    maxHP: (token: Token): number => token.actor.data.data.status.wounds.max,
    currentHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.status?.wounds?.value,
    maxHPChange: (changes: Record<string, any>): number => changes?.actorData?.data?.status?.wounds?.max,
    creatureType: (token: Token): string | void => {
      const actorType: string = token.actor.data.type.toLowerCase();
      let creatureType: string;
      if (actorType === 'character') {
        creatureType = token.actor.data.data.details.species.value;
      } else if (actorType === 'npc') {
        creatureType = token.actor.data.data.details.species.value;
      }
      log(LogLevel.INFO, 'creatureType wfrp4e: ', token.name, actorType, creatureType);
      if (creatureType) return creatureType.toLowerCase();
    },
  },
};
// stub: {
//   currentHP: (token: Token): number => ,
//   maxHP: (token: Token): number => ,
//   currentHPChange: (changes: Record<string, any>): number => ,
//   maxHPChange: (changes: Record<string, any>): number => ,
//   creatureType: (token: Token): string | void => {
//     const actorType: string = token.actor.data.type.toLowerCase();
//     let creatureType: string;
//     if (actorType === 'character') {
//       creatureType = token.actor.data.data.details.race;
//     } else if (actorType === 'npc') {
//       creatureType = token.actor.data.data.details.type;
//     }
//     log(LogLevel.INFO, 'creatureLookupDND5E: ', token.name, actorType, creatureType);
//     if (creatureType) return creatureType.toLowerCase();
//   },
// },
//};
// stub: {
//   currentHP: (token: Token): number => ,
//   maxHP: (token: Token): number => ,
//   currentHPChange: (changes: Record<string, any>): number => ,
//   maxHPChange: (changes: Record<string, any>): number => ,
//   creatureType: (token: Token): string | void => {
//     const actorType: string = token.actor.data.type.toLowerCase();
//     let creatureType: string;
//     if (actorType === 'character') {
//       creatureType = token.actor.data.data.details.race;
//     } else if (actorType === 'npc') {
//       creatureType = token.actor.data.data.details.type;
//     }
//     log(LogLevel.INFO, 'creatureLookupDND5E: ', token.name, actorType, creatureType);
//     if (creatureType) return creatureType.toLowerCase();
//   },
// },
//};
//stub: {
// currentHP: (token: Token): number => {
//   const d = token.actor.data.data.attributes.hp.value;
//   debugger;
//   return d;
// },
// maxHP: (token: Token): number => {
//   const d = token.actor.data.data.attributes.hp.max;
//   debugger;
//   return d;
// },
// currentHPChange: (changes: Record<string, any>): number => {
//   const d = changes?.actorData?.data?.attributes?.hp?.value;
//   debugger;
//   return d;
// },
// maxHPChange: (changes: Record<string, any>): number => {
//   const d = changes?.actorData?.data?.attributes?.hp?.max;
//   debugger;
//   return d;
// },
//   creatureType: (token: Token): string | void => {
//     const actorType: string = token.actor.data.type.toLowerCase();
//     let creatureType: string;
//     if (actorType === 'character') {
//       creatureType = token.actor.data.data.details.race;
//     } else if (actorType === 'npc') {
//       creatureType = token.actor.data.data.details.type;
//     }
//     log(LogLevel.INFO, 'creatureLookupDND5E: ', token.name, actorType, creatureType);
//     if (creatureType) return creatureType.toLowerCase();
//   },
// },
// stub: {
//   currentHP: (token: Token): number => ,
//   maxHP: (token: Token): number => ,
//   currentHPChange: (changes: Record<string, any>): number => ,
//   maxHPChange: (changes: Record<string, any>): number => ,
//   creatureType: (token: Token): string | void => {
//     const actorType: string = token.actor.data.type.toLowerCase();
//     let creatureType: string;
//     if (actorType === 'character') {
//       creatureType = token.actor.data.data.details.race;
//     } else if (actorType === 'npc') {
//       creatureType = token.actor.data.data.details.type;
//     }
//     log(LogLevel.INFO, 'creatureLookupDND5E: ', token.name, actorType, creatureType);
//     if (creatureType) return creatureType.toLowerCase();
//   },
// },
//};
// stub: {
//   currentHP: (token: Token): number => ,
//   maxHP: (token: Token): number => ,
//   currentHPChange: (changes: Record<string, any>): number => ,
//   maxHPChange: (changes: Record<string, any>): number => ,
//   creatureType: (token: Token): string | void => {
//     const actorType: string = token.actor.data.type.toLowerCase();
//     let creatureType: string;
//     if (actorType === 'character') {
//       creatureType = token.actor.data.data.details.race;
//     } else if (actorType === 'npc') {
//       creatureType = token.actor.data.data.details.type;
//     }
//     log(LogLevel.INFO, 'creatureLookupDND5E: ', token.name, actorType, creatureType);
//     if (creatureType) return creatureType.toLowerCase();
//   },
// },
//};
//stub: {
// currentHP: (token: Token): number => {
//   const d = token.actor.data.data.attributes.hp.value;
//   debugger;
//   return d;
// },
// maxHP: (token: Token): number => {
//   const d = token.actor.data.data.attributes.hp.max;
//   debugger;
//   return d;
// },
// currentHPChange: (changes: Record<string, any>): number => {
//   const d = changes?.actorData?.data?.attributes?.hp?.value;
//   debugger;
//   return d;
// },
// maxHPChange: (changes: Record<string, any>): number => {
//   const d = changes?.actorData?.data?.attributes?.hp?.max;
//   debugger;
//   return d;
// },
//   creatureType: (token: Token): string | void => {
//     const actorType: string = token.actor.data.type.toLowerCase();
//     let creatureType: string;
//     if (actorType === 'character') {
//       creatureType = token.actor.data.data.details.race;
//     } else if (actorType === 'npc') {
//       creatureType = token.actor.data.data.details.type;
//     }
//     log(LogLevel.INFO, 'creatureLookupDND5E: ', token.name, actorType, creatureType);
//     if (creatureType) return creatureType.toLowerCase();
//   },
// },
// stub: {
//   currentHP: (token: Token): number => ,
//   maxHP: (token: Token): number => ,
//   currentHPChange: (changes: Record<string, any>): number => ,
//   maxHPChange: (changes: Record<string, any>): number => ,
//   creatureType: (token: Token): string | void => {
//     const actorType: string = token.actor.data.type.toLowerCase();
//     let creatureType: string;
//     if (actorType === 'character') {
//       creatureType = token.actor.data.data.details.race;
//     } else if (actorType === 'npc') {
//       creatureType = token.actor.data.data.details.type;
//     }
//     log(LogLevel.INFO, 'creatureLookupDND5E: ', token.name, actorType, creatureType);
//     if (creatureType) return creatureType.toLowerCase();
//   },
// },
//};
// stub: {
//   currentHP: (token: Token): number => ,
//   maxHP: (token: Token): number => ,
//   currentHPChange: (changes: Record<string, any>): number => ,
//   maxHPChange: (changes: Record<string, any>): number => ,
//   creatureType: (token: Token): string | void => {
//     const actorType: string = token.actor.data.type.toLowerCase();
//     let creatureType: string;
//     if (actorType === 'character') {
//       creatureType = token.actor.data.data.details.race;
//     } else if (actorType === 'npc') {
//       creatureType = token.actor.data.data.details.type;
//     }
//     log(LogLevel.INFO, 'creatureLookupDND5E: ', token.name, actorType, creatureType);
//     if (creatureType) return creatureType.toLowerCase();
//   },
// },
//};
//stub: {
// currentHP: (token: Token): number => {
//   const d = token.actor.data.data.attributes.hp.value;
//   debugger;
//   return d;
// },
// maxHP: (token: Token): number => {
//   const d = token.actor.data.data.attributes.hp.max;
//   debugger;
//   return d;
// },
// currentHPChange: (changes: Record<string, any>): number => {
//   const d = changes?.actorData?.data?.attributes?.hp?.value;
//   debugger;
//   return d;
// },
// maxHPChange: (changes: Record<string, any>): number => {
//   const d = changes?.actorData?.data?.attributes?.hp?.max;
//   debugger;
//   return d;
// },
//   creatureType: (token: Token): string | void => {
//     const actorType: string = token.actor.data.type.toLowerCase();
//     let creatureType: string;
//     if (actorType === 'character') {
//       creatureType = token.actor.data.data.details.race;
//     } else if (actorType === 'npc') {
//       creatureType = token.actor.data.data.details.type;
//     }
//     log(LogLevel.INFO, 'creatureLookupDND5E: ', token.name, actorType, creatureType);
//     if (creatureType) return creatureType.toLowerCase();
//   },
// },
// stub: {
//   currentHP: (token: Token): number => ,
//   maxHP: (token: Token): number => ,
//   currentHPChange: (changes: Record<string, any>): number => ,
//   maxHPChange: (changes: Record<string, any>): number => ,
//   creatureType: (token: Token): string | void => {
//     const actorType: string = token.actor.data.type.toLowerCase();
//     let creatureType: string;
//     if (actorType === 'character') {
//       creatureType = token.actor.data.data.details.race;
//     } else if (actorType === 'npc') {
//       creatureType = token.actor.data.data.details.type;
//     }
//     log(LogLevel.INFO, 'creatureLookupDND5E: ', token.name, actorType, creatureType);
//     if (creatureType) return creatureType.toLowerCase();
//   },
// },
//};
// stub: {
//   currentHP: (token: Token): number => ,
//   maxHP: (token: Token): number => ,
//   currentHPChange: (changes: Record<string, any>): number => ,
//   maxHPChange: (changes: Record<string, any>): number => ,
//   creatureType: (token: Token): string | void => {
//     const actorType: string = token.actor.data.type.toLowerCase();
//     let creatureType: string;
//     if (actorType === 'character') {
//       creatureType = token.actor.data.data.details.race;
//     } else if (actorType === 'npc') {
//       creatureType = token.actor.data.data.details.type;
//     }
//     log(LogLevel.INFO, 'creatureLookupDND5E: ', token.name, actorType, creatureType);
//     if (creatureType) return creatureType.toLowerCase();
//   },
// },
//};
//stub: {
// currentHP: (token: Token): number => {
//   const d = token.actor.data.data.attributes.hp.value;
//   debugger;
//   return d;
// },
// maxHP: (token: Token): number => {
//   const d = token.actor.data.data.attributes.hp.max;
//   debugger;
//   return d;
// },
// currentHPChange: (changes: Record<string, any>): number => {
//   const d = changes?.actorData?.data?.attributes?.hp?.value;
//   debugger;
//   return d;
// },
// maxHPChange: (changes: Record<string, any>): number => {
//   const d = changes?.actorData?.data?.attributes?.hp?.max;
//   debugger;
//   return d;
// },
//   creatureType: (token: Token): string | void => {
//     const actorType: string = token.actor.data.type.toLowerCase();
//     let creatureType: string;
//     if (actorType === 'character') {
//       creatureType = token.actor.data.data.details.race;
//     } else if (actorType === 'npc') {
//       creatureType = token.actor.data.data.details.type;
//     }
//     log(LogLevel.INFO, 'creatureLookupDND5E: ', token.name, actorType, creatureType);
//     if (creatureType) return creatureType.toLowerCase();
//   },
// },
// stub: {
//   currentHP: (token: Token): number => ,
//   maxHP: (token: Token): number => ,
//   currentHPChange: (changes: Record<string, any>): number => ,
//   maxHPChange: (changes: Record<string, any>): number => ,
//   creatureType: (token: Token): string | void => {
//     const actorType: string = token.actor.data.type.toLowerCase();
//     let creatureType: string;
//     if (actorType === 'character') {
//       creatureType = token.actor.data.data.details.race;
//     } else if (actorType === 'npc') {
//       creatureType = token.actor.data.data.details.type;
//     }
//     log(LogLevel.INFO, 'creatureLookupDND5E: ', token.name, actorType, creatureType);
//     if (creatureType) return creatureType.toLowerCase();
//   },
// },
//};

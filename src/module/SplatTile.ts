import { LogLevel, log } from './logging.js';

// TODO:
// - follow Tile API for frame, tile and texture
// - on the fly swap of texture triggering Sprite texture swap

export const SplatTile = async function (tile) {
  log(LogLevel.INFO, `Upgrading tile ${tile.data._id}`);

  // tile states
  // initial lives in as copy in flag space, current and next only in client space
  tile.data.parallaxia = {
    initial: null,
    current: null,
    previous: null,
    ptransform: '',
    ptransform_active: false,
    _refreshed: false,
    _updating: false,
    _last_update: 0,
  };

  tile._onCreateEmbeddedEntity = (embeddedName, child, options, userId) => {
    debugger;
  };

  // tile._onUpdate = (data) => {
  //   debugger;
  // };

  return this;
};

/* -------------------------------------------- */

//   /** @override */
//   tile._onUpdate = (data) => {
//     log(LogLevel.INFO, '_onUpdate data', data);
//     const changed_keys = new Set(Object.keys(data));
//     log(LogLevel.INFO, '_onUpdate changed', changed_keys);

//     // Release control if the Tile was locked
//     if (data.locked) tile.release();

//     // update flags with data
//     changed_keys.forEach((ck) => {
//       switch (ck) {
//         case 'initial':
//           mergeObject(tile.data.parallaxia.initial, data.initial);
//           log(LogLevel.DEBUG, 'Saving initial state changes:', tile.data.parallaxia.initial);

//           // save this new state into the Tile entity flags
//           console.log('Pre-safe: ', tile.data.parallaxia.initial.texture.path);
//           if (game.user.isGM) {
//             const texPath = data.initial?.texture?.path;
//             if (texPath && tile.data.img !== texPath) tile.update({ img: texPath });
//             tile._saveInitialState().then((r) => {
//               log(LogLevel.DEBUG, 'Saving complete.', r);
//             });
//           }
//           break;

//         // these come not from configuring the tile from our side, but
//         // from foundry, e.g. dragging a tile. We want to pick up on those
//         // by overriding our own config
//         case 'x':
//           tile.data.parallaxia.initial.position.x = data.x;
//           // tile.data.parallaxia.current.position.x = data.x;
//           break;
//         case 'y':
//           tile.data.parallaxia.initial.position.y = data.y;
//           // tile.data.parallaxia.current.position.y = data.y;
//           break;
//         case 'rotation':
//           tile.data.parallaxia.initial.rotation.z = toRadians(data.rotation);
//           // tile.data.parallaxia.current.rotation.z = toRadians(data.rotation);
//           break;
//         case 'img':
//           // texture swapping should happen here?
//           log(LogLevel.DEBUG, 'img update with', data.img);
//           break;
//         case '_id':
//           break;
//       }
//     });

//     // if image path has changed, swap out the texture!
//     if (changed_keys.has('initial') && data.initial.texture && data.initial.texture.path) {
//       if (tile.data.img !== data.initial.texture.path) {
//         log(LogLevel.DEBUG, `Swapping "${tile.data.img}" to "${data.initial.texture.path}".`);
//         tile._loadTexture(data.initial.texture.path).then((texture) => {
//           tile._swapTexture(texture);
//         });
//       }
//     }

//     tile._resetCurrentState();
//     tile._advanceState(Date.now(), 0);

//     if (changed_keys.has('ptransform')) {
//       log(LogLevel.DEBUG, 'Custom tile update function changed _onUpdate!');
//       tile._ptransformSetup(data['ptransform']);
//       if (game.user.isGM) tile.setFlag('parallaxia', 'ptransform', data.ptransform);
//     }

//     // Update the sheet if it's visible. In contrast to the current values being updated, this
//     // completely re-renders, updating also the initial state and other fields.
//     if (tile._sheet && tile._sheet.rendered) tile.sheet.render();
//   };

//   tile._ptransformSetup = (command) => {
//     // custom transform function
//     tile.data.parallaxia.ptransform = command;
//     if (command !== undefined && command !== null) {
//       try {
//         tile.ptransform = new Function('tile', 't', 'delta', 'initial', 'current', 'next', command);
//         tile.ptransform_active = true;
//       } catch (e) {
//         ui.notifications.error('Custom transform function creation failed. See console.', e);
//         console.error('Parallaxia | Custom function creation failed:', e);
//         tile.ptransform = NOOP;
//         tile.ptransform_active = false;
//       }
//     } else {
//       tile.ptransform = NOOP;
//     }
//   };

//   tile._advanceState = (t, frac_delta) => {
//     const delta = canvas.app.ticker.deltaMS * 0.001;

//     // lock-step calculate the next state
//     try {
//       const initial = tile.data.parallaxia.initial;
//       const current = tile.data.parallaxia.current;
//       // const previous = tile.data.parallaxia.previous;
//       const next = duplicate(current);

//       // tile position
//       next.position.x += current.position.dx * delta;
//       next.position.y += current.position.dy * delta;
//       next.position.z += current.position.dz * delta;

//       // texture tiling offset
//       const tw = tile.tile.img.texture.baseTexture.width * current.tiling.sx;
//       const th = tile.tile.img.texture.baseTexture.height * current.tiling.sy;
//       next.tiling.x = (current.tiling.x + current.tiling.dx * delta) % tw;
//       next.tiling.y = (current.tiling.y + current.tiling.dy * delta) % th;

//       next.tiling.sx += current.tiling.sdx * delta;
//       next.tiling.sy += current.tiling.sdy * delta;
//       next.texture.width = tile.tile.img.texture.baseTexture.width;
//       next.texture.height = tile.tile.img.texture.baseTexture.height;

//       // ...

//       // run custom transformations script
//       if (tile.ptransform_active && tile.ptransform) {
//         try {
//           tile.ptransform(tile, t, delta, initial, current, next);
//         } catch (e) {
//           const tn = tile.data._id + (current.name ? `(${current.name})` : '');
//           ui.notifications.error(`Custom function of tile ${tn} failed to execute. See console.`);
//           paralerr(`Custom function of tile ${tn} failed to execute:`, e);
//           tile.ptransform_active = false;
//         }
//       }

//       // store next state as current state
//       tile.data.parallaxia.previous = current;
//       tile.data.parallaxia.current = next;
//     } catch (error) {
//       paralerr(error);
//     }
//   };

//   // load state from flags
//   tile._loadInitialState = async () => {
//     log(LogLevel.DEBUG, `Loading initial state of tile ${tile.data._id}`);
//     const initial_flags = mergeObject(defaultState, await tile.getFlag('parallaxia', 'initial'));

//     return ParallaxiaTileState.fromFlags(initial_flags);
//   };

//   tile._saveInitialState = async (state = null) => {
//     // save initial/current/specific state to flags
//     if (!state && tile.data.parallaxia.initial) {
//       state = tile.data.parallaxia.initial;
//     }
//     await tile.setFlag('parallaxia', 'initial', state);
//     await tile.setFlag('parallaxia', 'ptransform', tile.data.parallaxia.ptransform);
//   };

//   tile._resetCurrentState = () => {
//     log(LogLevel.DEBUG, `Resetting tile ${tile.data._id} state to initial.`);
//     tile.data.parallaxia.current = duplicate(tile.data.parallaxia.initial);
//     tile.data.parallaxia.previous = duplicate(tile.data.parallaxia.initial);
//   };

//   tile._resetToBase = () => {
//     // turn this tile back into a base tile, removing all parallaxia flags and elements
//   };

//   tile._applyState = (state) => {
//     tile._updating = true;

//     const img = tile.tile.img;
//     if (tile.data.img !== state.texture.path) {
//       // console.log('state path difference.')
//     }
//     tile.position.set(state.position.x, state.position.y);

//     // if width, height or rotation change, we need to recalculate the bounds
//     // so perhaps trigger a full refresh
//     // though we have a memory leak in the refresh right now...
//     if (img.width !== state.width || img.height !== state.height || tile.rotation !== state.rotation.z) {
//       img.width = state.width;
//       img.height = state.height;
//       img.rotation = state.rotation.z;

//       // todo: recalculate hitarea/bounds
//     }

//     if (img.blendMode !== blendModesString[state.blendMode]) {
//       img.blendMode = blendModesString[state.blendMode];
//     }
//     img.tilePosition.set(state.tiling.x, state.tiling.y);
//     img.tileScale.set(state.tiling.sx, state.tiling.sy);

//     img.tint = colorStringToHex(state.tint);

//     img.alpha = game.user.isGM ? Math.max(0.2, state.alpha) : state.alpha;
//     // todo: visibility
//     tile._updating = false;
//   };

//   tile._loadTexture = async (path) => {
//     const texture = await loadTexture(path, { fallback: 'icons/svg/hazard.svg' });
//     if (!texture || !texture.valid) {
//       console.warn(`Parallaxia | failed loading texture ${path}`);
//       return;
//     }
//     return texture;
//   };

//   tile._swapTexture = (texture) => {
//     if (!texture || !texture.valid) {
//       console.warn('Failed applying new texture!', texture);
//       return;
//     }
//     // swap the actual texture
//     tile.texture = texture;
//     tile.tile.img.texture = texture;
//   };

//   tile._swapImageContainer = () => {
//     // Coo coo replace the old sprite with our new one. That's basically all parallaxia is supposed to do... :D
//     const tilingImg = new PIXI.TilingSprite(tile.texture, tile.tile.img.width, tile.tile.img.height);

//     // due to artifacts when mipmapping is enabled for tiling sprites, hard force them to be disabled
//     tile.texture.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;

//     tilingImg.is_interactive = true;
//     tile.tile.removeChild(tile.tile.img);
//     tile.tile.img = tile.tile.addChild(tilingImg);
//   };

//   /* -------------------------------------------- */

//   /** @override */
//   tile.refresh = () => {
//     log(LogLevel.DEBUG, 'Tile refresh');
//     const current = tile.data.parallaxia.current;
//     tile.position.set(current.position.x, current.position.y);
//     const aw = Math.abs(current.width);
//     const ah = Math.abs(current.height);

//     let bounds;
//     if (tile.tile.img) {
//       // this check isn't really appropriate in our case?
//       const img = tile.tile.img;

//       img.width = aw;
//       img.height = ah;
//       // foundry.js does some messing with the sign of w/h and the scale in x and y

//       img.anchor.set(0.5, 0.5);
//       img.position.set(aw / 2, ah / 2);
//       img.rotation = current.rotation.z;
//       img.alpha = tile.data.hidden ? 0.5 : Math.max(current.alpha, 0.2); // have it always visible for DM
//       bounds = tile.tile.getLocalBounds();
//     }

//     // as in base, draw temporary element
//     else {
//       bounds = new NormalizedRectangle(0, 0, current.width, current.height);
//       // tile.tile.bg.clear().beginFill(0xFF00FF, 0.5).drawShape(bounds);
//       // tile.tile.bg.visible = true;
//     }

//     // padding for handles and frame
//     tile.hitArea = tile._controlled ? bounds.clone().pad(30, 30) : bounds;

//     // borders
//     tile._refreshBorder(bounds);
//     tile._refreshHandle(bounds);

//     tile.alpha = 1.0;
//     tile.visible = current.visible || game.user.isGM;
//     tile._refreshed = true;
//     return tile;
//   };

//   // Initialize the tile state for a new or reinitialized instance
//   const init_flags = await tile.getFlag('parallaxia', 'initial');
//   if (init_flags !== undefined) {
//     log(LogLevel.DEBUG, 'Trying to load existing flags');
//     tile.data.parallaxia.initial = ParallaxiaTileState.fromFlags(init_flags);
//   } else {
//     log(LogLevel.INFO, 'Creating new tile state from base Tile');
//     tile.data.parallaxia.initial = ParallaxiaTileState.fromTile(tile);
//   }

//   if (tile.data.parallaxia.current === null) tile.data.parallaxia.current = duplicate(tile.data.parallaxia.initial);
//   if (tile.data.parallaxia.previous === null) tile.data.parallaxia.previous = duplicate(tile.data.parallaxia.initial);

//   // if this tile was created we need to store the flags on the server
//   // note that this triggers an update, which reads some of the above.
//   if (game.user.isGM) {
//     if (tile.getFlag('parallaxia', 'initial') === undefined) {
//       log(LogLevel.DEBUG, `Setting initial flag for tile ${tile.data._id}`);
//       await tile.setFlag('parallaxia', 'initial', tile.data.parallaxia.initial);
//     }
//     if (tile.getFlag('parallaxia', 'ptransform') === undefined) await tile.setFlag('parallaxia', 'ptransform', '');
//   }

//   // create the custom update function
//   tile._ptransformSetup(await tile.getFlag('parallaxia', 'ptransform'));

//   // setup new tile stuff
//   tile._swapImageContainer();

//   // set up the configuration sheet reference
//   if (game.user.isGM) tile._sheet = new ParallaxiaTileConfig(tile);
// };

// export const defaultState = {
//   texture: {
//     path: null,
//     width: 0,
//     height: 0,
//   },
//   name: null,
//   position: {
//     x: 0,
//     y: 0,
//     z: 0,
//     dx: 0,
//     dy: 0,
//     dz: 0,
//   },
//   zIndex: 0,
//   tiling: {
//     x: 0,
//     y: 0,
//     dx: -50,
//     dy: 0,
//     sx: 1,
//     sy: 1,
//     sdx: 0,
//     sdy: 0,
//   },
//   rotation: {
//     x: 0,
//     y: 0,
//     z: 0,
//     dx: 0,
//     dy: 0,
//     dz: 0,
//   },
//   scale: {
//     x: 1,
//     y: 1,
//     z: 1,
//   },
//   filters: [],
//   blendMode: 'NORMAL',
//   weight: 0,
//   width: 1,
//   height: 1,
//   alpha: 1,
//   tint: '#ffffff',
//   visible: true,
//   paused: false,
//   flags: {},
//   _frameN: 0,
//   _lastTimestamp: 0,
// };

// export class ParallaxiaTileState {
//   constructor() {
//     return duplicate(defaultState);
//   }

//   static fromFlags(flags) {
//     log(LogLevel.INFO, 'Creating ParallaxiaState from flags:', flags);
//     const state = new ParallaxiaTileState();
//     if (flags === undefined) {
//       log(LogLevel.DEBUG, 'Returning default state on flag load!');
//       return state;
//     }
//     mergeObject(state, flags);

//     // some migration
//     if (!isNaN(state.blendMode)) state.blendMode = blendModes[parseInt(state.blendMode)];

//     // const fkeys = new Set(Object.keys(flags));
//     // const skeys = new Set(Object.keys(state));
//     // skeys.forEach(sk => {
//     //     if (fkeys.has(sk)) state[sk] = flags[sk];
//     // });
//     return state;
//   }

//   static fromTile(tile) {
//     log(LogLevel.INFO, 'State from tile:', tile);
//     const state = new ParallaxiaTileState();
//     state.name = '';
//     state.texture.path = tile.data.img;
//     console.log('From Tile: ', state.texture.path);
//     state.texture.width = tile.tile.img.texture.baseTexture.width;
//     state.texture.height = tile.tile.img.texture.baseTexture.height;
//     state.zIndex = tile.zIndex;
//     state.position.x = tile.position.x;
//     state.position.y = tile.position.y;
//     state.width = tile.tile.img.width;
//     state.height = tile.tile.img.height;
//     state.rotation.z = toRadians(tile.rotation);
//     state.alpha = tile.alpha;

//     return state;
//   }
// }

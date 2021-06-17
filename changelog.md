# CHANGELOG

## [0.8.8] (Breaking changes for FOundryVTT 0.8.6 and newer)

- Integration with libwrapper
- Manage hooks with a new workflow
- Bootstrapped with League of Extraordinary FoundryVTT Developers foundry-vtt-types
- Minor bug fix.
- Integration of pull request [Add support for 'gurps' system](https://github.com/edzillion/blood-n-guts/pull/223/files)
- Integration of pull request [Support for The Dark Eye / Das schwarze Auge 5th Ed.](https://github.com/edzillion/blood-n-guts/pull/272/)
- Integration of [Implement libwrapper to wrap token.draw call](https://github.com/edzillion/blood-n-guts/issues/268)
- Integration of [0.8.x support](https://github.com/edzillion/blood-n-guts/issues/276)
## [0.8.7]

### FEATURES

- Improvements to blood splat placement, connection of trail endpoints.
- Native system support for Morkborg.
- Native system support for Shadow of the Demon Lord.
- Better handling of active/inactive scenes: GM can now set up blood on an inactive scene before they activate it. Blood effects will only be created on a scene if the GM is viewing it, but all scenes will show (already created blood to all users whether a scene active or not.
- Limit notifications to GM only.
- User warnings now shown in Game Settings.
### BUGS

- Fix rotation issues with locked tokens. 
- Fix issue with NPCs with no class. 
- Fix crash when players view a scene without GM online.
- Fix problems with disabling scenes, and updates from those scenes. 
- Refactor and fix problems with game settings / scene settings / token settings. 

## [0.8.6]

### FEATURES

- Redesigned Violence Level Settings, removed old file-based system.
- Removed file-based custom color sytem, while it is redesigned.
- Started on i18n support. Translations not complete

## [0.8.5]

### BUGFIXES

- Fix Token.draw() crash when token missing actor.

## [0.8.4]

### BUGFIXES

- Fix silent error when token missing it's icon, fallback to default

## [0.8.3]

### FEATURES

- Ascending Damage - now supports systems which count damage upward from 0.
- Added native StarWarsFFG support.
- Added native SWADE support.

### BUGFIXES

- Fix missing splatToken.updateChanges() bug
- Potential fix for `_updateID` bug
- Fix for missing TokenSplat position bug

## [0.8.2]

### FEATURES

- Added native Starfinder support (thanks to [Ryan Renna](https://github.com/rrenna)!)

### BUGFIXES

- Fixed fxmaster / weather effects bug.

## [0.8.1]

### BUGFIXES

- Fixed customAttributePaths bug

## [0.8.0]

### MAJOR UPDATE

- **Blood Layer** - all blood splats other than token splats are drawn on the blood layer. 
- **TileSplat** - blood layer splats are derived from `Tile`, so most tile functionality is available (e.g. delete, move, lock etc.).
- **Brush Tool** - blood can now be drawn directly into the scene.
- **Blood Layer Tools**:
  - Toggle - toggles layer visiblity (token splats will still be visible).
  - Select - select and manipulate blood splats on the blood layer. 
  - Brush - draw blood splats directly to the blood layer.
  - Brush Settings - set brush color, font, size, density etc.
  - Wipe - wipes blood layer (token splats will remain).
- Color has been simplified, rbga -> hex colors, alpha is set on the parent container instead.
- New system compatibility system. Adding new systems possible through editing `src/data/systems.ts`
- Many new systems supported: archmage, cyberpunkred, D35E, dark-heresy, dcc, dnd5e, gurps4e, lancer, lotfp, pf1, pf2e, shadowrun5e, starwarsffg, swade, twodsix, uesrpg-d100, wfrp4e
- **Universal System Support** - if a system is not supported it is possible to set a trackable health attribute on each actor type (character, npc etc.) Note: this attribute requires both `.value` and `.max` fields to work.

## [0.7.5]

### BUGFIXES

- Changed lookupBloodToken error to warn, reorder log levels, and change default logLevel to 2 (INFO).

## [0.7.4]

### BUGFIXES

- Fixed Advanced Configuration blank when loading 'Custom' settings

## [0.7.3]

### BUGFIXES

- Fixed ReferenceError issue with ForgeVTT

## [0.7.2]

### BUGFIXES

- Fixed problem with loading custom files while running on Forge.
- Fixed problem with creatures set to 'name' without colors in name.
- Fixed problems with loading default colors, related to rgba -> hex conversion.
- Fixed bug with wipeAllFlags not wiping all token flags.
- Fixed some blood color defaults issues.

## [0.7.1]

### FEATURES

- Token Config works on prototype tokens now too
- All tokens on scene will be pre-splatted based on `healthThreshold` and `damageThreshold`

### BUGFIXES

- Fixed token blood color going black on re-adding a linked token.

## [0.7.0]

### FEATURES

- UX improvements for mod settings, 'Custom' shown when settings are changed from defaults. 
- Per-token settings: can set blood color, violence level and splat fonts on individual tokens, which will override base mod settings @ `Token Configuration -> Image`.

### BUGFIXES

- Fixed some issues with saving settings.

## [0.6.10]

### BUGS

- Scene transition stuff was left out of last build, added now.

## [0.6.9]

### FEATURES

- Added this changelog
- Added API Hook `bloodNGutsReady`, fired when mod is available globally at `Window.BloodNGuts`
- Added custom settings feature - can save custom fonts, blood colors & violence levels which persist between installs & updates.
- UX improvements to remind users that the mod is not intended to function on non-active scenes.

### BUGFIXES

- Fixed some bugs with `lookupTokenBloodColor`
- Fixed changing settings on non-active scenes bug.

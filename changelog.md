# CHANGELOG

## [0.7.3]

### BUGFIXES

- Fixed ReferenceError issue with FoundryVTT

## [0.7.2]

### BUGFIXES

- Fixed problem with loading custom files while running on Foundry.
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

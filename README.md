
# blood-n-guts - A module for FoundryVTT

***Spray your dungeons with blood!***
![Blood 'n Guts](./media/blood-n-guts-sting.gif)

## Table of contents

- [blood-n-guts - A module for FoundryVTT](#blood-n-guts---a-module-for-foundryvtt)
  - [Table of contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Installation](#installation)
    - [libWrapper](#libwrapper)
  - [Settings For House Rules](#settings-for-house-rules)
  - [Customization](#customization)
    - [Adding a Custom Font](#adding-a-custom-font)
    - [Customizing Blood Color](#customizing-blood-color)
    - [Customising Violence Levels](#customising-violence-levels)
  - [Performance & Clearing Blood](#performance--clearing-blood)
  - [Changelog](#changelog)
  - [Issues](#issues)
  - [Credits and Thanks](#credits-and-thanks)
  - [Acknowledgements](#acknowledgements)

## Overview

Blood 'n Guts is a module for FoundryVTT that draws blood splats on tokens and floors.

## Features

* Blood splatter on floor, on tokens, and blood trails behind moving tokens.
* Customizable blood Color based on race or npc type.
* Customizable blood splatter glyphs.
* Blood respects walls, but not see through walls.
* Many options to customize blood size and spread and frequency.
* Can support house rules such as `bloodied at 50% health`
* Currently supports DnD5E and PF2E and more to come (please add your request as an [issue](https://github.com/edzillion/blood-n-guts/issues) on the repo)
* **Only works on active scenes**

## Installation

It's always easiest to install modules from the in game add-on browser.

To install this module manually:
1.  Inside the Foundry "Configuration and Setup" screen, click "Add-on Modules"
2.  Click "Install Module"
3.  In the "Manifest URL" field, paste the following url:
`https://raw.githubusercontent.com/edzillion/blood-n-guts/master/src/module.json`
1.  Click 'Install' and wait for installation to complete
2.  Don't forget to enable the module in game using the "Manage Module" button

Or download the latest zip file here: [https://github.com/edzillion/blood-n-guts/releases](https://github.com/edzillion/blood-n-guts/releases)

### libWrapper

This module uses the [libWrapper](https://github.com/ruipin/fvtt-lib-wrapper) library for wrapping core methods. It is a hard dependency and it is recommended for the best experience and compatibility with other modules.

## Settings For House Rules

Two of the options in Advanced Config help customise when blood splats appear:

* `Health Threshold` - the percentage of total health to start showing blood.
* `Damage Threshold` - the damage as a percentage of health to show blood.

A common house rule is to show blood at 50% health. This can be achieved by setting `Health Threshold = 0.5` and `Damage Threshold = 0`. As this is a common rule so a checkbox is included which sets these settings.

## Customization

⚙️ Since v0.7.2 it is possible to save settings on **The Forge**. In this case the settings are stored in your [Assets Library](https://forge-vtt.com/assets/browse#/) in a folder called `blood-n-guts`. Replace `/Data/blood-n-guts` with this folder in the instructions below.

**Recomended Forge workflow**: install and enable module, files will be created in `Assets Library`. Go there are download `blood-n-guts` folder. Edit files locally, then upload back to same location.

⚙️ Since v0.6.9 it is now possible to save settings permanently. These settings files are stored in `/Data/blood-n-guts/` (note: this is *not* inside the `modules` folder). The files (in JSON format) and the folders will be created for you on install.

* If you add a customisation with the same name as a default - it will overwrite the default with your settings.
* New entries will be added in addition to the defaults.

### Adding a Custom Font

Blood 'n Guts renders splats as individual glyphs from fonts. You can use this online font face generator to convert a font into the required `woff` & `woff2` formats: [https://transfonter.org/](https://transfonter.org/) (just use the default options), it will also provide some sample css.

Steps:

1. Copy your font `.woff` and `.woff2` files to the `Data/blood-n-guts/fonts` folder.
2. Edit the `Data/blood-n-guts/custom.css` to add your `@font-family` definition, **note the src urls**:

```css
@font-face {
  font-family: 'Example Font Family';
  src: url('../../blood-n-guts/fonts/ExampleFontFile.woff2') format('woff2'),
      url('../../blood-n-guts/fonts/ExampleFontFile.woff') format('woff');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

3. Add an entry in the `Data/blood-n-guts/customSplatFonts.json` file for your new font, this and the css must match.

```json
{
    "Example Font Family": {
        "name": "Example Font Family",
        "availableGlyphs": "ABCDEFGHIJKLMNOP$%&^@!"
    }
}
```

4. You must select *only* the characters that you want to display. I used [FontForge](https://fontforge.org) to find the valid character glyphs.

5. Reload the world and you should then be able to select the font in `Advanced Configuration`.

### Customizing Blood Color

Blood color can be set for race as well as npc type. Just add an entry to the `Data/blood-n-guts/bloodColorSettings.json` file. Each entry consists of a name of the race or type (key), and the corresponding color (value), which can be described in a number of ways:

* The full rgba string [r,g,b,alpha] e.g.  `"half-elf":"rgba(223, 96, 96, 0.7)",`
* A [CSS color](https://www.w3schools.com/cssref/css_colors.asp) name e.g.  `"elf": "silver",`
* `"name"` tells Blood 'n Guts to read the creature's name for the color to display e.g.  `"dragon": "name",`

example (**note: keys should all be lowercase!**):

```js
{
  "beast": "green", // this will override the default color of all beasts
  "blob": "name" // this adds a new entry which will display blue for a 'blue blob' red for a 'red blob' etc.
  "gnome": "rgba(23, 23, 255, 0.5)" // setting individual red, green, blue, alpha
}
```

### Customising Violence Levels

As in other customisations you can override the default levels or add new ones. Example:

```json
{
  "Shrieker": { // this will override the default 'Shrieker' settings.
    "trailSplatDensity": 9,
    "floorSplatDensity": 1,
    "tokenSplatDensity": 1,
    "trailSplatSize": 25,
    "floorSplatSize": 35,
    "tokenSplatSize": 25,
    "splatSpread": 1,
    "healthThreshold": 0.5,
    "damageThreshold": 0.33,
    "deathMultiplier": 1.5,
    "sceneSplatPoolSize": 20
  },
  "Aboleth": { // this will add a new violence level to the end of the list.
    "trailSplatDensity": 10,
    "floorSplatDensity": 6,
    "tokenSplatDensity": 4,
    "trailSplatSize": 90,
    "floorSplatSize": 120,
    "tokenSplatSize": 60,
    "splatSpread": 2.5,
    "healthThreshold": 0.9,
    "damageThreshold": 0.15,
    "deathMultiplier": 2.5,
    "sceneSplatPoolSize": 175
  }
}
```

## Performance & Clearing Blood

Foundry can start to lag if too many blood splats are being generated. If you are having this problem consider lowering your `Violence Level` in settings or the `Splat Pool Size` in `Advanced Configuration`.

* Everyone has access to change `Violence Level` but only GMs have access to `Advanced Settings`.
* GM sets the level appropriate for their needs and then other clients can turn their violence level down if they are having issues.

There are 3 ways to clear blood from the current scene:

1. By chat command / chat macro: `/blood clear` (GM and PC)
1. By clicking the `Wipe Scene Splats` button at the bottom of `Advanced Configuration` (GM Only)
1. By clicking the button in the Tile menu on the left (GM Only):

![screenshot](./media/screenshot.png#right)

## [Changelog](./changelog.md)

## Issues

Any issues, bugs, or feature requests are always welcome to be reported directly to the [Issue Tracker](https://github.com/edzillion/blood-n-guts/issues ), or using the [Bug Reporter Module](https://foundryvtt.com/packages/bug-reporter/).

## Credits and Thanks

Thanks to @Fyorl @vance @skimble @sky @Monkeyy and @Erecon for tech help. Thanks to @ApoApostolov for testing and feedback.

* `splatter` font provided by [Codin Repsh]( https://www.dafont.com/profile.php?user=362757)
* `wc rhesus` font provided by [Christophe Féray](http://www.atypeekdesign.com )
* `Wach Op-Art` font provided by [Fernando Haro](https://defharo.com)
* `Sigali` font font provided by [Dylan Culhane](https://www.dafont.com/profile.php?user=931672)
* `WM Shapes 1` font provided by [WillyMac](https://www.dafont.com/willymac.d527)
* `Starz 2` font provided by [Imagex](http://www.imagex-fonts.com)

## Acknowledgements

Bootstrapped with League of Extraordinary FoundryVTT Developers  [foundry-vtt-types](https://github.com/League-of-Foundry-Developers/foundry-vtt-types).

Mad props to the 'League of Extraordinary FoundryVTT Developers' community which helped me figure out a lot.
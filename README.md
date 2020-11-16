
# blood-n-guts - A module for FoundryVTT
***Spray your dungeons with blood!***
![Blood 'n Guts](./media/blood-n-guts-sting.gif)

## Table of contents
* [Overview](#overview)
* [Features](#features)
* [Installation](#installation)
* [Customization](#customization)
* [Performance](#performance)
* [Features](#features)

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
Paste the link to the `module.json` file into the 'Manifest URL' field in 'Install Module'.
> `https://raw.githubusercontent.com/edzillion/blood-n-guts/dev/src/module.json`

Or download the latest zip file here: [https://github.com/edzillion/blood-n-guts/releases](https://github.com/edzillion/blood-n-guts/releases)

## Customization
⚠️Warning! Currently customizations will be overwritten by module updates. You should back up the files you have changed before updating. This will be fixed in a forthcoming release.
### Adding a Custom Font
Blood 'n Guts renders splats as individual glyphs from fonts. You can add a new font like so:

1. Copy your font in `.woff` and `.woff2` formats to the `fonts` folder.
2. Add an entry in the `data/splatFonts.js` file for your new font:
```js
'Font Family Name': {
    name: 'Font Family Name',
    availableGlyphs: [
        ...'ABDEFGHIKMNOPQRSTUVWXZ',
    ],
},
```
3. You must select only the characters that you want to display. I used [FontForge](https://fontforge.org) to find the valid character glyphs.
4. Add the font css to `blood-n-guts.css` like so:
```css
@font-face {
  font-family: 'Font Family Name';
  src: url('./fonts/filename.woff2') format('woff2'),
      url('./fonts/filename.woff') format('woff');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```
5. Reload the world and you should then be able to select the font in `Advanced Configuration`.

### Customizing Blood Color
Blood color can be set for race as well as npc type. Just add an entry to the `data/bloodColorSettings.js` file. There are various ways to set a color:
* The full rgba string [r,g,b,alpha] e.g.  `'half-elf':'rgba(223, 96, 96, 0.7)',`
* A [CSS color](https://www.w3schools.com/cssref/css_colors.asp) name e.g.  `elf: 'silver',`
* `'name'` tells Blood 'n Guts to read the creature's name for the color to display e.g.  `dragon: 'name',` 

### Customising for House Rules
Two of the options in Advanced Config help customise when blood splats appear:
* `Health Threshold` - the percentage of total health to start showing blood.
* `Damage Threshold` - the damage as a percentage of health to show blood.

A common house rule is to show blood at 50% health. This can be achieved by setting `Health Threshold = 0.5` and `Damage Threshold = 0`. This is a common rule so a checkbox is included which sets these settings. 

## Performance
Under the current implementation, foundry can start to lag if too many blood splats are being generated. If you are having this problem consider lowering the size of the `Splat Pool Size` in `Advanced Configuration`.

You can clear blood all the blood splats on the scene by clicking the button at the bottom of `Advanced Configuration` by clicking the button in the Tile menu on the left:

![screenshot](./media/screenshot.png#right)

## Credits and Thanks
Thanks to @Fyorl @vance @skimble @sky @Monkeyy and @Erecon for tech help. Thanks to @ApoApostolov for testing and feedback.

* `splatter` font provided by [Codin Repsh]( https://www.dafont.com/profile.php?user=362757)
* `wc rhesus` font provided by [Christophe Féray](http://www.atypeekdesign.com )
* `Wach Op-Art` font provided by [Fernando Haro](https://defharo.com) 
* `Sigali` font font provided by [Dylan Culhane](https://www.dafont.com/profile.php?user=931672)
* `WM Shapes 1` font provided by [WillyMac](https://www.dafont.com/willymac.d527)
* `Starz 2` font provided by [Imagex](http://www.imagex-fonts.com)


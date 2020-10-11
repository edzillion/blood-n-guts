
# blood-n-guts - A module for FoundryVTT
***Spray your dungeons with blood!***

## Table of contents
* [Overview](#overview)
* [To Do](#to-do)

## Overview
This is a work in progress.

## To Do
1. ~~splatTokens moving after the token moves~~
1. ~~big obvious sighmask polygon showing momentarily~~
1. ~~smaller sight polygon left for floor splats only?~~
1. ~~Use token.center(?) to align tokens~~
1. ~~update container positioning to make more sense~~
1. ~~base blood colour on race etc~~
1. ~~mask flicker, addChild?~~
1. control flow review, await always needed?
1. ~~change bleeding to flag on token~~
1. remove cut-off glyphs
1. use preloadTemplates to trigger DOM font loading
1. ~~wire up advanced config form~~
1. order of settings in config window
1. ~~clearly separate token from tokenData objects~~
1. implement Tile pool to reuse tiles instead of creating new.
1. thank vance and skimble on release
1. use token velocity for direction?

## Bugs
1. No trail when moving to a grid coord y < grid.size
1. tokensplat mask alignment is slightly off
1. sometimes tokensplats don't appear on damage (also on death?)
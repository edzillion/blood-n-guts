import { BloodNGuts } from '../blood-n-guts';
import { MODULE_TITLE } from '../constants';
import BloodConfig from './BloodConfig';
import BrushControls from './BrushControls';

/**
 * Add control buttons
 */
Hooks.on('getSceneControlButtons', (controls) => {
  if (game.user.isGM) {
    controls.push({
      name: 'blood',
      title: MODULE_TITLE,
      icon: 'fas fa-tint',
      layer: 'BloodLayer',
      tools: [
        {
          name: 'toggle',
          title: 'Toggle ' + MODULE_TITLE + ' on/off',
          icon: 'fas fa-eye',
          onClick: () => {
            canvas.blood.toggle();
          },
          active: false, //canvas.blood.visible, //todo: why is canvas available here in SimpleFog?
          toggle: true,
        },
        {
          name: 'select',
          title: 'Select blood splats',
          icon: 'fas fa-expand',
        },
        {
          name: 'brush',
          title: 'Draw blood splats to the scene',
          icon: 'fas fa-tint',
        },
        {
          name: 'sceneConfig',
          title: "Configure Blood 'n Guts",
          icon: 'fas fa-cog',
          onClick: () => {
            // @ts-expect-error defintions wrong
            new BloodConfig().render(true);
          },
          button: true,
        },
        {
          name: 'wipe',
          title: 'Wipe all blood splats from this scene',
          icon: 'fas fa-tint-slash',
          button: true,
          onClick: BloodNGuts.wipeAllFlags,
        },
      ],
      activeTool: 'tile',
    });
  }
});

/**
 * Handles adding the custom brush controls pallet
 * and switching active brush flag
 */
Hooks.on('renderSceneControls', (controls) => {
  // Switching to layer
  if (controls.activeControl === 'blood') {
    // Open brush tools if not already open
    // @ts-expect-error defintions wrong
    if (!$('#blood-brush-controls').length) new BrushControls().render(true);
    // Set active tool
    const tool = controls.controls.find((control) => control.name === 'blood').activeTool;
    // canvas.blood.setActiveTool(tool);
  }
  // Switching away from layer
  else {
    // Clear active tool
    // canvas.blood.clearActiveTool();
    // Remove brush tools if open
    const bc = $('#blood-brush-controls');
    if (bc) bc.remove();
  }
});

/**
 * Sets Y position of the brush controls to account for scene navigation buttons
 */
function setBrushControlPos() {
  const bc = $('#blood-brush-controls');
  if (bc) {
    const h = $('#navigation').height();
    bc.css({ top: `${h + 30}px` });
  }
}

// Reset position when brush controls are rendered or sceneNavigation changes
Hooks.on('renderBrushControls', setBrushControlPos);
Hooks.on('renderSceneNavigation', setBrushControlPos);

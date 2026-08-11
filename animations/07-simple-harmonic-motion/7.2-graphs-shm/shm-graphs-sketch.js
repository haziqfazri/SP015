/* =========================================================================
   SHM-GRAPHS-SKETCH.JS — Topic 7.2, SP015.
   Bootstrap only: constructs SimulationController once the DOM is ready.
   Load last, after physics.js, renderer.js, controller.js, ui-manager.js.
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  new SimulationController();
});

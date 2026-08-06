/* =========================================================================
   WAVE-SUPERPOSITION-SKETCH.JS — Topic 7.5, SP015.
   Bootstrap only: constructs SimulationController once the DOM is ready.
   Load last, after physics.js, renderer.js, controller.js, ui.js.
   ========================================================================= */

let simulation;

document.addEventListener('DOMContentLoaded', () => {
  simulation = new SimulationController();
  simulation.init();
});
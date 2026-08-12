/* =========================================================================
   KINEMATICS-SHM-SKETCH.JS — Topic 7.1, SP015.
   p5 GLOBAL mode entry point: setup()/draw()/windowResized(). Single
   canvas, so global mode is used here (architecture.md §4) rather than
   the instance-mode bootstrap used by 7.2/7.5. Load last, after physics.js,
   renderer.js, controller.js, ui.js.
   ========================================================================= */

let simulation;

// =========================================================================
// p5.js lifecycle
// =========================================================================
function setup() {
  const holder = document.getElementById('canvas-holder');
  const cnv = createCanvas(holder.clientWidth, holder.clientHeight);
  cnv.parent('canvas-holder');
  pixelDensity(1);
  frameRate(60);

  simulation = new SimulationController();
  simulation.init();

  noLoop();  // sim starts paused; draw() only runs on explicit redraw() until Play is pressed
  redraw();  // render one initial frame so the canvas isn't blank on load
}

function windowResized() {
  simulation.resize();
  const isPlaying = simulation.ui.playbackState?.isPlaying ?? simulation.ui.isPlaying;
  if (!isPlaying) redraw();
}

function draw() {
  const dt = Math.min(deltaTime / 1000, LIMITS.ui.maxDt); // clamped, coding.md §3
  simulation.update(dt);
  simulation.render();
}

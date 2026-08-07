/* =========================================================================
   STANDING-WAVES-SKETCH.JS — Topic 7.6, SP015.
   p5 GLOBAL mode entry point: setup()/draw()/windowResized(). Single
   canvas, so global mode is used here (architecture.md §4) rather than
   the instance-mode bootstrap used by 7.4/7.5. Load last, after physics.js,
   renderer.js, controller.js, ui.js.
   ========================================================================= */

let simulation;

function setup() {
  const holder = document.getElementById('canvas-holder');
  const cnv = createCanvas(holder.clientWidth, holder.clientHeight);
  cnv.parent('canvas-holder');
  pixelDensity(1);
  frameRate(60);
  textFont('Space Mono'); // monospace for the readouts and labels

  simulation = new SimulationController();

  noLoop(); // starts paused — first frame renders once via redraw(), never blank on load
  redraw();
}

function draw() {
  const dt = Math.min(deltaTime / 1000, 0.05); // clamped, coding.md §3
  simulation.update(dt);
  simulation.render();
}

function windowResized() {
  const holder = document.getElementById('canvas-holder');
  resizeCanvas(holder.clientWidth, holder.clientHeight);
  if (!simulation.isPlaying) redraw();
}

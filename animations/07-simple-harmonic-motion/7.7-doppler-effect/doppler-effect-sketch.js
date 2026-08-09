/* =========================================================================
   DOPPLER-EFFECT-SKETCH.JS — Topic 7.7, SP015.
   GLOBAL p5 mode — single canvas, no cross-canvas sync needed (see
   controller.js's header comment). Load last, after physics.js,
   renderer.js, controller.js, ui.js.
   ========================================================================= */

let simulation;
let lastFrameMs;

function setup() {
  const holder = document.getElementById('canvas-holder');
  const cnv = createCanvas(holder.clientWidth, holder.clientHeight);
  cnv.parent(holder);
  pixelDensity(1);
  frameRate(60);

  simulation = new SimulationController();

  lastFrameMs = performance.now();
  noLoop(); // sim starts paused; draw() only runs on explicit redraw()
  redraw(); // render one initial frame so the canvas isn't blank on load
}

function draw() {
  const nowMs = performance.now();
  const dt = Math.min((nowMs - lastFrameMs) / 1000, 0.03); // clamp tab-switch stalls
  lastFrameMs = nowMs;

  simulation.update(dt);
  simulation.render(window, width, height);
}

function windowResized() {
  const holder = document.getElementById('canvas-holder');
  resizeCanvas(holder.clientWidth, holder.clientHeight);
  if (!simulation.isPlaying) redraw();
}

/* =========================================================================
   THERMODYNAMICS-SKETCH.JS — SP015 9.3(a–b).
   Global p5 lifecycle for the single Energy Transfers canvas.
   ========================================================================= */

let simulation;
let lastFrameMs;

function setup() {
  if (!SP015Runtime.requireDependencies(['p5', 'katex'])) return;
  const holder = document.getElementById('canvas-holder');
  const cnv = createCanvas(holder.clientWidth, holder.clientHeight);
  cnv.parent(holder);
  pixelDensity(2);
  frameRate(60);

  simulation = new SimulationController();
  lastFrameMs = performance.now();
  noLoop();
  redraw();
}

function draw() {
  const nowMs = performance.now();
  const dt = Math.min((nowMs - lastFrameMs) / 1000, LIMITS.playback.maxDt);
  lastFrameMs = nowMs;
  simulation.update(dt);
  simulation.render(window, width, height);
}

function windowResized() {
  const holder = document.getElementById('canvas-holder');
  resizeCanvas(holder.clientWidth, holder.clientHeight);
  if (!simulation.isPlaying) redraw();
}

/* Global p5 entry point: one canvas, so instance mode is unnecessary. */

let simulation;
let lastFrameMs;

function setup() {
  const holder = document.getElementById('canvas-holder');
  const canvas = createCanvas(holder.clientWidth, holder.clientHeight);
  canvas.parent(holder);
  pixelDensity(1);
  frameRate(60);
  simulation = new SimulationController();
  lastFrameMs = performance.now();
  noLoop();
  redraw();
}

function draw() {
  const nowMs = performance.now();
  const dt = Math.min((nowMs - lastFrameMs) / 1000, LIMITS.maxDt);
  lastFrameMs = nowMs;
  simulation.update(dt);
  simulation.render(window);
}

function windowResized() {
  const holder = document.getElementById('canvas-holder');
  resizeCanvas(holder.clientWidth, holder.clientHeight);
  if (!simulation.isPlaying) redraw();
}

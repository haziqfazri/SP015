/* Global-mode p5 entry point — one responsive canvas, SP015 9.1–9.2. */

let simulation;
let lastFrameMs;

function setup() {
  if (!SP015Runtime.requireDependencies(['p5', 'katex'])) return;
  const holder = document.getElementById('canvas-holder');
  const canvas = createCanvas(holder.clientWidth, holder.clientHeight);
  canvas.parent(holder);
  pixelDensity(displayDensity());
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

/* =========================================================================
   TEMPLATE-SKETCH.JS — <Topic Name> (SP0XX Topic X.X)

   p5.js entry point only: canvas lifecycle and the frame loop. No physics,
   no readout formatting — those live in the controller.

   Pick ONE of the two variants below and delete the other.
   ========================================================================= */

// -------------------------------------------------------------------------
// VARIANT A — GLOBAL MODE (single shared canvas; matches
// simple-harmonic-motion/oscillation-sketch.js and
// circular-motion/circular-motion-sketch.js). Use this unless the sim
// needs more than one canvas.
// -------------------------------------------------------------------------

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
  noLoop();  // sim starts paused; draw() only runs on explicit redraw()
  redraw();  // render one initial frame so the canvas isn't blank on load
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

// -------------------------------------------------------------------------
// VARIANT B — INSTANCE MODE (multiple independent/synced canvases; matches
// shm-graphs-analysis/shm-graphs-sim.js and
// shm-superposition/wave-superposition-sketch.js). Use this if the sim
// needs 2+ canvases that must stay in lockstep.
// -------------------------------------------------------------------------

// document.addEventListener('DOMContentLoaded', () => {
//   const simulation = new SimulationController();
//
//   const instance = new p5((p) => {
//     p.setup = () => {
//       const holder = document.getElementById('canvas-holder');
//       const cnv = p.createCanvas(holder.clientWidth, holder.clientHeight);
//       cnv.parent(holder);
//       p.pixelDensity(1);
//       p.noLoop(); // controller/ticker decides when to repaint
//       p.redraw();
//     };
//     p.windowResized = () => {
//       const holder = document.getElementById('canvas-holder');
//       p.resizeCanvas(holder.clientWidth, holder.clientHeight);
//       p.redraw();
//     };
//   });
//
//   let lastMs = performance.now();
//   function loop(nowMs) {
//     const dt = Math.min((nowMs - lastMs) / 1000, 0.03);
//     lastMs = nowMs;
//     simulation.update(dt);
//     instance.redraw();
//     requestAnimationFrame(loop);
//   }
//   requestAnimationFrame(loop);
// });

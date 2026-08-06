/* =========================================================================
   WAVE-SKETCH.JS — Properties of Waves (SP015 Topic 7.4)

   p5.js entry point: creates the two panels (main canvas + a Graphics
   buffer for the second panel), instantiates UIManager/SimulationController,
   and runs the per-frame update/draw loop. No physics, no readout
   formatting — those live in the controller; this file only owns canvas
   lifecycle and the frame loop.
   ========================================================================= */

let uiManager;
let controller;
let yxPanelWidth, yxPanelHeight;
let ytPanelWidth, ytPanelHeight;
let ytBuffer; // p5.Graphics for the second (y-t) panel
let lastFrameMs;

function setup() {
  const yxHolder = document.getElementById('canvas-holder-yx');
  const ytHolder = document.getElementById('canvas-holder-yt');

  yxPanelWidth = yxHolder.clientWidth;
  yxPanelHeight = yxHolder.clientHeight;
  ytPanelWidth = ytHolder.clientWidth;
  ytPanelHeight = ytHolder.clientHeight;

  // Main canvas -> y-x panel, parented into its own holder (global mode).
  const mainCanvas = createCanvas(yxPanelWidth, yxPanelHeight);
  mainCanvas.parent(yxHolder);

  // Second panel is a Graphics buffer with its own <canvas> element,
  // manually placed into the y-t holder — see wave-renderer.js header for
  // why this sim uses two canvases instead of one.
  ytBuffer = createGraphics(ytPanelWidth, ytPanelHeight);
  ytBuffer.canvas.style.display = 'block';
  ytBuffer.canvas.style.width = '100%';
  ytBuffer.canvas.style.height = '100%';
  ytHolder.appendChild(ytBuffer.canvas);

  uiManager = new UIManager();
  controller = new SimulationController(uiManager);

  lastFrameMs = performance.now();
  frameRate(60);
}

function draw() {
  const nowMs = performance.now();
  const dt = Math.min((nowMs - lastFrameMs) / 1000, 1 / 30); // clamp to avoid huge jumps after tab-switch
  lastFrameMs = nowMs;

  controller.update(dt);

  drawWaveformPanel(window, controller, yxPanelWidth, yxPanelHeight);
  drawHistoryPanel(ytBuffer, controller, ytPanelWidth, ytPanelHeight);
}

// Keep both panels sized to their holders if the window/layout changes
// (e.g. resizing below the 800px/460px CSS breakpoints).
function windowResized() {
  const yxHolder = document.getElementById('canvas-holder-yx');
  const ytHolder = document.getElementById('canvas-holder-yt');

  yxPanelWidth = yxHolder.clientWidth;
  yxPanelHeight = yxHolder.clientHeight;
  resizeCanvas(yxPanelWidth, yxPanelHeight);

  ytPanelWidth = ytHolder.clientWidth;
  ytPanelHeight = ytHolder.clientHeight;
  ytBuffer.resizeCanvas(ytPanelWidth, ytPanelHeight);
}
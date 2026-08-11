/* =========================================================================
   WAVE-SUPERPOSITION-RENDERER.JS — Topic 7.5, SP015.
   Stateless drawing functions only. No physics, no DOM access beyond the
   p5 instance passed in. Load after physics.js, before controller.js.
   ========================================================================= */

const DISPLAY = {
  graphPadding: { left: 40, right: 20, top: 34, bottom: 30 }, // px
  yHeadroom: 0.7,        // m — plot half-height maps to this
  sampleCount: 240,      // points swept when drawing a curve
};

// Domain metre-position -> canvas x pixel.
function xToPx(x, plotX, plotW) {
  return plotX + ((x - DOMAIN.xMin) / (DOMAIN.xMax - DOMAIN.xMin)) * plotW;
}

// Displacement (m) -> canvas y pixel, centred on centerY.
function yToPx(y, centerY, plotH) {
  return centerY - (y / DISPLAY.yHeadroom) * (plotH / 2);
}

function drawAxis(p, plotX, plotY, plotW, plotH, centerY) {
  p.push();
  p.stroke(PALETTE.line);
  p.strokeWeight(1);
  p.line(plotX, centerY, plotX + plotW, centerY); // equilibrium line
  p.pop();

  // Tick marks only — no numeric labels (removed per Fazri's request).
  p.push();
  p.stroke(PALETTE.line);
  p.strokeWeight(1);
  p.noFill();
  for (let x = DOMAIN.xMin; x <= DOMAIN.xMax; x += 1) {
    const px = xToPx(x, plotX, plotW);
    p.line(px, centerY - 4, px, centerY + 4);
  }
  p.pop();
}

// Draws one curve by sampling valueFn(x); t is already baked into valueFn.
function drawCurve(p, valueFn, colorVal, plotX, plotY, plotW, plotH, centerY, weight = 2.5) {
  p.push();
  p.noFill();
  p.stroke(colorVal);
  p.strokeWeight(weight);
  p.beginShape();
  const steps = DISPLAY.sampleCount;
  for (let i = 0; i <= steps; i++) {
    const x = DOMAIN.xMin + ((DOMAIN.xMax - DOMAIN.xMin) * i) / steps;
    const y = valueFn(x);
    p.vertex(xToPx(x, plotX, plotW), yToPx(y, centerY, plotH));
  }
  p.endShape();
  p.pop();
}

// -------------------------------------------------------------------------
// Pulse Superposition — single-canvas scene
// -------------------------------------------------------------------------

function drawPulseScene(p, controller) {
  const pad = DISPLAY.graphPadding;
  const plotX = pad.left;
  const plotY = pad.top;
  const plotW = p.width - pad.left - pad.right;
  const plotH = p.height - pad.top - pad.bottom;
  const centerY = plotY + plotH / 2;

  drawAxis(p, plotX, plotY, plotW, plotH, centerY);

  const { t, superposition } = controller;
  const visibility = controller.ui.curveVisibility();

  if (visibility.waveA) {
    drawCurve(p, (x) => superposition.waveA.valueAt(x, t), PALETTE.orange, plotX, plotY, plotW, plotH, centerY, 2);
  }
  if (visibility.waveB) {
    drawCurve(p, (x) => superposition.waveB.valueAt(x, t), PALETTE.teal, plotX, plotY, plotW, plotH, centerY, 2);
  }
  if (visibility.resultant) {
    drawCurve(p, (x) => superposition.resultantAt(x, t), PALETTE.ink, plotX, plotY, plotW, plotH, centerY, 3);
  }
}

// -------------------------------------------------------------------------
// Interference — three separate canvases (Wave A / Wave B / Resultant)
// -------------------------------------------------------------------------

function drawWavePanel(p, valueFn, colorVal, weight = 2.5) {
  const pad = DISPLAY.graphPadding;
  const plotX = pad.left;
  const plotY = pad.top;
  const plotW = p.width - pad.left - pad.right;
  const plotH = p.height - pad.top - pad.bottom;
  const centerY = plotY + plotH / 2;

  drawAxis(p, plotX, plotY, plotW, plotH, centerY);
  drawCurve(p, valueFn, colorVal, plotX, plotY, plotW, plotH, centerY, weight);
}

function drawInterferenceWaveA(p, controller) {
  const { interferenceT, interference } = controller;
  p.background(PALETTE.panel);
  drawWavePanel(p, (x) => interference.waveA.valueAt(x, interferenceT), PALETTE.orange);
}

function drawInterferenceWaveB(p, controller) {
  const { interferenceT, interference } = controller;
  p.background(PALETTE.panel);
  drawWavePanel(p, (x) => interference.waveB.valueAt(x, interferenceT), PALETTE.teal);
}

function drawInterferenceResultant(p, controller) {
  const { interferenceT, interference } = controller;
  p.background(PALETTE.panel);
  drawWavePanel(p, (x) => interference.resultantAt(x, interferenceT), PALETTE.ink, 3);
}
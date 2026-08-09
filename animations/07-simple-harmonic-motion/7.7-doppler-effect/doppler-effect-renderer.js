/* =========================================================================
   DOPPLER-EFFECT-RENDERER.JS — Topic 7.7, SP015.
   Stateless drawing functions only. No physics, no DOM access beyond the
   p5 instance passed in. Load after physics.js, before controller.js.
   ========================================================================= */

const DISPLAY = {
  graphPadding: { left: 30, right: 30, top: 34, bottom: 34 }, // px
  wavefrontMaxRadius: 50, // m — cutoff beyond which a ring is no longer drawn
  bodyRadius: 9,          // px — drawn body marker radius
};

// Domain metre-position -> canvas x pixel.
function xToPx(x, plotX, plotW) {
  return plotX + ((x - DOMAIN.xMin) / (DOMAIN.xMax - DOMAIN.xMin)) * plotW;
}

function pxPerMetre(plotW) {
  return plotW / (DOMAIN.xMax - DOMAIN.xMin);
}

function drawMotionLine(p, plotX, plotW, centerY) {
  p.push();
  p.stroke('#c9d2c7'); // --line
  p.strokeWeight(1);
  p.line(plotX, centerY, plotX + plotW, centerY);
  p.pop();
}

// Concentric rings, older/larger rings fading toward the visibility
// cutoff so the compression pattern reads clearly without a hard pop.
function drawWavefronts(p, controller, plotX, plotW, centerY) {
  const scale = pxPerMetre(plotW);
  const fronts = controller.doppler.wavefronts(controller.t);

  p.push();
  p.noFill();
  fronts.forEach(({ emitTime, emitX }) => {
    const radiusM = PHYSICS.wavefrontVisualSpeed * (controller.t - emitTime);
    if (radiusM <= 0 || radiusM > DISPLAY.wavefrontMaxRadius) return;

    const alpha = 1 - radiusM / DISPLAY.wavefrontMaxRadius;
    p.stroke(53, 185, 173, alpha * 200); // --teal, fading
    p.strokeWeight(1.5);
    p.circle(xToPx(emitX, plotX, plotW), centerY, radiusM * scale * 2);
  });
  p.pop();
}

// One labelled body marker (Source or Observer) at a given metre position.
function drawBodyMarker(p, x, plotX, plotW, centerY, colorVal, label) {
  const px = xToPx(x, plotX, plotW);

  p.push();
  p.noStroke();
  p.fill(colorVal);
  p.circle(px, centerY, DISPLAY.bodyRadius * 2);
  p.pop();

  p.push();
  p.fill('#102126'); // --ink
  p.noStroke();
  p.textAlign(p.CENTER, p.BOTTOM);
  p.textSize(11);
  p.text(label, px, centerY - DISPLAY.bodyRadius - 6);
  p.pop();
}

// Velocity arrow on the moving body only — reuses the shared, context-
// explicit drawArrowCtx from sim-utils.js rather than a local copy.
function drawVelocityArrow(p, x, velocity, plotX, plotW, centerY) {
  if (velocity === 0) return;

  const px = xToPx(x, plotX, plotW);
  const len = normalizedArrowLength(Math.abs(velocity), LIMITS.moverSpeedMin, LIMITS.moverSpeedMax, 22, 60);
  const dir = Math.sign(velocity);
  const tipX = px + dir * len;
  const y = centerY + DISPLAY.bodyRadius + 14;

  drawArrowCtx(p, px, y, tipX, y, '#ff6b35', 3); // --orange
}

// Approaching / Receding / Passing label, drawn near the moving body.
// controller.statusText is computed once per readout refresh (see
// controller.js's _approachStatus) — the renderer only formats/places it,
// no physics logic of its own.
function drawStatusLabel(p, x, plotX, plotW, centerY, text) {
  if (text === '—') return;
  const px = xToPx(x, plotX, plotW);

  p.push();
  p.fill('#617075'); // --muted
  p.noStroke();
  p.textAlign(p.CENTER, p.TOP);
  p.textSize(11);
  p.text(text, px, centerY + DISPLAY.bodyRadius + 30);
  p.pop();
}

// -------------------------------------------------------------------------
// Main scene
// -------------------------------------------------------------------------

function drawDopplerScene(p, controller) {
  const pad = DISPLAY.graphPadding;
  const plotX = pad.left;
  const plotY = pad.top;
  const plotW = p.width - pad.left - pad.right;
  const plotH = p.height - pad.top - pad.bottom;
  const centerY = plotY + plotH / 2;

  p.background(248, 250, 246); // --panel

  drawMotionLine(p, plotX, plotW, centerY);
  drawWavefronts(p, controller, plotX, plotW, centerY);

  const { doppler, t } = controller;
  const sourceX = doppler.sourcePositionAt(t);
  const observerX = doppler.observerPositionAt(t);

  drawBodyMarker(p, sourceX, plotX, plotW, centerY, '#ff6b35', 'SOURCE');   // --orange
  drawBodyMarker(p, observerX, plotX, plotW, centerY, '#35b9ad', 'OBSERVER'); // --teal

  const moverX = doppler.moverPositionAt(t);
  drawVelocityArrow(p, moverX, doppler.moverSpeed(), plotX, plotW, centerY);
  drawStatusLabel(p, moverX, plotX, plotW, centerY, controller.statusText);
}

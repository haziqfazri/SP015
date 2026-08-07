/* =========================================================================
   STANDING-WAVES-RENDERER.JS — Topic 7.6, SP015.
   Stateless drawing functions only. No physics, no DOM access. Uses p5
   GLOBAL mode (bare stroke()/fill()/etc. calls) — this sim is a single
   canvas, matching the global-mode convention used by 05-circular-motion
   and 7.1-kinematics-of-shm (architecture.md §4), not the instance-mode
   multi-canvas pattern used by 7.4/7.5. Load after physics.js, before
   controller.js.
   ========================================================================= */

const DISPLAY = {
  graphPadding: { left: 40, right: 30, top: 40, bottom: 40 }, // px
  wallThickness: 10,       // px — gap between a pipe's inner and outer wall edge
  amplitudeMargin: 2,     // px — extra space above/below the animated curve to avoid clipping
  sampleCount: 200,         // points swept when drawing the curve
  nodeRadius: 6,            // px
  antinodeRadius: 6,        // px
  axisColor: '#c9d2c7',
  envelopeColor: [16, 33, 38, 46],   // rgba-ish array for the faint static envelope guide
  curveColor: '#ff6b35',
  nodeColor: '#102126',
  antinodeColor: '#35b9ad',
};

// Domain metre-position -> canvas x pixel.
function xToPx(x, length, plotX, plotW) {
  return plotX + (x / length) * plotW;
}

// Envelope value (-1..1) -> canvas y pixel, centred on centerY.
function yToPx(value, centerY, ampPx) {
  return centerY - value * ampPx;
}

function drawAxis(plotX, plotY, plotW, plotH, centerY) {
  push();
  stroke(DISPLAY.axisColor);
  strokeWeight(1);
  line(plotX, centerY, plotX + plotW, centerY);          // equilibrium line
  pop();
}

// Curve amplitude scales to fill the space between the two inner pipe
// walls (or the canvas edges for the string), so peaks/troughs visually
// touch the boundary — this is a DISPLAY-only scale, still not a
// physical displacement magnitude (this LO doesn't require one).
function computeAmplitude(plotH) {
  return plotH / 2 - DISPLAY.amplitudeMargin;
}

// Horizontal top/bottom pipe walls, each drawn as an outer+inner edge to
// show wall thickness — this is the column's side profile, so the walls
// run the full length between the two ends. Skipped for the string mode,
// which has no physical tube (its ends are fixed pins, drawn separately).
function drawPipeWalls(mode, plotX, plotY, plotW, plotH) {
  if (mode === 'string') return;

  const wt = DISPLAY.wallThickness;
  push();
  stroke(DISPLAY.axisColor);
  strokeWeight(1);

  // Top wall: outer edge above plotY, inner edge at plotY
  line(plotX, plotY - wt, plotX + plotW, plotY - wt);
  line(plotX, plotY, plotX + plotW, plotY);

  // Bottom wall: inner edge at plotY+plotH, outer edge below it
  line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
  line(plotX, plotY + plotH + wt, plotX + plotW, plotY + plotH + wt);

  pop();
}

// Vertical end treatment. String: always a simple fixed-end line at both
// ends. Air columns: a closed end gets a solid vertical cap sealing the
// pipe's mouth (with wall thickness); an open end gets nothing — the
// pipe walls simply stop, which is what makes it read as open.
function drawEndCap(mode, side, x, plotY, plotH) {
  if (mode === 'string') {
    push();
    stroke(DISPLAY.axisColor);
    strokeWeight(1);
    line(x, plotY, x, plotY + plotH);
    pop();
    return;
  }

  const isClosedEnd = mode === 'closed' && side === 'left';
  if (!isClosedEnd) return; // open end: no cap drawn

  const wt = DISPLAY.wallThickness;
  const capX = side === 'left' ? x - wt : x;
  push();
  stroke(DISPLAY.axisColor);
  strokeWeight(1);
  noFill();
  rect(capX, plotY - wt, wt, plotH + wt * 2);
  fill(DISPLAY.axisColor);
  noStroke();
  rect(capX, plotY - wt, wt, plotH + wt * 2); // solid fill seals the closed end
  pop();
}

// Small local curve-sweep helper — samples valueFn(x) across the domain
// and strokes it. Not shared/sim-utils.js's drawDashedGuide, which draws
// a single straight segment, not a swept curve.
function drawCurve(valueFn, length, plotX, plotW, centerY, ampPx, dashed) {
  if (dashed) drawingContext.setLineDash([4, 5]);
  beginShape();
  const steps = DISPLAY.sampleCount;
  for (let i = 0; i <= steps; i++) {
    const x = (length * i) / steps;
    const y = valueFn(x);
    vertex(xToPx(x, length, plotX, plotW), yToPx(y, centerY, ampPx));
  }
  endShape();
  if (dashed) drawingContext.setLineDash([]);
}

// Faint dashed max-envelope (+-1 * envelopeAt(x)) so the standing wave's
// shape reads even while paused, without implying motion.
function drawStaticEnvelope(object, length, plotX, plotW, centerY, amp) {
  push();
  noFill();
  stroke(...DISPLAY.envelopeColor);
  strokeWeight(1.5);
  drawCurve((x) => object.envelopeAt(x), length, plotX, plotW, centerY, amp, true);
  drawCurve((x) => -object.envelopeAt(x), length, plotX, plotW, centerY, amp, true);
  pop();
}

// The animated displacement curve, y(x,t) = A * envelope(x) * cos(wt),
// normalized back to -1..1 for yToPx since DISPLAY.amplitude is baked
// into displacementAt() already.
function drawAnimatedCurve(object, t, length, plotX, plotW, centerY, amp) {
  push();
  noFill();
  stroke(DISPLAY.curveColor);
  strokeWeight(3);
  drawCurve(
    (x) => object.displacementAt(x, t, amp) / amp,
    length, plotX, plotW, centerY, amp, false
  );
  pop();
}

// Node/antinode markers + labels — only drawn while playing (per Fazri:
// a paused frame can land near a zero-crossing of cos(wt), where the
// animated curve is flat everywhere and a frozen antinode marker would
// mislabel itself as a node). Positions come straight from the physics
// layer's nodePositions()/antinodePositions(), never re-derived here.
function drawExtremaMarkers(object, length, plotX, plotW, centerY, amp) {
  push();
  noStroke();
  textSize(10);
  textAlign(CENTER, TOP);

  fill(DISPLAY.nodeColor);
  object.nodePositions().forEach((x) => {
    const px = xToPx(x, length, plotX, plotW);
    circle(px, centerY, DISPLAY.nodeRadius * 2);
    text('N', px, centerY + DISPLAY.nodeRadius + 4);
  });

  fill(DISPLAY.antinodeColor);
  object.antinodePositions().forEach((x) => {
    const px = xToPx(x, length, plotX, plotW);
    circle(px, centerY - amp, DISPLAY.antinodeRadius * 2);
    circle(px, centerY + amp, DISPLAY.antinodeRadius * 2);
    text('A', px, centerY - amp - DISPLAY.antinodeRadius - 14);
    text('A', px, centerY + amp + DISPLAY.antinodeRadius + 4);
  });

  pop();
}
function drawBoundaryLabels(mode, plotX, plotY, plotW) {
  push();
  noStroke();
  fill('#617075');
  textSize(11);
  textAlign(LEFT, BOTTOM);
  const leftLabel = mode === 'closed' ? 'CLOSED END' : (mode === 'open' ? 'OPEN END' : 'FIXED END');
  const rightLabel = mode === 'string' ? 'FIXED END' : 'OPEN END';
  text(leftLabel, plotX, plotY - 8);
  textAlign(RIGHT, BOTTOM);
  text(rightLabel, plotX + plotW, plotY - 8);
  pop();
}

// Main scene draw — called once per frame by the controller with the
// currently-active physics object and mode name. Bare global-mode calls
// (background(), width, height) throughout, matching 05-circular-motion.
function drawStandingWaveScene(controller) {
  const pad = DISPLAY.graphPadding;
  const plotX = pad.left;
  const plotY = pad.top;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const amp = computeAmplitude(plotH);
  const centerY = plotY + plotH / 2;

  const object = controller.activeObject();
  const length = object.length;

  background(248, 250, 246);
  drawAxis(plotX, plotY, plotW, plotH, centerY);
  drawPipeWalls(controller.mode, plotX, plotY, plotW, plotH);
  drawEndCap(controller.mode, 'left', plotX, plotY, plotH);
  drawEndCap(controller.mode, 'right', plotX + plotW, plotY, plotH);
  drawBoundaryLabels(controller.mode, plotX, plotY, plotW);
  drawStaticEnvelope(object, length, plotX, plotW, centerY, amp);
  drawAnimatedCurve(object, controller.t, length, plotX, plotW, centerY, amp);

  if (controller.isPlaying) {
    drawExtremaMarkers(object, length, plotX, plotW, centerY, amp);
  }
}

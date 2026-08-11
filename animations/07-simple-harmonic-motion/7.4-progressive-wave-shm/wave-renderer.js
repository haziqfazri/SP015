/* =========================================================================
   WAVE-RENDERER.JS — Properties of Waves (SP015 Topic 7.4)

   Drawing only. Every function takes an explicit rendering context `ctx`
   (either the global p5 instance — pass `window`, per sim-utils.js's own
   convention — or a p5.Graphics buffer) plus plain numbers/positions
   already computed elsewhere. No physics maths beyond unit->pixel mapping,
   no DOM access.

   NOTE on shared helpers: drawDashedGuide() and drawTrailDots() from
   sim-utils.js already take a ctx param, so they're reused directly here.
   VectorArrow / drawArrowhead() are NOT reused — they call bare global p5
   functions (push/stroke/line with no ctx), which only works against the
   implicit global-mode instance. This sim draws its y-t panel into a
   p5.Graphics buffer (a second on-screen canvas), so the arrow helper
   below takes ctx explicitly instead. Everything else in sim-utils.js is
   used unmodified.
   ========================================================================= */

const COLORS = {
  waveLine: PALETTE.ink,   // --ink
  particle: PALETTE.orange,   // --orange
  referenceParticle: PALETTE.teal, // --teal
  vyArrow: PALETTE.teal,
  propagationArrow: PALETTE.orange, // --orange — deliberately different from vyArrow's
                               // teal, so wave velocity (horizontal) and particle
                               // velocity (vertical) never look like the same kind
                               // of vector at a glance
  guide: PALETTE.muted,       // --muted
  axis: PALETTE.line         // --line
};

// -------------------------------------------------------------------------
// Axis layout — reserved margins so tick marks/labels have room outside
// the plotting area itself. Style (short ticks, mono labels, quantity
// label top-left / unit label bottom-right) follows the same convention
// already used by shm-graphs-sim.js's drawTimeSeriesGraph(), for
// consistency across the whole project's sims.
// -------------------------------------------------------------------------
const AXIS = {
  color: PALETTE.muted,   // --muted
  tickLength: 5,
  tickCountX: 7,       // fixed count, per project decision — not interval-based
  font: 'Space Mono',
  tickTextSize: 9,
  titleTextSize: 10
};

// Reserved margins per panel. yx panel's top margin is taller to make
// room for the propagation arrow + its label; yt panel doesn't need that.
const PADDING = {
  yx: { left: 34, right: 12, top: 34, bottom: 20 },
  yt: { left: 34, right: 12, top: 14, bottom: 20 }
};

// -------------------------------------------------------------------------
// Coordinate mapping (physics metres/seconds -> pixels), now relative to
// a plot rectangle (plotX, plotY, plotW, plotH) rather than the whole
// panel, so axis margins have room outside it.
// -------------------------------------------------------------------------

// x in [0, visibleWidthM] -> pixel column within the plot rectangle.
function mapXToPixel(xMetres, visibleWidthM, plotX, plotW) {
  return plotX + (xMetres / visibleWidthM) * plotW;
}

// y displacement (signed, metres) -> pixel row, with y=0 at the plot
// rectangle's vertical centre and +y drawn upward (screen y grows
// downward, hence the negation).
function mapYToPixel(yMetres, plotCenterY, pxPerMetreY) {
  return plotCenterY - yMetres * pxPerMetreY;
}

// -------------------------------------------------------------------------
// Axis ticks/labels — generic, reused by both panels.
// xTicks / yTicks: arrays of { px|py, label }. Only short tick marks (no
// full gridlines) per project decision — the existing ±A dashed guides
// already provide gridline-style reference, so ticks stay minimal.
// -------------------------------------------------------------------------
function drawAxes(ctx, plotX, plotY, plotW, plotH, xTicks, yTicks, xAxisTitle, yAxisTitle) {
  // Axis lines (left edge = y-axis, bottom edge = x-axis)
  ctx.push();
  ctx.stroke(COLORS.axis);
  ctx.strokeWeight(1);
  ctx.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
  ctx.line(plotX, plotY, plotX, plotY + plotH);
  ctx.pop();

  // X-axis ticks + labels
  ctx.push();
  ctx.stroke(AXIS.color);
  ctx.strokeWeight(1);
  xTicks.forEach((t) => ctx.line(t.px, plotY + plotH, t.px, plotY + plotH + AXIS.tickLength));
  ctx.pop();

  ctx.push();
  ctx.noStroke();
  ctx.fill(AXIS.color);
  ctx.textFont(AXIS.font);
  ctx.textSize(AXIS.tickTextSize);
  ctx.textAlign(ctx.CENTER, ctx.TOP);
  xTicks.forEach((t) => ctx.text(t.label, t.px, plotY + plotH + AXIS.tickLength + 2));
  ctx.pop();

  // Y-axis ticks + labels
  ctx.push();
  ctx.stroke(AXIS.color);
  ctx.strokeWeight(1);
  yTicks.forEach((t) => ctx.line(plotX - AXIS.tickLength, t.py, plotX, t.py));
  ctx.pop();

  ctx.push();
  ctx.noStroke();
  ctx.fill(AXIS.color);
  ctx.textFont(AXIS.font);
  ctx.textSize(AXIS.tickTextSize);
  ctx.textAlign(ctx.RIGHT, ctx.CENTER);
  yTicks.forEach((t) => ctx.text(t.label, plotX - AXIS.tickLength - 3, t.py));
  ctx.pop();

  // Axis titles — quantity label top-left (above plot), unit label
  // bottom-right (below ticks), matching shm-graphs-sim.js's convention.
  ctx.push();
  ctx.noStroke();
  ctx.fill(COLORS.waveLine);
  ctx.textFont(AXIS.font);
  ctx.textStyle(ctx.BOLD);
  ctx.textSize(AXIS.titleTextSize);
  ctx.textAlign(ctx.LEFT, ctx.BOTTOM);
  ctx.text(yAxisTitle, plotX, plotY - 2);
  ctx.textAlign(ctx.RIGHT, ctx.TOP);
  ctx.text(xAxisTitle, plotX + plotW, plotY + plotH + AXIS.tickLength + 2);
  ctx.pop();
}

// Builds x-axis ticks at a fixed count, evenly spaced across [0, maxValue].
function buildFixedCountTicks(count, maxValue, mapToPx, decimals = 0) {
  const ticks = [];
  for (let i = 0; i < count; i++) {
    const value = (maxValue / (count - 1)) * i;
    ticks.push({ px: mapToPx(value), label: value.toFixed(decimals) });
  }
  return ticks;
}

// -------------------------------------------------------------------------
// Wave propagation direction arrow (y-x panel only)
// -------------------------------------------------------------------------
// Always visible (no toggle) — this is the horizontal counterpart to the
// reference particle's vertical vy arrow, and the pairing is the whole
// point: wave speed (horizontal, pattern-level) vs. particle velocity
// (vertical, per-particle) should be visually distinguishable at a glance,
// not just described in the theory strip. Fixed length regardless of
// waveSpeed — its job is to show direction only; magnitude is already a
// numeric readout.
const PROPAGATION_ARROW = {
  length: 46,     // px, fixed — not scaled to waveSpeed
  y: 25,          // px from panel top
  rightMargin: 35, // px from panel's right edge to the arrow's rightmost point
  weight: 4,
  labelOffsetY: -10
};

function drawPropagationArrow(ctx, controller, panelWidthPx) {
  const direction = controller.state.direction; // +1 or -1
  const half = PROPAGATION_ARROW.length / 2;
  const arrowY = PROPAGATION_ARROW.y;

  // Anchored to the panel's right edge instead of centred — cx is now the
  // midpoint of the arrow's footprint, positioned so its rightmost point
  // sits rightMargin px from the panel edge regardless of direction.
  const cx = panelWidthPx - PROPAGATION_ARROW.rightMargin - half;

  // Tail is always the end further back along the direction of travel,
  // so the head consistently points the way the wave is moving.
  const x0 = cx - direction * half;
  const x1 = cx + direction * half;

  drawArrowCtx(ctx, x0, arrowY, x1, arrowY, COLORS.propagationArrow, PROPAGATION_ARROW.weight);

  ctx.push();
  ctx.noStroke();
  ctx.fill(COLORS.propagationArrow);
  ctx.textFont('Space Mono');
  ctx.textSize(10);
  ctx.textAlign(ctx.CENTER, ctx.CENTER);
  ctx.text('wave motion', cx, arrowY + PROPAGATION_ARROW.labelOffsetY);
  ctx.pop();
}

// -------------------------------------------------------------------------
// Panel 1: y-x snapshot
// -------------------------------------------------------------------------

function drawWaveformPanel(ctx, controller, panelWidthPx, panelHeightPx) {
  const { state } = controller;
  const visibleWidthM = DISPLAY.visibleWidthM;
  const pad = PADDING.yx;

  const plotX = pad.left;
  const plotY = pad.top;
  const plotW = panelWidthPx - pad.left - pad.right;
  const plotH = panelHeightPx - pad.top - pad.bottom;
  const centerY = plotY + plotH / 2;

  ctx.background(PALETTE.panel); // --panel, matches .canvas-shell background

  // Centreline (y = 0)
  ctx.push();
  ctx.stroke(COLORS.axis);
  ctx.strokeWeight(1);
  ctx.line(plotX, centerY, plotX + plotW, centerY);
  ctx.pop();

  // Amplitude guides — dashed lines at +A and -A, only when toggled on.
  if (controller.showGuides) {
    const yTop = mapYToPixel(state.amplitude, centerY, DISPLAY.pxPerMetreY);
    const yBottom = mapYToPixel(-state.amplitude, centerY, DISPLAY.pxPerMetreY);
    drawDashedGuide(ctx, plotX, yTop, plotX + plotW, yTop, COLORS.guide, 1);
    drawDashedGuide(ctx, plotX, yBottom, plotX + plotW, yBottom, COLORS.guide, 1);
  }

  // Waveform curve, sampled at pixel resolution across the plot area.
  ctx.push();
  ctx.noFill();
  ctx.stroke(COLORS.waveLine);
  ctx.strokeWeight(2.5);
  ctx.beginShape();
  for (let pxOffset = 0; pxOffset <= plotW; pxOffset += 2) {
    const xM = (pxOffset / plotW) * visibleWidthM;
    const yM = state.displacementAt(xM);
    ctx.vertex(plotX + pxOffset, mapYToPixel(yM, centerY, DISPLAY.pxPerMetreY));
  }
  ctx.endShape();
  ctx.pop();

  // Particle markers, evenly spaced, only when toggled on.
  if (controller.showParticles) {
    const positions = controller.particlePositions;
    const refIdx = controller.referenceParticleIdx;

    positions.forEach((xM, idx) => {
      const yM = state.displacementAt(xM);
      const px = mapXToPixel(xM, visibleWidthM, plotX, plotW);
      const py = mapYToPixel(yM, centerY, DISPLAY.pxPerMetreY);
      const isReference = idx === refIdx;

      ctx.push();
      ctx.noStroke();
      ctx.fill(isReference ? COLORS.referenceParticle : COLORS.particle);
      ctx.circle(px, py, isReference ? 12 : 8);
      ctx.pop();

      // vy arrow only on the reference particle, only when toggled on.
      if (isReference && controller.showVyArrow) {
        const vy = state.particleVelocityAt(xM);
        // Arrow length scaled for visibility, not literal pixels-per-(m/s)
        // — this is a display-only vector, distinct from the pxPerMetreX/Y
        // used for position, so it's built from the shared helper's
        // generic magnitude->length mapping.
        const arrowLen = normalizedArrowLength(Math.abs(vy), 0, state.amplitude * state.angularFrequency, 20, 60);
        const dirSign = vy >= 0 ? -1 : 1; // screen-y is flipped vs. physics-y
        drawArrowCtx(ctx, px, py, px, py + dirSign * arrowLen, COLORS.vyArrow, 3);
      }
    });
  }

  // Axis ticks/labels — x in metres at a fixed count (7: 0..visibleWidthM),
  // y at -A/0/+A (reusing the amplitude guides' values as tick positions).
  const xTicks = buildFixedCountTicks(
    AXIS.tickCountX,
    visibleWidthM,
    (value) => mapXToPixel(value, visibleWidthM, plotX, plotW),
    1
  );
  const yTicks = [
    { py: mapYToPixel(state.amplitude, centerY, DISPLAY.pxPerMetreY), label: `+${state.amplitude.toFixed(2)}` },
    { py: centerY, label: '0' },
    { py: mapYToPixel(-state.amplitude, centerY, DISPLAY.pxPerMetreY), label: `-${state.amplitude.toFixed(2)}` }
  ];
  drawAxes(ctx, plotX, plotY, plotW, plotH, xTicks, yTicks, 'x (m)', 'y (m)');

  // Always-on direction indicator — see drawPropagationArrow() header for
  // why this one has no visibility toggle. Drawn last so it stays on top;
  // sits within the panel's top margin (pad.top), above the plot area.
  drawPropagationArrow(ctx, controller, panelWidthPx);
}

// -------------------------------------------------------------------------
// Panel 2: y-t trace of the reference particle
// -------------------------------------------------------------------------

function drawHistoryPanel(ctx, controller, panelWidthPx, panelHeightPx) {
  const { state, yHistory, yHistoryMaxLength } = controller;
  const pad = PADDING.yt;

  const plotX = pad.left;
  const plotY = pad.top;
  const plotW = panelWidthPx - pad.left - pad.right;
  const plotH = panelHeightPx - pad.top - pad.bottom;
  const centerY = plotY + plotH / 2;

  ctx.background(PALETTE.panel);

  // Centreline
  ctx.push();
  ctx.stroke(COLORS.axis);
  ctx.strokeWeight(1);
  ctx.line(plotX, centerY, plotX + plotW, centerY);
  ctx.pop();

  if (controller.showGuides) {
    const yTop = mapYToPixel(state.amplitude, centerY, DISPLAY.pxPerMetreY);
    const yBottom = mapYToPixel(-state.amplitude, centerY, DISPLAY.pxPerMetreY);
    drawDashedGuide(ctx, plotX, yTop, plotX + plotW, yTop, COLORS.guide, 1);
    drawDashedGuide(ctx, plotX, yBottom, plotX + plotW, yBottom, COLORS.guide, 1);
  }

  // y-axis ticks are always drawable (don't depend on history existing).
  const yTicks = [
    { py: mapYToPixel(state.amplitude, centerY, DISPLAY.pxPerMetreY), label: `+${state.amplitude.toFixed(2)}` },
    { py: centerY, label: '0' },
    { py: mapYToPixel(-state.amplitude, centerY, DISPLAY.pxPerMetreY), label: `-${state.amplitude.toFixed(2)}` }
  ];

  if (yHistory.length < 2) {
    // Still draw axes even before enough history exists to plot a curve.
    drawAxes(ctx, plotX, plotY, plotW, plotH, [], yTicks, 't (s)', 'y (m)');
    return;
  }

  const bufferIndexToPx = (idx) => plotX + (idx / (yHistoryMaxLength - 1)) * plotW;

  // Most recent sample plotted at the right edge; older samples scroll
  // left, so the trace reads left-to-right as "past -> now" like a
  // conventional strip-chart recorder.
  ctx.push();
  ctx.noFill();
  ctx.stroke(COLORS.referenceParticle);
  ctx.strokeWeight(2.5);
  ctx.beginShape();
  yHistory.forEach((sample, idx) => {
    const px = bufferIndexToPx(idx);
    const py = mapYToPixel(sample.y, centerY, DISPLAY.pxPerMetreY);
    ctx.vertex(px, py);
  });
  ctx.endShape();
  ctx.pop();

  // Marker at the current (rightmost-plotted) sample.
  const last = yHistory[yHistory.length - 1];
  const lastPx = bufferIndexToPx(yHistory.length - 1);
  const lastPy = mapYToPixel(last.y, centerY, DISPLAY.pxPerMetreY);
  ctx.push();
  ctx.noStroke();
  ctx.fill(COLORS.referenceParticle);
  ctx.circle(lastPx, lastPy, 10);
  ctx.pop();

  // x-axis ticks — fixed count across the currently-filled portion of the
  // buffer, each labeled with the actual elapsed time of the nearest
  // sample (buffer position isn't perfectly time-linear if frame dt
  // varies, but this keeps ticks consistent with how the curve itself is
  // plotted, which is index-based).
  const xTicks = [];
  for (let i = 0; i < AXIS.tickCountX; i++) {
    const frac = i / (AXIS.tickCountX - 1);
    const idx = Math.round(frac * (yHistory.length - 1));
    const sample = yHistory[idx];
    xTicks.push({ px: bufferIndexToPx(idx), label: sample.t.toFixed(1) });
  }

  drawAxes(ctx, plotX, plotY, plotW, plotH, xTicks, yTicks, 't (s)', 'y (m)');
}
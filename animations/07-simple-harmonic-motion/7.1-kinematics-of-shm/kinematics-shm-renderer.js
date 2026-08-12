const VELOCITY_PX_PER_MS = 100;   // px per (m/s) — direct scale, no normalization
const ACCEL_PX_PER_MS2 = 10;    // px per (m/s²) — direct scale, no normalization
const FORCE_PX_PER_N = 6;     // px per newton — direct scale, no normalization

// =========================================================================
// drawSinusoidColumn — scrolling y-vs-t trace for the Reference Circle tab.
// Draws within the sub-rectangle (x0, y0, w, h) so it can later sit as one
// of three columns in a shared canvas.
// =========================================================================

function drawSinusoidColumn(p5ctx, phase, A, history, x0, y0, w, h, centerY, ampPx) {
  const marginLeft = 46, marginRight = 14, marginTop = 22, marginBottom = 30;
  const plotX = x0 + marginLeft;
  const plotY = y0 + marginTop;
  const plotW = Math.max(10, w - marginLeft - marginRight);
  const plotH = Math.max(10, h - marginTop - marginBottom);

  const windowDuration = history.windowDuration;
  const tNow = phase.t;
  // Right after a reset the buffer hasn't accumulated a full window's
  // worth of samples yet — anchoring to the earliest sample actually
  // present (rather than the idealized tNow - windowDuration, which can
  // be negative/undersupplied early on) means the trace starts at the
  // left edge immediately instead of being compressed toward the right
  // edge until enough real time has passed to fill the window.
  const tStart = history.samples.length ? history.samples[0].t : tNow - windowDuration;

  const tToX = (t) => plotX + ((t - tStart) / windowDuration) * plotW;
  const yToPx = (val) => centerY - (val / A) * ampPx;

  drawLabel(p5ctx, 'y\u2013t graph', x0 + 6, y0 + 2, { font: 'Space Mono', weight: 'BOLD', size: 12, align: ['LEFT', 'TOP'] });

  p5ctx.push();
  p5ctx.noFill(); p5ctx.stroke(PALETTE.line); p5ctx.strokeWeight(1);
  p5ctx.rect(plotX, plotY, plotW, plotH);
  p5ctx.pop();

  const guides = [{ val: A, label: 'A' }, { val: 0, label: '0' }, { val: -A, label: '-A' }];
  guides.forEach(({ val, label }) => {
    const py = yToPx(val);
    drawDashedGuide(p5ctx, plotX, py, plotX + plotW, py, p5ctx.color(PALETTE.muted), 1, [4, 4]);
    drawLabel(p5ctx, label, plotX - 6, py, { fill: PALETTE.mutedRGB, font: 'Space Mono', size: 10, align: ['RIGHT', 'CENTER'] });
  });

  drawLabel(p5ctx, 't (s)', plotX + plotW, plotY + plotH + 6, { fill: PALETTE.mutedRGB, font: 'Space Mono', size: 10, align: ['RIGHT', 'TOP'] });

  p5ctx.push();
  p5ctx.noFill(); p5ctx.stroke(PALETTE.orange); p5ctx.strokeWeight(2.5);
  p5ctx.beginShape();
  history.samples.forEach((sample) => { p5ctx.vertex(tToX(sample.t), yToPx(sample.y)); });
  p5ctx.endShape();
  p5ctx.pop();

  let dotX = plotX, dotY = centerY;
  if (history.samples.length > 0) {
    const last = history.samples[history.samples.length - 1];
    dotX = tToX(last.t);
    dotY = yToPx(last.y);
    p5ctx.push();
    p5ctx.noStroke(); p5ctx.fill(PALETTE.teal);
    p5ctx.circle(dotX, dotY, 8);
    p5ctx.pop();
  }

  return { dotX, dotY };
}

// =========================================================================
// drawCircleColumn — rotating reference-circle panel for the Reference
// Circle tab. Radius is fixed to fill the column; only θ drives the point's
// position, matching the "always normalize to available space" convention
// drawSinusoidColumn already uses.
// =========================================================================
function drawCircleColumn(p5ctx, phase, A, x0, y0, w, h, centerY, ampPx) {
  const cx = x0 + w / 2;
  const cy = centerY;
  const r = ampPx;
  const px = cx + r * Math.cos(phase.theta);
  const py = cy - r * Math.sin(phase.theta);

  drawLabel(p5ctx, 'circular motion', x0 + 6, y0 + 2, { font: 'Space Mono', weight: 'BOLD', size: 12, align: ['LEFT', 'TOP'] });

  p5ctx.push();
  p5ctx.noFill(); p5ctx.stroke(PALETTE.line); p5ctx.strokeWeight(2);
  p5ctx.circle(cx, cy, r * 2);
  p5ctx.pop();

  drawDashedGuide(p5ctx, cx - r, cy, cx + r, cy, p5ctx.color(PALETTE.path), 1, [4, 4]);

  const axisLabelOpts = { fill: PALETTE.mutedRGB, font: 'Space Mono', size: 10 };
  drawLabel(p5ctx, '0, 2\u03C0', cx + r + 20, cy, axisLabelOpts);
  drawLabel(p5ctx, '\u03C0/2', cx, cy - r - 14, axisLabelOpts);
  drawLabel(p5ctx, '\u03C0', cx - r - 14, cy, axisLabelOpts);
  drawLabel(p5ctx, '3\u03C0/2', cx, cy + r + 14, axisLabelOpts);

  const arcR = r * 0.42;
  p5ctx.push();
  p5ctx.noFill(); p5ctx.stroke(PALETTE.orange); p5ctx.strokeWeight(2.5);
  p5ctx.beginShape();
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const a = (phase.theta * i) / steps;
    p5ctx.vertex(cx + arcR * Math.cos(a), cy - arcR * Math.sin(a));
  }
  p5ctx.endShape();
  p5ctx.pop();

  const labelAngle = phase.theta / 2;
  drawLabel(p5ctx, '\u03B8', cx + (arcR + 16) * Math.cos(labelAngle), cy - (arcR + 16) * Math.sin(labelAngle), {
    fill: PALETTE.orangeRGB, font: 'Space Mono', weight: 'BOLD', size: 13
  });

  p5ctx.push();
  p5ctx.stroke(PALETTE.ink); p5ctx.strokeWeight(2.5);
  p5ctx.line(cx, cy, px, py);
  p5ctx.pop();

  drawDashedGuide(p5ctx, px, py, px, cy, p5ctx.color(PALETTE.teal), 1.5, [3, 3]);

  p5ctx.push();
  p5ctx.noStroke(); p5ctx.fill(PALETTE.ink);
  p5ctx.circle(cx, cy, 7);
  p5ctx.pop();

  p5ctx.push();
  p5ctx.fill(PALETTE.orange); p5ctx.stroke(PALETTE.ink); p5ctx.strokeWeight(2);
  p5ctx.circle(px, py, 14);
  p5ctx.pop();

  return { cx, cy, px, py, r };
}

// =========================================================================
// drawVerticalSpringColumn — simplified SHM panel for the Reference Circle
// tab. Mass position is normalized by A (same convention as the other two
// columns), so its pixel range never changes size, only its instantaneous
// value does.
// =========================================================================
function drawVerticalSpringColumn(p5ctx, phase, A, x0, y0, w, h, centerY, ampPx) {
  const cx = x0 + w / 2;
  const ceilingY = y0 + 44; // fixed offset from column top — independent of amplitude
  const massY = centerY - (phase.y(A) / A) * ampPx;
  const massSize = 30;

  drawLabel(p5ctx, 'SHM', x0 + 6, y0 + 2, { font: 'Space Mono', weight: 'BOLD', size: 12, align: ['LEFT', 'TOP'] });

  p5ctx.push();
  p5ctx.noStroke(); p5ctx.fill(PALETTE.ink);
  p5ctx.rect(cx - 30, ceilingY - 8, 60, 8);
  p5ctx.pop();

  p5ctx.push();
  p5ctx.stroke(PALETTE.paper); p5ctx.strokeWeight(1);
  for (let x = cx - 28; x < cx + 30; x += 10) {
    p5ctx.line(x, ceilingY, x - 6, ceilingY + 8);
  }
  p5ctx.pop();

  drawDashedGuide(p5ctx, x0 + 10, centerY, x0 + w - 10, centerY, p5ctx.color(PALETTE.teal));
  const guides = [{ py: centerY - ampPx, label: 'y = A' }, { py: centerY + ampPx, label: 'y = -A' }];
  guides.forEach(({ py, label }) => {
    drawDashedGuide(p5ctx, x0 + 10, py, x0 + w - 10, py, p5ctx.color(PALETTE.path), 1, [3, 3]);
    drawLabel(p5ctx, label, x0 + w - 42, py - 10, { fill: PALETTE.mutedRGB, font: 'Space Mono', size: 10, align: ['LEFT', 'CENTER'] });
  });

  drawSpringCoilVertical(p5ctx, cx, ceilingY, massY - massSize / 2);

  p5ctx.push();
  p5ctx.fill(PALETTE.orange); p5ctx.stroke(PALETTE.ink); p5ctx.strokeWeight(2);
  p5ctx.rectMode(p5ctx.CENTER);
  p5ctx.rect(cx, massY, massSize, massSize);
  p5ctx.rectMode(p5ctx.CORNER);
  p5ctx.pop();

  return { cx, massY };
}

// The amplitude slider's max value (matches ampControl's max in
// oscillation.html) — used to fix a pixels-per-metre scale so the three
// columns actually grow/shrink with A, instead of always normalizing to
// the same fixed size regardless of amplitude.
const REFERENCE_MAX_AMPLITUDE = 2;

// =========================================================================
// drawReferenceScene — combines the three columns left to right (vertical
// spring, circle, sinusoid), sharing one centerY/ampPx scale so a dashed
// line drawn at the "current" height passes through all three at once.
// =========================================================================
function drawReferenceScene(p5ctx, phase, A, history, width, height) {
  const colW = width / 3;
  const marginTop = 34, marginBottom = 34;
  const usableH = height - marginTop - marginBottom;

  let maxAmpPx = (usableH / 2) * 0.72;
  maxAmpPx = Math.min(maxAmpPx, colW / 2 - 40); // circle needs horizontal room too
  const pxPerUnitAmplitude = maxAmpPx / REFERENCE_MAX_AMPLITUDE;
  const ampPx = A * pxPerUnitAmplitude; // now scales live with the slider
  const centerY = marginTop + usableH / 2;

  const spring = drawVerticalSpringColumn(p5ctx, phase, A, 0, 0, colW, height, centerY, ampPx);
  const circle = drawCircleColumn(p5ctx, phase, A, colW, 0, colW, height, centerY, ampPx);
  const sine = drawSinusoidColumn(p5ctx, phase, A, history, colW * 2, 0, colW, height, centerY, ampPx);

  const lineColor = p5ctx.color(PALETTE.teal + 'a0'); // teal at 160 alpha — cross-column guide
  drawDashedGuide(p5ctx, spring.cx, spring.massY, colW, spring.massY, lineColor, 1.5, [3, 3]);
  drawDashedGuide(p5ctx, colW, circle.py, circle.px, circle.py, lineColor, 1.5, [3, 3]);
  drawDashedGuide(p5ctx, circle.px, circle.py, colW * 2, circle.py, lineColor, 1.5, [3, 3]);
  drawDashedGuide(p5ctx, colW * 2, sine.dotY, sine.dotX, sine.dotY, lineColor, 1.5, [3, 3]);
}

// =========================================================================
// Renderers — free functions, no held state. Each takes the active p5
// instance (or the main p5 context when not using instance mode), the
// oscillator, its params, and the canvas dimensions, and draws one frame.
// =========================================================================

function drawSpringCoil(p5ctx, x1, x2, y) {
  const coils = 12, amplitude = 19;
  const usable = x2 - x1 - 16;

  p5ctx.push();
  p5ctx.noFill();
  p5ctx.stroke(PALETTE.ink);
  p5ctx.strokeWeight(3);
  p5ctx.beginShape();
  p5ctx.vertex(x1, y);
  p5ctx.vertex(x1 + 8, y);
  for (let i = 0; i <= coils * 2; i++) {
    const x = x1 + 8 + (usable * i / (coils * 2));
    const offset = i === 0 || i === coils * 2 ? 0 : (i % 2 ? -amplitude : amplitude);
    p5ctx.vertex(x, y + offset);
  }
  p5ctx.vertex(x2, y);
  p5ctx.endShape();
  p5ctx.pop();
}

function drawSpringCoilVertical(p5ctx, x, y1, y2) {
  const coils = 10, amplitude = 14;
  const usable = y2 - y1 - 16;

  p5ctx.push();
  p5ctx.noFill();
  p5ctx.stroke(PALETTE.ink);
  p5ctx.strokeWeight(3);
  p5ctx.beginShape();
  p5ctx.vertex(x, y1);
  p5ctx.vertex(x, y1 + 8);
  for (let i = 0; i <= coils * 2; i++) {
    const y = y1 + 8 + (usable * i / (coils * 2));
    const offset = i === 0 || i === coils * 2 ? 0 : (i % 2 ? -amplitude : amplitude);
    p5ctx.vertex(x + offset, y);
  }
  p5ctx.vertex(x, y2);
  p5ctx.endShape();
  p5ctx.pop();
}

function drawSpringSystem(p5ctx, oscillator, params, width, height, vectorOptions = {}) {
  const { showDisplacement, showVelocity, showAccel, showForce, displacementArrow, velocityArrow, accelArrow, forceArrow } = vectorOptions;
  const floorY = height * 0.7;
  const equilibrium = width * 0.59;
  const massSize = Math.min(70, 44 + params.m * 7);
  const pxPerMetre = Math.min(width * 0.27, 190);
  const massX = equilibrium + oscillator.x * pxPerMetre;

  // Floor hatching
  p5ctx.push();
  p5ctx.stroke(PALETTE.ink + '29'); // ~.16 alpha
  p5ctx.strokeWeight(1);
  for (let i = 0; i < width; i += 28) {
    p5ctx.line(i, floorY + 32, i, floorY + 38);
  }
  p5ctx.line(0, floorY + 34, width, floorY + 34);
  p5ctx.pop();

  // Equilibrium guide
  drawDashedGuide(p5ctx, equilibrium, 32, equilibrium, floorY + 80, p5ctx.color(PALETTE.teal));

  // Displacement/velocity/acceleration vectors — all anchored at x=equilibrium,
  // stacked at different y-offsets from the mass, each with its own endpoint
  // length. Config-driven since the three are structurally identical.
  const vectorA = oscillator.acceleration(params); // SP015 7.1: a = -kx/m, single source of truth
  const forceEndX = showForce
    ? equilibrium + oscillator.restoringForce(params) * FORCE_PX_PER_N
    : equilibrium;
  const vectors = [
    { show: showDisplacement, arrow: displacementArrow, y: floorY + 61, endX: massX, label: 'x' },
    { show: showVelocity, arrow: velocityArrow, y: floorY - 40, endX: equilibrium + oscillator.v * VELOCITY_PX_PER_MS, label: 'v' },
    { show: showAccel, arrow: accelArrow, y: floorY - 70, endX: equilibrium + vectorA * ACCEL_PX_PER_MS2, label: 'a' },
    { show: showForce, arrow: forceArrow, y: floorY - 100, endX: forceEndX, label: 'F' },
  ];
  vectors.forEach(({ show, arrow, y, endX, label }) => {
    if (show) arrow.draw(p5ctx, equilibrium, y, endX, y, label, true);
  });

  // Trail
  if (!showDisplacement) {
    drawTrailDots(p5ctx, oscillator.trail, (x) => ({
      x: equilibrium + x * pxPerMetre,
      y: floorY + 61
    }));
  }

  // Wall
  p5ctx.push();
  p5ctx.noStroke();
  p5ctx.fill(PALETTE.ink);
  p5ctx.rect(32, floorY - 75, 25, 150);
  p5ctx.pop();

  p5ctx.push();
  p5ctx.stroke(PALETTE.paper);
  p5ctx.strokeWeight(1);
  for (let y = floorY - 70; y < floorY + 70; y += 12) {
    p5ctx.line(32, y, 57, y + 12);
  }
  p5ctx.pop();

  // Spring + mass
  drawSpringCoil(p5ctx, 57, massX - massSize / 2, floorY);

  p5ctx.push();
  p5ctx.fill(PALETTE.orange);
  p5ctx.stroke(PALETTE.ink);
  p5ctx.strokeWeight(2);
  p5ctx.rectMode(p5ctx.CENTER);
  p5ctx.rect(massX, floorY, massSize, massSize);
  p5ctx.rectMode(p5ctx.CORNER);
  p5ctx.pop();

  drawLabel(p5ctx, params.m.toFixed(1) + ' kg', massX, floorY + 4, { font: 'Space Mono', weight: 'BOLD', size: 12 });

  drawLabel(p5ctx, 'equilibrium', equilibrium, 24, { fill: PALETTE.tealRGB, size: 11, align: ['CENTER', 'BASELINE'] });
}

// The length slider's max value (matches configureControlRanges() in
// UIManager) — used to fix a pixels-per-metre scale so the rod actually
// grows/shrinks with L, instead of L canceling out of the scale factor.
const PENDULUM_MAX_LENGTH_M = 4;

function drawPendulumSystem(p5ctx, oscillator, params, width, height) {
  const pivotX = width / 2, pivotY = 46;
  const pxPerMetre = Math.min(
    (height * 0.48) / PENDULUM_MAX_LENGTH_M,
    (width * 0.29) / PENDULUM_MAX_LENGTH_M
  );
  const rodLength = params.L * pxPerMetre;
  const bobX = pivotX + rodLength * Math.sin(oscillator.x);
  const bobY = pivotY + rodLength * Math.cos(oscillator.x);
  const bobRadius = Math.min(34, 16 + params.m * 4);

  // Floor hatching
  p5ctx.push();
  p5ctx.stroke(PALETTE.ink + '29');
  p5ctx.strokeWeight(1);
  for (let x = 0; x < width; x += 28) {
    p5ctx.line(x, height - 32, x + 14, height - 18);
  }
  p5ctx.line(0, height - 24, width, height - 24);
  p5ctx.pop();

  // Equilibrium guide
  drawDashedGuide(p5ctx, pivotX, pivotY, pivotX, pivotY + rodLength + 24, p5ctx.color(PALETTE.teal));

  // Swing-arc guide
  p5ctx.push();
  p5ctx.noFill();
  p5ctx.stroke(PALETTE.orange + '3d'); // ~.24 alpha swing-arc guide
  p5ctx.strokeWeight(2);
  p5ctx.arc(pivotX, pivotY, rodLength * 2, rodLength * 2,
    p5ctx.HALF_PI - 0.9, p5ctx.HALF_PI + 0.9);
  p5ctx.pop();

  // Trail
  drawTrailDots(p5ctx, oscillator.trail, (angle) => ({
    x: pivotX + rodLength * Math.sin(angle),
    y: pivotY + rodLength * Math.cos(angle)
  }));

  // Rod
  p5ctx.push();
  p5ctx.stroke(PALETTE.ink);
  p5ctx.strokeWeight(4);
  p5ctx.line(pivotX, pivotY, bobX, bobY);
  p5ctx.pop();

  // Pivot point
  p5ctx.push();
  p5ctx.noStroke();
  p5ctx.fill(PALETTE.ink);
  p5ctx.circle(pivotX, pivotY, 14);
  p5ctx.pop();

  // Bob
  p5ctx.push();
  p5ctx.fill(PALETTE.orange);
  p5ctx.stroke(PALETTE.ink);
  p5ctx.strokeWeight(2);
  p5ctx.circle(bobX, bobY, bobRadius * 2);
  p5ctx.pop();

  drawLabel(p5ctx, params.m.toFixed(1) + ' kg', bobX, bobY + 4, { font: 'Space Mono', weight: 'BOLD', size: 11 });

  drawLabel(p5ctx, 'equilibrium', pivotX, pivotY + rodLength + 42, { fill: PALETTE.tealRGB, size: 11, align: ['CENTER', 'BASELINE'] });
}
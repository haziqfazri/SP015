/* =========================================================================
   Simulation classes and shared physics/rendering helpers for the
   Oscillation Laboratory (spring–mass and simple pendulum).
   Loaded by oscillation.html before oscillation-sketch.js, so the main
   sketch can stay focused on setup, lifecycle, and scene orchestration.
   ========================================================================= */

const G = 9.81;            // gravitational acceleration, m/s^2
const TRAIL_MAX = 42;       // matches the vanilla version's trail length cap
const VELOCITY_ARROW_MAX = 14;
const ACCEL_ARROW_MAX = 280;

// =========================================================================
// signedFixed(), drawDashedGuide(), and drawTrailDots() now live in
// ../shared/sim-utils.js (loaded before this file in oscillation.html).
// =========================================================================

// =========================================================================
// Oscillator — abstract base. Holds shared state; physics is supplied by
// subclasses. Nothing in here knows about rendering or the DOM.
// =========================================================================
class Oscillator {
  constructor() {
    this.x = 0;      // displacement (m) or angle (rad), subclass-defined
    this.v = 0;      // velocity (m/s) or angular velocity (rad/s)
    this.t = 0;       // elapsed time, s
    this.trail = [];  // recent x-values, oldest first
  }

  // Advances the state by dt using params (subclass-specific keys) and
  // must update this.x / this.v / this.t and call this.pushTrail().
  integrate(dt, params) {
    throw new Error('Oscillator.integrate() must be implemented by subclass');
  }

  // Returns total mechanical energy (J) for the current state.
  energy(params) {
    throw new Error('Oscillator.energy() must be implemented by subclass');
  }

  // Returns the ideal (undamped, small-amplitude where relevant) period, s.
  period(params) {
    throw new Error('Oscillator.period() must be implemented by subclass');
  }

  reset(initial) {
    this.x = initial;
    this.v = 0;
    this.t = 0;
    this.trail = [];
  }

  pushTrail() {
    this.trail.push(this.x);
    if (this.trail.length > TRAIL_MAX) this.trail.shift();
  }
}

// =========================================================================
// ReferencePhase — kinematic phase clock for the Reference Circle tab.
// Unlike SpringOscillator/PendulumOscillator, this isn't integrated step
// by step; θ is computed analytically from elapsed time, so it can never
// drift and stays exact regardless of frame-rate variation.
// =========================================================================
class ReferencePhase {
  constructor() {
    this.t = 0;
    this.theta = 0;
    this.unwrappedTheta = 0;
  }

  reset() {
    this.t = 0;
    this.theta = 0;
    this.unwrappedTheta = 0;
  }

  advance(dt, omega) {
    this.t += dt;
    this.unwrappedTheta += omega * dt;
    this.theta = ((this.unwrappedTheta % TWO_PI) + TWO_PI) % TWO_PI;  // wrap to [0, 2π)
  }

  // y = A·sin(θ) — matches the reference diagram's convention where
  // θ=0 starts at equilibrium moving upward toward the first peak.
  y(A) {
    return A * Math.sin(this.theta);
  }
}

// =========================================================================
// SignalHistory — rolling buffer of {t, y} samples for the sinusoid trace.
// Keeps only the last `windowDuration` seconds so the graph always shows
// a fixed number of cycles, regardless of the current period.
// =========================================================================
class SignalHistory {
  constructor(windowDuration) {
    this.windowDuration = 6;
    this.samples = [];
  }

  setWindow(duration) {
    this.windowDuration = duration;
  }

  push(t, y) {
    this.samples.push({ t, y });
    const cutoff = t - this.windowDuration;
    while (this.samples.length && this.samples[0].t < cutoff) {
      this.samples.shift();
    }
  }

  clear() {
    this.samples = [];
  }
} 

// =========================================================================
// SpringOscillator — horizontal mass on a spring.
// State is in metres / metres-per-second throughout.
// =========================================================================
class SpringOscillator extends Oscillator {
  integrate(dt, { m, k }) {
    const a = (-k * this.x) / m;
    this.v += a * dt;
    this.x += this.v * dt;
    this.t += dt;
    this.pushTrail();
  }

  energy({ m, k }) {
    return 0.5 * m * this.v * this.v + 0.5 * k * this.x * this.x;
  }

  period({ m, k }) {
    return 2 * Math.PI * Math.sqrt(m / k);
  }
}

// =========================================================================
// PendulumOscillator — simple pendulum, exact sine term (not small-angle).
// State is in radians / radians-per-second throughout; degree conversion
// for display is a UIManager concern, not a physics concern.
// =========================================================================
class PendulumOscillator extends Oscillator {
  integrate(dt, { m, L }) {
    const a = -(G / L) * Math.sin(this.x);
    this.v += a * dt;
    this.x += this.v * dt;
    this.t += dt;
    this.pushTrail();
  }

  energy({ m, L }) {
    return 0.5 * m * L * L * this.v * this.v + m * G * L * (1 - Math.cos(this.x));
  }

  period({ L }) {
    return 2 * Math.PI * Math.sqrt(L / G);
  }
}

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
  const tStart = tNow - windowDuration;

  const tToX = (t) => plotX + ((t - tStart) / windowDuration) * plotW;
  const yToPx = (val) => centerY - (val / A) * ampPx;

  p5ctx.push();
  p5ctx.noStroke(); p5ctx.fill(16, 33, 38);
  p5ctx.textFont('Space Mono'); p5ctx.textStyle(p5ctx.BOLD); p5ctx.textSize(12);
  p5ctx.textAlign(p5ctx.LEFT, p5ctx.TOP);
  p5ctx.text('y\u2013t graph', x0 + 6, y0 + 2);
  p5ctx.pop();

  p5ctx.push();
  p5ctx.noFill(); p5ctx.stroke(201, 210, 199); p5ctx.strokeWeight(1);
  p5ctx.rect(plotX, plotY, plotW, plotH);
  p5ctx.pop();

  const guides = [{ val: A, label: 'A' }, { val: 0, label: '0' }, { val: -A, label: '-A' }];
  guides.forEach(({ val, label }) => {
    const py = yToPx(val);
    drawDashedGuide(p5ctx, plotX, py, plotX + plotW, py, p5ctx.color(97, 112, 117), 1, [4, 4]);
    p5ctx.push();
    p5ctx.noStroke(); p5ctx.fill(97, 112, 117);
    p5ctx.textFont('Space Mono'); p5ctx.textSize(10); p5ctx.textAlign(p5ctx.RIGHT, p5ctx.CENTER);
    p5ctx.text(label, plotX - 6, py);
    p5ctx.pop();
  });

  p5ctx.push();
  p5ctx.noStroke(); p5ctx.fill(97, 112, 117);
  p5ctx.textFont('Space Mono'); p5ctx.textSize(10); p5ctx.textAlign(p5ctx.RIGHT, p5ctx.TOP);
  p5ctx.text('t (s)', plotX + plotW, plotY + plotH + 6);
  p5ctx.pop();

  p5ctx.push();
  p5ctx.noFill(); p5ctx.stroke(255, 107, 53); p5ctx.strokeWeight(2.5);
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
    p5ctx.noStroke(); p5ctx.fill(53, 185, 173);
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

  p5ctx.push();
  p5ctx.noStroke(); p5ctx.fill(16, 33, 38);
  p5ctx.textFont('Space Mono'); p5ctx.textStyle(p5ctx.BOLD); p5ctx.textSize(12);
  p5ctx.textAlign(p5ctx.LEFT, p5ctx.TOP);
  p5ctx.text('circular motion', x0 + 6, y0 + 2);
  p5ctx.pop();

  p5ctx.push();
  p5ctx.noFill(); p5ctx.stroke(201, 210, 199); p5ctx.strokeWeight(2);
  p5ctx.circle(cx, cy, r * 2);
  p5ctx.pop();

  drawDashedGuide(p5ctx, cx - r, cy, cx + r, cy, p5ctx.color(180), 1, [4, 4]);

  p5ctx.push();
  p5ctx.noStroke(); p5ctx.fill(97, 112, 117);
  p5ctx.textFont('Space Mono'); p5ctx.textSize(10); p5ctx.textAlign(p5ctx.CENTER, p5ctx.CENTER);
  p5ctx.text('0, 2\u03C0', cx + r + 20, cy);
  p5ctx.text('\u03C0/2', cx, cy - r - 14);
  p5ctx.text('\u03C0', cx - r - 14, cy);
  p5ctx.text('3\u03C0/2', cx, cy + r + 14);
  p5ctx.pop();

  const arcR = r * 0.42;
  p5ctx.push();
  p5ctx.noFill(); p5ctx.stroke(255, 107, 53); p5ctx.strokeWeight(2.5);
  p5ctx.beginShape();
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const a = (phase.theta * i) / steps;
    p5ctx.vertex(cx + arcR * Math.cos(a), cy - arcR * Math.sin(a));
  }
  p5ctx.endShape();
  p5ctx.pop();

  const labelAngle = phase.theta / 2;
  p5ctx.push();
  p5ctx.noStroke(); p5ctx.fill(255, 107, 53);
  p5ctx.textFont('Space Mono'); p5ctx.textStyle(p5ctx.BOLD); p5ctx.textSize(13);
  p5ctx.textAlign(p5ctx.CENTER, p5ctx.CENTER);
  p5ctx.text('\u03B8', cx + (arcR + 16) * Math.cos(labelAngle), cy - (arcR + 16) * Math.sin(labelAngle));
  p5ctx.pop();

  p5ctx.push();
  p5ctx.stroke(16, 33, 38); p5ctx.strokeWeight(2.5);
  p5ctx.line(cx, cy, px, py);
  p5ctx.pop();

  drawDashedGuide(p5ctx, px, py, px, cy, p5ctx.color(53, 185, 173), 1.5, [3, 3]);

  p5ctx.push();
  p5ctx.noStroke(); p5ctx.fill(16, 33, 38);
  p5ctx.circle(cx, cy, 7);
  p5ctx.pop();

  p5ctx.push();
  p5ctx.fill(255, 107, 53); p5ctx.stroke(16, 33, 38); p5ctx.strokeWeight(2);
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
  const ceilingY = centerY - ampPx - 46;
  const massY = centerY - (phase.y(A) / A) * ampPx;
  const massSize = 30;

  p5ctx.push();
  p5ctx.noStroke(); p5ctx.fill(16, 33, 38);
  p5ctx.textFont('Space Mono'); p5ctx.textStyle(p5ctx.BOLD); p5ctx.textSize(12);
  p5ctx.textAlign(p5ctx.LEFT, p5ctx.TOP);
  p5ctx.text('SHM', x0 + 6, y0 + 2);
  p5ctx.pop();

  p5ctx.push();
  p5ctx.noStroke(); p5ctx.fill(16, 33, 38);
  p5ctx.rect(cx - 30, ceilingY - 8, 60, 8);
  p5ctx.pop();

  p5ctx.push();
  p5ctx.stroke(239, 243, 237); p5ctx.strokeWeight(1);
  for (let x = cx - 28; x < cx + 30; x += 10) {
    p5ctx.line(x, ceilingY, x - 6, ceilingY + 8);
  }
  p5ctx.pop();

  drawDashedGuide(p5ctx, x0 + 10, centerY, x0 + w - 10, centerY, p5ctx.color(53, 185, 173));
  const guides = [{ py: centerY - ampPx, label: 'y = A' }, { py: centerY + ampPx, label: 'y = -A' }];
  guides.forEach(({ py, label }) => {
    drawDashedGuide(p5ctx, x0 + 10, py, x0 + w - 10, py, p5ctx.color(180), 1, [3, 3]);
    p5ctx.push();
    p5ctx.noStroke(); p5ctx.fill(97, 112, 117);
    p5ctx.textFont('Space Mono'); p5ctx.textSize(10); p5ctx.textAlign(p5ctx.LEFT, p5ctx.CENTER);
    p5ctx.text(label, x0 + w - 42, py - 10);
    p5ctx.pop();
  });

  drawSpringCoilVertical(p5ctx, cx, ceilingY, massY - massSize / 2);

  p5ctx.push();
  p5ctx.fill(255, 107, 53); p5ctx.stroke(16, 33, 38); p5ctx.strokeWeight(2);
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

  const lineColor = p5ctx.color(53, 185, 173, 160);
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
  p5ctx.stroke(16, 33, 38);
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
  p5ctx.stroke(16, 33, 38);
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
  const { showDisplacement, showVelocity, showAccel, displacementArrow, velocityArrow, accelArrow } = vectorOptions;
  const floorY = height * 0.7;
  const equilibrium = width * 0.59;
  const massSize = Math.min(70, 44 + params.m * 7);
  const pxPerMetre = Math.min(width * 0.27, 190);
  const massX = equilibrium + oscillator.x * pxPerMetre;

  // Floor hatching
  p5ctx.push();
  p5ctx.stroke(16, 33, 38, 41); // ~.16 alpha
  p5ctx.strokeWeight(1);
  for (let i = 0; i < width; i += 28) {
    p5ctx.line(i, floorY + 32, i, floorY + 38);
  }
  p5ctx.line(0, floorY + 34, width, floorY + 34);
  p5ctx.pop();

  // Equilibrium guide
  drawDashedGuide(p5ctx, equilibrium, 32, equilibrium, floorY + 80, p5ctx.color(53, 185, 173));

  if (showDisplacementVector) {
    const vectorY = floorY + 61;
    displacementVectorArrow.draw(p5ctx, equilibrium, vectorY, massX, vectorY, 'x', true);
  }

  if (showVelocity) {
    const vy = 20;
    const len = normalizedArrowLength(Math.abs(oscillator.v), 0, VELOCITY_ARROW_MAX) * Math.sign(oscillator.v);
    velocityArrow.draw(p5ctx, equilibrium, vy, equilibrium + len, vy, 'v', true);
  }

  if (showAccel) {
    const ay = 8;
    const a = (-params.k * oscillator.x) / params.m; // SP015 7.1: a = -kx/m, derived not stored
    const len = normalizedArrowLength(Math.abs(a), 0, ACCEL_ARROW_MAX) * Math.sign(a);
    accelArrow.draw(p5ctx, equilibrium, ay, equilibrium + len, ay, 'a', true);
  }

  // Trail
  if (!showDisplacementVector) {
    drawTrailDots(p5ctx, oscillator.trail, (x) => ({
      x: equilibrium + x * pxPerMetre,
      y: floorY + 61
    }));
  }

  // Wall
  p5ctx.push();
  p5ctx.noStroke();
  p5ctx.fill(16, 33, 38);
  p5ctx.rect(32, floorY - 75, 25, 150);
  p5ctx.pop();

  p5ctx.push();
  p5ctx.stroke(239, 243, 237);
  p5ctx.strokeWeight(1);
  for (let y = floorY - 70; y < floorY + 70; y += 12) {
    p5ctx.line(32, y, 57, y + 12);
  }
  p5ctx.pop();

  // Spring + mass
  drawSpringCoil(p5ctx, 57, massX - massSize / 2, floorY);

  p5ctx.push();
  p5ctx.fill(255, 107, 53);
  p5ctx.stroke(16, 33, 38);
  p5ctx.strokeWeight(2);
  p5ctx.rectMode(p5ctx.CENTER);
  p5ctx.rect(massX, floorY, massSize, massSize);
  p5ctx.rectMode(p5ctx.CORNER);
  p5ctx.pop();

  p5ctx.push();
  p5ctx.noStroke();
  p5ctx.fill(16, 33, 38);
  p5ctx.textFont('Space Mono');
  p5ctx.textStyle(p5ctx.BOLD);
  p5ctx.textSize(12);
  p5ctx.textAlign(p5ctx.CENTER, p5ctx.CENTER);
  p5ctx.text(params.m.toFixed(1) + ' kg', massX, floorY + 4);
  p5ctx.pop();

  p5ctx.push();
  p5ctx.noStroke();
  p5ctx.fill(53, 185, 173);
  p5ctx.textSize(11);
  p5ctx.textAlign(p5ctx.CENTER, p5ctx.BASELINE);
  p5ctx.text('equilibrium', equilibrium, 24);
  p5ctx.pop();
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
  p5ctx.stroke(16, 33, 38, 41);
  p5ctx.strokeWeight(1);
  for (let x = 0; x < width; x += 28) {
    p5ctx.line(x, height - 32, x + 14, height - 18);
  }
  p5ctx.line(0, height - 24, width, height - 24);
  p5ctx.pop();

  // Equilibrium guide
  drawDashedGuide(p5ctx, pivotX, pivotY, pivotX, pivotY + rodLength + 24, p5ctx.color(53, 185, 173));

  // Swing-arc guide
  p5ctx.push();
  p5ctx.noFill();
  p5ctx.stroke(255, 107, 53, 61); // ~.24 alpha
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
  p5ctx.stroke(16, 33, 38);
  p5ctx.strokeWeight(4);
  p5ctx.line(pivotX, pivotY, bobX, bobY);
  p5ctx.pop();

  // Pivot point
  p5ctx.push();
  p5ctx.noStroke();
  p5ctx.fill(16, 33, 38);
  p5ctx.circle(pivotX, pivotY, 14);
  p5ctx.pop();

  // Bob
  p5ctx.push();
  p5ctx.fill(255, 107, 53);
  p5ctx.stroke(16, 33, 38);
  p5ctx.strokeWeight(2);
  p5ctx.circle(bobX, bobY, bobRadius * 2);
  p5ctx.pop();

  p5ctx.push();
  p5ctx.noStroke();
  p5ctx.fill(16, 33, 38);
  p5ctx.textFont('Space Mono');
  p5ctx.textStyle(p5ctx.BOLD);
  p5ctx.textSize(11);
  p5ctx.textAlign(p5ctx.CENTER, p5ctx.CENTER);
  p5ctx.text(params.m.toFixed(1) + ' kg', bobX, bobY + 4);
  p5ctx.pop();

  p5ctx.push();
  p5ctx.noStroke();
  p5ctx.fill(53, 185, 173);
  p5ctx.textSize(11);
  p5ctx.textAlign(p5ctx.CENTER, p5ctx.BASELINE);
  p5ctx.text('equilibrium', pivotX, pivotY + rodLength + 42);
  p5ctx.pop();
}

// =========================================================================
// UIManager — connects HTML controls to the simulation state.
// Sole DOM accessor; SimulationController reacts via the hook callbacks.
// ========================================================================= 
class UIManager {
  constructor() {
    this.system = 'spring'; // 'spring' | 'pendulum'
    this.isPlaying = false;
    this.showDisplacementVector = false;
    this.playbackState = null;

    // Assigned by SimulationController after construction.
    this.onSystemChange = null;   // (system) => {}
    this.onParamsChange = null;   // () => {}  (slider moved; caller should reset)
    this.onPlayToggle = null;     // (isPlaying) => {}
    this.onReset = null;          // () => {}
    this.onStep = null;           // (dt) => {}
    this.onDisplayChange = null;

    this._lastReadout = {};
    this._cacheEls();
    this._bindControls();
  }

  _cacheEls() {
    this.els = {
      springButton: document.getElementById('springSystemButton'),
      pendulumButton: document.getElementById('pendulumSystemButton'),
      referenceButton: document.getElementById('referenceSystemButton'),

      simGrid: document.getElementById('simGrid'),
      springPendulumControls: document.getElementById('springPendulumControls'),
      referenceControls: document.getElementById('referenceControls'),

      unitHint: document.getElementById('unitHint'),
      canvasLabel: document.getElementById('canvasLabel'),

      ampControl: document.getElementById('ampControl'),
      ampOutput: document.getElementById('ampOutput'),
      refPeriodControl: document.getElementById('refPeriodControl'),
      refPeriodOutput: document.getElementById('refPeriodOutput'),

      massControl: document.getElementById('massControl'),
      massOutput: document.getElementById('massOutput'),

      parameterControl: document.getElementById('parameterControl'),
      parameterOutput: document.getElementById('parameterOutput'),
      parameterLabel: document.getElementById('parameterLabel'),
      parameterNote: document.getElementById('parameterNote'),

      displacementControl: document.getElementById('displacementControl'),
      displacementOutput: document.getElementById('displacementOutput'),
      displacementLabel: document.getElementById('displacementLabel'),
      displacementNote: document.getElementById('displacementNote'),

      positionLabel: document.getElementById('positionLabel'),
      velocityLabel: document.getElementById('velocityLabel'),

      vectorToggleGroup: document.getElementById('vectorToggleGroup'),
      displacementVectorToggle: document.getElementById('toggleDisplacementVector'),

      timeValue: document.getElementById('timeValue'),
      positionValue: document.getElementById('positionValue'),
      velocityValue: document.getElementById('velocityValue'),
      energyValue: document.getElementById('energyValue'),
      periodValue: document.getElementById('periodValue'),
      periodNote: document.getElementById('periodNote'),

      springTheory: document.getElementById('springTheory'),
      pendulumTheory: document.getElementById('pendulumTheory'),
      periodTheoryContent: document.getElementById('periodTheoryContent'),
      readoutsPanel: document.getElementById('readoutsPanel'),

      playPauseButton: document.getElementById('playPauseButton'),
      playPauseLabel: document.getElementById('playPauseLabel'),
      resetButton: document.getElementById('resetButton'),
      stepButton: document.getElementById('stepButton'),
    };
  }

  // Returns a plain params object. Key names are generic (`parameter`)
  // rather than `k`/`L` so this method stays oscillator-agnostic; the
  // caller (SimulationController) maps `parameter` onto `k` or `L`
  // depending on which system is active before handing it to the
  // oscillator's integrate/energy/period methods.
  params() {
    return {
      m: Number(this.els.massControl.value),
      parameter: Number(this.els.parameterControl.value),
      initial: Number(this.els.displacementControl.value)
    };
  }

  // Builds the {m, k, c} or {m, L, c} shape a given oscillator expects.
  physicsParams() {
    const p = this.params();
    return this.system === 'spring'
      ? { m: p.m, k: p.parameter }
      : { m: p.m, L: p.parameter };
  }

  // Returns the {A, omega} shape the Reference Circle tab's phase clock
  // expects, independent of the spring/pendulum params() above.
  referenceParams() {
    const A = Number(this.els.ampControl.value);
    const T = Number(this.els.refPeriodControl.value);
    return { A, omega: TWO_PI / T };
  }

  _bindControls() {
    this._bindSystemToggle();
    this._bindSliders();
    this._bindReferenceSliders();
    this._bindPlaybackButtons();
    this._bindVectorToggles();
  }

  _bindSystemToggle() {
    const setSystem = (system) => {
      this.system = system;

      this.els.springButton.classList.toggle('is-active', system === 'spring');
      this.els.pendulumButton.classList.toggle('is-active', system === 'pendulum');
      this.els.referenceButton.classList.toggle('is-active', system === 'reference');
      this.els.vectorToggleGroup.classList.toggle('hidden', system !== 'spring');
      this.els.springButton.setAttribute('aria-pressed', String(system === 'spring'));
      this.els.pendulumButton.setAttribute('aria-pressed', String(system === 'pendulum'));
      this.els.referenceButton.setAttribute('aria-pressed', String(system === 'reference'));

      const isReference = system === 'reference';
      this.els.simGrid.classList.toggle('stacked-layout', isReference);
      this.els.springPendulumControls.classList.toggle('hidden', isReference);
      this.els.referenceControls.classList.toggle('hidden', !isReference);
      this.els.readoutsPanel.classList.toggle('hidden', isReference);

      if (isReference) {
        this.els.springTheory.style.display = 'none';
        this.els.pendulumTheory.style.display = 'none';
        this.els.periodTheoryContent.style.display = 'none'; // footer bar itself stays, just emptied
        this.els.canvasLabel.style.display = 'none'; // canvas draws its own column titles now
      } else {
        this.els.periodTheoryContent.style.display = 'block';
        this.els.canvasLabel.style.display = 'block';
        this.configureControlRanges();
        this.updateLabels();
      }

      if (this.onSystemChange) this.onSystemChange(system);
    };

    this.els.springButton.addEventListener('click', () => setSystem('spring'));
    this.els.pendulumButton.addEventListener('click', () => setSystem('pendulum'));
    this.els.referenceButton.addEventListener('click', () => setSystem('reference'));
  }

  _bindReferenceSliders() {
    const controls = [this.els.ampControl, this.els.refPeriodControl];
    controls.forEach((control) => {
      control.addEventListener('input', () => {
        this.updateReferenceControlOutputs();
        if (this.onParamsChange) this.onParamsChange();
      });
    });
  }

  updateReferenceControlOutputs() {
    const { A } = this.referenceParams();
    const T = Number(this.els.refPeriodControl.value);
    this.els.ampOutput.textContent = A.toFixed(2) + ' m';
    this.els.refPeriodOutput.textContent = T.toFixed(2) + ' s';
  }

  _bindVectorToggles() {
    this.els.displacementVectorToggle.addEventListener('change', () => {
      this.showDisplacementVector = this.els.displacementVectorToggle.checked;
      if (this.onDisplayChange) this.onDisplayChange();
    });
    this.els.velocityVectorToggle.addEventListener('change', () => {
      this.showVelocityVector = this.els.velocityVectorToggle.checked;
      if (this.onDisplayChange) this.onDisplayChange();
    });
    this.els.accelerationVectorToggle.addEventListener('change', () => {
      this.showAccelerationVector = this.els.accelerationVectorToggle.checked;
      if (this.onDisplayChange) this.onDisplayChange();
    });
  }

  _bindSliders() {
    const controls = [
      this.els.massControl,
      this.els.parameterControl,
      this.els.displacementControl
    ];
    controls.forEach((control) => {
      control.addEventListener('input', () => {
        if (this.onParamsChange) this.onParamsChange();
      });
    });
  }

  _bindPlaybackButtons() {
    this.playbackState = new PlaybackState({
      buttonEl: this.els.playPauseButton,
      playLabel: '▶ Play',
      pauseLabel: '⏸ Pause',
      onPlay: () => {
        this.isPlaying = true;
        if (this.onPlayToggle) this.onPlayToggle(true);
      },
      onPause: () => {
        this.isPlaying = false;
        if (this.onPlayToggle) this.onPlayToggle(false);
      }
    });

    this.els.playPauseButton.addEventListener('click', () => {
      this.playbackState.toggle();
    });

    this.els.resetButton.addEventListener('click', () => {
      this.playbackState.pause();
      if (this.onReset) this.onReset();
    });

    this.els.stepButton.addEventListener('click', () => {
      this.playbackState.pause();
      if (this.onStep) this.onStep(0.05);
    });
  }

  setPlayLabel(isPlaying) {
    this.els.playPauseLabel.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
  }

  // Swaps slider min/max/step/default when the system toggles, matching
  // the vanilla version's configureControlRanges().
  configureControlRanges() {
    if (this.system === 'spring') {
      this.els.parameterControl.min = '2';
      this.els.parameterControl.max = '80';
      this.els.parameterControl.step = '1';
      this.els.parameterControl.value = '20';

      this.els.displacementControl.min = '-0.7';
      this.els.displacementControl.max = '0.7';
      this.els.displacementControl.step = '0.05';
      this.els.displacementControl.value = '0.35';
    } else {
      this.els.parameterControl.min = '0.3';
      this.els.parameterControl.max = '4';
      this.els.parameterControl.step = '0.1';
      this.els.parameterControl.value = '3.5';

      this.els.displacementControl.min = '-0.9';
      this.els.displacementControl.max = '0.9';
      this.els.displacementControl.step = '0.05';
      this.els.displacementControl.value = '0.45';
    }
  }

  // Swaps static label/copy text between the two systems.
  updateLabels() {
    const spring = this.system === 'spring';

    this.els.canvasLabel.textContent = spring
      ? 'horizontal mass-spring system'
      : 'simple pendulum';

    this.els.parameterLabel.textContent = spring ? 'Spring constant, k' : 'String length, L';
    this.els.parameterNote.textContent = spring
      ? 'A stiffer spring pulls the mass back harder, shortening the period.'
      : 'A longer string means a larger arc for the same angle, lengthening the period.';

    this.els.displacementLabel.textContent = spring ? 'Initial displacement' : 'Initial angle';
    this.els.displacementNote.textContent = spring
      ? 'Starting distance from equilibrium — sets the amplitude.'
      : 'Starting angle from vertical — large angles deviate from ideal SHM.';

    this.els.positionLabel.textContent = spring ? 'Position' : 'Angle';
    this.els.velocityLabel.textContent = spring ? 'Velocity' : 'Angular velocity';

    this.els.periodNote.textContent = spring
      ? 'T = 2π√(m/k) — independent of amplitude for an ideal spring.'
      : 'T = 2π√(L/g) — exact only for small angles; large swings run slightly slower than this.';

    this.els.springTheory.style.display = spring ? 'block' : 'none';
    this.els.pendulumTheory.style.display = spring ? 'none' : 'block';
  }

  // Updates slider live-value spans and the ideal-period readout.
  updateControlOutputs(oscillator) {
    const p = this.params();
    const physics = this.physicsParams();

    this.els.massOutput.textContent = p.m.toFixed(1) + ' kg';

    if (this.system === 'spring') {
      this.els.parameterOutput.textContent = p.parameter.toFixed(0) + ' N/m';
      this.els.displacementOutput.textContent = p.initial.toFixed(2) + ' m';
      this.els.unitHint.textContent = 'x(t) / metres';
    } else {
      this.els.parameterOutput.textContent = p.parameter.toFixed(1) + ' m';
      this.els.displacementOutput.textContent = (p.initial * 180 / Math.PI).toFixed(0) + '°';
      this.els.unitHint.textContent = 'θ(t) / degrees';
    }

    this.els.periodValue.textContent = oscillator.period(physics).toFixed(2) + ' s';
  }

  // Updates the four live readouts (time, position/angle, velocity, energy)
  // with diffing against the last-written value, same optimization as the
  // UCM sim's updateReadout().
  updateReadout(oscillator) {
    const physics = this.physicsParams();
    const last = this._lastReadout;

    const time = oscillator.t.toFixed(2) + ' s';
    let position, velocity;

    if (this.system === 'spring') {
      position = signedFixed(oscillator.x, 3) + ' m';
      velocity = signedFixed(oscillator.v, 3) + ' m/s';
    } else {
      position = signedFixed(oscillator.x * 180 / Math.PI, 1) + '°';
      velocity = signedFixed(oscillator.v * 180 / Math.PI, 1) + '°/s';
    }

    const energy = oscillator.energy(physics).toFixed(3) + ' J';

    if (last.time !== time) { this.els.timeValue.textContent = time; last.time = time; }
    if (last.position !== position) { this.els.positionValue.textContent = position; last.position = position; }
    if (last.velocity !== velocity) { this.els.velocityValue.textContent = velocity; last.velocity = velocity; }
    if (last.energy !== energy) { this.els.energyValue.textContent = energy; last.energy = energy; }
  }
}

// -------------------------------------------------------------------------
// Arrow drawing
// -------------------------------------------------------------------------

function drawArrowCtx(ctx, x0, y0, x1, y1, colorVal, weight = 3, maxHeadSize = 9) {
  if (x0 === x1 && y0 === y1) return;

  const totalLen = Math.hypot(x1 - x0, y1 - y0);
  const headSize = Math.min(maxHeadSize, totalLen * 0.45 / 1.6);
  const headLen = headSize * 1.6;
  const headHalfWidth = headSize * 0.6;
  const shaftHalfWidth = weight / 2;

  // Unit vector along the arrow, and its perpendicular, so the polygon
  // can be built in absolute coordinates directly (no translate/rotate
  // needed for a single beginShape/endShape).
  const ux = (x1 - x0) / totalLen;
  const uy = (y1 - y0) / totalLen;
  const nx = -uy;
  const ny = ux;

  // Point where the head's base sits along the shaft.
  const baseX = x1 - ux * headLen;
  const baseY = y1 - uy * headLen;

  ctx.push();
  ctx.noStroke();
  ctx.fill(colorVal);
  ctx.beginShape();
  // Shaft: a thin rectangle from (x0,y0) to the head's base.
  ctx.vertex(x0 + nx * shaftHalfWidth, y0 + ny * shaftHalfWidth);
  ctx.vertex(baseX + nx * shaftHalfWidth, baseY + ny * shaftHalfWidth);
  // Head: triangle flaring out from the shaft width to the full head
  // width, then back in to the tip.
  ctx.vertex(baseX + nx * headHalfWidth, baseY + ny * headHalfWidth);
  ctx.vertex(x1, y1);
  ctx.vertex(baseX - nx * headHalfWidth, baseY - ny * headHalfWidth);
  ctx.vertex(baseX - nx * shaftHalfWidth, baseY - ny * shaftHalfWidth);
  ctx.vertex(x0 - nx * shaftHalfWidth, y0 - ny * shaftHalfWidth);
  ctx.endShape(CLOSE);
  ctx.pop();
}

// Maps a physical quantity (speed, acceleration, force...) onto a pixel
// arrow length so vectors of very different scales still read consistently
// on screen. minLen/maxLen default to the values both existing sims used,
// but can be overridden per call if a future sim needs a different range.
function normalizedArrowLength(magnitude, minVal, maxVal, minLen = 40, maxLen = 160) {
  if (magnitude <= 1e-6) return 0;
  const clamped = Math.min(Math.max(magnitude, minVal), maxVal);
  const frac = (clamped - minVal) / (maxVal - minVal);
  return minLen + frac * (maxLen - minLen);
}

// Generic reusable arrow-with-label primitive — draws a vector from
// (x0,y0) to (x1,y1) with an optional label offset to one side of the
// midpoint. Used for position/velocity/acceleration/force vectors.
class VectorArrow {
  constructor(colorVal, weight = 3) {
    this.colorVal = colorVal;
    this.weight = weight;
  }

  draw(ctx, x0, y0, x1, y1, label, showLabel) {
    if (x0 === x1 && y0 === y1) return;
      
    drawArrowCtx(ctx, x0, y0, x1, y1, this.colorVal, this.weight);

    if (label && showLabel) {
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / len, ny = dx / len;
      const offset = 16;

      ctx.push();
      ctx.noStroke();
      ctx.fill(this.colorVal);
      ctx.textAlign(ctx.CENTER, ctx.CENTER);
      ctx.text(label, mx + nx * offset, my + ny * offset);
      ctx.pop();
    }
  }
}

// -------------------------------------------------------------------------
// Number formatting
// -------------------------------------------------------------------------

// "+0.35" / "-1.20" style formatting for signed readouts (position,
// velocity, etc.) where the sign is physically meaningful.
function signedFixed(value, decimals) {
  return (value >= 0 ? '+' : '') + value.toFixed(decimals);
}

// -------------------------------------------------------------------------
// Drawing helpers
// -------------------------------------------------------------------------

// Draws a short dashed guide line from (x0,y0) to (x1,y1). Takes the p5
// instance/context explicitly (pass `window` in global-mode sketches) since
// dashed lines need direct access to the canvas drawing context.
function drawDashedGuide(p5ctx, x0, y0, x1, y1, colorVal, weight = 2, dash = [6, 6]) {
  p5ctx.push();
  p5ctx.drawingContext.setLineDash(dash);
  p5ctx.stroke(colorVal);
  p5ctx.strokeWeight(weight);
  p5ctx.line(x0, y0, x1, y1);
  p5ctx.drawingContext.setLineDash([]);
  p5ctx.pop();
}

// Renders a fading trail of dots. `projector` maps a stored state value
// (a metre displacement, an angle, whatever your sim tracks) to an
// {x, y} canvas position, so any sim can reuse this one loop.
function drawTrailDots(p5ctx, trail, projector, r = 255, g = 107, b = 53, maxAlpha = 0.28) {
  const n = Math.max(trail.length, 1);
  trail.forEach((value, index) => {
    const pos = projector(value);
    p5ctx.push();
    p5ctx.noStroke();
    p5ctx.fill(r, g, b, (index / n) * maxAlpha * 255);
    p5ctx.circle(pos.x, pos.y, 6);
    p5ctx.pop();
  });
}

// -------------------------------------------------------------------------
// Readout diffing
// -------------------------------------------------------------------------

// Only writes to the DOM when the formatted value actually changed since
// last frame. Both existing sims hand-rolled this same
// `if (last.x !== x) {...}` check per readout field — `store` is just a
// plain object you keep alive across frames (e.g. `this._lastReadout = {}`)
// to remember the previous value. New sims can adopt this instead of
// rewriting the diffing logic each time; existing sims don't need to
// change anything to keep working.
function updateReadout(store, key, el, formattedValue) {
  if (store[key] !== formattedValue) {
    el.textContent = formattedValue;
    store[key] = formattedValue;
  }
}

// -------------------------------------------------------------------------
// Playback State
// -------------------------------------------------------------------------

class PlaybackState {
  constructor({ buttonEl, playLabel = '▶ Play', pauseLabel = '⏸ Pause', onPlay, onPause }) {
    this.isPlaying = false;
    this.buttonEL = buttonEl;
    this.playLabel = playLabel;
    this.pauseLabel = pauseLabel;
    this.onPlay = onPlay || (() => {});
    this.onPause = onPause || (() => {});
    this._setLabel();
  }

  _setLabel() {
    if (this.buttonEL) {
      this.buttonEL.textContent = this.isPlaying ? this.pauseLabel : this.playLabel;
    }
  }

  toggle() {
    this.isPlaying = !this.isPlaying;
    this._setLabel();
    if (this.isPlaying) {
      this.onPlay();
    } else {
      this.onPause();
    }
    return this.isPlaying;
  }

  // Used by reset and Step handlers - both force a pause without toggling
  // from a possibly-already-paused-state (toggle() would incorrectly resume if called twice)
  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this._setLabel();
    this.onPause();
  }

  // For sims that need to force play state on (rare, but keeps symmetry)
  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this._setLabel();
    this.onPlay();
  }
}

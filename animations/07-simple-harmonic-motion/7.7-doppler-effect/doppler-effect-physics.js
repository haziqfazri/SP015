/* =========================================================================
   DOPPLER-EFFECT-PHYSICS.JS — Topic 7.7 (Doppler Effect), SP015.

   Physics layer only: constants, state, and equations. No DOM access, no
   canvas/p5 calls, no rendering.

   Scope (SP015 7.7(b)): "Limit to stationary observer and moving source,
   and vice versa." Only ONE of {source, observer} is ever moving at a
   time — the apparent-frequency formula below deliberately branches on
   `mode` and applies only the relevant half of the general equation,
   never both terms combined. This is a scoping decision confirmed with
   Fazri, not an oversight.

   Load order: shared/sim-utils.js, THEN this file, THEN renderer.js,
   THEN controller.js, THEN ui.js, THEN sketch.js.
   ========================================================================= */

// -------------------------------------------------------------------------
// PHYSICS — fixed constants. wavefrontVisualSpeed/wavefrontPulseRate are a
// disclosed visual simplification (see index.html's on-screen note): the
// true speed of sound (343 m/s at 20°C) is what actually drives f' and every
// readout. At 343 m/s, wavefront rings would cross this sim's meter-scale
// domain in a fraction of a second — too fast to ever see more than one
// ring on screen. wavefrontVisualSpeed is a slower, stylized expansion
// rate used ONLY for drawing the rings; it never enters the Doppler
// equation. It's kept comfortably above LIMITS.moverSpeedMax so the ring
// geometry never looks supersonic.
// -------------------------------------------------------------------------
const PHYSICS = {
  waveSpeed: 343,             // m/s — real speed of sound at 20°C; drives f' and all readouts
  wavefrontVisualSpeed: 150,  // m/s — stylized ring-expansion rate, display only (> moverSpeedMax)
  wavefrontPulseRate: 20,     // Hz — visual ring-emission rate, decoupled from sourceFrequency
  wavefrontLookbackTime: 0.4, // s — how far back in time wavefronts() considers emissions;
                               // comfortably covers a ring's lifetime within the visible domain
                               // (domain half-width / wavefrontVisualSpeed ≈ 0.27s) with margin,
                               // keeping the per-call loop small without needing held/pruned state
};

// -------------------------------------------------------------------------
// LIMITS — single source of truth for slider ranges/defaults. index.html's
// static min/max/value attributes are a cosmetic fallback only.
// -------------------------------------------------------------------------
const LIMITS = {
  sourceFreqMin: 200, sourceFreqMax: 1000, sourceFreqDefault: 500, // Hz — source's emitted frequency, f
  moverSpeedMin: 0, moverSpeedMax: 100, moverSpeedDefault: 20,      // m/s — whichever body is moving
  timeMin: 0, timeMax: 8,                                            // s
  timeStep: 0.02,                                                    // s
};

// Shared x-domain every position/wavefront is computed and plotted
// against. The stationary body always sits at x = 0 (domain centre); the
// moving body starts at xMin and travels in +x, so a full
// approach -> cross -> recede plays out within LIMITS.timeMax at the
// default speed (80 m domain / 20 m/s = 4 s, well inside the 8 s window).
const DOMAIN = {
  xMin: -40, // m
  xMax: 40,  // m
};

/**
 * DopplerBody — a point moving at constant velocity along the shared
 * x-axis. Reused for both the source and the observer in either mode;
 * a "stationary" body is just one with velocity = 0. Position is a
 * closed-form function of t (SP015-wide convention: analytic position
 * over integration wherever a closed form exists — see physics.md §3 —
 * so there is no accumulated state to drift or to reset incorrectly).
 */
class DopplerBody {
  constructor(startX, velocity) {
    this.startX = startX;
    this.velocity = velocity; // m/s, signed (+ travels toward +x)
  }

  positionAt(t) {
    return this.startX + this.velocity * t;
  }
}

/**
 * DopplerSystem — owns the source body, the observer body, and the
 * source's emitted frequency; applies SP015 7.7(b)'s Doppler equation
 * strictly scoped to whichever one body is moving in the current mode.
 *
 * Sign convention (matches physics.md's ± / ∓ convention from 7.4/7.5):
 *   Moving source, stationary observer:
 *     f' = f * v / (v ∓ v_s)   "-" when the source moves toward the
 *                               observer, "+" when it moves away.
 *   Moving observer, stationary source:
 *     f' = f * (v ± v_o) / v   "+" when the observer moves toward the
 *                               source, "-" when it moves away.
 *
 * Direction (toward/away) is computed from actual position each call,
 * not fixed at construction — this lets the moving body approach, pass
 * through, and recede in one continuous run, with f' crossing back to f
 * exactly at the pass-through instant (dirTo* = 0 there), which is
 * physically correct, not a discontinuity to special-case.
 */
class DopplerSystem {
  constructor(mode, sourceFrequency, waveSpeed, sourceBody, observerBody) {
    this.mode = mode; // 'movingSource' | 'movingObserver'
    this.sourceFrequency = sourceFrequency;
    this.waveSpeed = waveSpeed;
    this.sourceBody = sourceBody;
    this.observerBody = observerBody;
  }

  setSourceFrequency(f) {
    this.sourceFrequency = f;
  }

  // Applies the slider speed to whichever body is the mover in the
  // current mode; the other body's velocity is left at 0.
  setMoverSpeed(v) {
    if (this.mode === 'movingSource') {
      this.sourceBody.velocity = v;
    } else {
      this.observerBody.velocity = v;
    }
  }

  moverSpeed() {
    return this.mode === 'movingSource' ? this.sourceBody.velocity : this.observerBody.velocity;
  }

  moverPositionAt(t) {
    return this.mode === 'movingSource' ? this.sourceBody.positionAt(t) : this.observerBody.positionAt(t);
  }

  // Role-based accessors (as opposed to moverPositionAt/stationaryPosition
  // above, which are mode-relative) — the renderer needs these to label
  // "Source" and "Observer" markers consistently regardless of which one
  // happens to be moving in the current mode.
  sourcePositionAt(t) {
    return this.sourceBody.positionAt(t);
  }

  observerPositionAt(t) {
    return this.observerBody.positionAt(t);
  }

  // The stationary body sits fixed at x = 0 for the whole run, so t is
  // irrelevant to its position — kept as a method (not a bare field) so
  // callers don't need to know that detail.
  stationaryPosition() {
    return this.mode === 'movingSource' ? this.observerBody.positionAt(0) : this.sourceBody.positionAt(0);
  }

  // Signed separation, observer minus source — positive means the
  // observer is to the right of the source.
  separationAt(t) {
    return this.observerBody.positionAt(t) - this.sourceBody.positionAt(t);
  }

  // SP015 7.7(b) — see class doc for the two branches' sign convention.
  apparentFrequency(t) {
    const f = this.sourceFrequency;
    const v = this.waveSpeed;

    if (this.mode === 'movingSource') {
      const sourceX = this.sourceBody.positionAt(t);
      const observerX = this.observerBody.positionAt(t);
      const dirToObserver = Math.sign(observerX - sourceX); // +1/-1/0 at the crossing instant
      const vTowardObserver = this.sourceBody.velocity * dirToObserver;
      return (f * v) / (v - vTowardObserver);
    }

    const sourceX = this.sourceBody.positionAt(t);
    const observerX = this.observerBody.positionAt(t);
    const dirToSource = Math.sign(sourceX - observerX);
    const vTowardSource = this.observerBody.velocity * dirToSource;
    return (f * (v + vTowardSource)) / v;
  }

  // True while the mover is closing the distance to the stationary body
  // (used for the readout's "Approaching / Receding / Passing" label).
  isApproaching(t) {
    const dt = 0.001; // s — small forward difference, cheap and exact enough for a sign check
    return Math.abs(this.separationAt(t + dt)) < Math.abs(this.separationAt(t));
  }

  // Wavefronts always emanate from the SOURCE's actual position — true
  // whether the source is the mover (Mode 1) or stationary (Mode 2,
  // sourceBody.velocity is always 0 there), so no mode branch is needed
  // here. Pure function of t: nothing is accumulated or pruned as held
  // state, so there's no incremental buffer to get out of sync on reset
  // or on a mode switch.
  wavefronts(t) {
    const period = 1 / PHYSICS.wavefrontPulseRate;
    const earliestRelevant = Math.max(0, t - PHYSICS.wavefrontLookbackTime);
    const firstN = Math.ceil(earliestRelevant / period);
    const lastN = Math.floor(t / period);

    const fronts = [];
    for (let n = firstN; n <= lastN; n++) {
      const emitTime = n * period;
      fronts.push({ emitTime, emitX: this.sourceBody.positionAt(emitTime) });
    }
    return fronts;
  }
}

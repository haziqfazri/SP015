/* =========================================================================
   KINEMATICS-SHM-PHYSICS.JS — Topic 7.1, SP015.
   Constants and physics classes only. No DOM, no canvas. Load first after
   shared/sim-utils.js.
   ========================================================================= */

// -------------------------------------------------------------------------
// PHYSICS — fixed physical constants.
// -------------------------------------------------------------------------

const PHYSICS = {
  g: 9.81,        // gravitational acceleration, m/s^2
  trailMax: 42,   // trail length cap (matches the vanilla version's cap)
};

// -------------------------------------------------------------------------
// LIMITS — single source of truth for slider ranges/defaults. index.html's
// min/max/value attributes are cosmetic fallbacks only (coding.md §3);
// UIManager.configureControlRanges() sets them from here.
// -------------------------------------------------------------------------

const LIMITS = {
  spring: {
    massMin: 0.2, massMax: 5, massDefault: 1, massStep: 0.1,       // kg
    kMin: 2, kMax: 80, kDefault: 20, kStep: 1,                       // N/m
    initialMin: -0.7, initialMax: 0.7, initialDefault: 0.35, initialStep: 0.05, // m
  },
  pendulum: {
    massMin: 0.2, massMax: 5, massDefault: 1, massStep: 0.1,       // kg
    lengthMin: 0.3, lengthMax: 4, lengthDefault: 3.5, lengthStep: 0.1, // m
    initialMin: -0.9, initialMax: 0.9, initialDefault: 0.45, initialStep: 0.05, // rad
  },
  reference: {
    amplitudeMin: 1, amplitudeMax: 2, amplitudeDefault: 1.5, amplitudeStep: 0.05, // m
    periodMin: 0.5, periodMax: 6, periodDefault: 2, periodStep: 0.05, // s
  },
  ui: {
    stepDt: 0.05,  // s advanced by a single "Step" button press
    maxDt: 0.03,   // s — clamp for update() so tab-switch stalls don't blow up integration
  },
};

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

  // Returns the instantaneous acceleration (m/s^2) or angular acceleration
  // (rad/s^2) for the current state — subclass-defined units, matching x/v.
  acceleration(params) {
    throw new Error('Oscillator.acceleration() must be implemented by subclass');
  }

  // Returns the restoring force (N), F = m·a. Built on acceleration() so
  // subclasses don't need their own override — any subclass that defines
  // acceleration() gets this for free.
  restoringForce(params) {
    return params.m * this.acceleration(params);
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
    if (this.trail.length > PHYSICS.trailMax) this.trail.shift();
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

  acceleration({ m, k }) {
    return (-k * this.x) / m;
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
    const a = -(PHYSICS.g / L) * Math.sin(this.x);
    this.v += a * dt;
    this.x += this.v * dt;
    this.t += dt;
    this.pushTrail();
  }

  acceleration({ L }) {
    return -(PHYSICS.g / L) * Math.sin(this.x);
  }

  period({ L }) {
    return 2 * Math.PI * Math.sqrt(L / PHYSICS.g);
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

  // Instantaneous SHM velocity — vertical component of the tangential
  // velocity vector.  SP015 7.1(c.i): v = ωA cos ωt.
  vY(A, omega) {
    return omega * A * Math.cos(this.theta);
  }

  // Instantaneous SHM acceleration — vertical component of the
  // radial-inward centripetal vector.  SP015 7.1(c.ii): a = −ω²y,
  // equivalent to −ω²A sin ωt.
  aY(A, omega) {
    return -omega * omega * A * Math.sin(this.theta);
  }
}

// =========================================================================
// SignalHistory — rolling buffer of {t, y} samples for the sinusoid trace.
// Keeps only the last `windowDuration` seconds so the graph always shows
// a fixed number of cycles, regardless of the current period.
// =========================================================================
class SignalHistory {
  constructor(windowDuration = 6) {
    this.windowDuration = windowDuration;
    this.samples = [];
  }

  setWindow(duration) {
    this.windowDuration = duration;
  }

  push(t, y) {
    this.samples.push({ t, y });
    const cutoff = t - this.windowDuration;

    // Drop samples that are still strictly before the *previous* sample
    // in line (i.e. two or more samples behind cutoff), but always leave
    // the single sample straddling the cutoff so it can be interpolated
    // below — plain shift()-ing left a gap up to one frame's dt wide at
    // the trace's leading edge, which grew proportionally larger as
    // windowDuration (3x period) shrank with lower periods.
    while (this.samples.length > 1 && this.samples[1].t < cutoff) {
      this.samples.shift();
    }
    if (this.samples.length > 1 && this.samples[0].t < cutoff) {
      const [a, b] = this.samples;
      const frac = (cutoff - a.t) / (b.t - a.t);
      this.samples[0] = { t: cutoff, y: a.y + (b.y - a.y) * frac };
    }
  }

  clear() {
    this.samples = [];
  }
}
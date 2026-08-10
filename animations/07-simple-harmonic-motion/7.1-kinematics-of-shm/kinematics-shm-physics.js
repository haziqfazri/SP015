const G = 9.81;            // gravitational acceleration, m/s^2
const TRAIL_MAX = 42;       // matches the vanilla version's trail length cap

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
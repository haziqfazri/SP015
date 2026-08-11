/* =========================================================================
   SHM-GRAPHS-PHYSICS.JS — Topic 7.2, SP015.
   Constants and SHMOscillator class only. No DOM, no canvas. Load first
   after shared/sim-utils.js.
   ========================================================================= */

// -------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------

const PHYSICS = {
  assumedMass: 1.00,   // kg — fixed assumption for energy readouts (not a
  // slider; 7.2's LO is graph shape, not mass effects)
};

const LIMITS = {
  amplitudeMin: 0.05,     // m
  amplitudeMax: 0.30,     // m
  amplitudeDefault: 0.20, // m
  omegaMin: 2.0,          // rad/s
  omegaMax: 12.0,         // rad/s
  omegaDefault: 4.0,      // rad/s
};

const DISPLAY = {
  graphTimeWindow: 4,          // s visible on x-t/v-t/a-t graphs
  historyMaxPoints: 600,       // safety cap on buffer length
  pxPerMetreOscillator: 300,   // oscillator strip: metres -> px
  graphPadding: { left: 20, right: 20, top: 42, bottom: 22 }, // px
  oscillatorTrackY: 0.5,       // fraction of canvas height for the track line
};

const UI = {
  stepDt: 0.05,   // s advanced by a single "Step" button press
  maxDt: 0.05,    // s — cap dt from tab-switch stalls; analytic form, no integration stability concern
};

// Phase Shift mode (isolated single-graph view, SP015 7.2) — static curve,
// no time integration, so A and omega are fixed rather than slider-driven;
// only phi varies. Reuses the Standard Graphs mode defaults for A/omega so
// the two modes show a visually consistent amplitude/period.
const PHASE_SHIFT = {
  amplitude: LIMITS.amplitudeDefault, // m, fixed
  omega: LIMITS.omegaDefault,         // rad/s, fixed
  phaseStep: Math.PI / 2,             // rad per button click
  cyclesEachSide: 2,                  // 2 full cycles for t>=0 and t<0
};

// -------------------------------------------------------------------------
// Physics — state, integration, derived quantities. Never touches DOM
// or canvas.
// -------------------------------------------------------------------------

/**
 * SHMOscillator — pure physics state for Topic 7.1/7.2. All quantities
 * derived analytically from elapsed time (no numerical integration, no
 * calculus) — matches the curriculum's explicit "derive via algebra and
 * trigonometry" remark for 7.1(c).
 */
class SHMOscillator {
  constructor(amplitude, omega, mass = PHYSICS.assumedMass) {
    this.amplitude = amplitude;
    this.omega = omega;
    this.mass = mass;
    this.t = 0;
  }

  // Displacement — SP015 7.1(b): x = A sin(ωt)
  get x() {
    return this.amplitude * Math.sin(this.omega * this.t);
  }

  // Velocity — SP015 7.1(c.i) continuous closed form Aω cos(ωt).
  // The ±ω√(A² − x²) form shown in the theory strip is algebraically
  // equivalent; the cos form resolves the sign unambiguously.
  get v() {
    return this.amplitude * this.omega * Math.cos(this.omega * this.t);
  }

  // Acceleration — SP015 7.1(c.ii): a = −ω²x
  get a() {
    return -this.omega * this.omega * this.x;
  }

  // Kinetic energy — SP015 7.1(c.iii): EK = ½mω²(A² − x²)
  get kineticEnergy() {
    return 0.5 * this.mass * this.omega * this.omega * (this.amplitude * this.amplitude - this.x * this.x);
  }

  // Potential energy — SP015 7.1(c.iv): EP = ½mω²x²
  get potentialEnergy() {
    return 0.5 * this.mass * this.omega * this.omega * this.x * this.x;
  }

  // Total energy — SP015 7.1(d): E = ½mω²A² (constant, derived from A directly)
  get totalEnergy() {
    return 0.5 * this.mass * this.omega * this.omega * this.amplitude * this.amplitude;
  }

  step(dt) {
    this.t += dt;
  }

  // Reset to t = 0 (x = 0, v = +ωA, a = 0 — oscillator starts at
  // equilibrium moving in the +x direction, matching x = A sin(ωt)).
  reset() {
    this.t = 0;
  }

  // Changing amplitude/omega mid-run keeps t (so students see graphs
  // respond live to slider drags) rather than forcing a reset.
  setAmplitude(newAmplitude) {
    this.amplitude = newAmplitude;
  }

  setOmega(newOmega) {
    this.omega = newOmega;
  }
}

// -------------------------------------------------------------------------
// Phase helpers — Phase Shift mode (7.2 isolated view). Free functions
// rather than SHMOscillator methods since this mode never integrates
// time; phase wrapping/formatting is pure display logic.
// -------------------------------------------------------------------------

// Wraps phi into (-pi, pi] so e.g. 3pi/2 displays as -pi/2, matching the
// spec's requirement to always show the shortest signed representation.
function wrapPhase(phi) {
  let wrapped = phi % (2 * Math.PI);
  if (wrapped > Math.PI) wrapped -= 2 * Math.PI;
  if (wrapped <= -Math.PI) wrapped += 2 * Math.PI;
  return wrapped;
}

// Formats phi as a signed fractional multiple of pi, e.g. "+0.50π rad".
function formatPhase(phi) {
  const multiple = wrapPhase(phi) / Math.PI;
  return `${signedFixed(multiple, 2)}\u03C0 rad`;
}

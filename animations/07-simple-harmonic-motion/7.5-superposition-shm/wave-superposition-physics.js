/* =========================================================================
   WAVE-SUPERPOSITION-PHYSICS.JS — Topic 7.5 (Superposition of Waves), SP015.

   Physics layer only: constants, state, and equations. No DOM access, no
   canvas/p5 calls, no rendering.

   Covers both modes built so far:
     Mode 1 (Pulse Superposition): PulseWave, PulseSuperposition
     Mode 2 (Interference):        ProgressiveWave, InterferenceSystem

   Load order: shared/sim-utils.js, THEN this file, THEN renderer.js,
   THEN controller.js, THEN sketch.js.
   ========================================================================= */

// -------------------------------------------------------------------------
// Pulse Superposition — constants
// -------------------------------------------------------------------------

const PHYSICS = {
  pulseSpeed: 1.0,     // m/s — constant for both pulses (equal speeds is
                        // part of the LO: identical pulses, only signs differ)
  pulseWidth: 0.6,      // m — Gaussian width parameter, fixed (not a slider,
                        // confirmed with Fazri: focus stays on amplitude/overlap)
  waveAStartX: -4.0,    // m — Wave A begins left of centre, travels +x
  waveBStartX: 4.0,     // m — Wave B begins right of centre, travels -x

  peakSampleCount: 400, // resolution of the numerical sweep used to find a
                         // resultant's peak (both PulseSuperposition and
                         // InterferenceSystem below) — a computation
                         // constant, not a display one, so it lives here
                         // rather than in renderer.js's DISPLAY.
};

// Shared by both modes: the x-domain every curve is plotted/sampled across.
const DOMAIN = {
  xMin: -5,   // m — left edge of plotted x-axis
  xMax: 5,    // m — right edge of plotted x-axis
};

const LIMITS = {
  ampSteps: [-0.3, -0.2, -0.1, 0.1, 0.2, 0.3], // m — discrete amplitude steps, 0 skipped
  ampDefault: 0.1,     // m — both waves start here (same sign -> constructive first)
  timeMin: 0,           // s
  timeMax: 8,           // s — long enough for full approach/overlap/separation;
                        // centres cross at t=4s given the speed/start positions above
  timeStep: 0.02,       // s — scrubber resolution
};

/**
 * PulseWave — a single travelling Gaussian pulse.
 * y(x, t) = amplitude * exp( -(x - center(t))^2 / width^2 )
 * center(t) = startX + direction * speed * t
 *
 * This is a descriptive (not derived) model — SP015 7.5(a) only requires
 * stating the superposition principle, not deriving pulse shape from a
 * wave equation, so a fixed-shape travelling bump is sufficient and keeps
 * the visual exactly what the LO asks for: two identical pulses that
 * "maintain their original shape and amplitude throughout."
 */
class PulseWave {
  constructor(startX, direction, amplitude, speed, width) {
    this.startX = startX;
    this.direction = direction; // +1 (moves +x) or -1 (moves -x)
    this.amplitude = amplitude;
    this.speed = speed;
    this.width = width;
  }

  setAmplitude(newAmplitude) {
    this.amplitude = newAmplitude;
  }

  // Position of the pulse's centre at time t.
  center(t) {
    return this.startX + this.direction * this.speed * t;
  }

  // Displacement contributed by this pulse alone at position x, time t.
  valueAt(x, t) {
    const dx = x - this.center(t);
    return this.amplitude * Math.exp(-(dx * dx) / (this.width * this.width));
  }
}

/**
 * PulseSuperposition — owns both pulses and applies the superposition
 * principle. The ONLY physics rule here is y_resultant = y_A + y_B,
 * matching SP015 7.5(a) exactly — no other combination rule is used.
 */
class PulseSuperposition {
  constructor(waveA, waveB) {
    this.waveA = waveA;
    this.waveB = waveB;
  }

  resultantAt(x, t) {
    return this.waveA.valueAt(x, t) + this.waveB.valueAt(x, t);
  }

  // Distance between the two pulse centres — reads as "how close are they"
  // and crosses zero exactly at full overlap.
  separation(t) {
    return Math.abs(this.waveA.center(t) - this.waveB.center(t));
  }

  // Signed peak of the resultant curve at time t, found by sampling across
  // the visible domain. Signed (not abs-of-abs) so constructive doubling
  // and destructive cancellation both read naturally in the readout.
  peakResultant(t) {
    let peak = 0;
    const steps = PHYSICS.peakSampleCount;
    for (let i = 0; i <= steps; i++) {
      const x = DOMAIN.xMin + ((DOMAIN.xMax - DOMAIN.xMin) * i) / steps;
      const y = this.resultantAt(x, t);
      if (Math.abs(y) > Math.abs(peak)) peak = y;
    }
    return peak;
  }
}

// -------------------------------------------------------------------------
// Interference mode — physics constants
// LIMITS is the single source of truth for slider ranges (same convention
// as LIMITS above) — index.html's static min/max/value attributes are a
// cosmetic fallback only.
// -------------------------------------------------------------------------

const INTERFERENCE_LIMITS = {
  ampMin: 0.05, ampMax: 0.30, ampDefault: 0.20,           // m
  wavelengthMin: 0.5, wavelengthMax: 3, wavelengthDefault: 1.5, // m
  omegaMin: 2, omegaMax: 12, omegaDefault: 6.0,           // rad/s
  phaseDiffMin: 0, phaseDiffMax: 2 * Math.PI, phaseDiffDefault: 0, // rad
};

/**
 * ProgressiveWave — a single continuous travelling wave, reusing SP015
 * Topic 7.4 notation directly: y = A sin(ωt ± kx + phase), k = 2π/λ.
 * Unlike PulseWave, this has no finite extent — it fills the whole
 * plotted domain at every instant, which is what distinguishes
 * "interference" (continuous) from "pulse superposition" (momentary).
 */
class ProgressiveWave {
  constructor(amplitude, omega, wavelength, phase = 0, direction = +1) {
    this.amplitude = amplitude;
    this.omega = omega;
    this.wavelength = wavelength;
    this.phase = phase;         // rad — Wave B's Δφ; Wave A stays at 0
    this.direction = direction; // +1 travels +x, -1 travels -x (SP015 7.4's y = A sin(ωt ± kx))
  }

  // k = 2π/λ (SP015 7.4) — derived, never stored independently, so it
  // can never drift out of sync with wavelength (the bug avoided in 7.4).
  get k() {
    return (2 * Math.PI) / this.wavelength;
  }

  setAmplitude(v) { this.amplitude = v; }
  setOmega(v) { this.omega = v; }
  setWavelength(v) { this.wavelength = v; }
  setPhase(v) { this.phase = v; }

  valueAt(x, t) {
    return this.amplitude * Math.sin(this.omega * t - this.direction * this.k * x + this.phase);
  }
}

/**
 * InterferenceSystem — applies the same superposition rule as
 * PulseSuperposition (y_resultant = y_A + y_B), just with continuous
 * ProgressiveWaves instead of finite PulseWaves.
 */
class InterferenceSystem {
  constructor(waveA, waveB) {
    this.waveA = waveA;
    this.waveB = waveB;
  }

  resultantAt(x, t) {
    return this.waveA.valueAt(x, t) + this.waveB.valueAt(x, t);
  }

  // Signed peak of the resultant, sampled across the same domain used for
  // plotting — same technique as PulseSuperposition.peakResultant().
  peakResultant(t) {
    let peak = 0;
    const steps = PHYSICS.peakSampleCount;
    for (let i = 0; i <= steps; i++) {
      const x = DOMAIN.xMin + ((DOMAIN.xMax - DOMAIN.xMin) * i) / steps;
      const y = this.resultantAt(x, t);
      if (Math.abs(y) > Math.abs(peak)) peak = y;
    }
    return peak;
  }
}
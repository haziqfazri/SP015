/* =========================================================================
   WAVE-PHYSICS.JS — Properties of Waves (SP015 Topic 7.4)

   Physics only: state and the progressive wave equations. No DOM access,
   no canvas/p5 calls — those belong to the UI manager and renderer.

   Equations (SP015 notation):
     y(x,t)  = A sin(ωt ± kx)          displacement of medium at position x, time t
     vy(x,t) = Aω cos(ωt ± kx)         particle (vibrational) velocity — vertical
     λ       = v/f                     wavelength — DERIVED from v and f (see WaveState)
     k       = 2π/λ                    wave number
     ω       = 2πf                     angular frequency
     T       = 1/f                     period

   v (wave speed, a medium property) and f (frequency, a source property)
   are the independent quantities here; λ is always derived from them.
   This is the physically correct causal chain (medium + source -> λ) and
   is what makes f and λ move inversely when v is held fixed.

   Sign convention: +x propagation uses (ωt − kx); −x propagation uses
   (ωt + kx). This matches SP015's ± convention where the sign is chosen
   opposite to the direction of travel for a wave of the form sin(ωt ± kx).
   ========================================================================= */

const PHYSICS = {
  // No fixed physical constants needed here (no g, no mass) — this topic
  // is purely kinematic. Kept as an empty group for structural consistency
  // with other sims' PHYSICS blocks.
};

const LIMITS = {
  amplitudeMin: 0.05,   // m
  amplitudeMax: 0.25,   // m
  waveSpeedMin: 0.3,    // m/s — property of the "medium"
  waveSpeedMax: 1.5,    // m/s
  frequencyMin: 0.3,    // Hz — set by the source
  frequencyMax: 1.0,    // Hz

  particleCountMin: 3,
  particleCountMax: 20
};

// Direction is stored as +1 (wave travels toward +x) or -1 (toward -x).
const DIRECTION = {
  POSITIVE: 1,
  NEGATIVE: -1
};

class WaveState {
  // Physically, wave speed (v) is a property of the medium and frequency
  // (f) is set by the source — both are genuinely independent. Wavelength
  // is never something you can dial in directly; it's always the
  // consequence of those two: λ = v/f. So v and f are the stored,
  // independent fields here, and wavelength is a derived getter below —
  // this is what makes f and λ move inversely when v is held fixed
  // (exactly the relationship the sim is meant to demonstrate).
  constructor(amplitude, waveSpeed, frequency, direction = DIRECTION.POSITIVE) {
    this.amplitude = amplitude;     // A, metres
    this.waveSpeed = waveSpeed;     // v, m/s — medium property, independent
    this.frequency = frequency;     // f, Hz — source property, independent
    this.direction = direction;     // +1 or -1
    this.time = 0;                  // t, seconds — advanced externally by the controller
  }

  // Derived quantities, recomputed on demand from the current sliders
  // rather than cached, since they're cheap and always must match the
  // live slider values exactly (no stale-cache risk).
  get angularFrequency() {
    return 2 * Math.PI * this.frequency; // ω = 2πf
  }

  // λ = v/f — derived, not stored. This is the one place the inverse
  // f-vs-λ relationship (at fixed v) actually happens: raising this.frequency
  // shrinks this.wavelength automatically, and vice versa.
  get wavelength() {
    return this.waveSpeed / this.frequency;
  }

  get waveNumber() {
    return (2 * Math.PI) / this.wavelength; // k = 2π/λ
  }

  get period() {
    return 1 / this.frequency; // T = 1/f
  }

  // Phase term ωt ± kx, with sign chosen so the pattern moves in
  // this.direction: +x travel uses (ωt − kx), −x travel uses (ωt + kx).
  phase(x) {
    return this.angularFrequency * this.time - this.direction * this.waveNumber * x;
  }

  // Displacement of the medium at position x, at the current time.
  displacementAt(x) {
    return this.amplitude * Math.sin(this.phase(x));
  }

  // Particle vibrational velocity at position x, at the current time.
  // Vertical only — never conflated with waveSpeed, which is horizontal.
  particleVelocityAt(x) {
    return this.amplitude * this.angularFrequency * Math.cos(this.phase(x));
  }

  // Advances simulation time by dt seconds. The controller decides when
  // and how much (e.g. skip while paused, fixed step on "Step").
  advance(dt) {
    this.time += dt;
  }

  reset() {
    this.time = 0;
  }
}

// -------------------------------------------------------------------------
// Particle layout helper
// -------------------------------------------------------------------------
// Returns n evenly spaced x-positions (in metres) across [0, visibleWidthM],
// with a half-step inset on each side so markers don't sit flush against
// the panel edges. Pure function — no physics state, no DOM — so it can be
// called fresh whenever the particle-count slider changes.
function evenlySpacedPositions(n, visibleWidthM) {
  const positions = [];
  const step = visibleWidthM / (n + 1);
  for (let i = 1; i <= n; i++) {
    positions.push(i * step);
  }
  return positions;
}

// Index (in the array returned by evenlySpacedPositions) treated as the
// "reference" particle that drives the y-t panel — the middle one, so it
// sits centred in the visible wave regardless of n.
function referenceParticleIndex(n) {
  return Math.floor((n - 1) / 2);
}
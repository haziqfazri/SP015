/* =========================================================================
   STANDING-WAVES-PHYSICS.JS — Topic 7.6 (Application of Standing Waves),
   SP015.

   Physics layer only: constants, state, and equations. No DOM access, no
   canvas/p5 calls, no rendering.

   Covers all three modes:
     Mode 1 (Stretched String):  StretchedString  — both ends fixed (nodes)
     Mode 2 (Open Air Column):   AirColumn(false)  — both ends antinode
     Mode 3 (Closed Air Column): AirColumn(true)   — one node, one antinode

   All three reuse the SAME standing-wave equation introduced in SP015
   7.5(b): y(x,t) = 2A sin(kx) cos(ωt). Only the boundary condition (which
   trig function starts at x = 0, and which harmonic numbers are allowed)
   differs between them — see boundary-condition note above each class.

   Load order: shared/sim-utils.js, THEN this file, THEN renderer.js,
   THEN controller.js, THEN ui.js, THEN sketch.js.
   ========================================================================= */

// -------------------------------------------------------------------------
// Fixed physical constant
// -------------------------------------------------------------------------

// Speed of sound in air, dry air at ~20°C. Fixed, not a slider — this LO
// (SP015 7.6a.ii) is about harmonic/overtone frequencies and boundary
// conditions, not the temperature-dependence of the speed of sound, so
// this is stated as a fixed assumption via an on-screen note (same
// pattern as shm-graphs-analysis's assumedMass), never a hidden constant.
const SPEED_OF_SOUND = 343; // m/s

// -------------------------------------------------------------------------
// LIMITS — single source of truth for slider/stepper ranges.
// index.html's static min/max/value attributes are a cosmetic fallback
// only, per repo convention (architecture.md §5 / coding.md §3).
// -------------------------------------------------------------------------

const STRING_LIMITS = {
  tensionMin: 1, tensionMax: 50, tensionDefault: 10,       // N
  muMin: 0.0005, muMax: 0.01, muDefault: 0.002,             // kg/m — linear mass density
  lengthMin: 0.2, lengthMax: 2.0, lengthDefault: 1.0,       // m
  harmonics: [1, 2, 3, 4, 5, 6],                             // both ends fixed -> every integer n is allowed
  harmonicDefault: 1,
};

const OPEN_LIMITS = {
  lengthMin: 0.2, lengthMax: 2.0, lengthDefault: 1.0,       // m
  harmonics: [1, 2, 3, 4, 5, 6],                             // both ends open -> every integer n is allowed
  harmonicDefault: 1,
};

const CLOSED_LIMITS = {
  lengthMin: 0.2, lengthMax: 2.0, lengthDefault: 1.0,       // m
  harmonics: [1, 3, 5, 7, 9, 11],                            // one closed end -> ODD n only (SP015 7.6a.ii)
  harmonicDefault: 1,
};

const TIME_LIMITS = {
  playbackRate: 1.0, // simulation seconds per real second while playing
};

// -------------------------------------------------------------------------
// Shared helpers (not p5/DOM — pure math/formatting used by both classes
// below). Kept local to this file rather than shared/sim-utils.js since
// they're specific to this sim's boundary-condition/labeling logic, not
// generic across the repo.
// -------------------------------------------------------------------------

// "1st" / "2nd" / "3rd" / "4th"... ordinal formatting for harmonic/overtone
// labels — English ordinal suffix rules (11th/12th/13th are irregular).
function ordinal(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

// Node/antinode positions are always spaced by half a wavelength and
// offset from each other by a quarter wavelength — only the starting
// phase (does x=0 fall on a node or an antinode?) differs between a
// sin-envelope boundary (node at x=0: string, closed column) and a
// cos-envelope boundary (antinode at x=0: open column). Shared here so
// neither class re-derives the same sweep loop.
function extremaPositions(length, wavelength, phaseOffset) {
  const spacing = wavelength / 2;
  const positions = [];
  const EPS = 1e-6;
  for (let x = phaseOffset; x <= length + EPS; x += spacing) {
    if (x >= -EPS) positions.push(Math.max(0, Math.min(length, x)));
  }
  return positions;
}

/**
 * StretchedString — Mode 1. Both ends fixed (x = 0 and x = L are nodes).
 *
 * Wave speed:  v = sqrt(T / mu)                    — SP015 7.6(b)
 * Frequency:   f_n = n*v / (2L)                     — SP015 7.6(a.i)
 * Wavelength:  lambda_n = 2L / n  (derived, never cached — physics.md §2)
 * Envelope:    sin(kx), k = 2*pi/lambda  -> node at x=0 AND x=L for every n
 */
class StretchedString {
  constructor(tension, linearDensity, length, harmonic) {
    this.tension = tension;
    this.linearDensity = linearDensity;
    this.length = length;
    this.harmonic = harmonic; // n = 1, 2, 3, ...
  }

  setTension(v) { this.tension = v; }
  setLinearDensity(v) { this.linearDensity = v; }
  setLength(v) { this.length = v; }
  setHarmonic(n) { this.harmonic = n; }

  // v = sqrt(T/mu) — SP015 7.6(b)
  get waveSpeed() {
    return Math.sqrt(this.tension / this.linearDensity);
  }

  // lambda_n = 2L/n — derived from the fixed-fixed boundary condition
  get wavelength() {
    return (2 * this.length) / this.harmonic;
  }

  get wavenumber() {
    return (2 * Math.PI) / this.wavelength;
  }

  // f_n = n*v/(2L) — SP015 7.6(a.i)
  get frequency() {
    return (this.harmonic * this.waveSpeed) / (2 * this.length);
  }

  get angularFrequency() {
    return 2 * Math.PI * this.frequency;
  }

  get harmonicLabel() {
    return this.harmonic === 1 ? 'Fundamental (1st Harmonic)' : `${ordinal(this.harmonic)} Harmonic`;
  }

  get overtoneLabel() {
    return this.harmonic === 1 ? null : `${ordinal(this.harmonic - 1)} Overtone`;
  }

  // Time-invariant shape, sin(kx) — node at x=0 and x=L by construction.
  envelopeAt(x) {
    return Math.sin(this.wavenumber * x);
  }

  // Full animated standing wave — SP015 7.5(b): y = 2A sin(kx) cos(wt).
  // `amplitude` is a display-only constant supplied by the renderer/DISPLAY
  // block, not a physical quantity this LO requires to be accurate.
  displacementAt(x, t, amplitude) {
    return amplitude * this.envelopeAt(x) * Math.cos(this.angularFrequency * t);
  }

  nodePositions() {
    return extremaPositions(this.length, this.wavelength, 0);
  }

  antinodePositions() {
    return extremaPositions(this.length, this.wavelength, this.wavelength / 4);
  }
}

/**
 * AirColumn — Modes 2 & 3. A single class parameterized by `closedEnd`
 * rather than two near-duplicate classes, since open/closed columns
 * differ only in boundary condition (which end is a node) and which
 * harmonic numbers are physically allowed — everything else (frequency
 * formula shape, envelope/node/antinode logic) is the same derivation
 * pattern reused with a different phase offset and wavelength relation.
 *
 * Open column  (closedEnd = false): both ends antinode.
 *   lambda_n = 2L/n,  f_n = n*v/(2L),  n = 1, 2, 3, ...   — SP015 7.6(a.ii)
 *   Envelope: cos(kx) -> antinode at x=0 AND x=L for every n.
 *
 * Closed column (closedEnd = true): x=0 node (closed end), x=L antinode.
 *   lambda_n = 4L/n,  f_n = n*v/(4L),  n = 1, 3, 5, ...   — SP015 7.6(a.ii)
 *   Envelope: sin(kx) -> node at x=0, antinode at x=L (only for odd n).
 */
class AirColumn {
  constructor(length, harmonic, closedEnd) {
    this.length = length;
    this.harmonic = harmonic;
    this.closedEnd = closedEnd;
    this.speedOfSound = SPEED_OF_SOUND; // fixed constant, exposed for readouts
  }

  setLength(v) { this.length = v; }
  setHarmonic(n) { this.harmonic = n; }

  // lambda_n = 2L/n (open) or 4L/n (closed) — derived, never cached.
  get wavelength() {
    const denominatorHarmonics = this.closedEnd ? 4 : 2;
    return (denominatorHarmonics * this.length) / this.harmonic;
  }

  get wavenumber() {
    return (2 * Math.PI) / this.wavelength;
  }

  // f_n = n*v/(2L) open, n*v/(4L) closed — SP015 7.6(a.ii)
  get frequency() {
    return this.speedOfSound / this.wavelength;
  }

  get angularFrequency() {
    return 2 * Math.PI * this.frequency;
  }

  get harmonicLabel() {
    return this.harmonic === 1 ? 'Fundamental (1st Harmonic)' : `${ordinal(this.harmonic)} Harmonic`;
  }

  // Open: overtone index = n - 1 (every n allowed).
  // Closed: only odd n exist, so overtone index = (n-1)/2.
  get overtoneLabel() {
    if (this.harmonic === 1) return null;
    const overtoneIndex = this.closedEnd ? (this.harmonic - 1) / 2 : this.harmonic - 1;
    return `${ordinal(overtoneIndex)} Overtone`;
  }

  // Open column starts on an antinode (cos); closed starts on a node (sin).
  envelopeAt(x) {
    return this.closedEnd
      ? Math.sin(this.wavenumber * x)
      : Math.cos(this.wavenumber * x);
  }

  displacementAt(x, t, amplitude) {
    return amplitude * this.envelopeAt(x) * Math.cos(this.angularFrequency * t);
  }

  // Phase offset for extrema: sin-type starts at a node (offset 0),
  // cos-type starts at an antinode, i.e. its FIRST NODE is a quarter
  // wavelength in.
  nodePositions() {
    const phaseOffset = this.closedEnd ? 0 : this.wavelength / 4;
    return extremaPositions(this.length, this.wavelength, phaseOffset);
  }

  antinodePositions() {
    const phaseOffset = this.closedEnd ? this.wavelength / 4 : 0;
    return extremaPositions(this.length, this.wavelength, phaseOffset);
  }
}

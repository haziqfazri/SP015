/* =========================================================================
   SHM-GRAPHS.JS — Topic 7.2 (Graphs of Simple Harmonic Motion), SP015.

   Uses p5 INSTANCE MODE (not the global setup()/draw() convention used by
   circular-motion/oscillation) because this sim needs several independent
   canvases — Standard Graphs mode's oscillator strip plus x-t, v-t, a-t,
   and E-x graphs, and Phase Shift mode's isolated x-t graph — each living
   in its own holder div. drawDashedGuide() in sim-utils.js already takes
   a p5 context explicitly, which supports this usage.

   Phase Shift mode (SP015 7.2) is a static, non-integrating view: A and ω
   are fixed, only φ varies, and its canvas is excluded from the shared
   per-frame render loop, repainting only on mode entry or a phase-step
   click (see SimulationController's `phaseInstance`, kept separate from
   `instances`).

   Load order: shared/sim-utils.js, THEN this file.

   Architecture (strict separation, one-way flow):
     UIManager -> SimulationController -> SHMOscillator (physics)
                                        -> renderer functions (drawing)
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
  dt: 1 / 60,     // s per simulation step, ~60 FPS
  stepDt: 0.05,   // s advanced by a single "Step" button press
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
    this._recompute();
  }

  // Recalculate x, v, a, EK, EP, E from current t. Called after any time
  // advance or parameter change so all derived fields stay consistent.
  _recompute() {
    const { amplitude: A, omega, t, mass } = this;

    // Displacement — SP015 7.1(b): x = A sin(ωt)
    this.x = A * Math.sin(omega * t);

    // Velocity — SP015 7.1(c.i) states v = ±ω√(A² − x²). We compute the
    // equivalent continuous closed form Aω cos(ωt) so the sign never has
    // to be resolved ambiguously frame-to-frame; the ± form is what's
    // shown to students in the theory strip.
    this.v = A * omega * Math.cos(omega * t);

    // Acceleration — SP015 7.1(c.ii): a = −ω²A sin(ωt) = −ω²x
    this.a = -omega * omega * this.x;

    // Kinetic energy — SP015 7.1(c.iii): EK = ½mω²(A² − x²)
    this.kineticEnergy = 0.5 * mass * omega * omega * (A * A - this.x * this.x);

    // Potential energy — SP015 7.1(c.iv): EP = ½mω²x²
    this.potentialEnergy = 0.5 * mass * omega * omega * this.x * this.x;

    // Total — SP015 7.1(d): constant, independent of x and t
    this.totalEnergy = this.kineticEnergy + this.potentialEnergy;
  }

  // Advances time by dt (seconds) and recomputes all derived quantities.
  step(dt) {
    this.t += dt;
    this._recompute();
  }

  // Reset to t = 0 (x = 0, v = +ωA, a = 0 — oscillator starts at
  // equilibrium moving in the +x direction, matching x = A sin(ωt)).
  reset() {
    this.t = 0;
    this._recompute();
  }

  // Changing amplitude/omega mid-run keeps t (so students see graphs
  // respond live to slider drags) rather than forcing a reset.
  setAmplitude(newAmplitude) {
    this.amplitude = newAmplitude;
    this._recompute();
  }

  setOmega(newOmega) {
    this.omega = newOmega;
    this._recompute();
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

// -------------------------------------------------------------------------
// UIManager — DOM access, event binding, readout updates only. Never
// computes physics, never draws to canvas. Talks to SimulationController
// exclusively via the callbacks object passed into its constructor.
// -------------------------------------------------------------------------

class UIManager {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this._lastReadout = {}; // diffing store for updateReadout()
    this.playbackState = null;
    this._cacheElements();
    this._applyLimits(); // LIMITS is the single source of truth for slider
    // ranges/defaults; index.html's static min/max/value
    // attributes are just a cosmetic fallback for
    // viewing the markup alone — do not edit those to
    // change behavior, edit LIMITS instead.
    this._bindEvents();
  }

  _cacheElements() {
    this.el = {
      amplitudeSlider: document.getElementById('amplitude-slider'),
      amplitudeValue: document.getElementById('amplitude-value'),
      omegaSlider: document.getElementById('omega-slider'),
      omegaValue: document.getElementById('omega-value'),

      checkEk: document.getElementById('check-ek'),
      checkEp: document.getElementById('check-ep'),
      checkEtotal: document.getElementById('check-etotal'),

      btnPlay: document.getElementById('btn-play'),
      btnReset: document.getElementById('btn-reset'),
      btnStep: document.getElementById('btn-step'),

      timeLabel: document.getElementById('time-label'),
      readoutX: document.getElementById('readout-x'),
      readoutV: document.getElementById('readout-v'),
      readoutA: document.getElementById('readout-a'),
      readoutEk: document.getElementById('readout-ek'),
      readoutEp: document.getElementById('readout-ep'),
      readoutEtotal: document.getElementById('readout-etotal'),

      // Mode switch
      standardModeButton: document.getElementById('standardModeButton'),
      phaseShiftModeButton: document.getElementById('phaseShiftModeButton'),
      standardStage: document.getElementById('standardStage'),
      phaseShiftStage: document.getElementById('phaseShiftStage'),
      standardControls: document.getElementById('standardControls'),
      phaseShiftControls: document.getElementById('phaseShiftControls'),
      controlsTitle: document.getElementById('controlsTitle'),
      controlsIntro: document.getElementById('controlsIntro'),

      // Phase Shift mode
      phaseLabel: document.getElementById('phase-label'),
      btnPhaseMinus: document.getElementById('btn-phase-minus'),
      btnPhasePlus: document.getElementById('btn-phase-plus'),
    };
  }

  _applyLimits() {
    this.el.amplitudeSlider.min = LIMITS.amplitudeMin;
    this.el.amplitudeSlider.max = LIMITS.amplitudeMax;

    this.el.omegaSlider.min = LIMITS.omegaMin;
    this.el.omegaSlider.max = LIMITS.omegaMax;

    // Clamp any out-of-range default (e.g. if LIMITS shrinks later) rather
    // than trusting the HTML's hardcoded value="..." to stay valid.
    this.el.amplitudeSlider.value = this._clamp(
      parseFloat(this.el.amplitudeSlider.value) || LIMITS.amplitudeDefault,
      LIMITS.amplitudeMin, LIMITS.amplitudeMax);
    this.el.omegaSlider.value = this._clamp(
      parseFloat(this.el.omegaSlider.value) || LIMITS.omegaDefault,
      LIMITS.omegaMin, LIMITS.omegaMax);

    // Reflect the (possibly clamped) values in the visible readouts too.
    this.el.amplitudeValue.textContent = `${parseFloat(this.el.amplitudeSlider.value).toFixed(2)} m`;
    this.el.omegaValue.textContent = `${parseFloat(this.el.omegaSlider.value).toFixed(1)} rad/s`;
  }

  _clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  _bindEvents() {
    this.el.amplitudeSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      this.el.amplitudeValue.textContent = `${value.toFixed(2)} m`;
      this.callbacks.onAmplitudeChange(value);
    });

    this.el.omegaSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      this.el.omegaValue.textContent = `${value.toFixed(1)} rad/s`;
      this.callbacks.onOmegaChange(value);
    });

    this.el.checkEk.addEventListener('change', (e) =>
      this.callbacks.onToggleCurve('EK', e.target.checked));
    this.el.checkEp.addEventListener('change', (e) =>
      this.callbacks.onToggleCurve('EP', e.target.checked));
    this.el.checkEtotal.addEventListener('change', (e) =>
      this.callbacks.onToggleCurve('Etotal', e.target.checked));

    this.playbackState = new PlaybackState({
      buttonEl: this.el.btnPlay,
      onPlay: () => this.callbacks.onPlayToggle(true),
      onPause: () => this.callbacks.onPlayToggle(false),
    });

    this.el.btnPlay.addEventListener('click', () => this.playbackState.toggle());
    this.el.btnReset.addEventListener('click', () => {
      this.playbackState.pause();
      this.callbacks.onReset();
    });
    this.el.btnStep.addEventListener('click', () => {
      this.playbackState.pause();
      this.callbacks.onStep();
    });

    this.el.standardModeButton.addEventListener('click', () =>
      this.callbacks.onSystemChange('standard'));
    this.el.phaseShiftModeButton.addEventListener('click', () =>
      this.callbacks.onSystemChange('phaseShift'));

    this.el.btnPhaseMinus.addEventListener('click', () =>
      this.callbacks.onPhaseStep(-1));
    this.el.btnPhasePlus.addEventListener('click', () =>
      this.callbacks.onPhaseStep(1));
  }

  // Swaps which stage/control block is visible. Standard Graphs keeps its
  // own playback running underneath — this only toggles what's on screen,
  // matching 7.1's system-switch pattern (system-option is-active/aria-pressed).
  setSystem(system) {
    const isStandard = system === 'standard';

    this.el.standardModeButton.classList.toggle('is-active', isStandard);
    this.el.phaseShiftModeButton.classList.toggle('is-active', !isStandard);
    this.el.standardModeButton.setAttribute('aria-pressed', String(isStandard));
    this.el.phaseShiftModeButton.setAttribute('aria-pressed', String(!isStandard));

    this.el.standardStage.classList.toggle('hidden', !isStandard);
    this.el.phaseShiftStage.classList.toggle('hidden', isStandard);
    this.el.standardControls.classList.toggle('hidden', !isStandard);
    this.el.phaseShiftControls.classList.toggle('hidden', isStandard);

    this.el.controlsTitle.textContent = isStandard ? 'Controls' : 'Phase Controls';
    this.el.controlsIntro.textContent = isStandard
      ? 'Adjust amplitude and angular frequency to see how each SHM graph responds.'
      : 'Step the phase offset φ to see how x = A sin(ωt + φ) shifts left or right.';
  }

  // Phase readout is display-only and only changes on a button click, not
  // per frame, so it's a direct write rather than going through the
  // per-frame updateReadout() diffing store.
  updatePhaseReadout(phase) {
    this.el.phaseLabel.textContent = `\u03C6 = ${formatPhase(phase)}`;
  }

  // Called once per frame by the controller with the latest physics state.
  // Only writes to the DOM when a value actually changed.
  updateReadouts(oscillator) {
    const store = this._lastReadout;

    updateReadout(store, 't', this.el.timeLabel, `t = ${oscillator.t.toFixed(2)} s`);
    updateReadout(store, 'x', this.el.readoutX, `${signedFixed(oscillator.x, 2)} m`);
    updateReadout(store, 'v', this.el.readoutV, `${signedFixed(oscillator.v, 2)} m/s`);
    updateReadout(store, 'a', this.el.readoutA, `${signedFixed(oscillator.a, 2)} m/s²`);
    updateReadout(store, 'ek', this.el.readoutEk, `${oscillator.kineticEnergy.toFixed(2)} J`);
    updateReadout(store, 'ep', this.el.readoutEp, `${oscillator.potentialEnergy.toFixed(2)} J`);
    updateReadout(store, 'etotal', this.el.readoutEtotal, `${oscillator.totalEnergy.toFixed(2)} J`);
  }

  setPlayButtonLabel(isPlaying) {
    this.el.btnPlay.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
  }
}

// -------------------------------------------------------------------------
// Renderer functions — drawing only, no physics calculation of state.
// Each takes the p5 instance plus the controller (for read-only state
// access) or explicit arguments, and uses DISPLAY constants for scaling.
// -------------------------------------------------------------------------

/**
 * Draws the oscillating particle on a horizontal track, plus a dashed
 * guide from centre to particle so |x| reads visually. Reads
 * oscillator.x only — no calculation performed here.
 */
function drawOscillator(p, controller) {
  const { oscillator } = controller;
  const w = p.width;
  const h = p.height;
  const trackY = h * DISPLAY.oscillatorTrackY;
  const centreX = w / 2;

  p.push();
  p.stroke('#c9d2c7');
  p.strokeWeight(2);
  p.line(20, trackY, w - 20, trackY);
  p.pop();

  p.push();
  p.stroke('#617075');
  p.strokeWeight(1);
  p.line(centreX, trackY - 8, centreX, trackY + 8);
  p.pop();

  const particleX = centreX + oscillator.x * DISPLAY.pxPerMetreOscillator;

  drawDashedGuide(p, centreX, trackY, particleX, trackY, '#617075', 1, [4, 4]);

  p.push();
  p.noStroke();
  p.fill('#ff6b35');
  p.circle(particleX, trackY, 16);
  p.pop();
}

/**
 * Draws one time-series graph (x-t, v-t, or a-t) from the controller's
 * rolling history buffer, scrolling left as time advances. `field`
 * selects which quantity ('x'|'v'|'a') to plot.
 */
function drawTimeSeriesGraph(p, controller, field, colorVal, axisLabel) {
  const { history, oscillator } = controller;
  const pad = DISPLAY.graphPadding;
  const plotW = p.width - pad.left - pad.right;
  const plotH = p.height - pad.top - pad.bottom;

  const A = oscillator.amplitude;
  const omega = oscillator.omega;
  const maxAbs = field === 'x' ? A
    : field === 'v' ? A * omega
      : A * omega * omega; // 'a'

  const tNow = oscillator.t;
  const tMin = tNow - DISPLAY.graphTimeWindow;

  const toXY = (sample) => {
    const px = pad.left + ((sample.t - tMin) / DISPLAY.graphTimeWindow) * plotW;
    const py = pad.top + plotH / 2 - (sample[field] / maxAbs) * (plotH / 2);
    return { x: px, y: py };
  };

  p.push();
  p.stroke('#c9d2c7');
  p.strokeWeight(1);
  p.line(pad.left, pad.top, pad.left, pad.top + plotH);
  p.line(pad.left, pad.top + plotH / 2, pad.left + plotW, pad.top + plotH / 2);
  p.pop();

  p.push();
  p.noStroke();
  p.fill('#617075');
  p.textSize(10);
  p.textAlign(p.LEFT, p.BOTTOM);
  p.text(axisLabel, pad.left, pad.top - 2);
  p.textAlign(p.RIGHT, p.TOP);
  p.text('t (s)', p.width - pad.right, pad.top + plotH + 4);
  p.pop();

  if (history.length >= 2) {
    p.push();
    p.stroke(colorVal);
    p.strokeWeight(2);
    p.noFill();
    p.beginShape();
    for (const sample of history) {
      const { x, y } = toXY(sample);
      p.vertex(x, y);
    }
    p.endShape();
    p.pop();
  }

  if (history.length > 0) {
    const latest = history[history.length - 1];
    const { x, y } = toXY(latest);
    p.push();
    p.noStroke();
    p.fill(colorVal);
    p.circle(x, y, 7);
    p.pop();
  }
}

/**
 * Draws EK, EP, and/or Etotal against displacement x (not time), per
 * SP015 7.2(a.iv). Curves are swept from the closed-form equations
 * across [-A, A] for display — this is derived shape geometry, not
 * simulation state, so it stays in the renderer rather than
 * SHMOscillator.
 */
function drawEnergyDisplacementGraph(p, controller) {
  const { oscillator, curveVisibility } = controller;
  const A = oscillator.amplitude;
  const omega = oscillator.omega;
  const mass = oscillator.mass;
  const pad = DISPLAY.graphPadding;
  const plotW = p.width - pad.left - pad.right;
  const plotH = p.height - pad.top - pad.bottom;

  const totalEnergyMax = 0.5 * mass * omega * omega * A * A;

  const toXY = (xVal, eVal) => {
    const px = pad.left + ((xVal + A) / (2 * A)) * plotW;
    const py = pad.top + plotH - (eVal / totalEnergyMax) * plotH;
    return { x: px, y: py };
  };

  p.push();
  p.stroke('#c9d2c7');
  p.strokeWeight(1);
  p.line(pad.left, pad.top, pad.left, pad.top + plotH);
  p.line(pad.left, pad.top + plotH, pad.left + plotW, pad.top + plotH);
  p.pop();

  p.push();
  p.noStroke();
  p.fill('#617075');
  p.textSize(10);
  p.textAlign(p.LEFT, p.BOTTOM);
  p.text('E (J)', pad.left, pad.top - 2);
  p.textAlign(p.RIGHT, p.TOP);
  p.text('x (m)', p.width - pad.right, pad.top + plotH + 4);
  p.pop();

  const sweepSteps = 60;
  const plotCurve = (colorVal, energyFn) => {
    p.push();
    p.stroke(colorVal);
    p.strokeWeight(2);
    p.noFill();
    p.beginShape();
    for (let i = 0; i <= sweepSteps; i++) {
      const xVal = -A + (2 * A * i) / sweepSteps;
      const { x, y } = toXY(xVal, energyFn(xVal));
      p.vertex(x, y);
    }
    p.endShape();
    p.pop();
  };

  // EK = ½mω²(A² − x²) — SP015 7.1(c.iii)
  if (curveVisibility.EK) {
    plotCurve('#ff6b35', (xVal) => 0.5 * mass * omega * omega * (A * A - xVal * xVal));
  }
  // EP = ½mω²x² — SP015 7.1(c.iv)
  if (curveVisibility.EP) {
    plotCurve('#35b9ad', (xVal) => 0.5 * mass * omega * omega * xVal * xVal);
  }
  // E = constant — SP015 7.1(d)
  if (curveVisibility.Etotal) {
    plotCurve('#102126', () => totalEnergyMax);
  }

  const currentX = oscillator.x;
  if (curveVisibility.EK) {
    const { x, y } = toXY(currentX, oscillator.kineticEnergy);
    p.push(); p.noStroke(); p.fill('#ff6b35'); p.circle(x, y, 7); p.pop();
  }
  if (curveVisibility.EP) {
    const { x, y } = toXY(currentX, oscillator.potentialEnergy);
    p.push(); p.noStroke(); p.fill('#35b9ad'); p.circle(x, y, 7); p.pop();
  }
}

/**
 * Draws the isolated Phase Shift mode graph: a single static x = A sin(ωt
 * + φ) curve swept across [-2T, 2T] — SP015 7.2. Static because A and ω
 * are fixed in this mode (see PHASE_SHIFT constants); only φ (passed via
 * controller.phase) changes the shape, so this is a closed-form sweep
 * like drawEnergyDisplacementGraph, not a history-buffer plot.
 */
function drawPhaseShiftGraph(p, controller) {
  const { phase } = controller;
  const { amplitude: A, omega, cyclesEachSide } = PHASE_SHIFT;
  const T = (2 * Math.PI) / omega;
  const tMax = cyclesEachSide * T;
  const tMin = -tMax;

  const pad = DISPLAY.graphPadding;
  const plotW = p.width - pad.left - pad.right;
  const plotH = p.height - pad.top - pad.bottom;

  const toXY = (tVal, xVal) => {
    const px = pad.left + ((tVal - tMin) / (tMax - tMin)) * plotW;
    const py = pad.top + plotH / 2 - (xVal / A) * (plotH / 2);
    return { x: px, y: py };
  };

  // Axes: t-axis through x=0, x-axis (vertical) at t=0.
  p.push();
  p.stroke('#c9d2c7');
  p.strokeWeight(1);
  const zeroTX = toXY(0, 0).x;
  p.line(zeroTX, pad.top, zeroTX, pad.top + plotH);
  p.line(pad.left, pad.top + plotH / 2, pad.left + plotW, pad.top + plotH / 2);
  p.pop();

  p.push();
  p.noStroke();
  p.fill('#617075');
  p.textSize(10);
  p.textAlign(p.LEFT, p.BOTTOM);
  p.text('Displacement, x (m)', pad.left, pad.top - 2);
  p.textAlign(p.RIGHT, p.TOP);
  p.text('Time, t (s)', p.width - pad.right, pad.top + plotH + 4);
  p.pop();

  // Curve: x = A sin(ωt + φ) — SP015 7.2, general phase form of 7.1(b).
  const sweepSteps = 240;
  p.push();
  p.stroke('#ff6b35');
  p.strokeWeight(2);
  p.noFill();
  p.beginShape();
  for (let i = 0; i <= sweepSteps; i++) {
    const tVal = tMin + ((tMax - tMin) * i) / sweepSteps;
    const xVal = A * Math.sin(omega * tVal + phase);
    const { x, y } = toXY(tVal, xVal);
    p.vertex(x, y);
  }
  p.endShape();
  p.pop();
}

// -------------------------------------------------------------------------
// SimulationController — orchestration only. Owns SHMOscillator, the
// history buffer for the time-series graphs, playback state, and the
// five p5 canvas instances. No physics derivations, no drawing code of
// its own — decides when to step/redraw and what to pass along.
// -------------------------------------------------------------------------

class SimulationController {
  constructor() {
    this.oscillator = new SHMOscillator(LIMITS.amplitudeDefault, LIMITS.omegaDefault);
    this.history = []; // { t, x, v, a } samples for the last graphTimeWindow seconds
    this.isPlaying = false;
    this.curveVisibility = { EK: true, EP: true, Etotal: true };

    this.system = 'standard'; // 'standard' | 'phaseShift'
    this.phase = 0;           // rad — Phase Shift mode only, reset on mode entry

    this.ui = new UIManager({
      onAmplitudeChange: (v) => this._onAmplitudeChange(v),
      onOmegaChange: (v) => this._onOmegaChange(v),
      onToggleCurve: (key, visible) => this._onToggleCurve(key, visible),
      onPlayToggle: () => this._onPlayToggle(),
      onReset: () => this._onReset(),
      onStep: () => this._onStep(),
      onSystemChange: (system) => this._onSystemChange(system),
      onPhaseStep: (direction) => this._onPhaseStep(direction),
    });

    this._recordSample(); // seed history with t=0 point before first paint
    this._createCanvases();
    this._renderAll();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  // ----- callback handlers (UI -> physics) -----

  _onAmplitudeChange(value) {
    this.oscillator.setAmplitude(value);
    this._recordSample(); // reflect new A immediately, even while paused
    this._renderAll();
  }

  _onOmegaChange(value) {
    this.oscillator.setOmega(value);
    this._recordSample();
    this._renderAll();
  }

  _onToggleCurve(key, visible) {
    this.curveVisibility[key] = visible;
    this._renderAll();
  }

  _onPlayToggle(isPlaying = !this.isPlaying) {
    this.isPlaying = isPlaying;
    this.ui.setPlayButtonLabel(this.isPlaying);
  }

  _onReset() {
    this.isPlaying = false;
    this.ui.setPlayButtonLabel(false);
    this.oscillator.reset();
    this.history = [];
    this._recordSample();
    this._renderAll();
  }

  _onStep() {
    this.oscillator.step(UI.stepDt);
    this._recordSample();
    this._renderAll();
  }

  // Standard Graphs mode keeps running underneath (its own instance loop
  // is untouched); Phase Shift mode has no clock, so entering it just
  // resets φ to 0 (per spec) and repaints its own canvas once. The phase
  // canvas is created once up front but its holder is `display:none`
  // until activated, so it needs an explicit resize before its first
  // real paint — same reason 7.1's onSystemChange calls resize().
  _onSystemChange(system) {
    this.system = system;
    this.ui.setSystem(system);

    if (system === 'phaseShift') {
      this.phase = 0;
      this.ui.updatePhaseReadout(this.phase);
      this._resizePhaseCanvas();
      this.phaseInstance.redraw();
    }
  }

  _onPhaseStep(direction) {
    this.phase = wrapPhase(this.phase + direction * PHASE_SHIFT.phaseStep);
    this.ui.updatePhaseReadout(this.phase);
    this.phaseInstance.redraw();
  }

  _resizePhaseCanvas() {
    const holder = document.getElementById('phase-holder');
    this.phaseInstance.resizeCanvas(holder.clientWidth, holder.clientHeight);
  }

  // ----- internal -----

  _recordSample() {
    const { t, x, v, a } = this.oscillator;
    this.history.push({ t, x, v, a });

    const cutoff = t - DISPLAY.graphTimeWindow;
    while (this.history.length && this.history[0].t < cutoff) {
      this.history.shift();
    }
    if (this.history.length > DISPLAY.historyMaxPoints) {
      this.history.shift();
    }
  }

  _renderAll() {
    this.ui.updateReadouts(this.oscillator);
    this.instances.forEach((instance) => instance.redraw());
  }

  _loop(timestampMs) {
    if (this.isPlaying) {
      this.oscillator.step(UI.dt);
      this._recordSample();
      this._renderAll();
    }
    requestAnimationFrame(this._loop);
  }

  _createCanvases() {
    const makeInstance = (holderId, drawFn) => {
      return new p5((p) => {
        p.setup = () => {
          const holder = document.getElementById(holderId);
          const canvas = p.createCanvas(holder.clientWidth, holder.clientHeight);
          canvas.parent(holderId);
          p.noLoop(); // controller decides when to repaint, via .redraw()
        };
        p.draw = () => {
          p.clear();
          drawFn(p, this);
        };
        p.windowResized = () => {
          const holder = document.getElementById(holderId);
          // Guard against a hidden holder (e.g. phase-holder while Standard
          // Graphs mode is active) reporting 0x0 on a browser resize event.
          if (holder.clientWidth === 0 || holder.clientHeight === 0) return;
          p.resizeCanvas(holder.clientWidth, holder.clientHeight);
        };
      });
    };

    this.instances = [
      makeInstance('oscillator-holder', drawOscillator),
      makeInstance('xt-holder', (p, c) => drawTimeSeriesGraph(p, c, 'x', '#ff6b35', 'x (m)')),
      makeInstance('vt-holder', (p, c) => drawTimeSeriesGraph(p, c, 'v', '#35b9ad', 'v (m/s)')),
      makeInstance('at-holder', (p, c) => drawTimeSeriesGraph(p, c, 'a', '#dff34b', 'a (m/s\u00B2)')),
      makeInstance('ex-holder', drawEnergyDisplacementGraph),
    ];

    // Kept out of `this.instances` (and thus out of `_renderAll()`'s every-
    // frame redraw) since Phase Shift mode is static and only repaints on
    // mode entry or a phase-step click — see _onSystemChange/_onPhaseStep.
    this.phaseInstance = makeInstance('phase-holder', drawPhaseShiftGraph);
  }
}

// Bootstrapped once the DOM (and p5 library) is ready — no global-mode
// setup()/draw() at file scope, since this sim owns five independent
// instance-mode sketches rather than one global-mode canvas.
document.addEventListener('DOMContentLoaded', () => {
  new SimulationController();
});
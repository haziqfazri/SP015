/* =========================================================================
   SHM-GRAPHS-UI-MANAGER.JS — Topic 7.2, SP015.
   UIManager only: DOM access, event binding, readout updates. Never
   computes physics, never draws to canvas. Load after controller.js,
   before sketch.js.
   ========================================================================= */

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
}

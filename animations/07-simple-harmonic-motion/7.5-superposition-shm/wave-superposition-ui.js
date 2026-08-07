/* =========================================================================
   WAVE-SUPERPOSITION-UI.JS — Topic 7.5, SP015.
   UIManager only: DOM access, event binding, readout updates. Load after
   physics.js, renderer.js, controller.js, before sketch.js.
   ========================================================================= */

class UIManager {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this._lastReadout = {};
    this._cacheElements();
    this._bindEvents();
  }

  _cacheElements() {
    this.el = {
      ampAGroup: document.getElementById('amp-a-group'),
      ampBGroup: document.getElementById('amp-b-group'),

      chkWaveA: document.getElementById('chk-wave-a'),
      chkWaveB: document.getElementById('chk-wave-b'),
      chkResultant: document.getElementById('chk-resultant'),

      timeScrubber: document.getElementById('time-scrubber'),
      timeScrubberLive: document.getElementById('time-scrubber-live'),

      btnPlay: document.getElementById('btn-play'),
      btnReset: document.getElementById('btn-reset'),

      timeLabel: document.getElementById('time-label'),
      valAmpA: document.getElementById('val-amp-a'),
      valAmpB: document.getElementById('val-amp-b'),
      valSeparation: document.getElementById('val-separation'),
      valResultantPeak: document.getElementById('val-resultant-peak'),

      modeButtons: {
        pulse: document.getElementById('pulseModeButton'),
        interference: document.getElementById('interferenceModeButton'),
      },
      pulseStage: document.getElementById('pulseStage'),
      pulseControls: document.getElementById('pulseControls'),
      interferenceStage: document.getElementById('interferenceStage'),
      interferenceControls: document.getElementById('interferenceControls'),

      pulseTheoryContent: document.getElementById('pulseTheoryContent'),
      pulseTheoryContent2: document.getElementById('pulseTheoryContent2'),
      interferenceTheoryContent: document.getElementById('interferenceTheoryContent'),
      interferenceTheoryContent2: document.getElementById('interferenceTheoryContent2'),

      interferenceAmpSlider: document.getElementById('interference-amp-slider'),
      interferenceAmpLive: document.getElementById('interference-amp-live'),
      wavelengthSlider: document.getElementById('wavelength-slider'),
      wavelengthLive: document.getElementById('wavelength-live'),
      interferenceOmegaSlider: document.getElementById('interference-omega-slider'),
      interferenceOmegaLive: document.getElementById('interference-omega-live'),
      phaseDiffSlider: document.getElementById('phase-diff-slider'),
      phaseDiffLive: document.getElementById('phase-diff-live'),

      btnPlayInterference: document.getElementById('btn-play-interference'),
      btnResetInterference: document.getElementById('btn-reset-interference'),
      btnStepInterference: document.getElementById('btn-step-interference'),

      timeLabelInterference: document.getElementById('time-label-interference'),
      valInterferenceAmp: document.getElementById('val-interference-amp'),
      valWavelength: document.getElementById('val-wavelength'),
      valInterferenceOmega: document.getElementById('val-interference-omega'),
      valK: document.getElementById('val-k'),
      valPhaseDiff: document.getElementById('val-phase-diff'),
      valInterferencePeak: document.getElementById('val-interference-peak'),
    };

    this.el.timeScrubber.min = LIMITS.timeMin;
    this.el.timeScrubber.max = LIMITS.timeMax;
    this.el.timeScrubber.step = LIMITS.timeStep;
    this.el.timeScrubber.value = LIMITS.timeMin;

    this.el.interferenceAmpSlider.min = INTERFERENCE_LIMITS.ampMin;
    this.el.interferenceAmpSlider.max = INTERFERENCE_LIMITS.ampMax;
    this.el.interferenceAmpSlider.value = INTERFERENCE_LIMITS.ampDefault;

    this.el.wavelengthSlider.min = INTERFERENCE_LIMITS.wavelengthMin;
    this.el.wavelengthSlider.max = INTERFERENCE_LIMITS.wavelengthMax;
    this.el.wavelengthSlider.value = INTERFERENCE_LIMITS.wavelengthDefault;

    this.el.interferenceOmegaSlider.min = INTERFERENCE_LIMITS.omegaMin;
    this.el.interferenceOmegaSlider.max = INTERFERENCE_LIMITS.omegaMax;
    this.el.interferenceOmegaSlider.value = INTERFERENCE_LIMITS.omegaDefault;

    this.el.phaseDiffSlider.min = INTERFERENCE_LIMITS.phaseDiffMin;
    this.el.phaseDiffSlider.max = INTERFERENCE_LIMITS.phaseDiffMax;
    this.el.phaseDiffSlider.value = INTERFERENCE_LIMITS.phaseDiffDefault;
  }

  _bindEvents() {
    this._bindAmplitudeGroup(this.el.ampAGroup, (value) => this.callbacks.onAmplitudeAChange(value));
    this._bindAmplitudeGroup(this.el.ampBGroup, (value) => this.callbacks.onAmplitudeBChange(value));

    this.el.chkWaveA.addEventListener('change', (e) => this.callbacks.onToggleCurve('waveA', e.target.checked));
    this.el.chkWaveB.addEventListener('change', (e) => this.callbacks.onToggleCurve('waveB', e.target.checked));
    this.el.chkResultant.addEventListener('change', (e) => this.callbacks.onToggleCurve('resultant', e.target.checked));

    this.el.timeScrubber.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      this.setTimeScrubberLive(value);
      this.callbacks.onScrub(value);
    });

    this.el.btnPlay.addEventListener('click', () => this.callbacks.onPlayToggle());
    this.el.btnReset.addEventListener('click', () => this.callbacks.onReset());

    this.el.modeButtons.pulse.addEventListener('click', () => this.callbacks.onModeChange('pulse'));
    this.el.modeButtons.interference.addEventListener('click', () => this.callbacks.onModeChange('interference'));

    this.el.interferenceAmpSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.el.interferenceAmpLive.textContent = `${v.toFixed(2)} m`;
      this.callbacks.onInterferenceAmpChange(v);
    });

    this.el.wavelengthSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.el.wavelengthLive.textContent = `${v.toFixed(2)} m`;
      this.callbacks.onWavelengthChange(v);
    });

    this.el.interferenceOmegaSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.el.interferenceOmegaLive.textContent = `${v.toFixed(1)} rad/s`;
      this.callbacks.onOmegaChangeInterference(v);
    });

    this.el.phaseDiffSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.el.phaseDiffLive.textContent = `${v.toFixed(2)} rad`;
      this.callbacks.onPhaseDiffChange(v);
    });

    this.el.btnPlayInterference.addEventListener('click', () => this.callbacks.onInterferencePlayToggle());
    this.el.btnResetInterference.addEventListener('click', () => this.callbacks.onInterferenceReset());
    this.el.btnStepInterference.addEventListener('click', () => this.callbacks.onInterferenceStep());
  }

  // Amplitude step-button groups: click selects, deselects siblings.
  _bindAmplitudeGroup(groupEl, onChange) {
    const buttons = Array.from(groupEl.querySelectorAll('.system-option'));
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => {
          b.classList.toggle('is-active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        onChange(parseFloat(btn.dataset.value));
      });
    });
  }

  setPlayButtonLabel(isPlaying) {
    this.el.btnPlay.textContent = isPlaying ? 'Pause' : 'Play';
  }

  setTimeScrubberValue(t) {
    this.el.timeScrubber.value = t;
    this.setTimeScrubberLive(t);
  }

  setTimeScrubberLive(t) {
    this.el.timeScrubberLive.textContent = `${t.toFixed(2)} s`;
  }

  curveVisibility() {
    return {
      waveA: this.el.chkWaveA.checked,
      waveB: this.el.chkWaveB.checked,
      resultant: this.el.chkResultant.checked,
    };
  }

  updateReadouts(t, ampA, ampB, superposition) {
    const store = this._lastReadout;
    updateReadout(store, 't', this.el.timeLabel, `t = ${t.toFixed(2)} s`);
    updateReadout(store, 'ampA', this.el.valAmpA, `${signedFixed(ampA, 2)} m`);
    updateReadout(store, 'ampB', this.el.valAmpB, `${signedFixed(ampB, 2)} m`);
    updateReadout(store, 'sep', this.el.valSeparation, `${superposition.separation(t).toFixed(2)} m`);
    updateReadout(store, 'peak', this.el.valResultantPeak, `${signedFixed(superposition.peakResultant(t), 2)} m`);
  }

  // Toggles which mode's stage/controls/theory are visible. Both mode
  // pairs are permanent DOM siblings — only .hidden/display flip here.
  setMode(mode) {
    const isInterference = mode === 'interference';

    this.el.modeButtons.pulse.classList.toggle('is-active', !isInterference);
    this.el.modeButtons.interference.classList.toggle('is-active', isInterference);
    this.el.modeButtons.pulse.setAttribute('aria-pressed', String(!isInterference));
    this.el.modeButtons.interference.setAttribute('aria-pressed', String(isInterference));

    this.el.pulseStage.classList.toggle('hidden', isInterference);
    this.el.pulseControls.classList.toggle('hidden', isInterference);
    this.el.interferenceStage.classList.toggle('hidden', !isInterference);
    this.el.interferenceControls.classList.toggle('hidden', !isInterference);

    this.el.pulseTheoryContent.style.display = isInterference ? 'none' : 'block';
    this.el.pulseTheoryContent2.style.display = isInterference ? 'none' : 'block';
    this.el.interferenceTheoryContent.style.display = isInterference ? 'block' : 'none';
    this.el.interferenceTheoryContent2.style.display = isInterference ? 'block' : 'none';
  }

  setInterferencePlayButtonLabel(isPlaying) {
    this.el.btnPlayInterference.textContent = isPlaying ? 'Pause' : 'Play';
  }

  // Namespaced keys (ifT, ifAmp, ...) avoid collision with Pulse mode's
  // keys in the same diffing store.
  updateInterferenceReadouts(t, interference) {
    const store = this._lastReadout;
    const waveA = interference.waveA;
    const waveB = interference.waveB;

    updateReadout(store, 'ifT', this.el.timeLabelInterference, `t = ${t.toFixed(2)} s`);
    updateReadout(store, 'ifAmp', this.el.valInterferenceAmp, `${waveA.amplitude.toFixed(2)} m`);
    updateReadout(store, 'ifWavelength', this.el.valWavelength, `${waveA.wavelength.toFixed(2)} m`);
    updateReadout(store, 'ifOmega', this.el.valInterferenceOmega, `${waveA.omega.toFixed(1)} rad/s`);
    updateReadout(store, 'ifK', this.el.valK, `${waveA.k.toFixed(2)} rad/m`);
    updateReadout(store, 'ifPhase', this.el.valPhaseDiff, `${waveB.phase.toFixed(2)} rad`);
    updateReadout(store, 'ifPeak', this.el.valInterferencePeak, `${signedFixed(interference.peakResultant(t), 2)} m`);
  }
}
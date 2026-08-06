/* =========================================================================
   WAVE-UI-MANAGER.JS — Properties of Waves (SP015 Topic 7.4)

   DOM access and event binding only. Reads slider/checkbox/button input
   and forwards it to the controller via callbacks; writes readout values
   back to the DOM. Never touches physics state directly, never draws.

   Event flow: User -> UIManager -> SimulationController -> Physics -> Renderer
   ========================================================================= */

const UI = {
  sliderStep: {
    amplitude: 0.01,
    waveSpeed: 0.05,
    frequency: 0.05
  }
};

class UIManager {
  constructor() {
    // Cache every DOM element once at construction — never re-query inside
    // loops or per-frame calls.
    this.el = {
      directionButtons: Array.from(document.querySelectorAll('#direction-switch .system-option')),

      toggleParticles: document.getElementById('toggle-particles'),
      toggleVyArrow: document.getElementById('toggle-vy-arrow'),
      toggleGuides: document.getElementById('toggle-guides'),

      sliderAmplitude: document.getElementById('slider-amplitude'),
      sliderWaveSpeed: document.getElementById('slider-wave-speed'),
      sliderFrequency: document.getElementById('slider-frequency'),
      sliderParticleCount: document.getElementById('slider-particle-count'),

      valueAmplitude: document.getElementById('value-amplitude'),
      valueWaveSpeed: document.getElementById('value-wave-speed'),
      valueFrequency: document.getElementById('value-frequency'),
      valueParticleCount: document.getElementById('value-particle-count'),

      btnPlayPause: document.getElementById('btn-play-pause'),
      btnStep: document.getElementById('btn-step'),
      btnReset: document.getElementById('btn-reset'),

      timeReadout: document.getElementById('time-readout'),
      readoutLambda: document.getElementById('readout-lambda'),
      readoutF: document.getElementById('readout-f'),
      readoutT: document.getElementById('readout-T'),
      readoutV: document.getElementById('readout-v'),
      readoutK: document.getElementById('readout-k'),
      readoutOmega: document.getElementById('readout-omega'),
      readoutY: document.getElementById('readout-y'),
      readoutVy: document.getElementById('readout-vy'),

      equationYxt: document.getElementById('equation-yxt'),
      equationVy: document.getElementById('equation-vy')
    };

    // Diffing store for updateReadout() from sim-utils.js — avoids
    // rewriting unchanged DOM text every frame.
    this._lastReadout = {};

    // Callbacks the controller registers into. UIManager never calls
    // controller methods directly by name — this keeps it swappable/testable
    // and keeps the dependency direction one-way (UI -> controller).
    this.callbacks = {
      onAmplitudeChange: null,
      onWaveSpeedChange: null,
      onFrequencyChange: null,
      onParticleCountChange: null,
      onParticlesToggle: null,
      onVyArrowToggle: null,
      onGuidesToggle: null,
      onDirectionChange: null,
      onPlayPause: null,
      onStep: null,
      onReset: null
    };

    this._bindSliders();
    this._bindToggles();
    this._bindButtons();
    this._bindDirectionSwitch();
  }

  // Registers controller callbacks in one call so wiring stays in one place
  // (the controller's constructor) rather than scattered assignments.
  on(callbacksMap) {
    Object.assign(this.callbacks, callbacksMap);
  }

  _bindSliders() {
    this.el.sliderAmplitude.addEventListener('input', () => {
      const value = parseFloat(this.el.sliderAmplitude.value);
      if (this.callbacks.onAmplitudeChange) this.callbacks.onAmplitudeChange(value);
    });

    this.el.sliderWaveSpeed.addEventListener('input', () => {
      const value = parseFloat(this.el.sliderWaveSpeed.value);
      if (this.callbacks.onWaveSpeedChange) this.callbacks.onWaveSpeedChange(value);
    });

    this.el.sliderFrequency.addEventListener('input', () => {
      const value = parseFloat(this.el.sliderFrequency.value);
      if (this.callbacks.onFrequencyChange) this.callbacks.onFrequencyChange(value);
    });

    this.el.sliderParticleCount.addEventListener('input', () => {
      const value = parseInt(this.el.sliderParticleCount.value, 10);
      if (this.callbacks.onParticleCountChange) this.callbacks.onParticleCountChange(value);
    });
  }

  _bindToggles() {
    // Sync the slider's disabled state to the checkbox's actual initial
    // state on load (not just future 'change' events) — otherwise an
    // unchecked-by-default toggle would leave the slider enabled until
    // the user interacts with the checkbox at least once.
    this.el.sliderParticleCount.disabled = !this.el.toggleParticles.checked;

    this.el.toggleParticles.addEventListener('change', () => {
      const checked = this.el.toggleParticles.checked;
      // Disable (not hide) the particle-count slider so its value is
      // preserved when re-enabled, per the agreed behaviour.
      this.el.sliderParticleCount.disabled = !checked;
      if (this.callbacks.onParticlesToggle) this.callbacks.onParticlesToggle(checked);
    });

    this.el.toggleVyArrow.addEventListener('change', () => {
      if (this.callbacks.onVyArrowToggle) this.callbacks.onVyArrowToggle(this.el.toggleVyArrow.checked);
    });

    this.el.toggleGuides.addEventListener('change', () => {
      if (this.callbacks.onGuidesToggle) this.callbacks.onGuidesToggle(this.el.toggleGuides.checked);
    });
  }

  _bindButtons() {
    this.el.btnPlayPause.addEventListener('click', () => {
      if (this.callbacks.onPlayPause) this.callbacks.onPlayPause();
    });

    this.el.btnStep.addEventListener('click', () => {
      if (this.callbacks.onStep) this.callbacks.onStep();
    });

    this.el.btnReset.addEventListener('click', () => {
      if (this.callbacks.onReset) this.callbacks.onReset();
    });
  }

  _bindDirectionSwitch() {
    this.el.directionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.el.directionButtons.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const direction = btn.dataset.direction === 'negative' ? -1 : 1;
        if (this.callbacks.onDirectionChange) this.callbacks.onDirectionChange(direction);
      });
    });
  }

  // Called by the controller once at startup to push initial slider
  // ranges/values without guessing them twice in two places.
  configureSliders({ amplitude, waveSpeed, frequency, particleCount }) {
    this.el.sliderAmplitude.min = amplitude.min;
    this.el.sliderAmplitude.max = amplitude.max;
    this.el.sliderAmplitude.step = UI.sliderStep.amplitude;
    this.el.sliderAmplitude.value = amplitude.value;

    this.el.sliderWaveSpeed.min = waveSpeed.min;
    this.el.sliderWaveSpeed.max = waveSpeed.max;
    this.el.sliderWaveSpeed.step = UI.sliderStep.waveSpeed;
    this.el.sliderWaveSpeed.value = waveSpeed.value;

    this.el.sliderFrequency.min = frequency.min;
    this.el.sliderFrequency.max = frequency.max;
    this.el.sliderFrequency.step = UI.sliderStep.frequency;
    this.el.sliderFrequency.value = frequency.value;

    this.el.sliderParticleCount.min = particleCount.min;
    this.el.sliderParticleCount.max = particleCount.max;
    this.el.sliderParticleCount.step = 1;
    this.el.sliderParticleCount.value = particleCount.value;
  }

  updatePlayPauseLabel(isPlaying) {
    this.el.btnPlayPause.textContent = isPlaying ? 'Pause' : 'Play';
  }

  // Updates the theory strip's y(x,t) and vy equations to show the
  // resolved sign for the current propagation direction, instead of the
  // general ± form. Both texts arrive pre-built from the controller,
  // which owns the sign-resolution logic (it already tracks direction).
  updateEquations({ yxtText, vyText }) {
    updateReadout(this._lastReadout, 'equationYxt', this.el.equationYxt, yxtText);
    updateReadout(this._lastReadout, 'equationVy', this.el.equationVy, vyText);
  }

  // Every value arrives pre-formatted (string) from the controller, which
  // owns unit/decimal-place decisions — UIManager only decides *whether*
  // to touch the DOM (via the shared updateReadout diffing helper).
  updateReadouts(values) {
    updateReadout(this._lastReadout, 'amplitudeSlider', this.el.valueAmplitude, values.amplitudeText);
    updateReadout(this._lastReadout, 'waveSpeedSlider', this.el.valueWaveSpeed, values.waveSpeedText);
    updateReadout(this._lastReadout, 'frequencySlider', this.el.valueFrequency, values.frequencyText);
    updateReadout(this._lastReadout, 'particleCountSlider', this.el.valueParticleCount, values.particleCountText);

    updateReadout(this._lastReadout, 'time', this.el.timeReadout, values.timeText);
    updateReadout(this._lastReadout, 'lambda', this.el.readoutLambda, values.lambdaText);
    updateReadout(this._lastReadout, 'f', this.el.readoutF, values.fText);
    updateReadout(this._lastReadout, 'T', this.el.readoutT, values.TText);
    updateReadout(this._lastReadout, 'v', this.el.readoutV, values.vText);
    updateReadout(this._lastReadout, 'k', this.el.readoutK, values.kText);
    updateReadout(this._lastReadout, 'omega', this.el.readoutOmega, values.omegaText);
    updateReadout(this._lastReadout, 'y', this.el.readoutY, values.yText);
    updateReadout(this._lastReadout, 'vy', this.el.readoutVy, values.vyText);
  }
}
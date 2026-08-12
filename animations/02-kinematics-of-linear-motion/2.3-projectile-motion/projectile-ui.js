/* =========================================================================
   PROJECTILE-UI.JS — DOM cache, UI events, and diffed readout writes only.
   ========================================================================= */

class UIManager {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this._lastReadout = {};
    this._cacheElements();
    this._renderStaticMath();
    this._configureControls();
    this._initPlaybackState();
    this._bindEvents();
  }

  // One-time pass over every element carrying a data-latex attribute
  // (theory-strip formulas, static readout/control label notation).
  // .formula elements render in displayMode; .katex-inline renders inline.
  _renderStaticMath() {
    document.querySelectorAll('[data-latex]').forEach((el) => {
      renderMath(el, el.dataset.latex, el.classList.contains('formula'));
    });
  }

  _cacheElements() {
    this.el = {
      presetButtons: [...document.querySelectorAll('[data-preset]')],
      speedSlider: document.getElementById('speed-slider'),
      angleSlider: document.getElementById('angle-slider'),
      heightSlider: document.getElementById('height-slider'),
      speedLive: document.getElementById('speed-live'),
      angleLive: document.getElementById('angle-live'),
      heightLive: document.getElementById('height-live'),
      showTrail: document.getElementById('chk-trail'),
      showVectors: document.getElementById('chk-vectors'),
      btnPlay: document.getElementById('btn-play'),
      btnReset: document.getElementById('btn-reset'),
      btnStep: document.getElementById('btn-step'),
      timeLabel: document.getElementById('time-label'),
      valX: document.getElementById('val-x'),
      valY: document.getElementById('val-y'),
      valVx: document.getElementById('val-vx'),
      valVy: document.getElementById('val-vy'),
      valSpeed: document.getElementById('val-speed'),
      valFlightTime: document.getElementById('val-flight-time'),
      valRange: document.getElementById('val-range'),
      valMaxHeight: document.getElementById('val-max-height'),
    };
  }

  _configureControls() {
    this._setRange(this.el.speedSlider, LIMITS.launchSpeedMin, LIMITS.launchSpeedMax, 1, LIMITS.launchSpeedDefault);
    this._setRange(this.el.angleSlider, LIMITS.launchAngleMin, LIMITS.launchAngleMax, 1, LIMITS.launchAngleDefault);
    this._setRange(this.el.heightSlider, LIMITS.launchHeightMin, LIMITS.launchHeightMax, 0.5, LIMITS.launchHeightDefault);
    this._writeControlValues();
  }

  _setRange(el, min, max, step, value) {
    el.min = min;
    el.max = max;
    el.step = step;
    el.value = value;
  }

  _initPlaybackState() {
    this.playbackState = new PlaybackState({
      buttonEl: this.el.btnPlay,
      onPlay: () => this.callbacks.onPlayToggle(true),
      onPause: () => this.callbacks.onPlayToggle(false),
    });
  }

  _bindEvents() {
    this.el.presetButtons.forEach((button) => button.addEventListener('click', () => this.callbacks.onPreset(button.dataset.preset)));
    this.el.speedSlider.addEventListener('input', () => this._emitParameters());
    this.el.angleSlider.addEventListener('input', () => this._emitParameters());
    this.el.heightSlider.addEventListener('input', () => this._emitParameters());
    this.el.showTrail.addEventListener('change', (event) => this.callbacks.onDisplayChange('showTrail', event.target.checked));
    this.el.showVectors.addEventListener('change', (event) => this.callbacks.onDisplayChange('showVectors', event.target.checked));
    this.el.btnPlay.addEventListener('click', () => this.playbackState.toggle());
    this.el.btnReset.addEventListener('click', () => this.callbacks.onReset());
    this.el.btnStep.addEventListener('click', () => this.callbacks.onStep());
  }

  _emitParameters() {
    this._writeControlValues();
    this.callbacks.onParametersChange(this.getParameters());
  }

  _writeControlValues() {
    const { launchSpeed, launchAngleDeg, launchHeight } = this.getParameters();
    this.el.speedLive.textContent = `${launchSpeed.toFixed(0)} m/s`;
    this.el.angleLive.textContent = `${launchAngleDeg.toFixed(0)}°`;
    this.el.heightLive.textContent = `${launchHeight.toFixed(1)} m`;
  }

  getParameters() {
    return {
      launchSpeed: parseFloat(this.el.speedSlider.value),
      launchAngleDeg: parseFloat(this.el.angleSlider.value),
      launchHeight: parseFloat(this.el.heightSlider.value),
    };
  }

  setParameters({ launchSpeed, launchAngleDeg, launchHeight }) {
    this.el.speedSlider.value = launchSpeed;
    this.el.angleSlider.value = launchAngleDeg;
    this.el.heightSlider.value = launchHeight;
    this._writeControlValues();
  }

  setPresetActive(preset) {
    this.el.presetButtons.forEach((button) => {
      const active = button.dataset.preset === preset;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  setTimeLabel(t) {
    updateReadout(this._lastReadout, 'timeLabel', this.el.timeLabel, `t = ${t.toFixed(2)} s`);
  }

  updateReadouts(values) {
    const store = this._lastReadout;
    updateReadout(store, 'x', this.el.valX, `${values.x.toFixed(2)} m`);
    updateReadout(store, 'y', this.el.valY, `${values.y.toFixed(2)} m`);
    updateReadout(store, 'vx', this.el.valVx, `${signedFixed(values.vx, 2)} m/s`);
    updateReadout(store, 'vy', this.el.valVy, `${signedFixed(values.vy, 2)} m/s`);
    updateReadout(store, 'speed', this.el.valSpeed, `${values.speed.toFixed(2)} m/s`);
    updateReadout(store, 'flightTime', this.el.valFlightTime, `${values.flightTime.toFixed(2)} s`);
    updateReadout(store, 'range', this.el.valRange, `${values.range.toFixed(2)} m`);
    updateReadout(store, 'maximumHeight', this.el.valMaxHeight, `${values.maximumHeight.toFixed(2)} m`);
  }
}

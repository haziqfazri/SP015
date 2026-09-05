/* =========================================================================
   MATERIALS-TESTING-UI-MANAGER.JS — SP015 8.1–8.2.
   Sole DOM accessor. It formats supplied values but performs no derivation.
   ========================================================================= */

class UIManager {
  constructor() {
    this.callbacks = {};
    this._lastReadout = {};
    this._cacheElements();
    this._validateElements();
    this._configureRanges();
    this._renderStaticMath();
    this._bindControls();
    this.setMode('elastic');
    this.setLoadingType('tension');
    this.setPreset('ductile');
    this.setProgress(LIMITS.progress.default);
  }

  on(callbacksMap) {
    Object.assign(this.callbacks, callbacksMap);
  }

  _cacheElements() {
    this.els = {
      elasticMode: document.getElementById('elastic-mode'),
      comparisonMode: document.getElementById('comparison-mode'),
      elasticControls: document.getElementById('elastic-controls'),
      comparisonControls: document.getElementById('comparison-controls'),
      controlsIntro: document.getElementById('controls-intro'),
      tensionType: document.getElementById('tension-type'),
      compressionType: document.getElementById('compression-type'),
      ductilePreset: document.getElementById('ductile-preset'),
      brittlePreset: document.getElementById('brittle-preset'),
      originalLength: document.getElementById('original-length'),
      originalLengthValue: document.getElementById('original-length-value'),
      area: document.getElementById('area'),
      areaValue: document.getElementById('area-value'),
      youngModulus: document.getElementById('young-modulus'),
      youngModulusValue: document.getElementById('young-modulus-value'),
      targetDeformation: document.getElementById('target-deformation'),
      targetDeformationValue: document.getElementById('target-deformation-value'),
      progress: document.getElementById('loading-progress'),
      progressValue: document.getElementById('loading-progress-value'),
      play: document.getElementById('play-button'),
      reset: document.getElementById('reset-button'),
      step: document.getElementById('step-button'),
      stageStatus: document.getElementById('stage-status'),
      elasticTheory: document.getElementById('elastic-theory'),
      comparisonTheory: document.getElementById('comparison-theory'),
      elasticNotice: document.getElementById('elastic-notice'),
      comparisonNotice: document.getElementById('comparison-notice'),
      elasticReadouts: document.getElementById('elastic-readouts'),
      comparisonReadouts: document.getElementById('comparison-readouts'),
      readoutStrain: document.getElementById('readout-strain'),
      readoutStress: document.getElementById('readout-stress'),
      readoutForce: document.getElementById('readout-force'),
      readoutDeltaL: document.getElementById('readout-delta-l'),
      readoutModulus: document.getElementById('readout-modulus'),
      readoutEnergy: document.getElementById('readout-energy'),
      readoutDensity: document.getElementById('readout-density'),
      readoutState: document.getElementById('readout-state'),
      characteristicPoints: Array.from(document.querySelectorAll('[data-characteristic-point]')),
    };
  }

  _validateElements() {
    Object.entries(this.els).forEach(([name, el]) => {
      if (!el || (Array.isArray(el) && el.length !== CHARACTERISTIC_POINTS.length)) {
        throw new Error(`Materials Testing UI is missing #${name}`);
      }
    });
  }

  _configureRange(el, config) {
    el.min = String(config.min);
    el.max = String(config.max);
    el.step = String(config.step);
    el.value = String(config.default);
  }

  _configureRanges() {
    this._configureRange(this.els.originalLength, LIMITS.originalLength);
    this._configureRange(this.els.area, LIMITS.area);
    this._configureRange(this.els.youngModulus, LIMITS.youngModulus);
    this._configureRange(this.els.targetDeformation, LIMITS.targetDeltaL);
    this._configureRange(this.els.progress, LIMITS.progress);
    this._updateParameterOutputs();
  }

  _renderStaticMath() {
    document.querySelectorAll('[data-latex]').forEach((el) => {
      renderMath(el, el.dataset.latex, el.classList.contains('formula'));
    });
  }

  _bindControls() {
    this.els.elasticMode.addEventListener('click', () => this.callbacks.onModeChange?.('elastic'));
    this.els.comparisonMode.addEventListener('click', () => this.callbacks.onModeChange?.('comparison'));
    this.els.tensionType.addEventListener('click', () => this.callbacks.onLoadingTypeChange?.('tension'));
    this.els.compressionType.addEventListener('click', () => this.callbacks.onLoadingTypeChange?.('compression'));
    this.els.ductilePreset.addEventListener('click', () => this.callbacks.onPresetChange?.('ductile'));
    this.els.brittlePreset.addEventListener('click', () => this.callbacks.onPresetChange?.('brittle'));

    this.els.originalLength.addEventListener('input', () => {
      this._updateParameterOutputs();
      this.callbacks.onOriginalLengthChange?.(Number(this.els.originalLength.value));
    });
    this.els.area.addEventListener('input', () => {
      this._updateParameterOutputs();
      this.callbacks.onAreaChange?.(Number(this.els.area.value));
    });
    this.els.youngModulus.addEventListener('input', () => {
      this._updateParameterOutputs();
      this.callbacks.onYoungModulusChange?.(Number(this.els.youngModulus.value));
    });
    this.els.targetDeformation.addEventListener('input', () => {
      this._updateParameterOutputs();
      this.callbacks.onTargetDeformationChange?.(Number(this.els.targetDeformation.value));
    });
    this.els.progress.addEventListener('input', () => {
      const value = Number(this.els.progress.value);
      this.setProgress(value);
      this.callbacks.onProgressChange?.(value);
    });

    this.playbackState = new PlaybackState({
      buttonEl: this.els.play,
      onPlay: () => this.callbacks.onPlayToggle?.(true),
      onPause: () => this.callbacks.onPlayToggle?.(false),
    });
    this.els.play.addEventListener('click', () => this.playbackState.toggle());
    this.els.reset.addEventListener('click', () => this.callbacks.onReset?.());
    this.els.step.addEventListener('click', () => this.callbacks.onStep?.());
  }

  _updateParameterOutputs() {
    this.els.originalLengthValue.textContent = `${Number(this.els.originalLength.value).toFixed(2)} m`;
    this.els.areaValue.textContent = `${Number(this.els.area.value).toFixed(0)} mm²`;
    this.els.youngModulusValue.textContent = `${Number(this.els.youngModulus.value).toFixed(0)} GPa`;
    this.els.targetDeformationValue.textContent = `${Number(this.els.targetDeformation.value).toFixed(2)} cm`;
  }

  _setToggle(activeValue, mapping) {
    Object.entries(mapping).forEach(([value, el]) => {
      const active = value === activeValue;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-pressed', String(active));
    });
  }

  setMode(mode) {
    if (mode !== 'elastic' && mode !== 'comparison') throw new RangeError('Unknown UI mode');
    this._setToggle(mode, { elastic: this.els.elasticMode, comparison: this.els.comparisonMode });
    const comparison = mode === 'comparison';
    this.els.elasticControls.classList.toggle('hidden', comparison);
    this.els.comparisonControls.classList.toggle('hidden', !comparison);
    this.els.elasticTheory.classList.toggle('hidden', comparison);
    this.els.comparisonTheory.classList.toggle('hidden', !comparison);
    this.els.elasticNotice.classList.toggle('hidden', comparison);
    this.els.comparisonNotice.classList.toggle('hidden', !comparison);
    this.els.elasticReadouts.classList.toggle('hidden', comparison);
    this.els.comparisonReadouts.classList.toggle('hidden', !comparison);
    this.els.controlsIntro.textContent = comparison
      ? 'Select an idealized material response, then move from unloaded specimen to fracture.'
      : 'Set the specimen geometry and elastic properties, then apply a measured tensile or compressive deformation.';
  }

  setLoadingType(type) {
    this._setToggle(type, { tension: this.els.tensionType, compression: this.els.compressionType });
  }

  setPreset(preset) {
    this._setToggle(preset, { ductile: this.els.ductilePreset, brittle: this.els.brittlePreset });
  }

  setPlaying(isPlaying) {
    this.playbackState.isPlaying = isPlaying;
    this.playbackState._setLabel();
  }

  setProgress(progress) {
    this.els.progress.value = String(progress);
    this.els.progressValue.textContent = `${Math.round(progress * 100)}%`;
  }

  setActiveCharacteristic(key) {
    if (this._activeCharacteristic === key) return;
    this._activeCharacteristic = key;
    this.els.characteristicPoints.forEach((el) => {
      const active = el.dataset.characteristicPoint === key;
      el.classList.toggle('is-active', active);
      el.toggleAttribute('aria-current', active);
    });
  }

  updateReadouts(values) {
    const mapping = {
      strain: this.els.readoutStrain,
      stress: this.els.readoutStress,
      force: this.els.readoutForce,
      deltaL: this.els.readoutDeltaL,
      modulus: this.els.readoutModulus,
      energy: this.els.readoutEnergy,
      density: this.els.readoutDensity,
      state: this.els.readoutState,
      stageStatus: this.els.stageStatus,
    };
    Object.entries(mapping).forEach(([key, el]) => {
      if (values[key] !== undefined) updateReadout(this._lastReadout, key, el, values[key]);
    });
  }
}

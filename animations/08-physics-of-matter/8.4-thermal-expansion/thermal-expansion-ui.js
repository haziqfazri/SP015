/* =========================================================================
   THERMAL-EXPANSION-UI.JS — SP015 8.4(a–b).
   Sole DOM accessor; physics and drawing stay outside this class.
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
    this.setMode('linear');
  }

  on(callbacksMap) {
    Object.assign(this.callbacks, callbacksMap);
  }

  _cacheElements() {
    this.els = {
      modeButtons: Array.from(document.querySelectorAll('[data-expansion-mode]')),
      linearGroup: document.getElementById('linear-controls'),
      areaGroup: document.getElementById('area-controls'),
      volumeGroup: document.getElementById('volume-controls'),
      liquidSizeGroup: document.getElementById('liquid-size-controls'),
      liquidGroup: document.getElementById('liquid-controls'),
      linearTheory: document.getElementById('linear-theory'),
      areaTheory: document.getElementById('area-theory'),
      volumeTheory: document.getElementById('volume-theory'),
      liquidTheory: document.getElementById('liquid-theory'),
      linearLength: document.getElementById('linear-length'),
      linearLengthValue: document.getElementById('linear-length-value'),
      initialArea: document.getElementById('initial-area'),
      initialAreaValue: document.getElementById('initial-area-value'),
      initialVolume: document.getElementById('initial-volume'),
      initialVolumeValue: document.getElementById('initial-volume-value'),
      alpha: document.getElementById('alpha'),
      alphaValue: document.getElementById('alpha-value'),
      targetDeltaT: document.getElementById('target-delta-t'),
      targetDeltaTValue: document.getElementById('target-delta-t-value'),
      containerCapacity: document.getElementById('container-capacity'),
      containerCapacityValue: document.getElementById('container-capacity-value'),
      fillPercent: document.getElementById('fill-percent'),
      fillPercentValue: document.getElementById('fill-percent-value'),
      liquidGamma: document.getElementById('liquid-gamma'),
      liquidGammaValue: document.getElementById('liquid-gamma-value'),
      play: document.getElementById('play-button'),
      reset: document.getElementById('reset-button'),
      step: document.getElementById('step-button'),
      stageStatus: document.getElementById('stage-status'),
      canvasSummary: document.getElementById('canvas-summary'),
      readoutLabels: Array.from(document.querySelectorAll('[data-readout-label]')),
      initial: document.getElementById('readout-initial'),
      final: document.getElementById('readout-final'),
      change: document.getElementById('readout-change'),
      deltaT: document.getElementById('readout-delta-t'),
      alphaReadout: document.getElementById('readout-alpha'),
      derivedCoefficient: document.getElementById('readout-derived-coefficient'),
      apparent: document.getElementById('readout-apparent'),
      overflow: document.getElementById('readout-overflow'),
    };
  }

  _validateElements() {
    Object.entries(this.els).forEach(([name, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        throw new Error(`Thermal Expansion UI is missing ${name}`);
      }
    });
  }

  _configureRange(element, config) {
    element.min = String(config.min);
    element.max = String(config.max);
    element.step = String(config.step);
    element.value = String(config.default);
  }

  _configureRanges() {
    this._configureRange(this.els.linearLength, LIMITS.linearLength);
    this._configureRange(this.els.initialArea, LIMITS.area);
    this._configureRange(this.els.initialVolume, LIMITS.volume);
    this._configureRange(this.els.alpha, LIMITS.alphaMicro);
    this._configureRange(this.els.targetDeltaT, LIMITS.targetDeltaT);
    this._configureRange(this.els.containerCapacity, LIMITS.containerCapacityLitres);
    this._configureRange(this.els.fillPercent, LIMITS.fillPercent);
    this._configureRange(this.els.liquidGamma, LIMITS.liquidGammaMilli);
    this._updateControlOutputs();
  }

  _renderStaticMath() {
    document.querySelectorAll('[data-latex]').forEach((element) => {
      renderMath(element, element.dataset.latex, element.classList.contains('formula'));
    });
  }

  _bindControls() {
    this.els.modeButtons.forEach((button) => {
      button.addEventListener('click', () => this.callbacks.onModeChange?.(button.dataset.expansionMode));
    });
    this._bindRange(this.els.linearLength, this.els.linearLengthValue, (value) => `${value.toFixed(2)} m`, 'onLinearLengthChange');
    this._bindRange(this.els.initialArea, this.els.initialAreaValue, (value) => `${value.toFixed(2)} m²`, 'onAreaChange');
    this._bindRange(this.els.initialVolume, this.els.initialVolumeValue, (value) => `${value.toFixed(2)} m³`, 'onVolumeChange');
    this._bindRange(this.els.alpha, this.els.alphaValue, (value) => `${value.toFixed(0)} × 10⁻⁶ K⁻¹`, 'onAlphaChange');
    this._bindRange(this.els.targetDeltaT, this.els.targetDeltaTValue, (value) => `${signedFixed(value, 0)} K`, 'onTargetDeltaTChange');
    this._bindRange(this.els.containerCapacity, this.els.containerCapacityValue, (value) => `${value.toFixed(2)} L`, 'onContainerCapacityChange');
    this._bindRange(this.els.fillPercent, this.els.fillPercentValue, (value) => `${value.toFixed(0)}%`, 'onFillPercentChange');
    this._bindRange(this.els.liquidGamma, this.els.liquidGammaValue, (value) => `${value.toFixed(2)} × 10⁻³ K⁻¹`, 'onLiquidGammaChange');
    this.playbackState = new PlaybackState({
      buttonEl: this.els.play,
      onPlay: () => this.callbacks.onPlayToggle?.(true),
      onPause: () => this.callbacks.onPlayToggle?.(false),
    });
    this.els.play.addEventListener('click', () => this.playbackState.toggle());
    this.els.reset.addEventListener('click', () => this.callbacks.onReset?.());
    this.els.step.addEventListener('click', () => this.callbacks.onStep?.());
  }

  _bindRange(input, output, formatter, callbackName) {
    input.addEventListener('input', () => {
      const value = Number(input.value);
      output.textContent = formatter(value);
      this.callbacks[callbackName]?.(value);
    });
  }

  _updateControlOutputs() {
    this.els.linearLengthValue.textContent = `${Number(this.els.linearLength.value).toFixed(2)} m`;
    this.els.initialAreaValue.textContent = `${Number(this.els.initialArea.value).toFixed(2)} m²`;
    this.els.initialVolumeValue.textContent = `${Number(this.els.initialVolume.value).toFixed(2)} m³`;
    this.els.alphaValue.textContent = `${Number(this.els.alpha.value).toFixed(0)} × 10⁻⁶ K⁻¹`;
    this.els.targetDeltaTValue.textContent = `${signedFixed(Number(this.els.targetDeltaT.value), 0)} K`;
    this.els.containerCapacityValue.textContent = `${Number(this.els.containerCapacity.value).toFixed(2)} L`;
    this.els.fillPercentValue.textContent = `${Number(this.els.fillPercent.value).toFixed(0)}%`;
    this.els.liquidGammaValue.textContent = `${Number(this.els.liquidGamma.value).toFixed(2)} × 10⁻³ K⁻¹`;
  }

  setMode(mode) {
    if (!EXPANSION_MODES.includes(mode)) throw new RangeError('Unknown thermal-expansion UI mode');
    this.els.modeButtons.forEach((button) => {
      const active = button.dataset.expansionMode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const groups = {
      linear: this.els.linearGroup,
      area: this.els.areaGroup,
      volume: this.els.volumeGroup,
      'liquid-container': this.els.liquidSizeGroup,
    };
    Object.entries(groups).forEach(([key, element]) => element.classList.toggle('hidden', key !== mode));
    this.els.liquidGroup.classList.toggle('hidden', mode !== 'liquid-container');
    const theories = {
      linear: this.els.linearTheory,
      area: this.els.areaTheory,
      volume: this.els.volumeTheory,
      'liquid-container': this.els.liquidTheory,
    };
    Object.entries(theories).forEach(([key, element]) => element.classList.toggle('hidden', key !== mode));
    this._setReadoutLabels(mode);
  }

  _setReadoutLabels(mode) {
    const labels = {
      linear: ['Initial length', 'Final length', 'Length change', 'Applied ΔT', 'Linear α', 'Area β = 2α', 'Apparent change', 'Overflow'],
      area: ['Initial area', 'Final area', 'Area change', 'Applied ΔT', 'Linear α', 'Area β', 'Apparent change', 'Overflow'],
      volume: ['Initial volume', 'Final volume', 'Volume change', 'Applied ΔT', 'Linear α', 'Volume γ', 'Apparent change', 'Overflow'],
      'liquid-container': ['Initial liquid', 'Final liquid', 'Liquid change', 'Applied ΔT', 'Container α', 'Container γ', 'Apparent change', 'Overflow'],
    }[mode];
    this.els.readoutLabels.forEach((element, index) => { element.textContent = labels[index]; });
  }

  setPlaying(isPlaying) {
    this.playbackState.isPlaying = isPlaying;
    this.playbackState._setLabel();
  }

  updateReadouts(values) {
    const targets = {
      initial: this.els.initial,
      final: this.els.final,
      change: this.els.change,
      deltaT: this.els.deltaT,
      alpha: this.els.alphaReadout,
      derivedCoefficient: this.els.derivedCoefficient,
      apparent: this.els.apparent,
      overflow: this.els.overflow,
      stageStatus: this.els.stageStatus,
      canvasSummary: this.els.canvasSummary,
    };
    Object.entries(values).forEach(([key, value]) => updateReadout(this._lastReadout, key, targets[key], value));
  }
}

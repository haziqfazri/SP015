/* =========================================================================
   MOLECULAR-GAS-UI.JS — SP015 9.1(a–d), 9.2(a–f).
   Sole DOM accessor; forwards interactions and performs diffed text writes.
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
  }

  on(callbacksMap) {
    Object.assign(this.callbacks, callbacksMap);
  }

  _cacheElements() {
    this.els = {
      modeButtons: Array.from(document.querySelectorAll('[data-gas-mode]')),
      categoryButtons: Array.from(document.querySelectorAll('[data-molecule-category]')),
      degreeFocusButtons: Array.from(document.querySelectorAll('[data-degree-focus]')),
      motionTheory: document.getElementById('motion-theory'),
      energyTheory: document.getElementById('energy-theory'),
      temperature: document.getElementById('temperature'),
      temperatureValue: document.getElementById('temperature-value'),
      amount: document.getElementById('amount'),
      amountValue: document.getElementById('amount-value'),
      volume: document.getElementById('volume'),
      volumeValue: document.getElementById('volume-value'),
      molarMass: document.getElementById('molar-mass'),
      molarMassValue: document.getElementById('molar-mass-value'),
      categoryControls: document.querySelector('.category-controls'),
      play: document.getElementById('play-button'),
      reset: document.getElementById('reset-button'),
      step: document.getElementById('step-button'),
      stageStatus: document.getElementById('stage-status'),
      canvasSummary: document.getElementById('canvas-summary'),
      readoutLabels: Array.from(document.querySelectorAll('[data-readout-label]')),
      readoutValues: Array.from(document.querySelectorAll('[data-readout-value]')),
    };
  }

  _validateElements() {
    Object.entries(this.els).forEach(([name, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        throw new Error(`Molecular Gas UI is missing ${name}`);
      }
    });
    if (this.els.readoutLabels.length !== 8 || this.els.readoutValues.length !== 8) {
      throw new Error('Molecular Gas UI requires exactly eight readout cells');
    }
  }

  _configureRange(element, config) {
    element.min = String(config.min);
    element.max = String(config.max);
    element.step = String(config.step);
    element.value = String(config.default);
  }

  _configureRanges() {
    this._configureRange(this.els.temperature, LIMITS.temperature);
    this._configureRange(this.els.amount, LIMITS.amount);
    this._configureRange(this.els.volume, LIMITS.volumeLitres);
    this._configureRange(this.els.molarMass, LIMITS.molarMassGrams);
    this._updateControlOutputs();
  }

  _renderStaticMath() {
    document.querySelectorAll('[data-latex]').forEach((element) => {
      renderMath(element, element.dataset.latex, element.classList.contains('formula'));
    });
  }

  _bindControls() {
    this.els.modeButtons.forEach((button) => {
      button.addEventListener('click', () => this.callbacks.onModeChange?.(button.dataset.gasMode));
    });
    this.els.categoryButtons.forEach((button) => {
      button.addEventListener('click', () => this.callbacks.onCategoryChange?.(button.dataset.moleculeCategory));
    });
    this.els.degreeFocusButtons.forEach((button) => {
      button.addEventListener('click', () => this.callbacks.onDegreeFocusChange?.(button.dataset.degreeFocus));
    });
    this._bindRange(this.els.temperature, this.els.temperatureValue, (value) => `${value.toFixed(0)} K`, 'onTemperatureChange');
    this._bindRange(this.els.amount, this.els.amountValue, (value) => `${value.toFixed(2)} mol`, 'onAmountChange');
    this._bindRange(this.els.volume, this.els.volumeValue, (value) => `${value.toFixed(0)} L`, 'onVolumeChange');
    this._bindRange(this.els.molarMass, this.els.molarMassValue, (value) => `${value.toFixed(0)} g mol⁻¹`, 'onMolarMassChange');
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
    this.els.temperatureValue.textContent = `${Number(this.els.temperature.value).toFixed(0)} K`;
    this.els.amountValue.textContent = `${Number(this.els.amount.value).toFixed(2)} mol`;
    this.els.volumeValue.textContent = `${Number(this.els.volume.value).toFixed(0)} L`;
    this.els.molarMassValue.textContent = `${Number(this.els.molarMass.value).toFixed(0)} g mol⁻¹`;
  }

  setMode(mode) {
    if (!MOLECULAR_GAS_MODES.includes(mode)) throw new RangeError('Unknown molecular-gas UI mode');
    this.els.modeButtons.forEach((button) => {
      const active = button.dataset.gasMode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    this.els.categoryControls.hidden = mode === 'motion';
    this.els.motionTheory.classList.toggle('hidden', mode !== 'motion');
    this.els.energyTheory.classList.toggle('hidden', mode !== 'energy');
  }

  setCategory(category) {
    if (!MOLECULE_CATEGORIES[category]) throw new RangeError('Unknown molecular category');
    this.els.categoryButtons.forEach((button) => {
      const active = button.dataset.moleculeCategory === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  setDegreeFocus(focus) {
    if (!DEGREE_FOCUS_OPTIONS[focus]) throw new RangeError('Unknown degree-of-freedom focus');
    this.els.degreeFocusButtons.forEach((button) => {
      const active = button.dataset.degreeFocus === focus;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  setDegreeAvailability(category) {
    const supported = degreeFocusesForCategory(category);
    this.els.degreeFocusButtons.forEach((button) => {
      const available = supported.includes(button.dataset.degreeFocus);
      button.disabled = !available;
      button.setAttribute('aria-disabled', String(!available));
      button.title = available
        ? DEGREE_FOCUS_OPTIONS[button.dataset.degreeFocus].label
        : `${DEGREE_FOCUS_OPTIONS[button.dataset.degreeFocus].label} is not available for ${MOLECULE_CATEGORIES[category].label.toLowerCase()} molecules`;
    });
  }

  setPlaying(isPlaying) {
    this.playbackState.isPlaying = isPlaying;
    this.playbackState._setLabel();
  }

  updateReadouts({ labels, values }) {
    if (labels.length !== 8 || values.length !== 8) {
      throw new RangeError('Molecular Gas readouts require eight labels and values');
    }
    labels.forEach((label, index) => {
      updateReadout(this._lastReadout, `label-${index}`, this.els.readoutLabels[index], label);
    });
    values.forEach((value, index) => {
      updateReadout(this._lastReadout, `value-${index}`, this.els.readoutValues[index], value);
    });
  }

  updateSummary({ stageStatus, canvasSummary }) {
    updateReadout(this._lastReadout, 'stage-status', this.els.stageStatus, stageStatus);
    updateReadout(this._lastReadout, 'canvas-summary', this.els.canvasSummary, canvasSummary);
  }
}

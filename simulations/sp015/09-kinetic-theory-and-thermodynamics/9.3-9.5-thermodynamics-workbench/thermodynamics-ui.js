/* =========================================================================
   THERMODYNAMICS-UI.JS — SP015 9.3–9.5.
   Sole DOM accessor for Energy Transfers and P–V Processes modes.
   ========================================================================= */

const PROCESS_DEFINITIONS = Object.freeze({
  isothermal: 'Temperature remains constant; the path follows PV = constant.',
  isobaric: 'Pressure remains constant while the volume changes.',
  isochoric: 'Volume remains constant, so the P–V path is vertical.',
  adiabatic: 'No heat is transferred (Q = 0); the supporting ideal-gas curve is steeper than isothermal.',
});

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

  on(callbacksMap) { Object.assign(this.callbacks, callbacksMap); }

  _cacheElements() {
    this.els = {
      modeButtons: Array.from(document.querySelectorAll('[data-thermodynamics-mode]')),
      modePanels: Array.from(document.querySelectorAll('[data-mode-panel]')),
      theoryCards: Array.from(document.querySelectorAll('[data-theory-mode]')),
      stageHeading: document.getElementById('stage-heading'), controlsHeading: document.getElementById('controls-heading'),
      heat: document.getElementById('heat'), heatValue: document.getElementById('heat-value'),
      work: document.getElementById('work'), workValue: document.getElementById('work-value'),
      initialTemperature: document.getElementById('initial-temperature'), initialTemperatureValue: document.getElementById('initial-temperature-value'),
      amount: document.getElementById('amount'), amountValue: document.getElementById('amount-value'),
      categoryButtons: Array.from(document.querySelectorAll('[data-category]')), scenarioButtons: Array.from(document.querySelectorAll('[data-scenario]')),
      processButtons: Array.from(document.querySelectorAll('[data-process]')), processDefinition: document.getElementById('process-definition'),
      processAmount: document.getElementById('process-amount'), processAmountValue: document.getElementById('process-amount-value'),
      initialPressure: document.getElementById('initial-pressure'), initialPressureValue: document.getElementById('initial-pressure-value'),
      initialVolume: document.getElementById('initial-volume'), initialVolumeValue: document.getElementById('initial-volume-value'),
      targetVolume: document.getElementById('target-volume'), targetVolumeValue: document.getElementById('target-volume-value'),
      targetPressure: document.getElementById('target-pressure'), targetPressureValue: document.getElementById('target-pressure-value'),
      targetVolumeRow: document.getElementById('target-volume-row'), targetPressureRow: document.getElementById('target-pressure-row'),
      adiabaticCategoryRow: document.getElementById('adiabatic-category-row'), processCategoryButtons: Array.from(document.querySelectorAll('[data-process-category]')),
      play: document.getElementById('play-button'), reset: document.getElementById('reset-button'), step: document.getElementById('step-button'),
      validation: document.getElementById('validation-message'), canvasSummary: document.getElementById('canvas-summary'),
      readoutLabels: Array.from(document.querySelectorAll('[data-readout-label]')), readoutValues: Array.from(document.querySelectorAll('[data-readout-value]')),
    };
  }

  _validateElements() {
    Object.entries(this.els).forEach(([name, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) throw new Error(`Thermodynamics UI is missing ${name}`);
    });
    if (this.els.modeButtons.length !== 2 || this.els.readoutLabels.length !== 8 || this.els.readoutValues.length !== 8) throw new Error('Thermodynamics UI requires two modes and exactly eight readout cells');
  }

  _configureRange(element, config) {
    element.min = String(config.min); element.max = String(config.max); element.step = String(config.step); element.value = String(config.default);
  }

  _configureRanges() {
    this._configureRange(this.els.heat, LIMITS.heatJ);
    this._configureRange(this.els.work, LIMITS.workJ);
    this._configureRange(this.els.initialTemperature, LIMITS.initialTemperatureK);
    this._configureRange(this.els.amount, LIMITS.amountMol);
    this._configureRange(this.els.processAmount, LIMITS.amountMol);
    this._configureRange(this.els.initialPressure, LIMITS.initialPressureKPa);
    this._configureRange(this.els.initialVolume, LIMITS.initialVolumeL);
    this._configureRange(this.els.targetVolume, LIMITS.finalVolumeL);
    this._configureRange(this.els.targetPressure, LIMITS.finalPressureKPa);
    this._updateControlOutputs();
  }

  _renderStaticMath() {
    document.querySelectorAll('[data-latex]').forEach((element) => renderMath(element, element.dataset.latex, element.classList.contains('formula')));
  }

  _bindControls() {
    this.els.modeButtons.forEach((button) => button.addEventListener('click', () => this.callbacks.onModeChange?.(button.dataset.thermodynamicsMode)));
    this.els.categoryButtons.forEach((button) => button.addEventListener('click', () => this.callbacks.onCategoryChange?.(button.dataset.category)));
    this.els.scenarioButtons.forEach((button) => button.addEventListener('click', () => this.callbacks.onScenarioSelect?.(button.dataset.scenario)));
    this.els.processButtons.forEach((button) => button.addEventListener('click', () => this.callbacks.onProcessChange?.(button.dataset.process)));
    this.els.processCategoryButtons.forEach((button) => button.addEventListener('click', () => this.callbacks.onProcessCategoryChange?.(button.dataset.processCategory)));
    this._bindRange(this.els.heat, this.els.heatValue, (value) => `${signedControl(value)} J`, 'onHeatChange');
    this._bindRange(this.els.work, this.els.workValue, (value) => `${signedControl(value)} J`, 'onWorkChange');
    this._bindRange(this.els.initialTemperature, this.els.initialTemperatureValue, (value) => `${value.toFixed(0)} K`, 'onInitialTemperatureChange');
    this._bindRange(this.els.amount, this.els.amountValue, (value) => `${value.toFixed(2)} mol`, 'onAmountChange');
    this._bindRange(this.els.processAmount, this.els.processAmountValue, (value) => `${value.toFixed(2)} mol`, 'onAmountChange');
    this._bindRange(this.els.initialPressure, this.els.initialPressureValue, (value) => `${value.toFixed(0)} kPa`, 'onInitialPressureChange');
    this._bindRange(this.els.initialVolume, this.els.initialVolumeValue, (value) => `${value.toFixed(1)} L`, 'onInitialVolumeChange');
    this._bindRange(this.els.targetVolume, this.els.targetVolumeValue, (value) => `${value.toFixed(1)} L`, 'onTargetVolumeChange');
    this._bindRange(this.els.targetPressure, this.els.targetPressureValue, (value) => `${value.toFixed(0)} kPa`, 'onTargetPressureChange');
    this.playbackState = new PlaybackState({ buttonEl: this.els.play, onPlay: () => this.callbacks.onPlayToggle?.(true), onPause: () => this.callbacks.onPlayToggle?.(false) });
    this.els.play.addEventListener('click', () => this.playbackState.toggle());
    this.els.reset.addEventListener('click', () => this.callbacks.onReset?.());
    this.els.step.addEventListener('click', () => this.callbacks.onStep?.());
  }

  _bindRange(input, output, formatter, callbackName) {
    input.addEventListener('input', () => { const value = Number(input.value); output.textContent = formatter(value); this.callbacks[callbackName]?.(value); });
  }

  _updateControlOutputs() {
    this.setTargets({ heatJ: Number(this.els.heat.value), workJ: Number(this.els.work.value) });
    this.setInitialState({ initialTemperatureK: Number(this.els.initialTemperature.value), amountMol: Number(this.els.amount.value), category: 'diatomic' });
    this.els.initialPressureValue.textContent = `${Number(this.els.initialPressure.value).toFixed(0)} kPa`;
    this.els.initialVolumeValue.textContent = `${Number(this.els.initialVolume.value).toFixed(1)} L`;
    this.els.targetVolumeValue.textContent = `${Number(this.els.targetVolume.value).toFixed(1)} L`;
    this.els.targetPressureValue.textContent = `${Number(this.els.targetPressure.value).toFixed(0)} kPa`;
  }

  setMode(mode) {
    if (!THERMODYNAMICS_MODES.includes(mode)) throw new RangeError('Unknown thermodynamics mode');
    this.els.modeButtons.forEach((button) => {
      const active = button.dataset.thermodynamicsMode === mode;
      button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active));
    });
    this.els.modePanels.forEach((panel) => { panel.hidden = panel.dataset.modePanel !== mode; });
    this.els.theoryCards.forEach((card) => { card.hidden = card.dataset.theoryMode !== mode; });
    const processMode = mode === 'pvProcesses';
    this.els.stageHeading.textContent = processMode ? 'P–V Processes' : 'First Law of Thermodynamics';
    this.els.controlsHeading.textContent = processMode ? 'Process controls' : 'Energy controls';
    this.els.step.textContent = processMode ? 'Step process' : 'Step transfer';
  }

  setPlaying(isPlaying) { this.playbackState.isPlaying = isPlaying; this.playbackState._setLabel(); }

  setTargets({ heatJ, workJ }) {
    this.els.heat.value = String(heatJ); this.els.work.value = String(workJ);
    this.els.heatValue.textContent = `${signedControl(heatJ)} J`; this.els.workValue.textContent = `${signedControl(workJ)} J`;
  }

  setInitialState({ initialTemperatureK, amountMol, category }) {
    this.els.initialTemperature.value = String(initialTemperatureK); this.els.amount.value = String(amountMol); this.els.processAmount.value = String(amountMol);
    this.els.initialTemperatureValue.textContent = `${initialTemperatureK.toFixed(0)} K`;
    this.els.amountValue.textContent = `${amountMol.toFixed(2)} mol`; this.els.processAmountValue.textContent = `${amountMol.toFixed(2)} mol`;
    this.setCategory(category);
  }

  setProcessState(state) {
    this.els.processAmount.value = String(state.amountMol);
    this.els.initialPressure.value = String(state.initialPressurePa / PHYSICS.pascalsPerKilopascal);
    this.els.initialVolume.value = String(state.initialVolumeM3 / PHYSICS.cubicMetresPerLitre);
    this.els.targetVolume.value = String(state.targetVolumeM3 / PHYSICS.cubicMetresPerLitre);
    this.els.targetPressure.value = String(state.targetPressurePa / PHYSICS.pascalsPerKilopascal);
    this.els.processAmountValue.textContent = `${state.amountMol.toFixed(2)} mol`;
    this.els.initialPressureValue.textContent = `${(state.initialPressurePa / PHYSICS.pascalsPerKilopascal).toFixed(0)} kPa`;
    this.els.initialVolumeValue.textContent = `${(state.initialVolumeM3 / PHYSICS.cubicMetresPerLitre).toFixed(1)} L`;
    this.els.targetVolumeValue.textContent = `${(state.targetVolumeM3 / PHYSICS.cubicMetresPerLitre).toFixed(1)} L`;
    this.els.targetPressureValue.textContent = `${(state.targetPressurePa / PHYSICS.pascalsPerKilopascal).toFixed(0)} kPa`;
  }

  updateProcessState(state) { this.setProcessState(state); }

  setProcess(process) {
    if (!PROCESS_TYPES.includes(process)) throw new RangeError('Unknown thermodynamic process');
    this.els.processButtons.forEach((button) => {
      const active = button.dataset.process === process;
      button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active));
    });
    this.els.processDefinition.textContent = PROCESS_DEFINITIONS[process];
  }

  setProcessControls(process) {
    this.els.targetVolumeRow.hidden = process === 'isochoric';
    this.els.targetPressureRow.hidden = process !== 'isochoric';
    this.els.adiabaticCategoryRow.hidden = process !== 'adiabatic';
  }

  setCategory(category) { this._setButtonSelection(this.els.categoryButtons, 'category', category); }
  setProcessCategory(category) { this._setButtonSelection(this.els.processCategoryButtons, 'processCategory', category); }

  _setButtonSelection(buttons, datasetKey, value) {
    if (!MOLECULAR_CATEGORIES[value]) throw new RangeError('Unknown molecular category');
    buttons.forEach((button) => {
      const active = button.dataset[datasetKey] === value;
      button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active));
    });
  }

  setScenario(scenarioName) {
    if (scenarioName !== null && !SCENARIOS[scenarioName]) throw new RangeError('Unknown thermodynamics scenario');
    this.els.scenarioButtons.forEach((button) => {
      const active = button.dataset.scenario === scenarioName;
      button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active));
    });
  }

  showValidation(message, controlName) {
    this.els.validation.hidden = false; this.els.validation.textContent = message;
    const inputs = [this.els.heat, this.els.work, this.els.initialTemperature, this.els.amount, this.els.processAmount, this.els.initialPressure, this.els.initialVolume, this.els.targetVolume, this.els.targetPressure];
    inputs.forEach((input) => input.setAttribute('aria-invalid', String(input.id === controlName)));
  }

  clearValidation() {
    this.els.validation.hidden = true; this.els.validation.textContent = '';
    [this.els.heat, this.els.work, this.els.initialTemperature, this.els.amount, this.els.processAmount, this.els.initialPressure, this.els.initialVolume, this.els.targetVolume, this.els.targetPressure]
      .forEach((input) => input.setAttribute('aria-invalid', 'false'));
  }

  updateReadouts({ labels, values }) {
    if (labels.length !== 8 || values.length !== 8) throw new RangeError('Thermodynamics readouts require eight labels and values');
    labels.forEach((label, index) => updateReadout(this._lastReadout, `label-${index}`, this.els.readoutLabels[index], label));
    values.forEach((value, index) => updateReadout(this._lastReadout, `value-${index}`, this.els.readoutValues[index], value));
  }

  updateParameterReadouts({ initialInternalEnergy, finalInternalEnergy, initialTemperature, finalTemperature }) {
    [initialInternalEnergy, finalInternalEnergy, initialTemperature, finalTemperature].forEach((value, index) => updateReadout(this._lastReadout, `value-${index + 3}`, this.els.readoutValues[index + 3], value));
  }

  updateAppliedReadouts({ heat, work, deltaInternalEnergy, outcome }) {
    [0, 1, 2, 7].forEach((readoutIndex, index) => updateReadout(this._lastReadout, `value-${readoutIndex}`, this.els.readoutValues[readoutIndex], [heat, work, deltaInternalEnergy, outcome][index]));
  }

  updateProcessAppliedReadouts({ pressure, volume, temperature, work, invariant }) {
    [0, 1, 2, 6, 7].forEach((readoutIndex, index) => updateReadout(this._lastReadout, `value-${readoutIndex}`, this.els.readoutValues[readoutIndex], [pressure, volume, temperature, work, invariant][index]));
  }

  updateSummary({ canvasSummary }) { updateReadout(this._lastReadout, 'canvas-summary', this.els.canvasSummary, canvasSummary); }
}

function signedControl(value) { return value >= 0 ? `+${value.toFixed(0)}` : value.toFixed(0); }

if (typeof module !== 'undefined' && module.exports) module.exports = { UIManager, PROCESS_DEFINITIONS, signedControl };

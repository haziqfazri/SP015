/* =========================================================================
   HEAT-CONDUCTION-UI.JS — SP015 8.3(a–c).
   Sole DOM accessor. Formatting and physics decisions stay in the controller.
   ========================================================================= */

class UIManager {
  constructor() {
    this.callbacks = {};
    this._lastReadout = {};
    this.mode = 'insulated';
    this.arrangement = 'one';
    this.selectedRod = 'A';
    this._cacheElements();
    this._validateElements();
    this._configureRanges();
    this._renderStaticMath();
    this._bindControls();
    this.setMode(this.mode);
    this.setArrangement(this.arrangement);
    this.setExposurePattern('bothExposed');
    this.setSelectedRod('A');
  }

  on(callbacksMap) {
    Object.assign(this.callbacks, callbacksMap);
  }

  _cacheElements() {
    this.els = {
      insulatedMode: document.getElementById('insulated-mode'),
      nonInsulatedMode: document.getElementById('non-insulated-mode'),
      oneRod: document.getElementById('one-rod'),
      twoRods: document.getElementById('two-rods'),
      arrangementControl: document.getElementById('arrangement-control'),
      exposureControl: document.getElementById('exposure-control'),
      bothExposed: document.getElementById('both-exposed'),
      aInsulated: document.getElementById('a-insulated'),
      bInsulated: document.getElementById('b-insulated'),
      rodControls: document.getElementById('rod-controls'),
      rodSelection: document.getElementById('rod-selection'),
      selectRodA: document.getElementById('select-rod-a'),
      selectRodB: document.getElementById('select-rod-b'),
      activeRodStatus: document.getElementById('active-rod-status'),
      rodASummary: document.getElementById('rod-a-summary'),
      rodBSummary: document.getElementById('rod-b-summary'),
      areaControls: Array.from(document.querySelectorAll('.area-only')),
      schematicNote: document.getElementById('schematic-note'),
      controlsIntro: document.getElementById('controls-intro'),
      insulatedNotice: document.getElementById('insulated-notice'),
      nonInsulatedNotice: document.getElementById('non-insulated-notice'),
      hotTemperature: document.getElementById('hot-temperature'),
      hotTemperatureValue: document.getElementById('hot-temperature-value'),
      coldTemperature: document.getElementById('cold-temperature'),
      coldTemperatureValue: document.getElementById('cold-temperature-value'),
      temperatureError: document.getElementById('temperature-error'),
      activeLength: document.getElementById('active-length'),
      activeLengthValue: document.getElementById('active-length-value'),
      activeArea: document.getElementById('active-area'),
      activeAreaValue: document.getElementById('active-area-value'),
      activeConductivity: document.getElementById('active-conductivity'),
      activeConductivityValue: document.getElementById('active-conductivity-value'),
      activeLengthSymbol: document.getElementById('active-length-symbol'),
      activeAreaSymbol: document.getElementById('active-area-symbol'),
      activeConductivitySymbol: document.getElementById('active-conductivity-symbol'),
      play: document.getElementById('play-button'),
      reset: document.getElementById('reset-button'),
      step: document.getElementById('step-button'),
      stageStatus: document.getElementById('stage-status'),
      canvasSummary: document.getElementById('canvas-summary'),
      heatRate: document.getElementById('readout-heat-rate'),
      interfaceTemperature: document.getElementById('readout-interface'),
      totalResistance: document.getElementById('readout-total-resistance'),
      temperatureDifference: document.getElementById('readout-temperature-difference'),
      resistanceA: document.getElementById('readout-resistance-a'),
      resistanceB: document.getElementById('readout-resistance-b'),
      arrangement: document.getElementById('readout-arrangement'),
      model: document.getElementById('readout-model'),
    };
  }

  _validateElements() {
    Object.entries(this.els).forEach(([name, el]) => {
      if (!el || (Array.isArray(el) && el.length === 0)) throw new Error(`Heat Conduction UI is missing ${name}`);
    });
  }

  _configureRange(el, config) {
    el.min = String(config.min);
    el.max = String(config.max);
    el.step = String(config.step);
    el.value = String(config.default);
  }

  _configureRanges() {
    this._configureRange(this.els.hotTemperature, LIMITS.hotTemperature);
    this._configureRange(this.els.coldTemperature, LIMITS.coldTemperature);
    this._configureRange(this.els.activeLength, LIMITS.rodLength);
    this._configureRange(this.els.activeArea, LIMITS.area);
    this._configureRange(this.els.activeConductivity, LIMITS.conductivityA);
    this._updateActiveRodOutputs();
    this.setBoundaryTemperatures(LIMITS.hotTemperature.default, LIMITS.coldTemperature.default);
  }

  _renderStaticMath() {
    document.querySelectorAll('[data-latex]').forEach((el) => {
      renderMath(el, el.dataset.latex, el.classList.contains('formula'));
    });
  }

  _bindControls() {
    this.els.insulatedMode.addEventListener('click', () => this.callbacks.onModeChange?.('insulated'));
    this.els.nonInsulatedMode.addEventListener('click', () => this.callbacks.onModeChange?.('nonInsulated'));
    this.els.oneRod.addEventListener('click', () => this.callbacks.onArrangementChange?.('one'));
    this.els.twoRods.addEventListener('click', () => this.callbacks.onArrangementChange?.('two'));
    this.els.selectRodA.addEventListener('click', () => this.callbacks.onRodSelectionChange?.('A'));
    this.els.selectRodB.addEventListener('click', () => this.callbacks.onRodSelectionChange?.('B'));
    this.els.bothExposed.addEventListener('click', () => this.callbacks.onExposurePatternChange?.('bothExposed'));
    this.els.aInsulated.addEventListener('click', () => this.callbacks.onExposurePatternChange?.('aInsulated'));
    this.els.bInsulated.addEventListener('click', () => this.callbacks.onExposurePatternChange?.('bInsulated'));

    this.els.hotTemperature.addEventListener('input', () => {
      this.callbacks.onHotTemperatureChange?.(Number(this.els.hotTemperature.value));
    });
    this.els.coldTemperature.addEventListener('input', () => {
      this.callbacks.onColdTemperatureChange?.(Number(this.els.coldTemperature.value));
    });

    this._bindRodRange(this.els.activeLength, () => this.callbacks.onRodLengthChange?.(this.selectedRod, Number(this.els.activeLength.value)));
    this._bindRodRange(this.els.activeArea, () => this.callbacks.onRodAreaChange?.(this.selectedRod, Number(this.els.activeArea.value)));
    this._bindRodRange(this.els.activeConductivity, () => this.callbacks.onRodConductivityChange?.(this.selectedRod, Number(this.els.activeConductivity.value)));

    this.playbackState = new PlaybackState({
      buttonEl: this.els.play,
      onPlay: () => this.callbacks.onPlayToggle?.(true),
      onPause: () => this.callbacks.onPlayToggle?.(false),
    });
    this.els.play.addEventListener('click', () => this.playbackState.toggle());
    this.els.reset.addEventListener('click', () => this.callbacks.onReset?.());
    this.els.step.addEventListener('click', () => this.callbacks.onStep?.());
  }

  _bindRodRange(el, callback) {
    el.addEventListener('input', () => {
      this._updateActiveRodOutputs();
      callback();
    });
  }

  _updateActiveRodOutputs() {
    this.els.activeLengthValue.textContent = `${Number(this.els.activeLength.value).toFixed(2)} m`;
    this.els.activeAreaValue.textContent = `${Number(this.els.activeArea.value).toFixed(1)} cm²`;
    this.els.activeConductivityValue.textContent = `${Number(this.els.activeConductivity.value).toFixed(0)} W m⁻¹ K⁻¹`;
  }

  _setToggle(activeValue, mapping) {
    Object.entries(mapping).forEach(([value, el]) => {
      const active = value === activeValue;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-pressed', String(active));
    });
  }

  setMode(mode) {
    if (mode !== 'insulated' && mode !== 'nonInsulated') throw new RangeError('Unknown UI mode');
    this.mode = mode;
    const schematic = mode === 'nonInsulated';
    this._setToggle(mode, { insulated: this.els.insulatedMode, nonInsulated: this.els.nonInsulatedMode });
    this.els.schematicNote.classList.toggle('hidden', !schematic);
    this.els.insulatedNotice.classList.toggle('hidden', schematic);
    this.els.nonInsulatedNotice.classList.toggle('hidden', !schematic);
    this.els.controlsIntro.textContent = schematic
      ? 'Choose one or two rods, then compare exposed and insulated sections in a qualitative steady profile.'
      : 'Set the boundary temperatures and the properties of one or two insulated rods.';
    this._syncControlVisibility();
  }

  setArrangement(arrangement) {
    if (arrangement !== 'one' && arrangement !== 'two') throw new RangeError('Unknown rod arrangement');
    this.arrangement = arrangement;
    this._setToggle(arrangement, { one: this.els.oneRod, two: this.els.twoRods });
    this._syncControlVisibility();
  }

  setSelectedRod(rodKey) {
    if (rodKey !== 'A' && rodKey !== 'B') throw new RangeError('Unknown rod selection');
    this.selectedRod = rodKey;
    this._setToggle(rodKey, { A: this.els.selectRodA, B: this.els.selectRodB });
    this.els.activeRodStatus.textContent = `Rod ${rodKey}`;
  }

  setActiveRodParameters({ rodKey, key, lengthM, areaCm2, conductivity }) {
    rodKey = rodKey || key;
    this.setSelectedRod(rodKey);
    this.els.activeLength.value = String(lengthM);
    this.els.activeArea.value = String(areaCm2);
    this.els.activeConductivity.value = String(conductivity);
    this.els.activeLengthSymbol.dataset.latex = `L_${rodKey}`;
    this.els.activeAreaSymbol.dataset.latex = `A_${rodKey}`;
    this.els.activeConductivitySymbol.dataset.latex = `k_${rodKey}`;
    [this.els.activeLengthSymbol, this.els.activeAreaSymbol, this.els.activeConductivitySymbol].forEach((el) => renderMath(el, el.dataset.latex, false));
    this._updateActiveRodOutputs();
  }

  setRodSummaries({ A, B }) {
    const format = (rod) => `Rod ${rod.key} · L ${rod.lengthM.toFixed(2)} m · k ${rod.conductivity.toFixed(0)} W m⁻¹ K⁻¹ · A ${rod.areaCm2.toFixed(1)} cm² · ${rod.status}`;
    this.els.rodASummary.textContent = format(A);
    this.els.rodBSummary.textContent = format(B);
    this.els.rodBSummary.classList.toggle('hidden', this.arrangement !== 'two');
    this.els.activeRodStatus.textContent = `Rod ${this.selectedRod} · ${this.selectedRod === 'A' ? A.status : B.status}`;
  }

  setExposurePattern(exposurePattern) {
    if (!EXPOSURE_PATTERNS.includes(exposurePattern)) throw new RangeError('Unknown exposure pattern');
    this.exposurePattern = exposurePattern;
    this._setToggle(exposurePattern, {
      bothExposed: this.els.bothExposed,
      aInsulated: this.els.aInsulated,
      bInsulated: this.els.bInsulated,
    });
  }

  _syncControlVisibility() {
    const schematic = this.mode === 'nonInsulated';
    const twoRods = this.arrangement === 'two';
    this.els.exposureControl.classList.toggle('hidden', !schematic || !twoRods);
    this.els.rodControls.classList.toggle('hidden', schematic && !twoRods);
    this.els.rodSelection.classList.toggle('hidden', !twoRods);
    this.els.areaControls.forEach((el) => el.classList.toggle('hidden', schematic));
  }

  setBoundaryTemperatures(hotCelsius, coldCelsius) {
    this.els.hotTemperature.value = String(hotCelsius);
    this.els.coldTemperature.value = String(coldCelsius);
    this.els.hotTemperatureValue.textContent = `${hotCelsius.toFixed(0)} °C`;
    this.els.coldTemperatureValue.textContent = `${coldCelsius.toFixed(0)} °C`;
  }

  showValidation(messageOrNull) {
    this.els.temperatureError.textContent = messageOrNull || '';
  }

  setPlaying(isPlaying) {
    this.playbackState.isPlaying = isPlaying;
    this.playbackState._setLabel();
  }

  updateReadouts(values) {
    const mapping = {
      heatRate: this.els.heatRate,
      interfaceTemperature: this.els.interfaceTemperature,
      totalResistance: this.els.totalResistance,
      temperatureDifference: this.els.temperatureDifference,
      resistanceA: this.els.resistanceA,
      resistanceB: this.els.resistanceB,
      arrangement: this.els.arrangement,
      model: this.els.model,
      stageStatus: this.els.stageStatus,
      canvasSummary: this.els.canvasSummary,
    };
    Object.entries(mapping).forEach(([key, el]) => {
      if (values[key] !== undefined) updateReadout(this._lastReadout, key, el, values[key]);
    });
  }
}

/* =========================================================================
   THERMODYNAMICS-CONTROLLER.JS — SP015 9.3–9.5.
   Owns the separate First Law and P–V process models, normalized playback,
   and the bridge between UIManager and the stateless renderer.
   ========================================================================= */

const THERMODYNAMICS_MODES = Object.freeze(['energyTransfers', 'pvProcesses']);
const READOUT_LABELS = Object.freeze([
  'Applied heat, Q',
  'Applied work, W',
  'Internal-energy change, ΔU',
  'Initial internal energy, U₁',
  'Final internal energy, U₂',
  'Initial temperature, T₁',
  'Final temperature, T₂',
  'Energy outcome',
]);

const PROCESS_READOUT_LABELS = Object.freeze([
  'Current pressure, P',
  'Current volume, V',
  'Current temperature, T',
  'Initial pressure, P₁',
  'Initial volume, V₁',
  'Target state',
  'Work done by gas, W',
  'Process invariant',
]);

const PROCESS_LABELS = Object.freeze({
  isothermal: 'Isothermal',
  isobaric: 'Isobaric',
  isochoric: 'Isochoric',
  adiabatic: 'Adiabatic',
});

class SimulationController {
  constructor() {
    this.mode = 'energyTransfers';
    this.category = 'diatomic';
    this.progress = 0;
    this.isPlaying = false;
    this.state = new FirstLawState();
    this.processState = new ThermodynamicProcessState();
    this.processCategory = 'diatomic';
    const initialProcessFrame = this.processState.snapshotAt(0);
    this.processMolecules = new ProcessMoleculeEnsemble({
      containerWidth: this._processContainerWidth(initialProcessFrame),
      temperatureK: initialProcessFrame.temperatureK,
    });
    this.selectedScenario = scenarioForTransfers(this.state.targetHeatJ, this.state.targetWorkJ);
    this.ui = new UIManager();
    this.ui.on({
      onModeChange: (mode) => this._onModeChange(mode),
      onHeatChange: (valueJ) => this._onHeatChange(valueJ),
      onWorkChange: (valueJ) => this._onWorkChange(valueJ),
      onInitialTemperatureChange: (valueK) => this._onInitialTemperatureChange(valueK),
      onAmountChange: (valueMol) => this._onAmountChange(valueMol),
      onInitialPressureChange: (valueKPa) => this._onInitialPressureChange(valueKPa),
      onInitialVolumeChange: (valueL) => this._onInitialVolumeChange(valueL),
      onTargetVolumeChange: (valueL) => this._onTargetVolumeChange(valueL),
      onTargetPressureChange: (valueKPa) => this._onTargetPressureChange(valueKPa),
      onProcessChange: (process) => this._onProcessChange(process),
      onProcessCategoryChange: (category) => this._onProcessCategoryChange(category),
      onCategoryChange: (category) => this._onCategoryChange(category),
      onScenarioSelect: (scenario) => this._onScenarioSelect(scenario),
      onPlayToggle: (isPlaying) => this._onPlayToggle(isPlaying),
      onStep: () => this._onStep(),
      onReset: () => this._onReset(),
    });
    this.ui.setMode(this.mode);
    this.ui.setCategory(this.category);
    this.ui.setProcessCategory(this.processCategory);
    this.ui.setProcess(this.processState.processType);
    this.ui.setProcessControls(this.processState.processType);
    this.ui.setScenario(this.selectedScenario);
    this._refreshUI();
  }

  _onModeChange(mode) {
    if (!THERMODYNAMICS_MODES.includes(mode)) throw new RangeError('Unknown thermodynamics mode');
    if (mode === this.mode) return;
    this._pause();
    this.progress = 0;
    this.mode = mode;
    if (mode === 'pvProcesses') this._resetProcessMolecules();
    this.ui.setMode(mode);
    this._refreshUI();
    redraw();
  }

  _onHeatChange(valueJ) {
    this._tryStateChange('heat', () => this.state.setHeat(valueJ), undefined, () => this._syncScenarioSelection());
  }

  _onWorkChange(valueJ) {
    this._tryStateChange('work', () => this.state.setWork(valueJ), undefined, () => this._syncScenarioSelection());
  }

  _onInitialTemperatureChange(valueK) {
    this._tryStateChange('initial-temperature', () => this.state.setInitialTemperature(valueK));
  }

  _onAmountChange(valueMol) {
    this._tryStateChange('amount', () => {
      this.state.setAmount(valueMol);
      this.processState.setAmount(valueMol);
    }, undefined, () => this._reconcileProcessMolecules());
  }

  _onCategoryChange(category) {
    const selected = MOLECULAR_CATEGORIES[category];
    if (!selected) throw new RangeError('Unknown molecular category');
    this._tryStateChange('category', () => {
      this.state.setDegreesOfFreedom(selected.degreesOfFreedom);
      this.category = category;
    }, () => {
      this.category = categoryForDegreesOfFreedom(this.state.degreesOfFreedom);
    }, () => this.ui.setCategory(this.category));
  }

  _onInitialPressureChange(valueKPa) {
    this._tryProcessChange('initial-pressure', () => {
      this.processState.setInitialPressure(valueKPa * PHYSICS.pascalsPerKilopascal);
    });
  }

  _onInitialVolumeChange(valueL) {
    this._tryProcessChange('initial-volume', () => {
      this.processState.setInitialVolume(valueL * PHYSICS.cubicMetresPerLitre);
    });
  }

  _onTargetVolumeChange(valueL) {
    this._tryProcessChange('target-volume', () => {
      this.processState.setTargetVolume(valueL * PHYSICS.cubicMetresPerLitre);
    });
  }

  _onTargetPressureChange(valueKPa) {
    this._tryProcessChange('target-pressure', () => {
      this.processState.setTargetPressure(valueKPa * PHYSICS.pascalsPerKilopascal);
    });
  }

  _onProcessChange(process) {
    this._tryProcessChange('process', () => this.processState.setProcessType(process), () => {
      this.ui.setProcess(this.processState.processType);
      this.ui.setProcessControls(this.processState.processType);
    });
  }

  _onProcessCategoryChange(category) {
    const selected = MOLECULAR_CATEGORIES[category];
    if (!selected) throw new RangeError('Unknown molecular category');
    this._tryProcessChange('process-category', () => {
      this.processState.setDegreesOfFreedom(selected.degreesOfFreedom);
      this.processCategory = category;
    }, () => this.ui.setProcessCategory(this.processCategory));
  }

  _onScenarioSelect(scenarioName) {
    const scenario = SCENARIOS[scenarioName];
    if (!scenario) throw new RangeError('Unknown thermodynamics scenario');
    this.state.setTransfers({ heatJ: scenario.heatJ, workJ: scenario.workJ });
    this._pause();
    this.progress = 0;
    this.ui.setTargets({ heatJ: scenario.heatJ, workJ: scenario.workJ });
    this._syncScenarioSelection();
    this.ui.clearValidation();
    this._refreshUI();
    redraw();
  }

  _tryStateChange(controlName, mutate, rollback = () => {}, onSuccess = () => {}) {
    try {
      mutate();
      onSuccess();
      this._reconcileProcessMolecules();
      this.ui.clearValidation();
      this._refreshParameterAndAppliedUI();
      this._requestRedrawIfPaused();
    } catch (error) {
      rollback();
      this.ui.setTargets({ heatJ: this.state.targetHeatJ, workJ: this.state.targetWorkJ });
      this.ui.setInitialState({
        initialTemperatureK: this.state.initialTemperatureK,
        amountMol: this.state.amountMol,
        category: this.category,
      });
      this.ui.showValidation(error.message, controlName);
      this._requestRedrawIfPaused();
    }
  }

  _tryProcessChange(controlName, mutate, onSuccess = () => {}) {
    try {
      mutate();
      onSuccess();
      this.ui.clearValidation();
      this._refreshUI();
      this._requestRedrawIfPaused();
    } catch (error) {
      this.ui.setProcessState(this.processState);
      this.ui.setProcess(this.processState.processType);
      this.ui.setProcessControls(this.processState.processType);
      this.ui.setProcessCategory(this.processCategory);
      this.ui.showValidation(error.message, controlName);
      this._requestRedrawIfPaused();
    }
  }

  _syncScenarioSelection() {
    this.selectedScenario = scenarioForTransfers(this.state.targetHeatJ, this.state.targetWorkJ);
    this.ui.setScenario(this.selectedScenario);
  }

  _onPlayToggle(isPlaying) {
    if (isPlaying && this.progress >= 1) {
      this.progress = 0;
      if (this.mode === 'pvProcesses') this._resetProcessMolecules();
    }
    this.isPlaying = isPlaying;
    this.ui.setPlaying(isPlaying);
    this._refreshAppliedUI();
    if (isPlaying) {
      loop();
    } else {
      noLoop();
      redraw();
    }
  }

  _pause() {
    this.isPlaying = false;
    this.ui.setPlaying(false);
    noLoop();
  }

  _onStep() {
    this._pause();
    this.progress = Math.min(1, this.progress + LIMITS.playback.stepFraction);
    if (this.mode === 'pvProcesses') this._reconcileProcessMolecules();
    this._refreshAppliedUI();
    redraw();
  }

  _onReset() {
    this._pause();
    this.progress = 0;
    if (this.mode === 'pvProcesses') this._resetProcessMolecules();
    this.ui.clearValidation();
    this._refreshAppliedUI();
    redraw();
  }

  update(dt) {
    if (!this.isPlaying) return;
    const previousProgress = this.progress;
    const clampedDt = Math.min(Math.max(dt, 0), LIMITS.playback.maxDt);
    this.progress = Math.min(1, this.progress + clampedDt / LIMITS.playback.durationSeconds);
    if (this.mode === 'pvProcesses') {
      const processFrame = this.processState.snapshotAt(this.progress);
      this.processMolecules.advance(clampedDt, {
        containerWidth: this._processContainerWidth(processFrame),
        temperatureK: processFrame.temperatureK,
      });
    }
    if (this.progress >= 1) {
      this._pause();
    }
    if (this.progress !== previousProgress) this._refreshAppliedUI();
    if (!this.isPlaying) redraw();
  }

  render(ctx, canvasWidth, canvasHeight) {
    const frame = this.frameSnapshot();
    if (this.mode === 'energyTransfers') {
      drawThermodynamicsEnergyScene(ctx, frame, canvasWidth, canvasHeight);
    } else {
      drawThermodynamicsProcessScene(ctx, frame, canvasWidth, canvasHeight);
    }
  }

  frameSnapshot() {
    if (this.mode === 'pvProcesses') return this._processFrameSnapshot();
    return this._energyFrameSnapshot();
  }

  _energyFrameSnapshot() {
    const values = this.state.snapshotAt(this.progress);
    const heatDirection = Math.sign(values.targetHeatJ);
    const workDirection = Math.sign(values.targetWorkJ);
    const outcome = values.appliedDeltaInternalEnergyJ > 0
      ? 'Internal energy increases'
      : values.appliedDeltaInternalEnergyJ < 0
        ? 'Internal energy decreases'
        : this.progress === 0 ? 'No transfer applied yet' : 'Internal energy unchanged';

    return Object.freeze({
      ...values,
      mode: this.mode,
      isPlaying: this.isPlaying,
      category: this.category,
      categoryLabel: MOLECULAR_CATEGORIES[this.category].label,
      transferMagnitudeLimitJ: Math.max(
        Math.abs(LIMITS.heatJ.min),
        Math.abs(LIMITS.heatJ.max),
        Math.abs(LIMITS.workJ.min),
        Math.abs(LIMITS.workJ.max),
      ),
      heatDirectionLabel: heatDirection > 0 ? 'HEAT INTO GAS' : heatDirection < 0 ? 'HEAT OUT OF GAS' : 'NO NET HEAT',
      workDirectionLabel: workDirection > 0 ? 'WORK BY GAS' : workDirection < 0 ? 'WORK ON GAS' : 'NO NET WORK',
      outcome,
    });
  }

  _processFrameSnapshot() {
    const values = this.processState.snapshotAt(this.progress);
    const target = this.processState.targetSnapshot;
    return Object.freeze({
      ...values,
      mode: this.mode,
      isPlaying: this.isPlaying,
      molecularCategory: this.processCategory,
      moleculeEnsemble: this.processMolecules.snapshot(),
      processLabel: PROCESS_LABELS[this.processState.processType],
      target,
      targetLabel: this.processState.processType === 'isochoric'
        ? `P₂ ${formatKPa(target.pressurePa)} kPa`
        : `V₂ ${formatLitres(target.volumeM3)} L`,
      pathSamples: this.processState.pathSamples(1),
      appliedPathSamples: this.processState.pathSamples(this.progress),
      isothermalComparisonSamples: this.processState.isothermalComparisonSamples(),
    });
  }

  _refreshUI() {
    if (this.mode === 'pvProcesses') {
      const frame = this._processFrameSnapshot();
      this.ui.updateReadouts({ labels: PROCESS_READOUT_LABELS, values: this._allProcessReadoutValues(frame) });
      this.ui.updateProcessState(this.processState);
      this._updateProcessSummary(frame);
      return;
    }
    const frame = this.frameSnapshot();
    this.ui.updateReadouts({
      labels: READOUT_LABELS,
      values: this._allReadoutValues(frame),
    });
    this._updateSummary(frame);
  }

  _refreshParameterAndAppliedUI() {
    if (this.mode === 'pvProcesses') {
      this._refreshUI();
      return;
    }
    const frame = this.frameSnapshot();
    this.ui.updateParameterReadouts(this._parameterReadoutValues(frame));
    this.ui.updateAppliedReadouts(this._appliedReadoutValues(frame));
    this._updateSummary(frame);
  }

  _refreshAppliedUI() {
    if (this.mode === 'pvProcesses') {
      const frame = this._processFrameSnapshot();
      this.ui.updateProcessAppliedReadouts(this._processAppliedReadoutValues(frame));
      this._updateProcessSummary(frame);
      return;
    }
    const frame = this.frameSnapshot();
    this.ui.updateAppliedReadouts(this._appliedReadoutValues(frame));
    this._updateSummary(frame);
  }

  _allReadoutValues(frame) {
    const applied = this._appliedReadoutValues(frame);
    const parameters = this._parameterReadoutValues(frame);
    return [
      applied.heat,
      applied.work,
      applied.deltaInternalEnergy,
      parameters.initialInternalEnergy,
      parameters.finalInternalEnergy,
      parameters.initialTemperature,
      parameters.finalTemperature,
      applied.outcome,
    ];
  }

  _parameterReadoutValues(frame) {
    return {
      initialInternalEnergy: `${(frame.initialInternalEnergyJ * PHYSICS.joulesToKilojoules).toFixed(2)} kJ`,
      finalInternalEnergy: `${(frame.targetFinalInternalEnergyJ * PHYSICS.joulesToKilojoules).toFixed(2)} kJ`,
      initialTemperature: `${frame.initialTemperatureK.toFixed(0)} K`,
      finalTemperature: `${frame.targetFinalTemperatureK.toFixed(1)} K`,
    };
  }

  _appliedReadoutValues(frame) {
    return {
      heat: `${signedFixed(frame.appliedHeatJ, 0)} J`,
      work: `${signedFixed(frame.appliedWorkJ, 0)} J`,
      deltaInternalEnergy: `${signedFixed(frame.appliedDeltaInternalEnergyJ, 0)} J`,
      outcome: frame.outcome,
    };
  }

  _updateSummary(frame) {
    this.ui.updateSummary({
      canvasSummary: `${frame.heatDirectionLabel}; ${frame.workDirectionLabel}. ${frame.outcome}. The ledger uses the path-independent First Law model.`,
    });
  }

  _allProcessReadoutValues(frame) {
    return [
      `${formatKPa(frame.pressurePa)} kPa`,
      `${formatLitres(frame.volumeM3)} L`,
      `${frame.temperatureK.toFixed(1)} K`,
      `${formatKPa(frame.initialPressurePa)} kPa`,
      `${formatLitres(frame.initialVolumeM3)} L`,
      frame.targetLabel,
      frame.workRequiredBySP015 ? `${signedFixed(frame.currentWorkJ, 0)} J` : 'Not required by SP015 9.5',
      frame.invariantLabel,
    ];
  }

  _processAppliedReadoutValues(frame) {
    return {
      pressure: `${formatKPa(frame.pressurePa)} kPa`,
      volume: `${formatLitres(frame.volumeM3)} L`,
      temperature: `${frame.temperatureK.toFixed(1)} K`,
      work: frame.workRequiredBySP015 ? `${signedFixed(frame.currentWorkJ, 0)} J` : 'Not required by SP015 9.5',
      invariant: frame.invariantLabel,
    };
  }

  _updateProcessSummary(frame) {
    const direction = frame.progress === 0
      ? 'State 1 is shown; play or step to trace the selected path.'
      : frame.processType === 'isochoric'
      ? frame.pressurePa > frame.initialPressurePa ? 'Pressure rises at fixed volume.' : 'Pressure falls at fixed volume.'
      : frame.volumeM3 > frame.initialVolumeM3 ? 'Expansion: the piston moves outward and work by the gas is positive.' : 'Compression: the piston moves inward and work by the gas is negative.';
    const scope = frame.workRequiredBySP015
      ? 'The signed graph area and work use the SP015 9.5 relationship.'
      : 'Adiabatic work is supporting context and is not required by SP015 9.5.';
    this.ui.updateSummary({ canvasSummary: `${frame.processLabel}: ${frame.invariantLabel}. ${direction} ${scope}` });
  }

  _requestRedrawIfPaused() {
    if (!this.isPlaying) redraw();
  }

  _processContainerWidth(frame) {
    return frame.volumeM3 / frame.initialVolumeM3;
  }

  _resetProcessMolecules() {
    const frame = this.processState.snapshotAt(0);
    this.processMolecules.reset({
      containerWidth: this._processContainerWidth(frame),
      temperatureK: frame.temperatureK,
    });
  }

  _reconcileProcessMolecules() {
    const frame = this.processState.snapshotAt(this.progress);
    this.processMolecules.reconcile({
      containerWidth: this._processContainerWidth(frame),
      temperatureK: frame.temperatureK,
    });
  }
}

function formatKPa(valuePa) {
  return (valuePa / PHYSICS.pascalsPerKilopascal).toFixed(0);
}

function formatLitres(valueM3) {
  return (valueM3 / PHYSICS.cubicMetresPerLitre).toFixed(1);
}

function scenarioForTransfers(heatJ, workJ) {
  const match = Object.entries(SCENARIOS)
    .find(([, scenario]) => scenario.heatJ === heatJ && scenario.workJ === workJ);
  return match ? match[0] : null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SimulationController,
    THERMODYNAMICS_MODES,
    READOUT_LABELS,
    PROCESS_READOUT_LABELS,
    PROCESS_LABELS,
    scenarioForTransfers,
    formatKPa,
    formatLitres,
  };
}

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const physics = require('./thermodynamics-physics.js');

let loopCalls = 0;
let noLoopCalls = 0;
let redrawCalls = 0;

class FakeUIManager {
  constructor() {
    this.readoutUpdates = 0;
    this.summaryUpdates = 0;
    this.parameterReadoutUpdates = 0;
    this.appliedReadoutUpdates = 0;
    this.isPlaying = false;
    this.validation = null;
    this.scenario = null;
  }
  on(callbacks) { this.callbacks = callbacks; }
  setMode(mode) { this.mode = mode; }
  setCategory(category) { this.category = category; }
  setProcessCategory(category) { this.processCategory = category; }
  setProcess(process) { this.process = process; }
  setProcessControls(process) { this.processControls = process; }
  setScenario(scenario) { this.scenario = scenario; }
  setPlaying(isPlaying) { this.isPlaying = isPlaying; }
  setTargets(targets) { this.targets = targets; }
  setInitialState(values) { this.initialState = values; this.category = values.category; }
  setProcessState(state) { this.processState = state; }
  updateProcessState(state) { this.processState = state; }
  clearValidation() { this.validation = null; }
  showValidation(message, controlName) { this.validation = { message, controlName }; }
  updateReadouts(values) { this.readoutUpdates += 1; this.readouts = values; }
  updateParameterReadouts(values) { this.parameterReadoutUpdates += 1; this.parameterReadouts = values; }
  updateAppliedReadouts(values) { this.appliedReadoutUpdates += 1; this.appliedReadouts = values; }
  updateProcessAppliedReadouts(values) { this.appliedReadoutUpdates += 1; this.processAppliedReadouts = values; }
  updateSummary(values) { this.summaryUpdates += 1; this.summary = values; }
}

const context = vm.createContext({
  ...physics,
  UIManager: FakeUIManager,
  loop() { loopCalls += 1; },
  noLoop() { noLoopCalls += 1; },
  redraw() { redrawCalls += 1; },
  drawThermodynamicsEnergyScene() {},
  drawThermodynamicsProcessScene() {},
  signedFixed(value, decimals) { return (value >= 0 ? '+' : '') + value.toFixed(decimals); },
});
const source = fs.readFileSync(path.join(__dirname, 'thermodynamics-controller.js'), 'utf8');
vm.runInContext(source, context);
const SimulationController = vm.runInContext('SimulationController', context);

const controller = new SimulationController();
assert.equal(controller.mode, 'energyTransfers');
assert.equal(controller.category, 'diatomic');
assert.equal(controller.progress, 0);
assert.equal(controller.isPlaying, false);
assert.equal(controller.selectedScenario, null);
assert.equal(controller.ui.scenario, null);
assert.equal(controller.ui.readoutUpdates, 1);
assert.match(controller.ui.summary.canvasSummary, /path-independent/);

const parameterReadsBeforePlay = controller.ui.parameterReadoutUpdates;
controller._onPlayToggle(true);
assert.equal(controller.isPlaying, true);
assert.equal(loopCalls, 1);
controller.update(2);
assert.equal(controller.progress, physics.LIMITS.playback.maxDt / physics.LIMITS.playback.durationSeconds);
assert.equal(controller.ui.parameterReadoutUpdates, parameterReadsBeforePlay, 'parameter readouts are not rewritten during playback');
const appliedReadsBeforeIdle = controller.ui.appliedReadoutUpdates;
controller.update(0.03);
assert.equal(controller.ui.appliedReadoutUpdates, appliedReadsBeforeIdle + 1);
controller._onPlayToggle(false);
assert.equal(controller.isPlaying, false);
assert.ok(noLoopCalls > 0);

const progressBeforeStep = controller.progress;
controller._onStep();
assert.equal(controller.progress, progressBeforeStep + physics.LIMITS.playback.stepFraction);
assert.equal(controller.isPlaying, false);

const progressBeforeParameter = controller.progress;
controller._onHeatChange(1000);
assert.equal(controller.progress, progressBeforeParameter, 'slider preserves progress');
assert.equal(controller.state.targetHeatJ, 1000);
controller._onCategoryChange('monatomic');
assert.equal(controller.category, 'monatomic');
assert.equal(controller.ui.category, 'monatomic', 'accepted category change updates the active button');
controller._onScenarioSelect('heating');
assert.equal(controller.progress, 0);
assert.equal(controller.isPlaying, false);
assert.equal(controller.ui.targets.heatJ, 600);
assert.equal(controller.ui.targets.workJ, 0);
assert.equal(controller.selectedScenario, 'heating');
assert.equal(controller.ui.scenario, 'heating');
assert.equal(controller.ui.validation, null);
controller._onHeatChange(650);
assert.equal(controller.ui.scenario, null, 'manual transfers clear a non-matching scenario');
controller._onScenarioSelect('heating');

controller._onInitialTemperatureChange(200);
controller._onAmountChange(0.5);
controller._onHeatChange(-1500);
assert.equal(controller.state.targetHeatJ, 600, 'invalid heat target is rejected');
assert.equal(controller.ui.validation.controlName, 'heat');
assert.equal(controller.category, 'monatomic', 'invalid edit preserves category');
controller._onCategoryChange('polyatomic');
assert.equal(controller.category, 'polyatomic');
controller._onReset();
assert.equal(controller.progress, 0);
assert.equal(controller.category, 'polyatomic');
assert.equal(controller.state.targetHeatJ, 600);
assert.equal(controller.state.targetWorkJ, 0);
assert.equal(controller.ui.validation, null);

controller._onPlayToggle(true);
controller.progress = 0.99;
controller.update(1);
assert.equal(controller.progress, 1);
assert.equal(controller.isPlaying, false, 'completion pauses');
controller._onPlayToggle(true);
assert.equal(controller.progress, 0, 'play after completion replays');
assert.equal(controller.ui.appliedReadouts.heat, '+0 J');
controller._onPlayToggle(false);
controller._onModeChange('pvProcesses');
assert.equal(controller.mode, 'pvProcesses');
assert.equal(controller.progress, 0);
assert.equal(controller.ui.mode, 'pvProcesses');
assert.equal(controller.ui.process, 'isothermal');
assert.match(controller.ui.summary.canvasSummary, /Isothermal/);
assert.equal(controller.ui.readouts.labels[0], 'Current pressure, P');
const seededProcessMolecules = controller.frameSnapshot().moleculeEnsemble;
assert.equal(seededProcessMolecules.particles.length, physics.LIMITS.processMolecules.count);
assert.equal(controller.frameSnapshot().molecularCategory, 'diatomic');
assert.equal(seededProcessMolecules.temperatureK, controller.frameSnapshot().temperatureK);
const processReadsBeforePlay = controller.ui.appliedReadoutUpdates;
controller._onPlayToggle(true);
const processReadsAfterPlay = controller.ui.appliedReadoutUpdates;
controller.update(0.03);
const movingProcessMolecules = controller.frameSnapshot().moleculeEnsemble;
assert.notDeepEqual(movingProcessMolecules.particles, seededProcessMolecules.particles, 'playing advances molecule positions');
assert.equal(processReadsAfterPlay, processReadsBeforePlay + 1, 'play refreshes the current P–V state once');
assert.equal(controller.ui.appliedReadoutUpdates, processReadsAfterPlay + 1, 'P–V progress updates only current state readouts');
controller._onPlayToggle(false);
const pausedProcessMolecules = controller.frameSnapshot().moleculeEnsemble;
controller.update(0.03);
assert.deepEqual(controller.frameSnapshot().moleculeEnsemble, pausedProcessMolecules, 'paused molecules retain their positions and velocities');
controller._onPlayToggle(true);
controller.update(0.03);
assert.notDeepEqual(controller.frameSnapshot().moleculeEnsemble.particles, pausedProcessMolecules.particles, 'resuming continues from the paused ensemble');
controller._onPlayToggle(false);
controller._onReset();
assert.deepEqual(controller.frameSnapshot().moleculeEnsemble, seededProcessMolecules, 'reset restores the seeded molecule ensemble');
controller._onProcessChange('isobaric');
assert.equal(controller.processState.processType, 'isobaric');
assert.equal(controller.ui.process, 'isobaric');
controller._onTargetVolumeChange(10);
assert.ok(controller.processState.targetVolumeM3 > controller.processState.initialVolumeM3, 'invalid equal/near target preserves process state');
assert.equal(controller.ui.validation.controlName, 'target-volume');
controller._onProcessChange('isochoric');
assert.equal(controller.processState.processType, 'isochoric');
assert.equal(controller.ui.processControls, 'isochoric');
controller._onTargetPressureChange(200);
assert.equal(controller.processState.targetPressurePa, 200000);
controller._onProcessChange('adiabatic');
controller._onProcessCategoryChange('monatomic');
assert.equal(controller.processState.degreesOfFreedom, 3);
assert.equal(controller.processCategory, 'monatomic');
controller._onModeChange('energyTransfers');
assert.equal(controller.mode, 'energyTransfers');
assert.equal(controller.state.targetHeatJ, 600, 'mode switch never substitutes process work for First Law targets');
assert.throws(() => controller._onModeChange('invalid'), /Unknown/);

console.log('thermodynamics controller tests passed');

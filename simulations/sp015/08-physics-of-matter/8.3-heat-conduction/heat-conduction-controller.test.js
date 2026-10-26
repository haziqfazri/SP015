'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const physics = require('./heat-conduction-physics.js');

class FakeUIManager {
  constructor() {
    this.isPlaying = false;
    this.validation = '';
    this.readouts = {};
  }

  on(callbacks) { this.callbacks = callbacks; }
  setMode(mode) { this.mode = mode; }
  setArrangement(arrangement) { this.arrangement = arrangement; }
  setExposurePattern(exposurePattern) { this.exposurePattern = exposurePattern; }
  setSelectedRod(rodKey) { this.selectedRod = rodKey; }
  setActiveRodParameters(parameters) { this.activeParameters = parameters; }
  setRodSummaries(summaries) { this.summaries = summaries; }
  setBoundaryTemperatures(hot, cold) { this.hot = hot; this.cold = cold; }
  showValidation(message) { this.validation = message || ''; }
  setPlaying(isPlaying) { this.isPlaying = isPlaying; }
  updateReadouts(values) { Object.assign(this.readouts, values); }
}

const context = vm.createContext({
  ...physics,
  UIManager: FakeUIManager,
  loop() {},
  noLoop() {},
  redraw() {},
  drawHeatConductionScene() {},
});
const source = fs.readFileSync(path.join(__dirname, 'heat-conduction-controller.js'), 'utf8');
vm.runInContext(source, context);
const SimulationController = vm.runInContext('SimulationController', context);

const controller = new SimulationController();
assert.equal(controller.mode, 'insulated');
assert.equal(controller.arrangement, 'one');
assert.equal(controller.ui.readouts.heatRate, '12.80 W');

controller._onArrangementChange('two');
assert.equal(controller.system.rods.length, 2);
assert.equal(controller.ui.arrangement, 'two');
assert.match(controller.ui.readouts.interfaceTemperature, /°C$/);
assert.equal(controller.selectedRod, 'A');
controller._onRodSelectionChange('B');
assert.equal(controller.selectedRod, 'B');
controller._onRodConductivityChange('B', 120);
controller._onRodSelectionChange('A');
assert.equal(controller.ui.activeParameters.conductivity, 200, 'Rod A values remain independent');
controller._onRodSelectionChange('B');
assert.equal(controller.ui.activeParameters.conductivity, 120, 'Rod B values are restored');
controller._onRodSelectionChange('A');

const previousHot = controller.hotTemperatureC;
const previousCold = controller.coldTemperatureC;
assert.equal(controller._onBoundaryTemperatureChange('hot', previousCold), false);
assert.equal(controller.hotTemperatureC, previousHot);
assert.equal(controller.coldTemperatureC, previousCold);
assert.match(controller.ui.validation, /greater/);

assert.equal(controller._onBoundaryTemperatureChange('cold', 10), true);
assert.equal(controller.coldTemperatureC, 10);
assert.equal(controller.ui.validation, '');

const beforeStep = controller.tracerPhase;
controller._onStep();
assert.equal(controller.isPlaying, false);
assert.notEqual(controller.tracerPhase, beforeStep);
controller._onReset();
assert.equal(controller.tracerPhase, 0);
assert.equal(controller.arrangement, 'two', 'Reset preserves parameters and arrangement');

controller._onPlayToggle(true);
controller.update(5);
assert.equal(controller.isPlaying, true);
assert.ok(controller.tracerPhase > 0 && controller.tracerPhase < 1, 'tracer phase remains bounded');
controller._onPlayToggle(false);

controller._onModeChange('nonInsulated');
assert.equal(controller.ui.readouts.heatRate, 'Not calculated');
assert.equal(controller.ui.readouts.interfaceTemperature, 'Not calculated — side loss');
assert.equal(controller.ui.readouts.totalResistance, 'Not sufficient');
assert.equal(controller.ui.readouts.model, 'Schematic — both exposed');
assert.equal(controller.frameSnapshot().rods.map((rod) => rod.insulated).join(','), 'false,false');
assert.equal(controller.frameSnapshot().rods.map((rod) => rod.resistance).join(','), ',');
assert.equal(controller.frameSnapshot().interfaceTemperatureC, null);
const lowConductivityShape = controller.frameSnapshot().graphPoints[20].temperature;
controller._onRodConductivityChange('A', 400);
assert.notEqual(controller.frameSnapshot().graphPoints[20].temperature, lowConductivityShape, 'conductivity changes the schematic curve');
assert.equal(controller.frameSnapshot().totalLengthM, 1, 'snapshot exposes physical total length');

controller._onExposurePatternChange('aInsulated');
assert.equal(controller.ui.exposurePattern, 'aInsulated');
assert.equal(controller.ui.readouts.model, 'Schematic — A insulated');
assert.equal(controller.frameSnapshot().rods.map((rod) => rod.insulated).join(','), 'true,false');

controller._onExposurePatternChange('bInsulated');
assert.equal(controller.ui.readouts.model, 'Schematic — B insulated');
assert.equal(controller.frameSnapshot().rods.map((rod) => rod.insulated).join(','), 'false,true');

const interfaceBefore = controller.frameSnapshot().interfacePosition;
controller._onRodLengthChange('A', 0.75);
assert.notEqual(controller.frameSnapshot().interfacePosition, interfaceBefore, 'rod length moves the shared interface');

controller._onArrangementChange('one');
assert.equal(controller.exposurePattern, 'singleExposed');
assert.equal(controller.selectedRod, 'A');
assert.equal(controller.frameSnapshot().rods.length, 1);
assert.equal(controller.ui.readouts.interfaceTemperature, 'Not applicable');
assert.throws(() => controller._onExposurePatternChange('bothExposed'), /require two rods/);

controller._onArrangementChange('two');
assert.equal(controller.exposurePattern, 'bInsulated', 'two-rod exposure pattern is restored');
controller._onModeChange('insulated');
assert.match(controller.ui.readouts.heatRate, /W$/);
controller._onModeChange('nonInsulated');
assert.equal(controller.exposurePattern, 'bInsulated', 'mode changes preserve exposure pattern');

assert.throws(() => controller._onArrangementChange('three'), /Unknown rod arrangement/);
assert.throws(() => controller._onExposurePatternChange('invalid'), /Unknown exposure pattern/);
assert.throws(() => controller._onRodLengthChange('C', 0.5), /Unknown rod key/);

console.log('heat-conduction controller tests passed');

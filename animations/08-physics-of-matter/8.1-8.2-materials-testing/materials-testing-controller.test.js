'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const physics = require('./materials-testing-physics.js');

class FakeUIManager {
  constructor() {
    this.progress = physics.LIMITS.progress.default;
    this.isPlaying = false;
    this.activeCharacteristic = null;
  }

  on(callbacks) { this.callbacks = callbacks; }
  setMode() {}
  setLoadingType() {}
  setPreset() {}
  setProgress(progress) { this.progress = progress; }
  setPlaying(isPlaying) { this.isPlaying = isPlaying; }
  updateReadouts() {}
  setActiveCharacteristic(key) { this.activeCharacteristic = key; }
}

const context = vm.createContext({
  ...physics,
  UIManager: FakeUIManager,
  signedFixed: (value, decimals) => `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}`,
  loop() {},
  noLoop() {},
  redraw() {},
});
const source = fs.readFileSync(path.join(__dirname, 'materials-testing-controller.js'), 'utf8');
vm.runInContext(source, context);
const SimulationController = vm.runInContext('SimulationController', context);

function playUntilPause(controller) {
  controller._onPlayToggle(true);
  for (let frame = 0; frame < 10000 && controller.isPlaying; frame += 1) {
    controller.update(0.03);
  }
  assert.equal(controller.isPlaying, false, 'playback should reach an automatic pause');
}

function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${label}: expected ${expected}, received ${actual}`);
}

const ductile = new SimulationController();
ductile._onModeChange('comparison');
const expectedStops = physics.CHARACTERISTIC_POINTS.map(({ pointIndex }) => (
  physics.MATERIAL_CURVES.ductile[pointIndex].progress
));
expectedStops.forEach((expectedProgress, index) => {
  playUntilPause(ductile);
  assert.equal(ductile.progress, expectedProgress, `ductile stop ${index + 1}`);
  assert.equal(ductile.ui.progress, expectedProgress, `progress slider at stop ${index + 1}`);
  assert.equal(ductile.ui.activeCharacteristic, physics.CHARACTERISTIC_POINTS[index].key, `highlight at stop ${index + 1}`);
});

ductile._onPlayToggle(true);
assert.equal(ductile.progress, physics.LIMITS.progress.min, 'Play at fracture restarts from zero');
assert.equal(ductile.isPlaying, true);
ductile._pause();

const positioned = new SimulationController();
positioned._onModeChange('comparison');
positioned._onProgressChange(0.50);
playUntilPause(positioned);
assert.equal(positioned.progress, 0.78, 'manual position pauses at the next characteristic point');

const stepped = new SimulationController();
stepped._onModeChange('comparison');
stepped._onProgressChange(0.17);
stepped._onStep();
close(stepped.progress, 0.22, 'Step remains a fixed manual increment');
assert.equal(stepped.isPlaying, false);
stepped._onReset();
assert.equal(stepped.progress, physics.LIMITS.progress.min);
assert.equal(stepped.ui.activeCharacteristic, null);

const brittle = new SimulationController();
brittle._onModeChange('comparison');
brittle._onPresetChange('brittle');
brittle._onPlayToggle(true);
for (let frame = 0; frame < 60; frame += 1) brittle.update(0.03);
assert.equal(brittle.isPlaying, true, 'brittle playback does not pause at ductile thresholds');
while (brittle.isPlaying) brittle.update(0.03);
assert.equal(brittle.progress, physics.LIMITS.progress.max, 'brittle pauses at fracture');

const elastic = new SimulationController();
elastic._onPlayToggle(true);
for (let frame = 0; frame < 60; frame += 1) elastic.update(0.03);
assert.equal(elastic.isPlaying, true, 'elastic playback has no intermediate auto-pauses');
while (elastic.isPlaying) elastic.update(0.03);
assert.equal(elastic.progress, physics.LIMITS.progress.max, 'elastic playback stops at maximum progress');

console.log('materials-testing controller tests passed');

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const physics = require('./molecular-gas-physics.js');

let loopCalls = 0;
let noLoopCalls = 0;
let redrawCalls = 0;

class FakeUIManager {
  constructor() {
    this.readoutUpdates = 0;
    this.summaryUpdates = 0;
    this.isPlaying = false;
  }
  on(callbacks) { this.callbacks = callbacks; }
  setMode(mode) { this.mode = mode; }
  setCategory(category) { this.category = category; }
  setDegreeFocus(focus) { this.degreeFocus = focus; }
  setDegreeAvailability(category) {
    this.degreeAvailabilityCategory = category;
    this.availableDegreeFocuses = [...physics.degreeFocusesForCategory(category)];
  }
  setPlaying(isPlaying) { this.isPlaying = isPlaying; }
  updateReadouts(values) { this.readoutUpdates += 1; this.readouts = values; }
  updateSummary(values) { this.summaryUpdates += 1; this.summary = values; }
}

const context = vm.createContext({
  ...physics,
  UIManager: FakeUIManager,
  loop() { loopCalls += 1; },
  noLoop() { noLoopCalls += 1; },
  redraw() { redrawCalls += 1; },
  drawMolecularGasScene() {},
});
const source = fs.readFileSync(path.join(__dirname, 'molecular-gas-controller.js'), 'utf8');
vm.runInContext(source, context);
const SimulationController = vm.runInContext('SimulationController', context);
const scientificText = vm.runInContext('scientificText', context);
const visualSpeedForRms = vm.runInContext('visualSpeedForRms', context);

const controller = new SimulationController();
assert.equal(controller.mode, 'motion');
assert.equal(controller.state.category, 'diatomic');
assert.equal(controller.degreeFocus, 'all');
assert.deepEqual(controller.ui.availableDegreeFocuses, [...physics.CATEGORY_DEGREE_FOCUSES.diatomic]);
assert.equal(controller.ensemble.count, physics.LIMITS.ensemble.count);
assert.equal(controller.ui.readoutUpdates, 1);
assert.match(controller.ui.summary.canvasSummary, /Representative 2D projection/);
assert.match(scientificText(4.65e-26, 2, 'kg'), /10⁻²⁶ kg$/);
assert.ok(visualSpeedForRms(controller.state.rmsSpeed) >= physics.DISPLAY.visualSpeedMin);
assert.ok(visualSpeedForRms(controller.state.rmsSpeed) <= physics.DISPLAY.visualSpeedMax);

const redrawBeforeParameter = redrawCalls;
controller._onTemperatureChange(600);
controller._onAmountChange(1.5);
controller._onVolumeChange(30);
controller._onMolarMassChange(32);
controller._onCategoryChange('polyatomic');
assert.equal(controller.state.temperatureK, 600);
assert.equal(controller.state.amountMol, 1.5);
assert.equal(controller.state.volumeM3, 30e-3);
assert.equal(controller.state.molarMassKgPerMol, 32e-3);
assert.equal(controller.state.degreesOfFreedom, 6);
assert.equal(controller.ui.category, 'polyatomic');
assert.ok(redrawCalls > redrawBeforeParameter, 'parameter changes redraw while paused');

const readsBeforeAnimation = controller.ui.readoutUpdates;
controller._onPlayToggle(true);
assert.equal(controller.isPlaying, true);
assert.equal(loopCalls, 1);
controller.update(2);
assert.equal(controller.animationTime, physics.LIMITS.playback.maxDt, 'update clamps dt');
assert.equal(controller.ui.readoutUpdates, readsBeforeAnimation, 'animation does not rewrite parameter readouts');
controller._onPlayToggle(false);
assert.equal(controller.ui.isPlaying, false);
assert.ok(noLoopCalls > 0);

const snapshotBeforeStep = JSON.stringify(controller.ensemble.snapshot());
controller._onStep();
assert.equal(controller.isPlaying, false);
assert.equal(controller.animationTime, physics.LIMITS.playback.maxDt + physics.LIMITS.playback.stepSeconds);
assert.notEqual(JSON.stringify(controller.ensemble.snapshot()), snapshotBeforeStep);

controller._onModeChange('energy');
assert.equal(controller.mode, 'energy');
assert.equal(controller.ui.mode, 'energy');
assert.equal(controller.ui.readouts.values[1], '6');
const readsBeforeFocusChange = controller.ui.readoutUpdates;
controller._onDegreeFocusChange('rotate-r3');
assert.equal(controller.degreeFocus, 'rotate-r3');
assert.equal(controller.ui.degreeFocus, 'rotate-r3');
assert.equal(controller.ui.readoutUpdates, readsBeforeFocusChange, 'focus changes do not rewrite energy readouts');
assert.match(controller.ui.summary.canvasSummary, /R₃ rotation/);
const energyEnsembleBefore = JSON.stringify(controller.ensemble.snapshot());
controller._onStep();
assert.equal(JSON.stringify(controller.ensemble.snapshot()), energyEnsembleBefore, 'energy animation leaves ensemble unchanged');

const preserved = {
  mode: controller.mode,
  temperature: controller.state.temperatureK,
  amount: controller.state.amountMol,
  volume: controller.state.volumeM3,
  mass: controller.state.molarMassKgPerMol,
  category: controller.state.category,
  degreeFocus: controller.degreeFocus,
};
controller._onReset();
assert.equal(controller.animationTime, 0);
assert.equal(controller.collisionFlashes.length, 0);
assert.deepEqual({
  mode: controller.mode,
  temperature: controller.state.temperatureK,
  amount: controller.state.amountMol,
  volume: controller.state.volumeM3,
  mass: controller.state.molarMassKgPerMol,
  category: controller.state.category,
  degreeFocus: controller.degreeFocus,
}, preserved, 'Reset preserves mode, gas parameters, and visual focus');

controller._onCategoryChange('diatomic');
assert.equal(controller.degreeFocus, 'all', 'category downgrade falls back to all');
assert.equal(controller.ui.degreeFocus, 'all');
assert.equal(controller.ui.availableDegreeFocuses.includes('rotate-r3'), false);
controller._onDegreeFocusChange('rotate-r2');
controller._onModeChange('motion');
assert.equal(controller.degreeFocus, 'rotate-r2', 'mode changes preserve focus');
controller._onModeChange('energy');
assert.equal(controller.degreeFocus, 'rotate-r2');
controller._onCategoryChange('monatomic');
assert.equal(controller.degreeFocus, 'all');
assert.throws(() => controller._onDegreeFocusChange('rotate-r1'), /unavailable/);
assert.throws(() => controller._onDegreeFocusChange('invalid'), /Unknown degree-of-freedom focus/);

controller._onModeChange('motion');
controller.ensemble.advance = () => Array.from({ length: 40 }, (_, index) => ({ type: 'pair', x: index / 50, y: 0.3 }));
controller._advanceVisual(0.01);
assert.equal(controller.collisionFlashes.length, physics.LIMITS.collisionFlashes.max, 'flash buffer is capped');
assert.throws(() => controller._onModeChange('invalid'), /Unknown molecular-gas mode/);
assert.throws(() => controller._onCategoryChange('invalid'), /Unknown molecule category/);

const snapshot = controller.frameSnapshot();
assert.equal(snapshot.sampleSpeeds.length, 6);
assert.equal(snapshot.degreeFocus, 'all');
assert.deepEqual([...snapshot.supportedDegreeFocuses], [...physics.CATEGORY_DEGREE_FOCUSES.monatomic]);
assert.ok(Object.isFrozen(snapshot));
assert.ok(Math.abs(snapshot.sampleRmsSpeed - snapshot.rmsSpeed) / snapshot.rmsSpeed < 1e-12);

console.log('molecular-gas controller tests passed');

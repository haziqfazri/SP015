'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const physics = require('./thermal-expansion-physics.js');

let loopCalls = 0;
let noLoopCalls = 0;
let redrawCalls = 0;

class FakeUIManager {
  constructor() {
    this.readouts = {};
    this.isPlaying = false;
  }
  on(callbacks) { this.callbacks = callbacks; }
  setMode(mode) { this.mode = mode; }
  setPlaying(isPlaying) { this.isPlaying = isPlaying; }
  updateReadouts(values) { Object.assign(this.readouts, values); }
}

const signedFixed = (value, decimals) => `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}`;
const context = vm.createContext({
  ...physics,
  UIManager: FakeUIManager,
  signedFixed,
  loop() { loopCalls += 1; },
  noLoop() { noLoopCalls += 1; },
  redraw() { redrawCalls += 1; },
  drawThermalExpansionScene() {},
});
const source = fs.readFileSync(path.join(__dirname, 'thermal-expansion-controller.js'), 'utf8');
vm.runInContext(source, context);
const SimulationController = vm.runInContext('SimulationController', context);

const controller = new SimulationController();
assert.equal(controller.state.mode, 'linear');
assert.equal(controller.progress, 0);
assert.equal(controller.state.deltaTK, 0);
assert.equal(controller.ui.readouts.change, '+0.000 mm');

controller._onStep();
assert.equal(controller.progress, physics.LIMITS.progress.stepIncrement);
assert.equal(controller.state.deltaTK, 5);
assert.match(controller.ui.readouts.deltaT, /^\+5\.0 K$/);

controller._onTargetDeltaTChange(-40);
assert.equal(controller.state.deltaTK, -4, 'target changes preserve normalized progress');
assert.match(controller.ui.readouts.change, /^-/);

const redrawBefore = redrawCalls;
controller._onAreaChange(2);
assert.ok(redrawCalls > redrawBefore, 'parameter changes redraw while paused');
controller._onAlphaChange(20);
controller._onVolumeChange(1.5);
controller._onLinearLengthChange(2.5);

controller._onModeChange('liquid-container');
assert.equal(controller.ui.mode, 'liquid-container');
controller._onContainerCapacityChange(1.5);
controller._onFillPercentChange(80);
controller._onLiquidGammaChange(0.6);
assert.equal(controller.state.containerCapacityM3, 1.5e-3);
assert.equal(controller.state.fillFraction, 0.8);
assert.equal(controller.state.liquidGammaPerK, 0.6e-3);
assert.match(controller.ui.readouts.apparent, /mL$/);
assert.match(controller.frameSnapshot().mode, /liquid-container/);

controller._onReset();
assert.equal(controller.progress, 0);
assert.equal(controller.state.deltaTK, 0);
assert.equal(controller.state.mode, 'liquid-container', 'Reset preserves mode');
assert.equal(controller.targetDeltaT, -40, 'Reset preserves target temperature');
assert.equal(controller.state.fillFraction, 0.8, 'Reset preserves parameters');

controller._onPlayToggle(true);
assert.equal(controller.isPlaying, true);
assert.equal(loopCalls, 1);
controller.update(5);
assert.equal(controller.progress, 0.0075, 'update clamps dt to 0.03 s');
controller._onPlayToggle(false);
assert.equal(controller.ui.isPlaying, false);
assert.ok(noLoopCalls > 0);

controller.progress = 1;
controller._applyProgress();
controller._onPlayToggle(true);
assert.equal(controller.progress, 0, 'replay restarts at zero after completion');
controller._onPlayToggle(false);

controller.progress = 0.999;
controller._onPlayToggle(true);
controller.update(1);
assert.equal(controller.progress, 1);
assert.equal(controller.isPlaying, false, 'playback pauses at completion');

controller._onModeChange('area');
assert.ok(Math.abs(controller.state.alphaPerK - 20e-6) < 1e-15, 'mode changes preserve shared coefficient');
assert.equal(controller.targetDeltaT, -40, 'mode changes preserve target temperature');
assert.throws(() => controller._onModeChange('invalid'), RangeError);
assert.throws(() => controller._onTargetDeltaTChange(999), /outside the configured limits/);

console.log('thermal-expansion controller tests passed');

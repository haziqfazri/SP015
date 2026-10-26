'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class FakeUIManager {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.speed = 20;
    this.time = 0;
    this.lastReadouts = {};
    this.lastAnnouncement = '';
    this.playbackState = {
      isPlaying: false,
      pause: () => { this.playbackState.isPlaying = false; },
    };
  }

  getSpeedValue() { return this.speed; }
  setPlayButtonLabel() {}
  setTimeLabel(t) { this.time = t; }
  setMode() {}
  updateReadouts(values) { this.lastReadouts = values; }
  announce(message) { this.lastAnnouncement = message; }
}

class FakeAudioTone {
  start() {}
  stop() {}
  updateFrequency() {}
}

const context = vm.createContext({
  UIManager: FakeUIManager,
  AudioTone: FakeAudioTone,
  drawDopplerScene() {},
  loop() {},
  noLoop() {},
  redraw() {},
});

const physicsSource = fs.readFileSync(path.join(__dirname, 'doppler-effect-physics.js'), 'utf8');
const controllerSource = fs.readFileSync(path.join(__dirname, 'doppler-effect-controller.js'), 'utf8');
vm.runInContext(physicsSource, context);
vm.runInContext(controllerSource, context);

const { DOMAIN, LIMITS, SimulationController } = vm.runInContext(
  '({ DOMAIN, LIMITS, SimulationController })',
  context
);

function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${label}: expected ${expected}, received ${actual}`);
}

const stepped = new SimulationController();
stepped._onPlayToggle(true);
stepped._onStep();
assert.equal(stepped.isPlaying, false, 'Step pauses playback');
close(stepped.t, LIMITS.timeStep, 'Step advances by the configured interval');
close(stepped.ui.time, LIMITS.timeStep, 'Step refreshes the displayed time');

const movingSource = new SimulationController();
movingSource._onPlayToggle(true);
movingSource.update((DOMAIN.xMax - DOMAIN.xMin) / movingSource.doppler.moverSpeed());
assert.equal(movingSource.isPlaying, true, 'moving-source playback continues after looping');
assert.equal(movingSource.t, LIMITS.timeMin, 'moving-source loop resets time');
assert.equal(movingSource.sourceBody.positionAt(movingSource.t), DOMAIN.xMin, 'source loops to the left edge');
assert.equal(movingSource.observerBody.positionAt(movingSource.t), 0, 'stationary observer remains centered');

const movingObserver = new SimulationController();
movingObserver._onModeChange('movingObserver');
movingObserver._onPlayToggle(true);
movingObserver.update((DOMAIN.xMax - DOMAIN.xMin) / movingObserver.doppler.moverSpeed());
assert.equal(movingObserver.isPlaying, true, 'moving-observer playback continues after looping');
assert.equal(movingObserver.t, LIMITS.timeMin, 'moving-observer loop resets time');
assert.equal(movingObserver.observerBody.positionAt(movingObserver.t), DOMAIN.xMin, 'observer loops to the left edge');
assert.equal(movingObserver.sourceBody.positionAt(movingObserver.t), 0, 'stationary source remains centered');

const boundaryStep = new SimulationController();
boundaryStep.t = ((DOMAIN.xMax - DOMAIN.xMin) / boundaryStep.doppler.moverSpeed()) - 0.01;
boundaryStep._onStep();
assert.equal(boundaryStep.isPlaying, false, 'boundary Step remains paused');
assert.equal(boundaryStep.t, LIMITS.timeMin, 'boundary Step starts a new cycle');

const stationary = new SimulationController();
stationary.ui.speed = 0;
stationary._onSpeedChange(0);
stationary._onPlayToggle(true);
stationary.update(5);
assert.equal(stationary.isPlaying, true, 'zero-speed playback does not stop');
assert.equal(stationary.t, 5, 'zero-speed playback does not loop');
assert.equal(stationary.doppler.moverPositionAt(stationary.t), DOMAIN.xMin, 'zero-speed mover remains stationary');
assert.ok(stationary.wavefrontHistory.length <= 22, 'wavefront history remains bounded');
assert.ok(stationary.wavefrontHistory[0].emitTime >= 4, 'expired wavefronts are pruned');

const speedChange = new SimulationController();
speedChange._advance(1);
const emittedBeforeSpeedChange = speedChange.wavefrontHistory.map((front) => ({ ...front }));
const positionBeforeSpeedChange = speedChange.doppler.moverPositionAt(speedChange.t);
speedChange.ui.speed = 40;
speedChange._onSpeedChange(40);
close(
  speedChange.doppler.moverPositionAt(speedChange.t),
  positionBeforeSpeedChange,
  'speed change preserves current position'
);
assert.equal(
  JSON.stringify(speedChange.wavefrontHistory),
  JSON.stringify(emittedBeforeSpeedChange),
  'speed change preserves previously emitted wavefront centres'
);
speedChange._advance(0.05);
const firstFrontAfterSpeedChange = speedChange.wavefrontHistory.at(-1);
close(firstFrontAfterSpeedChange.emitTime, 1.05, 'new wavefront uses the next emission time');
close(firstFrontAfterSpeedChange.emitX, -18, 'new wavefront uses the updated source trajectory');
speedChange._onReset();
assert.equal(speedChange.doppler.moverPositionAt(speedChange.t), DOMAIN.xMin, 'Reset restores the initial mover position');
assert.equal(
  JSON.stringify(speedChange.wavefrontHistory),
  JSON.stringify([{ emitTime: LIMITS.timeMin, emitX: DOMAIN.xMin }]),
  'Reset starts a clean wavefront history'
);

const shift = new SimulationController();
assert.equal(shift.ui.lastReadouts.frequencyShiftText, '↑ Higher', 'approaching source reports a higher frequency');
shift._advance(3);
assert.equal(shift.ui.lastReadouts.frequencyShiftText, '↓ Lower', 'receding source reports a lower frequency');
shift.ui.speed = 0;
shift._onSpeedChange(0);
assert.equal(shift.ui.lastReadouts.frequencyShiftText, '= No shift', 'stationary source reports no shift');

console.log('doppler-effect controller tests passed');

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const physics = require('./thermal-expansion-physics.js');

const calls = [];
const noop = (...args) => { calls.push(args); };
const drawingContext = { setLineDash: noop };
const ctx = new Proxy({
  drawingContext,
  LEFT: 'left', CENTER: 'center', RIGHT: 'right', TOP: 'top', BOTTOM: 'bottom',
  BASELINE: 'baseline', BOLD: 'bold', NORMAL: 'normal', CLOSE: 'close',
}, {
  get(target, property) {
    if (property in target) return target[property];
    return noop;
  },
});

const helpers = {
  PALETTE: {
    ink: '#102126', panel: '#f8faf6', line: '#c9d2c7', orange: '#ff6b35', teal: '#35b9ad', path: '#b4beb2',
    inkRGB: [16, 33, 38], mutedRGB: [97, 117, 117], orangeRGB: [255, 107, 53], tealRGB: [53, 185, 173],
  },
  drawArrowCtx: noop,
  drawDashedGuide: noop,
  drawLabel: noop,
  signedFixed: (value, decimals) => `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}`,
};
const context = vm.createContext({ ...physics, ...helpers, module: { exports: {} } });
const source = fs.readFileSync(path.join(__dirname, 'thermal-expansion-renderer.js'), 'utf8');
vm.runInContext(source, context);
const renderer = context.module.exports;

assert.equal(renderer.clampDisplayScale(1), 1);
assert.equal(renderer.clampDisplayScale(100), physics.DISPLAY.maximumDisplayScale);
assert.equal(renderer.clampDisplayScale(0), physics.DISPLAY.minimumDisplayScale);
assert.ok(renderer.normalizedDimension(physics.LIMITS.linearLength.min, physics.LIMITS.linearLength) < renderer.normalizedDimension(physics.LIMITS.linearLength.max, physics.LIMITS.linearLength), 'initial linear size maps to drawing scale');
assert.ok(renderer.normalizedDimension(physics.LIMITS.area.min, physics.LIMITS.area) < renderer.normalizedDimension(physics.LIMITS.area.max, physics.LIMITS.area), 'initial area maps to drawing scale');
assert.ok(renderer.normalizedDimension(physics.LIMITS.volume.min, physics.LIMITS.volume) < renderer.normalizedDimension(physics.LIMITS.volume.max, physics.LIMITS.volume), 'initial volume maps to drawing scale');

const overflowCalls = [];
const overflowCtx = new Proxy({ CLOSE: 'close' }, {
  get(target, property) {
    if (property in target) return target[property];
    return (...args) => overflowCalls.push({ property, args });
  },
});
renderer.drawOverflowSpill(overflowCtx, { left: 100, top: 30, width: 80, height: 160, baseY: 190, compact: false });
assert.ok(overflowCalls.some(({ property }) => property === 'bezierVertex'), 'overflow uses smooth Bézier geometry');
assert.ok(overflowCalls.some(({ property }) => property === 'circle'), 'overflow includes rounded droplets');
assert.ok(overflowCalls.some(({ property }) => property === 'fill'), 'overflow is rendered as a filled liquid ribbon');

const base = {
  progress: 1,
  targetDeltaT: 50,
  deltaT: 50,
  direction: 'heating',
  initial: 1,
  final: 1.0006,
  change: 0.0006,
  geometryRatio: 1.0006,
  alphaPerK: 12e-6,
  betaPerK: 24e-6,
  gammaPerK: 36e-6,
  containerCapacityM3: 1e-3,
  finalContainerCapacityM3: 1.0018e-3,
  fillFraction: 1,
  initialLiquidVolumeM3: 1e-3,
  finalLiquidVolumeM3: 1.04e-3,
  liquidGammaPerK: 0.8e-3,
  apparentExpansionM3: 38.2e-6,
  overflowM3: 38.2e-6,
};

['linear', 'area', 'volume', 'liquid-container'].forEach((mode) => {
  calls.length = 0;
  const snapshot = { ...base, mode };
  renderer.drawThermalExpansionScene(ctx, snapshot, 720, 350);
  renderer.drawThermalExpansionScene(ctx, { ...snapshot, deltaT: -20, direction: 'cooling', overflowM3: 0 }, 420, 280);
  assert.ok(calls.length > 0, `${mode} draws wide and compact frames`);
});

assert.equal(renderer.formatSnapshotChange({ ...base, mode: 'linear' }), '+0.600 mm');
assert.match(renderer.formatSnapshotChange({ ...base, mode: 'liquid-container' }), /mL$/);

console.log('thermal-expansion renderer tests passed');

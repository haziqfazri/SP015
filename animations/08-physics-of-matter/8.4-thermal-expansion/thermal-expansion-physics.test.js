'use strict';

const assert = require('node:assert/strict');
const {
  EXPANSION_MODES,
  PHYSICS,
  LIMITS,
  ThermalExpansionState,
} = require('./thermal-expansion-physics.js');

function close(actual, expected, tolerance = 1e-12, label = 'value') {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, received ${actual}`);
}

const state = new ThermalExpansionState({
  linearLengthM: 1,
  areaM2: 2,
  volumeM3: 1,
  alphaPerK: 12e-6,
  deltaTK: 50,
});
close(state.betaPerK, 24e-6, 1e-15, 'beta');
close(state.gammaPerK, 36e-6, 1e-15, 'gamma');
close(state.deltaLengthM, 0.0006, 1e-15, 'linear expansion');
close(state.deltaAreaM2, 0.0024, 1e-15, 'area expansion');
close(state.deltaVolumeM3, 0.0018, 1e-15, 'volume expansion');

state.setDeltaT(0);
close(state.deltaLengthM, 0, 0, 'zero-temperature linear change');
close(state.deltaAreaM2, 0, 0, 'zero-temperature area change');
close(state.deltaVolumeM3, 0, 0, 'zero-temperature volume change');

state.setDeltaT(-20);
assert.ok(state.finalLengthM < state.linearLengthM, 'cooling contracts length');
assert.ok(state.finalAreaM2 < state.areaM2, 'cooling contracts area');
assert.ok(state.finalVolumeM3 < state.volumeM3, 'cooling contracts volume');

const base = new ThermalExpansionState({ linearLengthM: 1, alphaPerK: 10e-6, deltaTK: 40 });
const doubleLength = new ThermalExpansionState({ linearLengthM: 2, alphaPerK: 10e-6, deltaTK: 40 });
const doubleAlpha = new ThermalExpansionState({ linearLengthM: 1, alphaPerK: 20e-6, deltaTK: 40 });
const doubleTemperature = new ThermalExpansionState({ linearLengthM: 1, alphaPerK: 10e-6, deltaTK: 80 });
close(doubleLength.deltaLengthM, 2 * base.deltaLengthM, 1e-15, 'length scaling');
close(doubleAlpha.deltaLengthM, 2 * base.deltaLengthM, 1e-15, 'coefficient scaling');
close(doubleTemperature.deltaLengthM, 2 * base.deltaLengthM, 1e-15, 'temperature scaling');

const liquid = new ThermalExpansionState({
  mode: 'liquid-container',
  alphaPerK: 10e-6,
  deltaTK: 50,
  containerCapacityM3: 1 * PHYSICS.litresToCubicMetres,
  fillFraction: 1,
  liquidGammaPerK: 0.4e-3,
});
close(liquid.deltaContainerCapacityM3 * PHYSICS.cubicMetresToMillilitres, 1.5, 1e-12, 'container change');
close(liquid.deltaLiquidVolumeM3 * PHYSICS.cubicMetresToMillilitres, 20, 1e-12, 'liquid change');
close(liquid.apparentExpansionM3 * PHYSICS.cubicMetresToMillilitres, 18.5, 1e-12, 'apparent change');
close(liquid.overflowM3 * PHYSICS.cubicMetresToMillilitres, 18.5, 1e-12, 'overflow');

const partial = new ThermalExpansionState({
  mode: 'liquid-container',
  alphaPerK: 10e-6,
  deltaTK: 50,
  containerCapacityM3: 1 * PHYSICS.litresToCubicMetres,
  fillFraction: 0.5,
  liquidGammaPerK: 0.4e-3,
});
close(partial.initialLiquidVolumeM3, 0.5e-3, 1e-15, 'derived partial-fill volume');
close(partial.apparentExpansionM3, liquid.apparentExpansionM3 / 2, 1e-15, 'partial-fill apparent change');
close(partial.overflowM3, 0, 0, 'partial container does not overflow');
partial.setContainerCapacity(2 * PHYSICS.litresToCubicMetres);
close(partial.initialLiquidVolumeM3, 1e-3, 1e-15, 'capacity change re-derives liquid volume');

// The identity gives exactly zero when the liquid and container volume coefficients match.
const equalCoefficientApparent = partial.initialLiquidVolumeM3
  * (partial.gammaPerK - partial.gammaPerK) * partial.deltaTK;
close(equalCoefficientApparent, 0, 0, 'equal-coefficient apparent change');

const threshold = new ThermalExpansionState({
  mode: 'liquid-container',
  alphaPerK: 30e-6,
  deltaTK: 0,
  containerCapacityM3: 1e-3,
  fillFraction: 1,
  liquidGammaPerK: 0.2e-3,
});
close(threshold.overflowM3, 0, 0, 'no overflow at zero temperature change');
threshold.setDeltaT(100);
assert.ok(threshold.overflowM3 > 0, 'overflow begins when liquid exceeds expanded capacity');

EXPANSION_MODES.forEach((mode) => {
  const candidate = new ThermalExpansionState({ mode });
  assert.equal(candidate.mode, mode);
});
assert.throws(() => new ThermalExpansionState({ mode: 'invalid' }), RangeError);
assert.throws(() => new ThermalExpansionState({ linearLengthM: 0.1 }), RangeError);
assert.throws(() => new ThermalExpansionState({ areaM2: Number.NaN }), RangeError);
assert.throws(() => new ThermalExpansionState({ volumeM3: 3 }), RangeError);
assert.throws(() => new ThermalExpansionState({ alphaPerK: 50e-6 }), RangeError);
assert.throws(() => new ThermalExpansionState({ deltaTK: LIMITS.targetDeltaT.max + 1 }), RangeError);
assert.throws(() => new ThermalExpansionState({ containerCapacityM3: 0 }), RangeError);
assert.throws(() => new ThermalExpansionState({ fillFraction: 0.4 }), RangeError);
assert.throws(() => new ThermalExpansionState({ liquidGammaPerK: 2e-3 }), RangeError);

console.log('thermal-expansion physics tests passed');

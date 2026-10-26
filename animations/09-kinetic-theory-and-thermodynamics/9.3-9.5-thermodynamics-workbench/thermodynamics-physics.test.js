'use strict';

const assert = require('node:assert/strict');
const {
  PHYSICS,
  LIMITS,
  MOLECULAR_CATEGORIES,
  SCENARIOS,
  PROCESS_TYPES,
  FirstLawState,
  ThermodynamicProcessState,
  ProcessMoleculeEnsemble,
  categoryForDegreesOfFreedom,
  processInvariantLabel,
} = require('./thermodynamics-physics.js');

function close(actual, expected, relativeTolerance = 1e-12, label = 'value') {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= relativeTolerance * scale, `${label}: expected ${expected}, received ${actual}`);
}

const state = new FirstLawState();
close(state.initialInternalEnergyJ, (5 / 2) * PHYSICS.gasConstant * 300, 1e-12, 'default U1');
close(state.targetDeltaInternalEnergyJ, 400, 1e-12, 'default delta U');
close(state.targetFinalInternalEnergyJ, state.initialInternalEnergyJ + 400, 1e-12, 'default U2');
close(state.targetFinalTemperatureK, 300 + 400 / ((5 / 2) * PHYSICS.gasConstant), 1e-12, 'default T2');

const zero = new FirstLawState({ targetHeatJ: 0, targetWorkJ: 0 });
close(zero.targetDeltaInternalEnergyJ, 0, 1e-12, 'zero delta U');
close(zero.targetFinalTemperatureK, zero.initialTemperatureK, 1e-12, 'zero transfer temperature');

const heating = new FirstLawState({ targetHeatJ: 600, targetWorkJ: 0 });
close(heating.targetDeltaInternalEnergyJ, 600, 1e-12, 'positive heat');
const expansion = new FirstLawState({ targetHeatJ: 0, targetWorkJ: 600 });
close(expansion.targetDeltaInternalEnergyJ, -600, 1e-12, 'positive work');
const compression = new FirstLawState({ targetHeatJ: 0, targetWorkJ: -600 });
close(compression.targetDeltaInternalEnergyJ, 600, 1e-12, 'negative work');
const balanced = new FirstLawState({ targetHeatJ: 600, targetWorkJ: 600 });
close(balanced.targetDeltaInternalEnergyJ, 0, 1e-12, 'balanced transfers');

const monatomic = new FirstLawState({ degreesOfFreedom: 3 });
const polyatomic = new FirstLawState({ degreesOfFreedom: 6 });
close(polyatomic.initialInternalEnergyJ, 2 * monatomic.initialInternalEnergyJ, 1e-12, 'f scaling');
const doubleAmount = new FirstLawState({ amountMol: 2 });
close(doubleAmount.initialInternalEnergyJ, 2 * state.initialInternalEnergyJ, 1e-12, 'amount scaling');
const doubleTemperature = new FirstLawState({ initialTemperatureK: 600 });
close(doubleTemperature.initialInternalEnergyJ, 2 * state.initialInternalEnergyJ, 1e-12, 'temperature scaling');

const atStart = state.snapshotAt(0);
assert.equal(atStart.appliedHeatJ, 0);
assert.equal(atStart.appliedWorkJ, 0);
assert.equal(atStart.appliedDeltaInternalEnergyJ, 0);
const halfway = state.snapshotAt(0.5);
close(halfway.appliedHeatJ, state.targetHeatJ / 2, 1e-12, 'halfway heat');
close(halfway.appliedWorkJ, state.targetWorkJ / 2, 1e-12, 'halfway work');
close(halfway.currentInternalEnergyJ, state.initialInternalEnergyJ + 200, 1e-12, 'halfway U');
const atEnd = state.snapshotAt(1);
close(atEnd.appliedHeatJ, state.targetHeatJ, 1e-12, 'target heat');
close(atEnd.appliedWorkJ, state.targetWorkJ, 1e-12, 'target work');
close(atEnd.currentInternalEnergyJ, state.targetFinalInternalEnergyJ, 1e-12, 'target U');
close(atEnd.currentTemperatureK, state.targetFinalTemperatureK, 1e-12, 'target T');
assert.ok(Object.isFrozen(atEnd));
assert.throws(() => state.snapshotAt(-0.1), RangeError);
assert.throws(() => state.snapshotAt(1.1), RangeError);

const atomic = new FirstLawState({ initialTemperatureK: 200, amountMol: 0.5, degreesOfFreedom: 3, targetHeatJ: 600, targetWorkJ: 600 });
assert.throws(() => atomic.setTransfers({ heatJ: -1500, workJ: 1500 }), /non-positive final temperature/);
assert.equal(atomic.targetHeatJ, 600);
assert.equal(atomic.targetWorkJ, 600);
assert.throws(() => new FirstLawState({ initialTemperatureK: 200, amountMol: 0.5, degreesOfFreedom: 3, targetHeatJ: -1500, targetWorkJ: 1500 }), RangeError);
assert.throws(() => new FirstLawState({ initialTemperatureK: 0 }), RangeError);
assert.throws(() => new FirstLawState({ amountMol: Number.NaN }), RangeError);
assert.throws(() => new FirstLawState({ degreesOfFreedom: 4 }), RangeError);
assert.throws(() => state.setHeat(1550), RangeError);
assert.throws(() => state.setWork(Number.POSITIVE_INFINITY), RangeError);
assert.equal(categoryForDegreesOfFreedom(3), 'monatomic');
assert.equal(categoryForDegreesOfFreedom(5), 'diatomic');
assert.equal(categoryForDegreesOfFreedom(6), 'polyatomic');
assert.deepEqual(MOLECULAR_CATEGORIES.diatomic.degreesOfFreedom, 5);
assert.deepEqual(SCENARIOS.expansion, { label: 'Expansion', heatJ: 0, workJ: 600 });
assert.equal(LIMITS.playback.maxDt, 0.03);

const process = new ThermodynamicProcessState();
assert.deepEqual(PROCESS_TYPES, ['isothermal', 'isobaric', 'isochoric', 'adiabatic']);
close(process.initialTemperatureK, 100000 * 0.01 / PHYSICS.gasConstant, 1e-12, 'process initial temperature');
const isothermalStart = process.snapshotAt(0);
const isothermalEnd = process.snapshotAt(1);
close(isothermalStart.pressurePa * isothermalStart.volumeM3, 100000 * 0.01, 1e-12, 'isothermal initial PV');
close(isothermalEnd.pressurePa * isothermalEnd.volumeM3, 100000 * 0.01, 1e-12, 'isothermal final PV');
close(isothermalEnd.temperatureK, isothermalStart.temperatureK, 1e-12, 'isothermal temperature');
close(isothermalStart.currentWorkJ, 0, 1e-12, 'isothermal start work');
close(isothermalEnd.currentWorkJ, 100000 * 0.01 * Math.log(2), 1e-12, 'isothermal work');

const samples = process.pathSamples(1, 10001);
let numericalArea = 0;
for (let index = 1; index < samples.length; index += 1) {
  const before = samples[index - 1];
  const after = samples[index];
  numericalArea += (before.pressurePa + after.pressurePa) / 2 * (after.volumeM3 - before.volumeM3);
}
close(numericalArea, isothermalEnd.currentWorkJ, 1e-8, 'isothermal numerical P-V area');

process.setProcessType('isobaric');
const isobaricEnd = process.snapshotAt(1);
close(isobaricEnd.pressurePa, process.initialPressurePa, 1e-12, 'isobaric pressure');
close(isobaricEnd.currentWorkJ, process.initialPressurePa * (process.targetVolumeM3 - process.initialVolumeM3), 1e-12, 'isobaric work');
assert.ok(isobaricEnd.temperatureK > process.initialTemperatureK, 'isobaric expansion raises temperature');

process.setProcessType('isochoric');
const isochoricEnd = process.snapshotAt(1);
close(isochoricEnd.volumeM3, process.initialVolumeM3, 1e-12, 'isochoric volume');
assert.equal(isochoricEnd.currentWorkJ, 0, 'isochoric work');
assert.equal(isochoricEnd.workRequiredBySP015, true);
assert.throws(() => process.setTargetVolume(0.02), /Isochoric/);

process.setProcessType('adiabatic');
const adiabaticEnd = process.snapshotAt(1);
const comparisonEnd = process.isothermalComparisonSamples(3)[2];
assert.ok(adiabaticEnd.pressurePa < comparisonEnd.pressurePa, 'adiabatic expansion is steeper than isothermal');
assert.equal(adiabaticEnd.currentWorkJ, null);
assert.equal(adiabaticEnd.workRequiredBySP015, false);
close(process.gamma, 7 / 5, 1e-12, 'default adiabatic gamma');
assert.equal(processInvariantLabel('adiabatic'), 'Q = 0');
assert.throws(() => process.setTargetPressure(150000), /Only isochoric/);
assert.throws(() => new ThermodynamicProcessState({ processType: 'bad' }), /Unknown/);
assert.throws(() => new ThermodynamicProcessState({ targetVolumeM3: 0.0101 }), /differ enough/);
assert.throws(() => new ThermodynamicProcessState({ processType: 'isochoric', targetPressurePa: 100000 }), /differ enough/);

function assertMoleculesConfined(ensemble, label) {
  const snapshot = ensemble.snapshot();
  snapshot.particles.forEach((particle, index) => {
    assert.ok(Number.isFinite(particle.x) && Number.isFinite(particle.y), `${label}: particle ${index} position is finite`);
    assert.ok(particle.x - snapshot.radius >= -1e-9, `${label}: particle ${index} clears the left wall`);
    assert.ok(particle.x + snapshot.radius <= snapshot.containerWidth + 1e-9, `${label}: particle ${index} clears the piston`);
    assert.ok(particle.y - snapshot.radius >= -1e-9, `${label}: particle ${index} clears the top wall`);
    assert.ok(particle.y + snapshot.radius <= 1 + 1e-9, `${label}: particle ${index} clears the bottom wall`);
  });
  for (let first = 0; first < snapshot.particles.length; first += 1) {
    for (let second = first + 1; second < snapshot.particles.length; second += 1) {
      const a = snapshot.particles[first];
      const b = snapshot.particles[second];
      assert.ok(
        Math.hypot(a.x - b.x, a.y - b.y) >= snapshot.radius * 2 - 1e-6,
        `${label}: particles ${first} and ${second} do not overlap`,
      );
    }
  }
}

const moleculesA = new ProcessMoleculeEnsemble();
const moleculesB = new ProcessMoleculeEnsemble();
assert.deepEqual(moleculesA.snapshot(), moleculesB.snapshot(), 'seeded reset is deterministic');
assert.equal(moleculesA.snapshot().particles.length, LIMITS.processMolecules.count);
close(moleculesA.visualRmsSpeed, LIMITS.processMolecules.speedAtReference, 1e-12, 'reference thermal speed');
assertMoleculesConfined(moleculesA, 'initial ensemble');

const initialMoleculeSnapshot = moleculesA.snapshot();
moleculesA.advance(0.03, { containerWidth: 1.01, temperatureK: 300 });
assert.notDeepEqual(moleculesA.snapshot().particles, initialMoleculeSnapshot.particles, 'playback advances persistent particle positions');
assertMoleculesConfined(moleculesA, 'expanded ensemble');

moleculesA.reconcile({ containerWidth: 0.5, temperatureK: 600 });
close(
  moleculesA.visualRmsSpeed,
  LIMITS.processMolecules.speedAtReference * Math.sqrt(2),
  1e-12,
  'thermal speed follows square-root temperature scaling',
);
assertMoleculesConfined(moleculesA, 'compressed hot ensemble');

for (let step = 0; step < 500; step += 1) {
  const phase = step / 499;
  const containerWidth = 0.5 + 1.5 * (0.5 + 0.5 * Math.sin(phase * Math.PI * 4));
  const temperatureK = 240 + 280 * (0.5 + 0.5 * Math.cos(phase * Math.PI * 3));
  moleculesA.advance(0.01, { containerWidth, temperatureK });
  assertMoleculesConfined(moleculesA, `moving piston step ${step}`);
}
moleculesA.reset({ containerWidth: 1, temperatureK: 300 });
assert.deepEqual(moleculesA.snapshot(), moleculesB.snapshot(), 'reset restores the same seeded positions and velocities');
assert.throws(() => new ProcessMoleculeEnsemble({ count: 0 }), /count/);
assert.throws(() => moleculesA.advance(-0.01, { containerWidth: 1, temperatureK: 300 }), /dt/);
assert.throws(() => moleculesA.reconcile({ containerWidth: 0, temperatureK: 300 }), /container width/);
assert.throws(() => moleculesA.reconcile({ containerWidth: 1, temperatureK: 0 }), /temperature/);

console.log('thermodynamics physics tests passed');

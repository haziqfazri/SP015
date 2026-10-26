'use strict';

const assert = require('node:assert/strict');
const {
  MOLECULE_CATEGORIES,
  DEGREE_FOCUS_OPTIONS,
  CATEGORY_DEGREE_FOCUSES,
  PHYSICS,
  LIMITS,
  DISPLAY,
  IdealGasState,
  MolecularEnsemble,
  containerWidthForVolume,
  degreeFocusesForCategory,
  isDegreeFocusSupported,
} = require('./molecular-gas-physics.js');

function close(actual, expected, relativeTolerance = 1e-12, label = 'value') {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= relativeTolerance * scale,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

const state = new IdealGasState();
close(state.rmsSpeed, state.rmsSpeedFromMoleculeMass, 1e-12, 'equivalent rms formulas');
close(state.pressure, state.kineticPressure, 1e-12, 'equivalent pressure formulas');
close(state.pressure * state.volumeM3, state.molecularPressureVolume, 1e-12, 'PV molecular identity');
close(state.meanTranslationalEnergy, 0.5 * state.moleculeMass * state.meanSquaredSpeed, 1e-12, 'translational energy');

const doubleTemperature = new IdealGasState({ temperatureK: 600 });
close(doubleTemperature.rmsSpeed / state.rmsSpeed, Math.sqrt(2), 1e-12, 'temperature rms scaling');
close(doubleTemperature.internalEnergy, 2 * state.internalEnergy, 1e-12, 'temperature internal-energy scaling');
const doubleMass = new IdealGasState({ molarMassKgPerMol: 56e-3 });
close(doubleMass.rmsSpeed / state.rmsSpeed, 1 / Math.sqrt(2), 1e-12, 'mass rms scaling');
close(doubleMass.meanTranslationalEnergy, state.meanTranslationalEnergy, 1e-12, 'mass-independent translational energy');

const doubleAmount = new IdealGasState({ amountMol: 2 });
close(doubleAmount.internalEnergy, 2 * state.internalEnergy, 1e-12, 'amount internal-energy scaling');
const monatomic = new IdealGasState({ degreesOfFreedom: MOLECULE_CATEGORIES.monatomic.degreesOfFreedom });
const polyatomic = new IdealGasState({ degreesOfFreedom: MOLECULE_CATEGORIES.polyatomic.degreesOfFreedom });
close(polyatomic.internalEnergy, 2 * monatomic.internalEnergy, 1e-12, 'degree-of-freedom energy scaling');
const largerVolume = new IdealGasState({ volumeM3: 48e-3 });
close(largerVolume.internalEnergy, state.internalEnergy, 1e-12, 'volume-independent internal energy');
close(largerVolume.pressure, state.pressure / 2, 1e-12, 'inverse pressure-volume scaling');

assert.deepEqual(degreeFocusesForCategory('monatomic'), CATEGORY_DEGREE_FOCUSES.monatomic);
assert.deepEqual(degreeFocusesForCategory('diatomic'), CATEGORY_DEGREE_FOCUSES.diatomic);
assert.deepEqual(degreeFocusesForCategory('polyatomic'), Object.keys(DEGREE_FOCUS_OPTIONS));
assert.equal(isDegreeFocusSupported('monatomic', 'translate-z'), true);
assert.equal(isDegreeFocusSupported('monatomic', 'rotate-r1'), false);
assert.equal(isDegreeFocusSupported('diatomic', 'rotate-r2'), true);
assert.equal(isDegreeFocusSupported('diatomic', 'rotate-r3'), false);
assert.equal(isDegreeFocusSupported('polyatomic', 'rotate-r3'), true);
assert.throws(() => degreeFocusesForCategory('invalid'), RangeError);
assert.throws(() => isDegreeFocusSupported('monatomic', 'invalid'), RangeError);

close(
  containerWidthForVolume(LIMITS.volumeLitres.min * PHYSICS.litresToCubicMetres),
  DISPLAY.worldWidthMin,
  1e-12,
  'minimum visual width',
);
close(
  containerWidthForVolume(LIMITS.volumeLitres.max * PHYSICS.litresToCubicMetres),
  DISPLAY.worldWidthMax,
  1e-12,
  'maximum visual width',
);

assert.throws(() => new IdealGasState({ temperatureK: 0 }), RangeError);
assert.throws(() => new IdealGasState({ amountMol: Number.NaN }), RangeError);
assert.throws(() => new IdealGasState({ volumeM3: 0.1 }), RangeError);
assert.throws(() => new IdealGasState({ molarMassKgPerMol: -1 }), RangeError);
assert.throws(() => new IdealGasState({ degreesOfFreedom: 4 }), RangeError);

[
  () => state.setTemperature(Number.POSITIVE_INFINITY),
  () => state.setTemperature(LIMITS.temperature.min - 1),
  () => state.setAmount(0),
  () => state.setAmount(LIMITS.amount.max + 1),
  () => state.setVolume(Number.NaN),
  () => state.setVolume(0),
  () => state.setMolarMass(Number.NEGATIVE_INFINITY),
  () => state.setMolarMass(0),
  () => state.setDegreesOfFreedom(Number.NaN),
  () => state.setDegreesOfFreedom(4),
].forEach((invalidSetter) => assert.throws(invalidSetter, RangeError));

const ensemble = new MolecularEnsemble();
close(ensemble.sampleMeanSquaredSpeed, 1, 1e-12, 'normalized sample rms');
close(ensemble.momentum.x, 0, 1e-12, 'zero x drift');
close(ensemble.momentum.y, 0, 1e-12, 'zero y drift');
const initialSnapshot = JSON.stringify(ensemble.snapshot());
ensemble.advance(0.02, 0.35);
ensemble.reset();
assert.equal(JSON.stringify(ensemble.snapshot()), initialSnapshot, 'Reset reproduces seeded sample');

const wall = new MolecularEnsemble({ count: 1 });
wall.particles[0] = {
  x: wall.radius + 0.001,
  y: wall.containerHeight / 2,
  vx: -1,
  vy: 0.25,
};
const wallSpeedBefore = Math.hypot(wall.particles[0].vx, wall.particles[0].vy);
const wallEvents = wall.advance(0.02, 0.5);
close(Math.hypot(wall.particles[0].vx, wall.particles[0].vy), wallSpeedBefore, 1e-12, 'wall speed preservation');
assert.ok(wall.particles[0].vx > 0, 'wall collision reflects velocity');
assert.ok(wallEvents.some((event) => event.type === 'wall'));

const pair = new MolecularEnsemble({ count: 2 });
pair.particles = [
  { x: 0.40, y: 0.31, vx: 1, vy: 0.2 },
  { x: 0.40 + pair.radius * 1.8, y: 0.31, vx: -0.25, vy: -0.1 },
];
const pairMomentumBefore = { ...pair.momentum };
const pairEnergyBefore = pair.kineticEnergy;
const pairEvents = [];
pair._resolvePairs(pairEvents);
close(pair.momentum.x, pairMomentumBefore.x, 1e-12, 'pair x momentum');
close(pair.momentum.y, pairMomentumBefore.y, 1e-12, 'pair y momentum');
close(pair.kineticEnergy, pairEnergyBefore, 1e-12, 'pair kinetic energy');
assert.ok(pairEvents.some((event) => event.type === 'pair'));

const longRun = new MolecularEnsemble();
const energyBefore = longRun.kineticEnergy;
for (let index = 0; index < 1000; index += 1) {
  const events = longRun.advance(0.03, DISPLAY.visualSpeedMax);
  assert.ok(events.length <= LIMITS.collisionFlashes.max * 2, 'per-step event list is capped');
}
longRun.particles.forEach((particle) => {
  assert.ok(Number.isFinite(particle.x) && Number.isFinite(particle.y));
  assert.ok(Number.isFinite(particle.vx) && Number.isFinite(particle.vy));
  assert.ok(particle.x >= longRun.radius - 1e-12);
  assert.ok(particle.x <= longRun.containerWidth - longRun.radius + 1e-12);
  assert.ok(particle.y >= longRun.radius - 1e-12);
  assert.ok(particle.y <= longRun.containerHeight - longRun.radius + 1e-12);
});
let maximumOverlap = 0;
for (let first = 0; first < longRun.particles.length; first += 1) {
  for (let second = first + 1; second < longRun.particles.length; second += 1) {
    const a = longRun.particles[first];
    const b = longRun.particles[second];
    maximumOverlap = Math.max(
      maximumOverlap,
      longRun.radius * 2 - Math.hypot(b.x - a.x, b.y - a.y),
    );
  }
}
assert.ok(maximumOverlap < longRun.radius * 0.01, 'long-run overlap remains bounded');
close(longRun.kineticEnergy, energyBefore, 1e-9, 'long-run kinetic energy');

assert.throws(() => new MolecularEnsemble({ count: 0 }), RangeError);
assert.throws(() => ensemble.setContainerWidth(0.5), RangeError);
assert.throws(() => ensemble.advance(-1, 1), RangeError);
assert.throws(() => ensemble.advance(1, Number.NaN), RangeError);

console.log('molecular-gas physics tests passed');

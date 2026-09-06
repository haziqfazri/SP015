'use strict';

const assert = require('node:assert/strict');
const {
  LIMITS,
  ElasticSpecimen,
  IdealizedMaterialCurve,
  MATERIAL_CURVES,
  CHARACTERISTIC_POINTS,
} = require('./materials-testing-physics.js');

function close(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, received ${actual}`);
}

const specimen = new ElasticSpecimen();
assert.equal(specimen.strain, 0);
assert.equal(specimen.stress, 0);
assert.equal(specimen.force, 0);
assert.equal(specimen.strainEnergy, 0);
assert.equal(specimen.energyDensity, 0);

specimen.setDeformationMagnitude(LIMITS.targetDeltaL.default * 1e-2);
close(specimen.strain, 0.0075, 1e-12, 'default strain');
close(specimen.stress, 1.5e9, 1e-4, 'default stress');
close(specimen.force, 150e3, 1e-4, 'default force');
close(specimen.strainEnergy, 562.5, 1e-10, 'default strain energy');
close(specimen.energyDensity, 5.625e6, 1e-4, 'default energy density');

specimen.setLoadingType('compression');
assert.ok(specimen.deltaL < 0 && specimen.strain < 0 && specimen.stress < 0 && specimen.force < 0);
assert.ok(specimen.strainEnergy > 0 && specimen.energyDensity > 0);

const scaling = new ElasticSpecimen({ youngModulusPa: 100e9, deformationMagnitudeM: 0.0005 });
const base = { stress: scaling.stress, force: scaling.force, strain: scaling.strain };
scaling.setYoungModulus(200e9);
close(scaling.stress, base.stress * 2, 1e-6, 'modulus doubles stress');
close(scaling.force, base.force * 2, 1e-6, 'modulus doubles force');
scaling.setYoungModulus(100e9);
scaling.setArea(200e-6);
close(scaling.force, base.force * 2, 1e-6, 'area doubles force');
close(scaling.stress, base.stress, 1e-6, 'area preserves stress');
close(scaling.strain, base.strain, 1e-12, 'area preserves strain');
scaling.setOriginalLength(2);
close(scaling.strain, base.strain / 2, 1e-12, 'length halves strain');

const ductile = new IdealizedMaterialCurve('ductile');
const brittle = new IdealizedMaterialCurve('brittle');
assert.ok(ductile.sample(1).elongation > brittle.sample(1).elongation);
assert.deepEqual(CHARACTERISTIC_POINTS.map(({ key }) => key), ['A', 'B', 'C', 'D', 'E']);
const characteristicSamples = CHARACTERISTIC_POINTS.map(({ pointIndex }) => MATERIAL_CURVES.ductile[pointIndex]);
assert.ok(characteristicSamples.every((point, index) => index === 0 || point.elongation > characteristicSamples[index - 1].elongation));
assert.equal(characteristicSamples[3].force, Math.max(...MATERIAL_CURVES.ductile.map(({ force }) => force)));
assert.ok(characteristicSamples[4].force < characteristicSamples[3].force);
for (let i = 0; i <= 100; i += 1) {
  const progress = i / 100;
  [ductile.sample(progress), brittle.sample(progress)].forEach((sample) => {
    ['progress', 'strain', 'stress', 'elongation', 'force'].forEach((key) => {
      assert.ok(Number.isFinite(sample[key]), `${key} is finite`);
      assert.ok(sample[key] >= 0 && sample[key] <= 1, `${key} is normalized`);
    });
  });
  assert.ok(!['Plastic', 'Necking', 'Yielding'].includes(brittle.sample(progress).state));
}

assert.throws(() => new ElasticSpecimen({ loadingType: 'shear' }), RangeError);
assert.throws(() => specimen.setLoadingType('shear'), RangeError);
assert.throws(() => specimen.setOriginalLength(Number.NaN), RangeError);
assert.throws(() => specimen.setOriginalLength(0.1), RangeError);
assert.throws(() => specimen.setArea(Infinity), RangeError);
assert.throws(() => specimen.setYoungModulus(10e9), RangeError);
assert.throws(() => specimen.setDeformationMagnitude(-1), RangeError);
assert.throws(() => new IdealizedMaterialCurve('steel'), RangeError);
assert.throws(() => ductile.sample(1.1), RangeError);
assert.throws(() => ductile.sample(Number.NaN), RangeError);

console.log('materials-testing physics tests passed');

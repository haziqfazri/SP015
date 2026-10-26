'use strict';

const assert = require('node:assert/strict');
const {
  PHYSICS,
  ConductionRod,
  SeriesConductionSystem,
  QualitativeHeatLossProfile,
  DISPLAY,
  celsiusToKelvin,
} = require('./heat-conduction-physics.js');

assert.equal(DISPLAY.escapingTracerCount, 3, 'exposed segments use a small group of tracers');

function close(actual, expected, tolerance = 1e-10, label = 'value') {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, received ${actual}`);
}

const area = 4 * PHYSICS.squareCentimetresToSquareMetres;
const baseRod = new ConductionRod({ lengthM: 0.5, areaM2: area, conductivity: 200 });
close(baseRod.thermalResistance, 6.25, 1e-12, 'rod resistance');

const single = new SeriesConductionSystem({
  rods: [baseRod],
  hotTemperatureK: celsiusToKelvin(100),
  coldTemperatureK: celsiusToKelvin(20),
});
close(single.heatRate, 12.8, 1e-12, 'single-rod heat rate');
close(single.temperatureAt(0), celsiusToKelvin(100), 1e-12, 'hot boundary');
close(single.temperatureAt(single.totalLength), celsiusToKelvin(20), 1e-12, 'cold boundary');
assert.ok(single.temperatureGradients[0] < 0, 'temperature gradient is negative toward +x');
assert.ok(single.heatRate > 0, 'heat flow is positive toward +x');

const doubledLength = new SeriesConductionSystem({
  rods: [new ConductionRod({ lengthM: 1, areaM2: area, conductivity: 200 })],
  hotTemperatureK: celsiusToKelvin(100),
  coldTemperatureK: celsiusToKelvin(20),
});
close(doubledLength.heatRate, single.heatRate / 2, 1e-12, 'doubling length halves heat rate');

const doubledArea = new SeriesConductionSystem({
  rods: [new ConductionRod({ lengthM: 0.5, areaM2: 8 * PHYSICS.squareCentimetresToSquareMetres, conductivity: 200 })],
  hotTemperatureK: celsiusToKelvin(100),
  coldTemperatureK: celsiusToKelvin(20),
});
close(doubledArea.heatRate, single.heatRate * 2, 1e-12, 'doubling area doubles heat rate');

const doubledConductivity = new SeriesConductionSystem({
  rods: [new ConductionRod({ lengthM: 0.5, areaM2: area, conductivity: 400 })],
  hotTemperatureK: celsiusToKelvin(100),
  coldTemperatureK: celsiusToKelvin(20),
});
close(doubledConductivity.heatRate, single.heatRate * 2, 1e-12, 'doubling conductivity doubles heat rate');

const equalSeries = new SeriesConductionSystem({
  rods: [baseRod, new ConductionRod({ lengthM: 0.5, areaM2: area, conductivity: 200 })],
  hotTemperatureK: celsiusToKelvin(100),
  coldTemperatureK: celsiusToKelvin(20),
});
close(equalSeries.interfaceTemperature, celsiusToKelvin(60), 1e-12, 'equal-resistance interface');
close(equalSeries.temperatureAt(0.5), equalSeries.interfaceTemperature, 1e-12, 'continuous interface');

const unequal = new SeriesConductionSystem({
  rods: [
    new ConductionRod({ lengthM: 0.5, areaM2: area, conductivity: 200 }),
    new ConductionRod({ lengthM: 0.5, areaM2: area, conductivity: 50 }),
  ],
  hotTemperatureK: celsiusToKelvin(100),
  coldTemperatureK: celsiusToKelvin(20),
});
close(unequal.interfaceTemperature, celsiusToKelvin(84), 1e-10, 'unequal-resistance interface');
close(unequal.temperatureAt(unequal.totalLength), celsiusToKelvin(20), 1e-10, 'series cold boundary');
assert.ok(unequal.temperatureGradients.every((gradient) => gradient < 0));

const qualitative = new QualitativeHeatLossProfile();
close(qualitative.valueAt(0), 1, 1e-12, 'schematic hot endpoint');
close(qualitative.valueAt(1), 0, 1e-12, 'schematic cold endpoint');
assert.ok(qualitative.valueAt(0.5) < 0.5, 'side-loss curve lies below insulated comparison');
assert.equal(qualitative.points(10).length, 11);
assert.notEqual(qualitative.valueAt(0.5, 10), qualitative.valueAt(0.5, 400), 'conductivity changes schematic steepness');
assert.ok(qualitative.valueAt(0.5, 400) > qualitative.valueAt(0.5, 10), 'higher conductivity approaches the insulated line');

function verifyComposite(exposurePattern) {
  const points = qualitative.compositePoints({
    interfacePosition: 0.4,
    exposurePattern,
    sampleCount: 20,
  });
  assert.equal(points.length, 21);
  close(points[0].position, 0, 1e-12, `${exposurePattern} hot position`);
  close(points[0].temperature, 1, 1e-12, `${exposurePattern} hot temperature`);
  close(points.at(-1).position, 1, 1e-12, `${exposurePattern} cold position`);
  close(points.at(-1).temperature, 0, 1e-12, `${exposurePattern} cold temperature`);
  const interfacePoints = points.filter((point) => Math.abs(point.position - 0.4) < 1e-12);
  assert.equal(interfacePoints.length, 1, `${exposurePattern} has one continuous interface point`);
  close(interfacePoints[0].temperature, 0.6, 1e-12, `${exposurePattern} interface temperature`);
  points.forEach((point, index) => {
    assert.ok(point.temperature >= 0 && point.temperature <= 1, `${exposurePattern} remains bounded`);
    if (index > 0) assert.ok(point.temperature <= points[index - 1].temperature, `${exposurePattern} remains monotonic`);
  });
  return points;
}

const bothExposed = verifyComposite('bothExposed');
const aInsulated = verifyComposite('aInsulated');
const bInsulated = verifyComposite('bInsulated');
assert.ok(bothExposed.find((point) => point.position === 0.2).temperature < 0.8, 'both-exposed rod A curves below its chord');
close(aInsulated.find((point) => point.position === 0.2).temperature, 0.8, 1e-12, 'insulated rod A is linear');
assert.ok(aInsulated.find((point) => point.position === 0.7).temperature < 0.3, 'exposed rod B curves below its chord');
assert.ok(bInsulated.find((point) => point.position === 0.2).temperature < 0.8, 'exposed rod A curves below its chord');
close(bInsulated.find((point) => point.position === 0.7).temperature, 0.3, 1e-12, 'insulated rod B is linear');

assert.throws(() => new ConductionRod({ lengthM: 0.1 }), RangeError);
assert.throws(() => new ConductionRod({ areaM2: Number.NaN }), RangeError);
assert.throws(() => new ConductionRod({ conductivity: 500 }), RangeError);
assert.throws(() => new SeriesConductionSystem({ rods: [] }), RangeError);
assert.throws(() => new SeriesConductionSystem({ rods: [baseRod, baseRod, baseRod] }), RangeError);
assert.throws(() => single.setBoundaryTemperatures(celsiusToKelvin(20), celsiusToKelvin(20)), RangeError);
assert.throws(() => single.temperatureAt(-0.1), RangeError);
assert.throws(() => qualitative.valueAt(1.1), RangeError);
assert.throws(() => qualitative.valueAt(0.5, Number.NaN), RangeError);
assert.throws(() => qualitative.compositePoints({ interfacePosition: 0, exposurePattern: 'bothExposed' }), RangeError);
assert.throws(() => qualitative.compositePoints({ interfacePosition: 0.5, exposurePattern: 'invalid' }), RangeError);

console.log('heat-conduction physics tests passed');

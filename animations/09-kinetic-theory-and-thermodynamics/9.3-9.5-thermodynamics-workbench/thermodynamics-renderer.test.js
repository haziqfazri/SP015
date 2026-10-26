'use strict';

const assert = require('node:assert/strict');
const physics = require('./thermodynamics-physics.js');
global.PHYSICS = physics.PHYSICS;
const renderer = require('./thermodynamics-renderer.js');

assert.equal(renderer.DISPLAY.compactWidth, 560);
const wide = renderer.wideLayout(900, 460);
assert.ok(wide.heat.x >= 0);
assert.ok(wide.work.x + wide.work.width <= 900);
const compact = renderer.compactLayout(320, 520);
assert.ok(compact.heat.x >= 0 && compact.heat.x <= 320);
assert.ok(compact.work.y + compact.work.height <= 520);
const shortCompact = renderer.compactLayout(520, 460);
assert.ok(shortCompact.heat.y - 23 > 0, 'compact reservoir stays below the canvas top');
assert.ok(shortCompact.work.y + 70 < 460, 'compact work labels stay above the canvas bottom');

[560, 704, 800, 900].forEach((width) => {
  const layout = renderer.wideLayout(width, 460);
  const reservoir = renderer.reservoirGeometry(layout.heat);
  const pistonOut = renderer.pistonGeometry(layout.work, 600, 600);
  const pistonIn = renderer.pistonGeometry(layout.work, -600, -600);
  assert.ok(reservoir.left >= 0, `reservoir stays inside a ${width}px canvas`);
  assert.ok(reservoir.right <= width, `reservoir right edge stays inside a ${width}px canvas`);
  assert.ok(pistonOut.right <= width, `piston chamber stays inside a ${width}px canvas`);
  assert.ok(pistonOut.pistonX + renderer.DISPLAY.pistonWidth / 2 <= width, `outward piston stays inside a ${width}px canvas`);
  assert.ok(pistonIn.pistonX - renderer.DISPLAY.pistonWidth / 2 >= 0, `inward piston stays inside a ${width}px canvas`);
});

[320, 460].forEach((width) => {
  const layout = renderer.compactLayout(width, 520);
  const reservoir = renderer.reservoirGeometry(layout.heat);
  const piston = renderer.pistonGeometry(layout.work, 600, 600);
  assert.ok(reservoir.left >= 0 && reservoir.right <= width);
  assert.ok(piston.left >= 0 && piston.right <= width);
  assert.ok(piston.pistonX + renderer.DISPLAY.pistonWidth / 2 <= width);
});

const store = renderer.gasStoreGeometry(wide.gas);
const fullFill = renderer.energyFillGeometry(store, 1);
assert.equal(fullFill.left, store.left + renderer.DISPLAY.energyStoreInset);
assert.equal(fullFill.right, store.right - renderer.DISPLAY.energyStoreInset);
assert.equal(fullFill.top, store.top + renderer.DISPLAY.energyStoreInset);
assert.equal(fullFill.bottom, store.bottom - renderer.DISPLAY.energyStoreInset);
const halfFill = renderer.energyFillGeometry(store, 0.5);
assert.equal(halfFill.bottom, fullFill.bottom, 'energy fill grows upward from a fixed bottom');
assert.equal(halfFill.height, fullFill.height / 2);

const calls = [];
const fakeContext = {
  push() {},
  pop() {},
  drawingContext: { setLineDash() {} },
  stroke() {},
  strokeWeight() {},
  line(x0, y0, x1, y1) { calls.push({ x0, y0, x1, y1 }); },
};
global.drawArrowCtx = (ctx, x0, y0, x1, y1) => ctx.line(x0, y0, x1, y1);
global.normalizedArrowLength = (magnitude, min, max, minLength, maxLength) => {
  if (magnitude <= 1e-6) return 0;
  return minLength + ((magnitude - min) / (max - min)) * (maxLength - minLength);
};
renderer.drawTransferArrow(fakeContext, 600, 0, 0, 10, 100, 10, '#ff6b35', 1500);
assert.equal(calls.length, 0, 'zero applied transfer draws no connector or arrow');
calls.length = 0;
renderer.drawTransferArrow(fakeContext, -600, -300, 0, 10, 100, 10, '#35b9ad', 1500);
assert.equal(calls.length, 1, 'negative transfer draws only the applied arrow');
assert.ok(calls[0].x1 < calls[0].x0, 'negative transfer arrow points toward decreasing x');

calls.length = 0;
renderer.drawTransferArrow(fakeContext, 300, 300, 0, 10, 100, 10, '#ff6b35', 1500);
const smallTargetLength = calls[0].x1 - calls[0].x0;
calls.length = 0;
renderer.drawTransferArrow(fakeContext, 1500, 1500, 0, 10, 100, 10, '#ff6b35', 1500);
const largeTargetLength = calls[0].x1 - calls[0].x0;
assert.ok(largeTargetLength > smallTargetLength, 'larger transfer magnitude draws a longer arrow');

assert.equal(renderer.pistonOffsetFor(600, 0), 0, 'piston starts at the neutral position');
assert.equal(renderer.pistonOffsetFor(600, 600), renderer.DISPLAY.pistonTravel);
assert.equal(renderer.pistonOffsetFor(-600, -600), -renderer.DISPLAY.pistonTravel);

const processFrame = {
  processType: 'isothermal',
  initialVolumeM3: 0.01,
  initialPressurePa: 100000,
  volumeM3: 0.02,
  pressurePa: 50000,
  pathSamples: [
    { volumeM3: 0.01, pressurePa: 100000 },
    { volumeM3: 0.02, pressurePa: 50000 },
  ],
  isothermalComparisonSamples: [],
};
const processWide = renderer.processLayout(900, 460);
assert.equal(processWide.compact, false);
assert.ok(processWide.cylinder.x + processWide.cylinder.width < processWide.graph.x);
const processCompact = renderer.processLayout(320, 520);
assert.equal(processCompact.compact, true);
assert.ok(processCompact.cylinder.y + processCompact.cylinder.height < processCompact.graph.y);
const chamber = renderer.processChamberGeometry(processWide.cylinder, processFrame);
assert.ok(chamber.pistonX > chamber.x && chamber.pistonX < chamber.x + chamber.width);
assert.ok(chamber.gasLeft < chamber.gasRight, 'gas chamber has positive width');
assert.equal(chamber.gasRight, chamber.pistonX - chamber.pistonHeadHalfWidth - renderer.DISPLAY.processMoleculeInset, 'gas stops before the piston head');
const moleculeEnsemble = new physics.ProcessMoleculeEnsemble({ containerWidth: 2, temperatureK: 300 });
const molecules = renderer.processMoleculeDrawables(chamber, moleculeEnsemble.snapshot());
assert.equal(molecules.length, physics.LIMITS.processMolecules.count);
molecules.forEach((molecule) => {
  assert.ok(molecule.x - molecule.radius >= chamber.gasLeft - 1e-9, 'molecule stays right of cylinder wall');
  assert.ok(molecule.x + molecule.radius <= chamber.gasRight + 1e-9, 'molecule stays left of piston');
  assert.ok(molecule.y - molecule.radius >= chamber.gasTop - 1e-9, 'molecule stays below cylinder ceiling');
  assert.ok(molecule.y + molecule.radius <= chamber.gasBottom + 1e-9, 'molecule stays above cylinder floor');
});
const compressedChamber = renderer.processChamberGeometry(processWide.cylinder, { ...processFrame, volumeM3: 0.005 });
assert.ok(compressedChamber.gasRight - compressedChamber.gasLeft < chamber.gasRight - chamber.gasLeft, 'compression reduces visual gas volume');
moleculeEnsemble.reconcile({ containerWidth: 0.5, temperatureK: 300 });
const compressedMolecules = renderer.processMoleculeDrawables(compressedChamber, moleculeEnsemble.snapshot());
compressedMolecules.forEach((molecule) => {
  assert.ok(molecule.x - molecule.radius >= compressedChamber.gasLeft - 1e-9);
  assert.ok(molecule.x + molecule.radius <= compressedChamber.gasRight + 1e-9);
});
assert.equal(renderer.processDirection(processFrame), 1);
assert.equal(renderer.processDirection({ ...processFrame, volumeM3: 0.01 }), 0);
assert.equal(renderer.processDirection({ ...processFrame, processType: 'isochoric' }), 0);
const graph = renderer.graphGeometry(processWide.graph, processFrame);
const mappedStart = renderer.mapGraphPoint(graph, processFrame.pathSamples[0]);
const mappedEnd = renderer.mapGraphPoint(graph, processFrame.pathSamples[1]);
assert.ok(mappedStart.x < mappedEnd.x, 'graph volume increases to the right');
assert.ok(mappedStart.y < mappedEnd.y, 'graph pressure increases upward');

console.log('thermodynamics renderer tests passed');

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const physics = require('./molecular-gas-physics.js');
const { DISPLAY } = physics;

const context = vm.createContext({ ...physics, module: { exports: {} } });
const source = fs.readFileSync(path.join(__dirname, 'molecular-gas-renderer.js'), 'utf8');
vm.runInContext(source, context);
const {
  computeMolecularPanels,
  computeEnergyPanel,
  computeChamberRect,
  projectWorldPoint,
  computePerspectiveChamber,
  projectEnergyPoint,
  computeEnergyMotion,
  rotatePoint3D,
  moleculeGeometryForCategory,
} = context.module.exports;

function assertInside(box, width, height) {
  [box.x, box.y, box.width, box.height].forEach((value) => assert.ok(Number.isFinite(value) && value >= 0));
  assert.ok(box.x + box.width <= width + 1e-9);
  assert.ok(box.y + box.height <= height + 1e-9);
}

[
  [900, 460, false],
  [560, 460, false],
  [559, 360, true],
  [288, 360, true],
].forEach(([width, height, compact]) => {
  const panels = computeMolecularPanels(width, height);
  assert.equal(panels.compact, compact);
  assertInside(panels.primary, width, height);
  assertInside(panels.secondary, width, height);
  if (compact) assert.ok(panels.secondary.y > panels.primary.y + panels.primary.height);
  else assert.ok(panels.secondary.x > panels.primary.x + panels.primary.width);

  const ensemble = { containerWidth: 0.85, containerHeight: DISPLAY.worldHeight };
  const chamber = computeChamberRect(ensemble, panels.primary);
  assertInside(chamber, width, height);
  const origin = projectWorldPoint(chamber, 0, 0);
  const farCorner = projectWorldPoint(chamber, ensemble.containerWidth, ensemble.containerHeight);
  assert.ok(origin.x >= chamber.x && origin.y >= chamber.y);
  assert.ok(farCorner.x <= chamber.x + chamber.width + 1e-9);
  assert.ok(farCorner.y <= chamber.y + chamber.height + 1e-9);

  const energyPanel = computeEnergyPanel(width, height);
  assertInside(energyPanel, width, height);
  assert.equal(energyPanel.width, width - 2 * energyPanel.x, 'Energy mode uses the full available width');
  if (!compact) assert.ok(energyPanel.width > panels.primary.width);
  const perspective = computePerspectiveChamber(energyPanel);
  assertInside(perspective.front, width, height);
  assertInside(perspective.back, width, height);
  assert.ok(perspective.back.width < perspective.front.width);
  assert.ok(perspective.back.height < perspective.front.height);
  assert.ok(perspective.back.y < perspective.front.y);
  [-0.9, 0, 0.9].forEach((x) => {
    [-0.9, 0, 0.9].forEach((y) => {
      [-1, 0, 1].forEach((z) => {
        const point = projectEnergyPoint(perspective, { x, y, z });
        assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
        assert.ok(point.x >= energyPanel.x && point.x <= energyPanel.x + energyPanel.width);
        assert.ok(point.y >= energyPanel.y && point.y <= energyPanel.y + energyPanel.height);
        assert.ok(point.scale > 0 && point.alpha > 0);
      });
    });
  });
});

const originalPoint = { x: 0.4, y: -0.2, z: 0.7 };
const rotatedPoint = rotatePoint3D(originalPoint, { r1: 0.6, r2: -0.9, r3: 1.2 });
assert.ok(Math.abs(Math.hypot(rotatedPoint.x, rotatedPoint.y, rotatedPoint.z)
  - Math.hypot(originalPoint.x, originalPoint.y, originalPoint.z)) < 1e-12);

Object.keys(physics.MOLECULE_CATEGORIES).forEach((category) => {
  const geometry = moleculeGeometryForCategory(category);
  geometry.bonds.forEach(([first, second]) => {
    const a = geometry.atoms[first];
    const b = geometry.atoms[second];
    const distance = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    assert.ok(distance > a.radius + b.radius, `${category} bonded atoms do not overlap at rest`);
  });
});
assert.throws(() => moleculeGeometryForCategory('invalid'), /Unsupported molecular category/);

Object.keys(physics.DEGREE_FOCUS_OPTIONS).forEach((degreeFocus) => {
  const motion = computeEnergyMotion({
    animationTime: 1,
    degreeFocus,
    category: 'polyatomic',
    supportedDegreeFocuses: physics.degreeFocusesForCategory('polyatomic'),
  });
  ['x', 'y', 'z'].forEach((axis) => assert.ok(Number.isFinite(motion.position[axis])));
  ['r1', 'r2', 'r3'].forEach((axis) => assert.ok(Number.isFinite(motion.rotations[axis])));
  if (degreeFocus.startsWith('translate-')) {
    const selected = degreeFocus.at(-1);
    ['x', 'y', 'z'].filter((axis) => axis !== selected).forEach((axis) => assert.equal(motion.position[axis], 0));
    assert.deepEqual({ ...motion.rotations }, { r1: 0, r2: 0, r3: 0 });
  }
  if (degreeFocus.startsWith('rotate-')) {
    assert.deepEqual({ ...motion.position }, { x: 0, y: 0, z: 0 });
    const selected = `r${degreeFocus.at(-1)}`;
    ['r1', 'r2', 'r3'].filter((axis) => axis !== selected).forEach((axis) => assert.equal(motion.rotations[axis], 0));
  }
});

const allDiatomic = computeEnergyMotion({
  animationTime: 1,
  degreeFocus: 'all',
  category: 'diatomic',
  supportedDegreeFocuses: physics.degreeFocusesForCategory('diatomic'),
});
assert.notEqual(allDiatomic.position.x, 0);
assert.notEqual(allDiatomic.position.y, 0);
assert.notEqual(allDiatomic.position.z, 0);
assert.notEqual(allDiatomic.rotations.r1, 0);
assert.notEqual(allDiatomic.rotations.r2, 0);
assert.equal(allDiatomic.rotations.r3, 0);

console.log('molecular-gas renderer tests passed');

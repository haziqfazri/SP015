'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({
  PALETTE: { orange: '#ff6b35', teal: '#35b9ad', ink: '#102126', path: '#b4beb2' },
  DISPLAY: {},
});
vm.runInContext(fs.readFileSync(`${__dirname}/heat-conduction-renderer.js`, 'utf8'), context);
const renderer = vm.runInContext('({ graphSegmentColor, referenceGraphColor, distanceTickLabels })', context);

const twoRodFrame = Object.freeze({ rods: [{ key: 'A' }, { key: 'B' }] });
const oneRodFrame = Object.freeze({ rods: [{ key: 'A' }] });

assert.equal(renderer.graphSegmentColor(twoRodFrame, 0), context.PALETTE.orange, 'Rod A uses orange');
assert.equal(renderer.graphSegmentColor(twoRodFrame, 1), context.PALETTE.teal, 'Rod B uses teal');
assert.notEqual(renderer.graphSegmentColor(twoRodFrame, 0), context.PALETTE.ink, 'Rod A is not black');
assert.notEqual(renderer.graphSegmentColor(twoRodFrame, 1), context.PALETTE.ink, 'Rod B is not black');
assert.equal(renderer.graphSegmentColor(oneRodFrame, 0), context.PALETTE.orange, 'single-rod graph remains orange');
assert.equal(renderer.referenceGraphColor(), context.PALETTE.path, 'reference line uses a neutral color');
assert.notEqual(renderer.referenceGraphColor(), context.PALETTE.ink, 'reference line is not black');
assert.deepEqual(JSON.parse(JSON.stringify(renderer.distanceTickLabels({ rods: [{}, {}], totalLengthM: 1.25, interfacePosition: 0.4 }))), [
  { position: 0, label: '0 m' },
  { position: 0.4, label: '0.50 m' },
  { position: 1, label: '1.25 m' },
], 'two-rod axis labels show physical lengths');

console.log('heat-conduction renderer tests passed');

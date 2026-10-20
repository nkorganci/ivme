import assert from 'node:assert/strict';
import { calculate } from '../frontend/src/components/scientificMath.js';
import { shapePoints } from '../frontend/src/components/inkGeometry.js';

assert.equal(calculate('sin(30)+sqrt(9)'), 3.5);
assert.equal(calculate('cos(pi)', false), -1);
assert.equal(calculate('-2^2+5!'), 116);
assert.equal(calculate('log(100)+ln(e)'), 3);
assert.throws(() => calculate('1/0'), /tanımsız/);
assert.throws(() => calculate('process.exit(1)'), /tanınmayan|Sayı/);
assert.deepEqual(shapePoints('RECTANGLE', [.1, .2], [.4, .5]), [[.1, .2], [.4, .2], [.4, .5], [.1, .5], [.1, .2]]);
assert.equal(shapePoints('ELLIPSE', [.1, .1], [.5, .5]).length, 49);
assert.deepEqual(shapePoints('LINE', [.1, .2], [.4, .5]), [[.1, .2], [.4, .5]]);
assert.deepEqual(shapePoints('TRIANGLE', [.1, .2], [.5, .6]), [[.3, .2], [.5, .6], [.1, .6], [.3, .2]]);
assert.deepEqual(shapePoints('ANGLE', [.1, .2], [.4, .5]), [[.1, .5], [.1, .2], [.4, .2]]);
console.log('page ink tools: 11 checks passed');

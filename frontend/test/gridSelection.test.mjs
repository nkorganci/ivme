import test from 'node:test';
import assert from 'node:assert/strict';
import { selectionKey, selectionPasses } from '../src/gridSelection.js';

test('checklist preserves exact text, numbers, zero, blanks and an empty selection', () => {
  const model = { values: [selectionKey(0), selectionKey(null), selectionKey('AYT')] };
  assert.equal(selectionPasses(0, model), true);
  assert.equal(selectionPasses(null, model), true);
  assert.equal(selectionPasses('AYT', model), true);
  assert.equal(selectionPasses('TYT', model), false);
  assert.equal(selectionPasses('0', model), false);
  assert.equal(selectionPasses(0, { values: [] }), false);
  assert.equal(selectionPasses(0, null), true);
});

test('date selections and bounds include the entire local day and combine', () => {
  const morning = new Date(2026, 9, 17, 0, 0).getTime();
  const night = new Date(2026, 9, 17, 23, 59).getTime();
  const next = new Date(2026, 9, 18).getTime();
  const model = { from: '2026-10-17', until: '2026-10-17' };
  assert.equal(selectionKey(morning, 'date'), selectionKey(night, 'date'));
  assert.equal(selectionPasses(morning, model, 'date'), true);
  assert.equal(selectionPasses(night, model, 'date'), true);
  assert.equal(selectionPasses(next, model, 'date'), false);
  assert.equal(selectionPasses(null, model, 'date'), false);
  assert.equal(selectionPasses(morning, { ...model, values: [] }, 'date'), false);
});

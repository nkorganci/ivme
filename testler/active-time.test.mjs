import assert from 'node:assert/strict';
import test from 'node:test';
import { ActiveTime } from '../frontend/src/activeTime.js';

test('visible reading counts until idle, then resumes on interaction', () => {
  const time = new ActiveTime(0, true, true);
  assert.equal(time.read(70_000), 60);
  time.interact(70_000);
  assert.equal(time.read(75_000), 65);
});

test('hidden and unfocused intervals do not count', () => {
  const time = new ActiveTime(0, true, true);
  time.setVisibility(10_000, false);
  assert.equal(time.read(90_000), 10);
  time.setVisibility(90_000, true);
  assert.equal(time.read(95_000), 15);
  time.setFocus(95_000, false);
  assert.equal(time.read(115_000), 15);
  time.setFocus(115_000, true);
  assert.equal(time.read(120_000), 20);
});

test('late timer callbacks cannot count more than the idle window', () => {
  const time = new ActiveTime(0, true, true);
  assert.equal(time.read(600_000), 60);
  time.reset(600_000);
  assert.equal(time.read(602_500), 2);
});

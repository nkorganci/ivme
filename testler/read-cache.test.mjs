import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadCache } from '../frontend/src/readCache.js';

test('reference reads share pending work, expire, and clear on scope changes', async () => {
  let calls = 0, now = 0;
  const cache = createReadCache(async key => ({key, call: ++calls}), {ttl: 30, now: () => now});
  const [first, same] = await Promise.all([cache.get('metadata'), cache.get('metadata')]);
  assert.equal(first, same);
  assert.equal((await cache.get('metadata')).call, 1);
  now = 31;
  assert.equal((await cache.get('metadata')).call, 2);
  cache.clear();
  assert.equal((await cache.get('metadata')).call, 3);
});

test('failed or invalidated in-flight reads cannot repopulate the active scope', async () => {
  let fail = true;
  const cache = createReadCache(async () => { if (fail) throw Error('offline'); return 'fresh'; });
  await assert.rejects(cache.get('key'), /offline/);
  fail = false;
  assert.equal(await cache.get('key'), 'fresh');
  const resolvers = [];
  const pending = createReadCache(() => new Promise(resolve => resolvers.push(resolve)));
  const old = pending.get('metadata'); await Promise.resolve();
  pending.clear();
  const fresh = pending.get('metadata'); await Promise.resolve();
  resolvers[1]('new scope'); await fresh;
  resolvers[0]('old scope'); await old;
  assert.equal(await pending.get('metadata'), 'new scope');
});

test('zero TTL shares only concurrent work and refreshes private values on the next read', async () => {
  let calls = 0;
  const cache = createReadCache(async () => ++calls, {ttl: 0});
  assert.deepEqual(await Promise.all([cache.get('summary'),cache.get('summary')]),[1,1]);
  assert.equal(await cache.get('summary'),2);
});

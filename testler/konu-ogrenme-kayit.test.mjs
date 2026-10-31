import test from 'node:test';
import assert from 'node:assert/strict';
import { LearnOutbox } from '../frontend/src/learn/outbox.js';

class Storage {
  data = new Map();
  blocked = false;
  get length() { return this.data.size; }
  key(i) { return [...this.data.keys()][i] ?? null; }
  getItem(key) { if (this.blocked) throw Error('Denied'); return this.data.get(key) ?? null; }
  setItem(key, value) { if (this.blocked) throw Error('Quota'); this.data.set(key, value); }
  removeItem(key) { if (this.blocked) throw Error('Denied'); this.data.delete(key); }
}
const event = (id, extra = {}) => ({ id: String(id), kind: 'lesson', action: 'open', ...extra });
const failure = (status, message = 'Rejected') => Object.assign(Error(message), { status });
function setup(options = {}) {
  const storage = options.storage ?? new Storage();
  const db = new Map();
  const acknowledged = [];
  const save = async (events) => ({ events: events.map((e) => {
    if (!db.has(e.id)) db.set(e.id, { ...e, seq: db.size + 1 });
    return db.get(e.id);
  }) });
  const queue = new LearnOutbox({ userId: 7, storage, postEvents: save,
    onSaved: (events) => acknowledged.push(...events), ...options });
  return { queue, storage, db, acknowledged, save };
}

test('650 pending events survive reload, batching and a lost committed response', async () => {
  const { queue, storage, db, save } = setup();
  queue.add(Array.from({ length: 650 }, (_, i) => event(i)));
  queue.postEvents = async (events) => { await save(events); throw failure(0); };
  await queue.flush();
  assert.equal(queue.pending, 650);
  assert.equal(db.size, 50);
  const reloaded = setup({ storage, postEvents: save }).queue;
  await reloaded.flush();
  assert.equal(db.size, 650);
  assert.equal(reloaded.pending, 0);
  assert.equal(storage.length, 0);
});

test('atomic 400 isolates only invalid event and keeps its id/reason across reload', async () => {
  const { queue, storage, save, db } = setup();
  queue.postEvents = async (events) => {
    if (events.some((e) => e.id === 'bad')) throw failure(400, 'Unknown kind');
    return save(events);
  };
  queue.add([event(1), event('bad'), event(2)]);
  await queue.flush();
  assert.equal(db.size, 2);
  assert.equal(queue.pending, 1);
  const restored = setup({ storage }).queue;
  assert.match(restored.error, /bad.*Unknown kind/);
  await restored.flush();
  assert.equal(restored.pending, 1);
  await restored.flush(true);
  assert.equal(restored.pending, 0);
});

test('partial/unverified acknowledgement never removes unconfirmed entries', async () => {
  const { queue } = setup({ postEvents: async (events) => ({ events: [{ ...events[0], seq: 1 }, events[1], { id: 'foreign', seq: 2 }] }) });
  queue.add([event(1), event(2), event(3)]);
  await queue.flush();
  assert.deepEqual([...queue.entries.keys()], ['2', '3']);
  assert.match(queue.error, /onaylamadı/);
});

test('denied storage retains memory and exposes failure until server acknowledgement', async () => {
  const storage = new Storage(); storage.blocked = true;
  const { queue, save, db } = setup({ storage, postEvents: async () => { throw failure(503); } });
  queue.add([event(1)]);
  await queue.flush();
  assert.equal(queue.pending, 1);
  assert.match(queue.error, /sayfayı kapatma/);
  storage.blocked = false;
  queue.postEvents = save;
  await queue.flush();
  assert.equal(db.size, 1);
  assert.equal(queue.pending, 0);
});

test('two tabs can append during an in-flight acknowledgement without overwriting each other', async () => {
  const { queue: first, storage, save, db } = setup();
  const second = setup({ storage, postEvents: save }).queue;
  first.add([event(1)]);
  let release;
  first.postEvents = async (events) => { await new Promise((resolve) => { release = resolve; }); return save(events); };
  const sending = first.flush();
  second.add([event(2)]);
  release(); await sending;
  assert.equal(storage.length, 1);
  await second.flush();
  assert.equal(db.size, 2);
  assert.equal(storage.length, 0);
});

test('account isolation and disposal stop later chunks and ignore stale UI updates', async () => {
  const { queue, storage, save } = setup();
  queue.add(Array.from({ length: 60 }, (_, i) => event(i)));
  const other = setup({ userId: 8, storage });
  assert.equal(other.queue.pending, 0);
  let release;
  let calls = 0;
  let updates = 0;
  queue.onSaved = () => updates++;
  queue.postEvents = async (events, userId) => {
    assert.equal(userId, 7); calls++;
    await new Promise((resolve) => { release = resolve; }); return save(events);
  };
  const sending = queue.flush();
  queue.active = false;
  release(); await sending;
  assert.equal(calls, 1);
  assert.equal(updates, 0);
  assert.equal(setup({ storage }).queue.pending, 10);
});

test('bank answer is durable and retries the exact payload after lost response', async () => {
  const storage = new Storage();
  const received = [];
  const original = event('bank', { itemType: 'bank', chosen: 'B', questionId: 3 });
  const postBankAnswer = async (e, userId) => {
    received.push({ ...e }); assert.equal(userId, 7);
    if (received.length === 1) throw failure(0);
    return { event: { ...e, seq: 1, correct: true, correctAnswer: 'B' }, hasSolution: true };
  };
  const first = setup({ storage, postBankAnswer }).queue;
  first.add([original]); await first.flush();
  const second = setup({ storage, postBankAnswer }).queue;
  await second.flush();
  assert.deepEqual(received, [original, original]);
  assert.equal(second.pending, 0);
});

test('old unsaved queues are discarded without replay; new queue and other data remain', async () => {
  const storage = new Storage();
  storage.setItem('ivme:konu-ogrenme:giden:7:v1', JSON.stringify([event('old-v1')]));
  storage.setItem('ivme:konu-ogrenme:giden:7:v2:old-v2', JSON.stringify({ event: event('old-v2') }));
  storage.setItem('unrelated', 'keep');
  const { queue, db } = setup({ storage });
  assert.equal(queue.pending, 0);
  queue.add([event('new')]);
  await queue.flush();
  assert.deepEqual([...db.keys()], ['new']);
  assert.equal(storage.getItem('ivme:konu-ogrenme:giden:7:v1'), null);
  assert.equal(storage.getItem('ivme:konu-ogrenme:giden:7:v2:old-v2'), null);
  assert.equal(storage.getItem('unrelated'), 'keep');
});

test('corrupt NEW queue is preserved and visible; obsolete corrupt queue is discarded', () => {
  const storage = new Storage();
  storage.setItem('ivme:konu-ogrenme:giden:7:v1', '{obsolete');
  storage.setItem('ivme:konu-ogrenme:giden:7:v3:broken', '{oops');
  const restored = setup({ storage }).queue;
  assert.match(restored.error, /bozuk/);
  assert.equal(storage.getItem('ivme:konu-ogrenme:giden:7:v3:broken'), '{oops');
  assert.equal(storage.getItem('ivme:konu-ogrenme:giden:7:v1'), null);
});

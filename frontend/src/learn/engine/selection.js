import { ENGINE } from './config.js';
import { ageDays } from './dates.js';
import { rng, shuffle, weightedPick } from './random.js';

// Soru seçimi (spec §6). Banka dosyası kısa alan adları taşır; burada okunur nesneye açılır.
export function expandBank(conceptId, raw = []) {
  return raw.map((q) => ({
    conceptId, code: q.c, id: q.i, archetype: q.a ?? null, difficulty: q.d ?? 2, exam: q.x, cikmis: !!q.k,
    year: q.y ?? null, source: q.s ?? '', hasSolution: !!q.w, choices: q.n ?? 5,
  }));
}

/** 0: hiç görülmedi · 1: 30 günden önce görüldü · 2: yakında görüldü (yanlış kuyruğu dışında tekrar edilmez). */
export function tierOf(question, state) {
  const last = state.seen[question.code];
  if (!last) return 0;
  return ageDays(last, state.now) > ENGINE.repeatGuardDays ? 1 : 2;
}

function ranked(pool, state, random, { preferPast = true } = {}) {
  const groups = [[], [], []];
  for (const q of shuffle(pool, random)) groups[tierOf(q, state)].push(q);
  if (preferPast) {
    for (const group of groups) {
      const index = group.findIndex((q) => q.cikmis);
      if (index > 0) group.unshift(group.splice(index, 1)[0]);
    }
  }
  return groups;
}

function takeFrom(groups, count, used, allowRecent) {
  const out = [];
  for (const [tier, group] of groups.entries()) {
    if (tier === 2 && !allowRecent) break;
    for (const q of group) {
      if (out.length >= count) return out;
      if (used.has(q.code)) continue;
      used.add(q.code);
      out.push(q);
    }
  }
  return out;
}

const queued = (state) => new Set(Object.values(state.queue).filter((item) => item.status === 'active').map((item) => item.itemId));

/**
 * Ustalık testi: dersin karışımına (tip başına sayı, zorluk aralığı) uyar; dersin içinde kullanılan
 * banka soruları dışarıda kalır, çıkmış sorulara öncelik verilir, önce görülmemiş sorular gelir.
 * Banka bir tipi karşılayamazsa dersin ek soru havuzundan (lesson_q) tamamlanır.
 */
export function pickMastery({ meta, bank, state, seed, practicePool = [], testOut = false }) {
  const random = rng(seed);
  const exclude = new Set([...(meta.practiceIds ?? []), ...queued(state)]);
  const used = new Set(exclude);
  const mix = testOut
    ? meta.archetypes.slice().sort((a, b) => b.share - a.share).slice(0, ENGINE.placement.testOutMax)
      .map((a) => ({ archetype: a.id, count: ENGINE.placement.testOutPerArchetype, lo: 1, hi: 3 }))
    : meta.mastery.mix;
  const items = [];
  for (const entry of mix) {
    const sameType = bank.filter((q) => q.archetype === entry.archetype);
    const inRange = sameType.filter((q) => q.difficulty >= entry.lo && q.difficulty <= entry.hi);
    let picked = takeFrom(ranked(inRange, state, random), entry.count, used, false);
    if (picked.length < entry.count) picked = picked.concat(takeFrom(ranked(sameType, state, random), entry.count - picked.length, used, false));
    const missing = entry.count - picked.length;
    const extra = practicePool.filter((q) => q.archetype === entry.archetype && !used.has(q.id)).slice(0, missing);
    extra.forEach((q) => used.add(q.id));
    items.push(...picked.map((q) => ({ type: 'bank', question: q, archetype: entry.archetype })),
      ...extra.map((q) => ({ type: 'lesson_q', question: q, archetype: entry.archetype })));
  }
  const want = mix.reduce((sum, entry) => sum + entry.count, 0);
  if (items.length < want) {
    const untyped = bank.filter((q) => !q.archetype);
    items.push(...takeFrom(ranked(untyped, state, random), want - items.length, used, false).map((q) => ({ type: 'bank', question: q, archetype: null })));
  }
  return shuffle(items, random);
}

/**
 * Tekrar seti: 6 banka sorusu (görülmemiş > 30 günden eski > hiçbiri), tipler karışık ve zayıf tipe
 * ağırlıklı; ek olarak konunun vadesi gelmiş en çok 5 kartı.
 */
export function pickReview({ meta, bank, state, seed, practicePool = [] }) {
  const random = rng(seed);
  const concept = state.concepts[meta.id];
  const used = new Set(queued(state));
  const size = ENGINE.review.setSize;
  const acc = Object.fromEntries((concept?.perArchetype ?? []).map((a) => [a.id, a.acc]));
  const counts = {};
  const groupsByType = Object.fromEntries(meta.archetypes.map((a) => [a.id, ranked(bank.filter((q) => q.archetype === a.id), state, random)]));
  const items = [];
  for (let slot = 0; slot < size * 3 && items.length < size; slot += 1) {
    const key = weightedPick(meta.archetypes
      .filter((a) => (counts[a.id] ?? 0) < Math.ceil(size / 2))
      .map((a) => ({ key: a.id, weight: Math.max(0.05, a.share) * (1.25 - (acc[a.id] ?? 0)) })), random);
    if (!key) break;
    counts[key] = (counts[key] ?? 0) + 1;
    const [q] = takeFrom(groupsByType[key] ?? [[], [], []], 1, used, false);
    if (q) items.push({ type: 'bank', question: q, archetype: key });
    else {
      const fallback = practicePool.find((p) => p.archetype === key && !used.has(p.id));
      if (fallback) {
        used.add(fallback.id);
        items.push({ type: 'lesson_q', question: fallback, archetype: key });
      }
    }
  }
  if (items.length < size) {
    items.push(...takeFrom(ranked(bank.filter((q) => !q.archetype), state, random), size - items.length, used, false)
      .map((q) => ({ type: 'bank', question: q, archetype: null })));
  }
  const cards = state.dueCards.filter((card) => card.conceptId === meta.id).slice(0, ENGINE.review.flashcardsMax)
    .map((card) => ({ type: 'flashcard', cardId: card.id }));
  return [...shuffle(items, random), ...cards];
}

/** İlk öğrenmede bloklu alıştırma: tek tip, kolaydan zora. */
export function pickPractice({ bank, state, archetype, count = 5, seed }) {
  const random = rng(seed);
  const pool = bank.filter((q) => !archetype || q.archetype === archetype);
  const used = new Set(queued(state));
  const picked = takeFrom(ranked(pool, state, random, { preferPast: false }), count, used, true);
  return picked.sort((a, b) => a.difficulty - b.difficulty).map((q) => ({ type: 'bank', question: q, archetype: q.archetype }));
}

/** Kardeş soru: aynı tipte, görülmemiş ve kuyrukta olmayan bir soru. */
export function pickSibling({ bank, archetype, state, seed, exclude = [] }) {
  const random = rng(seed);
  const used = new Set([...queued(state), ...exclude]);
  const pool = bank.filter((q) => q.archetype && q.archetype === archetype && !used.has(q.code) && !state.seen[q.code]);
  return shuffle(pool, random)[0] ?? null;
}

/**
 * Haftalık karma set (20–30 soru): ustalaşılmış kavramlar (100 − ustalık) ağırlığıyla karışır;
 * birbirine karıştırılan (confused_with) kavramların soruları yan yana konur.
 */
export function pickMixed({ index, banks, state, seed, track, size = 24 }) {
  const random = rng(seed);
  const used = new Set(queued(state));
  const candidates = index.concepts.filter((m) => m.exams.includes(track) && state.concepts[m.id]?.masteryValid && banks[m.id]?.length);
  if (!candidates.length) return [];
  const groups = Object.fromEntries(candidates.map((m) => [m.id, ranked(banks[m.id].filter((q) => !q.exam || q.exam === track || m.exams.length > 1), state, random)]));
  const chosen = [];
  for (let slot = 0; slot < size * 4 && chosen.length < size; slot += 1) {
    const key = weightedPick(candidates.map((m) => ({ key: m.id, weight: Math.max(5, 100 - (state.concepts[m.id].mastery ?? 0)) })), random);
    const [q] = takeFrom(groups[key], 1, used, false);
    if (q) chosen.push({ type: 'bank', question: q, archetype: q.archetype, conceptId: key });
  }
  return orderConfusedPairs(chosen, index);
}

export function orderConfusedPairs(items, index) {
  const rest = [...items];
  const out = [];
  while (rest.length) {
    const item = rest.shift();
    out.push(item);
    const partners = new Set(index.byId[item.question.conceptId]?.confused ?? []);
    const next = rest.findIndex((other) => partners.has(other.question.conceptId));
    if (next >= 0) out.push(rest.splice(next, 1)[0]);
  }
  return out;
}

/** Seviye testi (spec §9): her üniteden 2 orta zorlukta soru; çıkmış soru önce. */
export function pickPlacement({ index, banks, track, seed }) {
  const random = rng(seed);
  const units = index.units.filter((unit) => unit.concepts.some((id) => index.byId[id].exams.includes(track)));
  return units.map((unit) => {
    const pool = unit.concepts.filter((id) => index.byId[id].exams.includes(track))
      .flatMap((id) => (banks[id] ?? []).filter((q) => q.difficulty === 2 && (!q.exam || q.exam === track)));
    const byConcept = {};
    for (const q of shuffle(pool, random)) (byConcept[q.conceptId] ??= []).push(q);
    for (const list of Object.values(byConcept)) list.sort((a, b) => Number(b.cikmis) - Number(a.cikmis));
    const ordered = [];
    const lists = Object.values(byConcept);
    for (let round = 0; ordered.length < ENGINE.placement.perUnit && lists.some((list) => list.length); round += 1) {
      for (const list of lists) if (list.length && ordered.length < ENGINE.placement.perUnit) ordered.push(list.shift());
    }
    return { unitId: unit.id, title: unit.title, questions: ordered };
  }).filter((unit) => unit.questions.length);
}

/**
 * Konu testi: tiplere sınav payıyla dağılmış (her tipten en az 1) 12 soru, kolaydan zora sıralı;
 * görülmemiş ve çıkmış sorular önce. Banka yetmezse dersin ek soru havuzundan tamamlanır.
 */
export function pickTest({ meta, bank, state, seed, size = 12, practicePool = [] }) {
  const random = rng(seed);
  const used = new Set(queued(state));
  const types = [...meta.archetypes].sort((a, b) => b.share - a.share);
  const quotas = Object.fromEntries(types.map((a) => [a.id, Math.max(1, Math.round(size * a.share))]));
  let total = Object.values(quotas).reduce((sum, n) => sum + n, 0);
  for (let i = 0; total > size && i < types.length * 3; i += 1) {
    const id = types[types.length - 1 - (i % types.length)].id;
    if (quotas[id] > 1) { quotas[id] -= 1; total -= 1; }
  }
  const items = [];
  for (const archetype of types) {
    const groups = ranked(bank.filter((q) => q.archetype === archetype.id), state, random);
    const picked = takeFrom(groups, quotas[archetype.id], used, true);
    items.push(...picked.map((q) => ({ type: 'bank', question: q, archetype: archetype.id })));
    const missing = quotas[archetype.id] - picked.length;
    if (missing > 0) {
      const extra = practicePool.filter((q) => q.archetype === archetype.id && !used.has(q.id)).slice(0, missing);
      extra.forEach((q) => used.add(q.id));
      items.push(...extra.map((q) => ({ type: 'lesson_q', question: q, archetype: archetype.id })));
    }
  }
  if (items.length < size) {
    items.push(...takeFrom(ranked(bank.filter((q) => !q.archetype), state, random), size - items.length, used, true)
      .map((q) => ({ type: 'bank', question: q, archetype: null })));
  }
  const difficulty = (item) => item.question.difficulty ?? 1;
  return shuffle(items, random).sort((a, b) => difficulty(a) - difficulty(b));
}

/** Kavrama eşlenen ÖSYM çıkmış soruları, yıl sırasıyla (en çok 40). */
export function pickPast({ bank, limit = 40 }) {
  return bank.filter((q) => q.cikmis)
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || a.code.localeCompare(b.code))
    .slice(0, limit)
    .map((q) => ({ type: 'bank', question: q, archetype: q.archetype }));
}

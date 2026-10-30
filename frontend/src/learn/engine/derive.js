import { ENGINE, normalizeSettings } from './config.js';
import { addDays, dayKey, daysBetween } from './dates.js';
import { interval, reviewOutcome } from './ladder.js';
import { masteryScore, setResult, solvedTypes, weakestArchetype } from './mastery.js';
import { addSibling, applyBankAttempt, dueItems } from './missed.js';
import { cardDueDay, median, newCard, ratingFor, reviewCard } from './cards.js';
import { streakOf } from './streak.js';

// Olay günlüğü tek doğruluk kaynağıdır (spec §14): konu durumu, kuyruklar, kartlar ve günlük
// toplamlar her açılışta olaylardan yeniden hesaplanır. Aynı olaylar her zaman aynı durumu verir.

const CLOCK_SKEW_MS = 5 * 60 * 1000;

export function emptyConcept(id) {
  return {
    id, status: 'locked', mastery: 0, perArchetype: [], solvedTypes: 0, archetypes: {}, attemptsByArchetype: {},
    ladderStep: 0, nextDue: null, lastReviewAt: null, firstMasteredAt: null, masteredAt: null, retained: false, lapses: 0,
    msSpent: 0, minutesSpent: 0, lessonOpenedAt: null, firstOpenDay: null, lessonCompletedAt: null, sectionsDone: [], resume: null,
    override: false, testOut: false, reteach: null, reteachDoneAt: null, atRisk: false, masteryValid: false,
    history: [], pretest: [], posttest: [], selfExplain: '', keyPointRatings: null, lastActivityAt: null,
  };
}

const compare = (a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : (a.seq ?? 0) - (b.seq ?? 0));

function dayStats(state, day) {
  state.days[day] ??= { day, ms: 0, questions: 0, correct: 0, bank: 0, cards: 0, sections: 0, reviews: 0, fixed: 0, concepts: [], tracks: {} };
  return state.days[day];
}

function trackStats(day, track) {
  day.tracks[track] ??= { questions: 0, correct: 0, ms: 0 };
  return day.tracks[track];
}

function introduceCard(state, cardId, conceptId, at) {
  if (state.cards[cardId]) return state.cards[cardId];
  state.cards[cardId] = { id: cardId, conceptId, introducedAt: at, introDay: dayKey(new Date(at)), fsrs: newCard(at), reps: 0, lastAt: null, lastRating: null };
  return state.cards[cardId];
}

function applyAttempt(state, event, meta) {
  const concept = state.concepts[event.conceptId];
  const day = dayStats(state, dayKey(new Date(event.at)));
  const timeMs = Math.max(0, Number(event.timeMs) || 0);
  const track = event.exam || meta[event.conceptId]?.exams?.[0] || 'TYT';
  state.attempts.push(event);
  day.ms += timeMs;
  trackStats(day, track).ms += timeMs;
  if (event.itemType === 'flashcard') day.cards += 1;
  else {
    day.questions += 1;
    trackStats(day, track).questions += 1;
    if (event.correct) {
      day.correct += 1;
      trackStats(day, track).correct += 1;
    }
    if (event.itemType === 'bank') day.bank += 1;
    state.seen[event.itemId] = event.at;
  }
  if (concept) {
    concept.msSpent += timeMs;
    concept.lastActivityAt = event.at;
    if (!day.concepts.includes(concept.id)) day.concepts.push(concept.id);
    if (event.archetypeId && event.context !== 'pretest' && event.itemType !== 'flashcard') {
      const stats = concept.archetypes[event.archetypeId] ??= { seen: 0, correct: 0, lastAt: null };
      stats.seen += 1;
      if (event.correct) stats.correct += 1;
      stats.lastAt = event.at;
      (concept.attemptsByArchetype[event.archetypeId] ??= []).push({ at: event.at, correct: !!event.correct, difficulty: event.difficulty });
    }
    if (event.context === 'pretest') concept.pretest.push({ itemId: event.itemId, correct: !!event.correct, at: event.at });
    if (event.context === 'posttest') concept.posttest.push({ itemId: event.itemId, correct: !!event.correct, at: event.at });
  }
  if (event.itemType === 'bank' && event.context !== 'placement' && typeof event.correct === 'boolean') {
    const before = state.queue[event.itemId];
    const wasActive = before?.status === 'active';
    const { item } = applyBankAttempt(state.queue, event);
    if (wasActive && item?.status === 'cleared') day.fixed += 1;
  }
  if (event.itemType === 'bank' && state.paceSamples[track] && timeMs > 0) state.paceSamples[track].push(timeMs / 1000);
  if (event.itemType === 'flashcard') {
    const card = state.cards[event.itemId] ?? introduceCard(state, event.itemId, event.conceptId, event.at);
    const medianMs = state.cardMs.length >= 10 ? median(state.cardMs) : ENGINE.fsrs.defaultCardMs;
    const rating = ratingFor(event, medianMs);
    if (card.reps === 0) card.firstReviewDay = day.day;
    card.fsrs = reviewCard(card.fsrs, event.at, rating);
    card.reps += 1;
    card.lastAt = event.at;
    card.lastRating = rating;
    if (timeMs > 0) state.cardMs.push(timeMs);
  }
  if (event.setId) {
    state.sets[event.setId] ??= { id: event.setId, type: event.context, conceptId: event.conceptId, startedAt: event.at, doneAt: null, attempts: [], result: null };
    state.sets[event.setId].attempts.push(event);
  }
}

function applyLesson(state, event) {
  const concept = state.concepts[event.conceptId];
  if (event.action === 'level' && ['L1', 'L2', 'L3'].includes(event.level)) {
    state.levelPref = event.level;
    state.levelChosen = true;
    return;
  }
  if (!concept) return;
  const day = dayStats(state, dayKey(new Date(event.at)));
  concept.lastActivityAt = event.at;
  if (!day.concepts.includes(concept.id)) day.concepts.push(concept.id);
  switch (event.action) {
    case 'open':
      concept.lessonOpenedAt ??= event.at;
      concept.firstOpenDay ??= dayKey(new Date(event.at));
      break;
    case 'section': {
      if (event.sectionId && !concept.sectionsDone.includes(event.sectionId)) concept.sectionsDone.push(event.sectionId);
      concept.resume = event.nextSectionId ? { sectionId: event.nextSectionId, blockIndex: 0 } : null;
      const ms = Math.max(0, Math.min(Number(event.ms) || 0, 3 * 3600 * 1000));
      concept.msSpent += ms;
      day.ms += ms;
      day.sections += 1;
      break;
    }
    case 'complete':
      concept.lessonCompletedAt ??= event.at;
      concept.resume = null;
      for (const cardId of event.cards ?? []) introduceCard(state, `${concept.id}:${cardId}`, concept.id, event.at);
      break;
    case 'explain':
      concept.selfExplain = String(event.text ?? '');
      break;
    case 'rate':
      concept.keyPointRatings = event.ratings ?? null;
      break;
    default:
      break;
  }
}

function applySet(state, event, settings) {
  if (event.action === 'start') {
    state.sets[event.setId] ??= { id: event.setId, type: event.setType, conceptId: event.conceptId ?? null, startedAt: event.at, doneAt: null, attempts: [], result: null };
    return;
  }
  if (event.action !== 'done') return;
  const set = state.sets[event.setId] ??= { id: event.setId, type: event.setType, conceptId: event.conceptId ?? null, startedAt: event.at, doneAt: null, attempts: [], result: null };
  if (set.doneAt) return; // aynı set bir kez sonuçlanır
  set.type = event.setType;
  set.conceptId = event.conceptId ?? set.conceptId;
  set.doneAt = event.at;
  set.track = event.track ?? null;
  const graded = set.attempts.filter((a) => a.itemType !== 'flashcard' && typeof a.correct === 'boolean');
  const result = setResult(graded);
  set.result = result;
  const day = dayKey(new Date(event.at));
  const concept = state.concepts[set.conceptId];
  switch (event.setType) {
    case 'mastery':
    case 'testout': {
      if (!concept || !graded.length) break;
      concept.history.push({ at: event.at, type: event.setType, pct: result.pct, passed: result.passed, setId: set.id });
      if (result.passed) {
        concept.masteryValid = true;
        concept.atRisk = false;
        concept.reteach = null;
        concept.firstMasteredAt ??= event.at;
        concept.masteredAt = event.at;
        concept.ladderStep = 0;
        concept.nextDue = addDays(day, interval(0, { examDate: settings.examDate, today: day }));
        if (event.setType === 'testout') for (const cardId of event.cards ?? []) introduceCard(state, `${concept.id}:${cardId}`, concept.id, event.at);
      } else {
        const weak = result.weak.length ? result.weak : [weakestRunning(concept)].filter(Boolean);
        concept.reteach = { archetypes: weak, reason: 'mastery_fail', since: event.at };
      }
      break;
    }
    case 'review': {
      if (!concept || !graded.length) break;
      dayStats(state, day).reviews += 1;
      const outcome = reviewOutcome(result.pct);
      concept.lastReviewAt = event.at;
      if (outcome === 'up') {
        if (!concept.retained && concept.masteredAt && daysBetween(dayKey(new Date(concept.masteredAt)), day) >= 1) concept.retained = true;
        concept.ladderStep = Math.min(concept.ladderStep + 1, ENGINE.review.ladderDays.length - 1);
        concept.nextDue = addDays(day, interval(concept.ladderStep, { examDate: settings.examDate, today: day }));
      } else if (outcome === 'same') {
        concept.nextDue = addDays(day, interval(concept.ladderStep, { examDate: settings.examDate, today: day }));
      } else {
        concept.ladderStep = 0;
        concept.lapses += 1;
        concept.atRisk = true;
        concept.masteryValid = false;
        concept.retained = false;
        concept.nextDue = null;
        const weakest = result.weak[0] ?? weakestRunning(concept);
        concept.reteach = { archetypes: weakest ? [weakest] : [], reason: 'review_fail', since: event.at };
      }
      concept.history.push({ at: event.at, type: 'review', pct: result.pct, outcome, step: concept.ladderStep, setId: set.id });
      break;
    }
    case 'reteach':
      if (concept) {
        concept.reteach = null;
        concept.reteachDoneAt = event.at;
        concept.history.push({ at: event.at, type: 'reteach', pct: graded.length ? result.pct : null, setId: set.id });
      }
      break;
    case 'placement': {
      if (!event.track) break;
      state.placement[event.track] = {
        at: event.at, pct: result.pct, total: result.total, correct: result.correct,
        level: event.level ?? null, startUnit: event.startUnit ?? null, testOut: event.testOut ?? [],
      };
      for (const id of event.testOut ?? []) if (state.concepts[id]) state.concepts[id].testOut = true;
      if (event.level && !state.levelChosen) state.levelPref = event.level;
      break;
    }
    default:
      break;
  }
}

function weakestRunning(concept) {
  const entries = Object.entries(concept.archetypes);
  if (!entries.length) return null;
  return entries.sort((a, b) => a[1].correct / Math.max(1, a[1].seen) - b[1].correct / Math.max(1, b[1].seen))[0][0];
}

function prerequisitesMet(meta, state, scope) {
  return (meta.prereq ?? []).every((id) => !scope.has(id) || state.concepts[id]?.firstMasteredAt);
}

export function statusOf(concept, meta, state, scope) {
  if (concept.atRisk) return concept.reteach ? 'at_risk' : 'practicing';
  if (concept.masteryValid) return concept.nextDue && concept.nextDue <= state.today ? 'review_due' : 'mastered';
  if (concept.reteach) return 'learning';
  if (concept.lessonCompletedAt) return 'practicing';
  if (concept.lessonOpenedAt) return 'learning';
  if (concept.override || concept.testOut || prerequisitesMet(meta, state, scope)) return 'available';
  return 'locked';
}

/** Bir öğrencinin sınav kapsamındaki kavramlar (TYT, AYT ya da ikisi). */
export function scopeOf(index, settings) {
  return new Set(index.concepts.filter((c) => c.exams.some((exam) => settings.tracks.includes(exam))).map((c) => c.id));
}

/**
 * events: olay günlüğü; index: kavram dizini (content/curriculum); settings: öğrenci ayarları.
 * now: değerlendirme anı (geçmiş bir gün için de çağrılabilir).
 */
export function derive({ events = [], index, settings, now = new Date() }) {
  const cfg = normalizeSettings(settings);
  const limit = now.getTime() + CLOCK_SKEW_MS;
  const state = {
    today: dayKey(now), now, settings: cfg,
    concepts: Object.fromEntries(index.concepts.map((c) => [c.id, emptyConcept(c.id)])),
    queue: {}, cards: {}, sets: {}, days: {}, attempts: [], seen: {}, planDone: {},
    levelPref: ENGINE.lesson.defaultLevel, levelChosen: false, placement: { TYT: null, AYT: null },
    paceSamples: { TYT: [], AYT: [] }, cardMs: [], eventCount: 0,
  };
  const ordered = events.filter((e) => e?.at && new Date(e.at).getTime() <= limit).sort(compare);
  for (const event of ordered) {
    state.eventCount += 1;
    switch (event.kind) {
      case 'attempt': applyAttempt(state, event, index.byId); break;
      case 'lesson': applyLesson(state, event); break;
      case 'concept':
        if (state.concepts[event.conceptId] && event.action === 'start_anyway') state.concepts[event.conceptId].override = true;
        break;
      case 'set': applySet(state, event, cfg); break;
      case 'queue':
        if (event.action === 'sibling') addSibling(state.queue, event);
        break;
      case 'plan':
        if (event.action === 'item_done') state.planDone[`${event.planDate}:${event.itemKey}`] = event.at;
        break;
      default: break;
    }
  }
  const scope = scopeOf(index, cfg);
  state.scope = scope;
  for (const meta of index.concepts) {
    const concept = state.concepts[meta.id];
    const scored = masteryScore(meta.archetypes ?? [], concept.attemptsByArchetype, now);
    concept.mastery = scored.score;
    concept.perArchetype = scored.perArchetype;
    concept.solvedTypes = solvedTypes(scored.perArchetype);
    concept.weakest = weakestArchetype(scored.perArchetype);
    concept.minutesSpent = Math.round(concept.msSpent / 60000);
  }
  for (const meta of index.concepts) state.concepts[meta.id].status = statusOf(state.concepts[meta.id], meta, state, scope);
  state.dueQueue = dueItems(state.queue, state.today);
  state.dueCards = Object.values(state.cards)
    .filter((card) => card.reps > 0 && cardDueDay(card.fsrs) <= state.today)
    .sort((a, b) => new Date(a.fsrs.due) - new Date(b.fsrs.due));
  state.newCards = Object.values(state.cards).filter((card) => card.reps === 0).sort((a, b) => a.introducedAt.localeCompare(b.introducedAt));
  const introducedToday = Object.values(state.cards).filter((card) => card.firstReviewDay === state.today).length;
  state.newCardsAllowance = Math.max(0, ENGINE.fsrs.newPerDay - introducedToday);
  state.pace = Object.fromEntries(Object.entries(state.paceSamples).map(([track, samples]) =>
    [track, samples.length >= ENGINE.pace.ownAfterAttempts ? Math.round(median(samples)) : ENGINE.pace[track]]));
  state.cardMedianMs = state.cardMs.length >= 10 ? median(state.cardMs) : ENGINE.fsrs.defaultCardMs;
  state.streak = streakOf(state.days, state.today);
  return state;
}

/** Geçmiş bir anın durumu (telafi modu dünkü yükü bununla ölçer). */
export function deriveAt({ events, index, settings, at }) {
  return derive({ events: events.filter((e) => new Date(e.at) <= at), index, settings, now: at });
}

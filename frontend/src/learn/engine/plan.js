import { ENGINE } from './config.js';
import { dayKey, daysBetween, hoursBetween, weekday } from './dates.js';
import { interval, planMode } from './ladder.js';

// Günlük plan (spec §7): öncelik sırasıyla bütçe dolana kadar; sığmayan iş vadeli kalır ve ertesi gün
// daha yüksek öncelikle döner. Telafi modunda yeni öğrenme %20'ye iner.

export function trackOf(meta, settings) {
  return settings.trackOrder.find((track) => meta.exams.includes(track) && settings.tracks.includes(track)) ?? meta.exams[0];
}

/** Sınav ağırlığı: kavramın seçili sınavlardaki çıkmış soru payı → 1 ile 3 arası. */
export function examWeight(meta, summary, settings) {
  const counts = summary?.concepts ?? {};
  const value = (id) => settings.tracks.reduce((sum, track) => sum + (counts[id]?.cikmis?.[track] ?? 0), 0);
  const max = Math.max(1, ...Object.keys(counts).map(value));
  return 1 + 2 * (value(meta.id) / max);
}

export function paceMinutes(state, track) {
  return ((state.pace?.[track] ?? ENGINE.pace[track] ?? 90) * ENGINE.pace.missedFactor) / 60;
}

/** Dersin şu anki oturumu ve kalan dakikası. */
export function lessonProgress(meta, concept) {
  const done = new Set(concept?.sectionsDone ?? []);
  const sessions = meta.sessions?.length ? meta.sessions : [{ title: meta.title, sections: meta.sections.map((s) => s.id) }];
  const minutesOf = (id) => meta.sections.find((s) => s.id === id)?.minutes ?? 8;
  const index = sessions.findIndex((session) => session.sections.some((id) => !done.has(id)));
  if (index < 0) return { session: sessions.length, sessions: sessions.length, remaining: 0, total: meta.minutes, done: true };
  const remaining = sessions[index].sections.filter((id) => !done.has(id)).reduce((sum, id) => sum + minutesOf(id), 0);
  const totalLeft = meta.sections.filter((s) => !done.has(s.id)).reduce((sum, s) => sum + s.minutes, 0);
  return { session: index + 1, sessions: sessions.length, remaining, totalLeft, total: meta.minutes, done: false };
}

const titleOfArchetype = (meta, id) => meta.archetypes.find((a) => a.id === id)?.title ?? 'zayıf soru tipi';

function candidates({ state, index, summary }) {
  const cfg = state.settings;
  const today = state.today;
  const inScope = (id) => state.scope.has(id);
  const scoped = index.concepts.filter((m) => inScope(m.id));
  const reviews = scoped.filter((m) => state.concepts[m.id].status === 'review_due').map((m) => {
    const concept = state.concepts[m.id];
    const overdue = Math.max(0, daysBetween(concept.nextDue, today));
    const step = interval(concept.ladderStep, { examDate: cfg.examDate, today });
    const priority = (1 + overdue / Math.max(1, step)) * examWeight(m, summary, cfg);
    const reason = overdue > 0
      ? `${m.title} tekrarın ${overdue} gün gecikti — ${m.review.minutes} dakikalık tekrarla başlayalım.`
      : `${m.title}: ${concept.ladderStep + 1}. aralıklı tekrar bugün; bilgiyi taze tutar.`;
    return { key: `review:${m.id}`, kind: 'review', conceptId: m.id, track: trackOf(m, cfg), minutes: m.review.minutes, overdueDays: overdue, priority, reason };
  }).sort((a, b) => b.priority - a.priority || a.conceptId.localeCompare(b.conceptId));

  const queue = state.dueQueue.filter((item) => !item.conceptId || inScope(item.conceptId));
  const missed = [];
  if (queue.length) {
    const tracks = queue.map((item) => item.exam || trackOf(index.byId[item.conceptId] ?? { exams: ['TYT'] }, cfg));
    const perQuestion = tracks.reduce((sum, track) => sum + paceMinutes(state, track), 0) / tracks.length;
    const fit = Math.max(1, Math.min(queue.length, Math.floor(ENGINE.plan.missedMaxMinutes / perQuestion)));
    const priorityCount = queue.filter((item) => item.priority).length;
    missed.push({
      key: 'missed', kind: 'missed', track: null, count: fit, total: queue.length, minutes: Math.max(2, Math.ceil(fit * perQuestion)),
      priority: 1, reason: `${queue.length} soru geri geldi: daha önce yanlış yaptıkların ve kardeş sorular${priorityCount ? ` (${priorityCount} tanesi "Eminim" dediğin yanlışlar)` : ''}.`,
    });
  }

  const dueCards = state.dueCards.filter((card) => inScope(card.conceptId));
  const newCards = state.newCards.filter((card) => inScope(card.conceptId)).slice(0, state.newCardsAllowance);
  const cards = [];
  const cardCount = dueCards.length + newCards.length;
  if (cardCount) {
    const fit = Math.min(cardCount, Math.floor((ENGINE.plan.flashcardMaxMinutes * 60) / ENGINE.plan.flashcardSeconds));
    cards.push({
      key: 'flashcards', kind: 'flashcards', track: null, count: fit, total: cardCount, minutes: Math.max(2, Math.ceil((fit * ENGINE.plan.flashcardSeconds) / 60)),
      priority: 1, reason: `${dueCards.length} kartın vakti geldi${newCards.length ? `, ${newCards.length} yeni kart destede` : ''}.`,
    });
  }

  const reteach = scoped.filter((m) => state.concepts[m.id].reteach).map((m) => {
    const concept = state.concepts[m.id];
    const weak = concept.reteach.archetypes.map((id) => titleOfArchetype(m, id)).join(', ');
    const reason = concept.atRisk
      ? `${m.title}: son tekrarda zorlandın. Zayıf tip (${weak}) için kısa ve basit bir anlatım, sonra yeniden kontrol.`
      : `${m.title}: ustalık testinde ${weak} zorladı. Önce bu kısmı toparlayalım.`;
    return { key: `reteach:${m.id}`, kind: 'reteach', conceptId: m.id, track: trackOf(m, cfg), minutes: ENGINE.plan.reteachMinutes, priority: concept.atRisk ? 2 : 1, reason };
  }).sort((a, b) => b.priority - a.priority);

  const masteryChecks = scoped.filter((m) => {
    const concept = state.concepts[m.id];
    if (concept.status !== 'practicing' || concept.reteach) return false;
    const since = concept.reteachDoneAt && concept.reteachDoneAt > (concept.lessonCompletedAt ?? '') ? concept.reteachDoneAt : concept.lessonCompletedAt;
    return !since || hoursBetween(since, state.now) >= ENGINE.plan.masteryGapHours || daysBetween(dayKey(new Date(since)), today) >= 1;
  }).map((m) => ({
    key: `mastery:${m.id}`, kind: 'mastery', conceptId: m.id, track: trackOf(m, cfg), minutes: m.mastery.minutes, priority: 1,
    reason: `${m.title} dersini bitirdin; şimdi her soru tipinden gerçek sınav sorularıyla ustalık testi.`,
  }));

  const open = scoped.filter((m) => {
    const concept = state.concepts[m.id];
    return concept.status === 'learning' && !concept.reteach && concept.lessonOpenedAt && !concept.lessonCompletedAt;
  }).sort((a, b) => (state.concepts[b.id].lastActivityAt ?? '').localeCompare(state.concepts[a.id].lastActivityAt ?? ''))
    .map((m) => {
      const progress = lessonProgress(m, state.concepts[m.id]);
      return {
        key: `learn:${m.id}`, kind: 'learn', conceptId: m.id, track: trackOf(m, cfg), minutes: Math.max(5, progress.remaining), priority: 1,
        session: progress.session, sessions: progress.sessions, continuing: true,
        reason: `${m.title}: kaldığın yerden devam — oturum ${progress.session}/${progress.sessions}.`,
      };
    });

  const startedToday = {};
  for (const m of scoped) {
    if (state.concepts[m.id].firstOpenDay === today) {
      const track = trackOf(m, cfg);
      startedToday[track] = (startedToday[track] ?? 0) + 1;
    }
  }
  const fresh = [];
  for (const track of cfg.trackOrder.filter((t) => cfg.tracks.includes(t))) {
    const room = ENGINE.plan.maxNewConceptsPerTrack - (startedToday[track] ?? 0) - open.filter((item) => item.track === track).length;
    if (room <= 0) continue;
    const next = scoped.filter((m) => trackOf(m, cfg) === track && state.concepts[m.id].status === 'available' && !state.concepts[m.id].lessonOpenedAt)
      .sort((a, b) => a.order - b.order).slice(0, room);
    for (const m of next) {
      const progress = lessonProgress(m, state.concepts[m.id]);
      fresh.push({
        key: `learn:${m.id}`, kind: 'learn', conceptId: m.id, track, minutes: Math.max(5, progress.remaining), priority: 1,
        session: 1, sessions: progress.sessions, continuing: false,
        reason: `Yeni konu: ${m.title} (${track}) — oturum 1/${progress.sessions}.`,
      });
    }
  }

  const mixed = [];
  const finalMode = planMode(cfg.examDate, today) === 'exam_final';
  const mixedDay = weekday(today) === cfg.mixedSetWeekday || (finalMode && weekday(today) === (cfg.mixedSetWeekday + 3) % 7);
  if (mixedDay) {
    for (const track of cfg.tracks) {
      const mastered = scoped.filter((m) => m.exams.includes(track) && state.concepts[m.id].masteryValid).length;
      if (mastered >= 3) {
        const size = Math.min(ENGINE.plan.mixedSetMax, Math.max(ENGINE.plan.mixedSetMin, mastered * 3));
        mixed.push({
          key: `mixed:${track}`, kind: 'mixed', track, count: size, minutes: Math.ceil((size * (state.pace?.[track] ?? ENGINE.pace[track])) / 60), priority: 1,
          reason: `Haftalık karma set (${track}): ustalaştığın ${mastered} konudan karışık ${size} soru — sınav gibi.`,
        });
      }
    }
  }

  const placement = cfg.tracks.filter((track) => !state.placement[track] && !cfg.placementSkipped.includes(track)
    && !scoped.some((m) => m.exams.includes(track) && (state.concepts[m.id].lessonOpenedAt || state.concepts[m.id].firstMasteredAt)))
    .map((track) => ({
      key: `placement:${track}`, kind: 'placement', track, minutes: ENGINE.placement.maxMinutes, priority: 1, optional: true,
      reason: `${track} Matematik'e ilk girişin: isteğe bağlı kısa seviye testi bildiğin konuları atlamanı sağlar.`,
    }));

  return { reviews, missed, cards, reteach, masteryChecks, open, fresh, mixed, placement };
}

/** Telafi modu ölçüsü: vadeli işlerin (tekrar, yanlış, kart, yeniden anlatım) dakikası. */
export function dueLoad(state, index, summary) {
  const c = candidates({ state, index, summary });
  return [...c.reviews, ...c.missed, ...c.cards, ...c.reteach].reduce((sum, item) => sum + item.minutes, 0);
}

/**
 * state: o günün başındaki türetilmiş durum. yesterdayLoad: dün aynı ölçüyle hesaplanan vadeli yük.
 * Dönen plan: { date, budgetMin, items, deferred, mode, catchUpDays, message }.
 */
export function buildPlan({ state, index, summary, yesterdayLoad = 0 }) {
  const cfg = state.settings;
  const budget = cfg.dailyMinutes;
  const c = candidates({ state, index, summary });
  const load = [...c.reviews, ...c.missed, ...c.cards, ...c.reteach].reduce((sum, item) => sum + item.minutes, 0);
  const catchUp = load > ENGINE.plan.catchUpLoad * budget && yesterdayLoad > ENGINE.plan.catchUpLoad * budget;
  const newBudget = Math.round(budget * (catchUp ? ENGINE.plan.catchUpNewShare : ENGINE.plan.newShare));
  const dueBudget = budget - newBudget;
  const items = [];
  const deferred = [];
  let usedDue = 0;
  for (const item of [...c.reviews, ...c.missed, ...c.cards, ...c.reteach]) {
    if (usedDue + item.minutes <= dueBudget || (!items.length && item.minutes <= budget)) {
      items.push(item);
      usedDue += item.minutes;
    } else deferred.push(item);
  }
  let usedNew = 0;
  for (const item of [...c.masteryChecks, ...c.open, ...c.fresh]) {
    const left = newBudget - usedNew + Math.max(0, dueBudget - usedDue);
    if (left < 10) {
      deferred.push(item);
      continue;
    }
    const minutes = Math.min(item.minutes, left);
    items.push({ ...item, minutes, partial: minutes < item.minutes });
    usedNew += minutes;
  }
  const used = () => items.reduce((sum, item) => sum + item.minutes, 0);
  if (!catchUp) {
    for (const item of [...deferred]) {
      if (item.kind === 'learn' || item.kind === 'mastery') continue;
      if (used() + item.minutes <= budget) {
        items.push(item);
        deferred.splice(deferred.indexOf(item), 1);
      }
    }
  }
  for (const item of c.mixed) {
    if (used() + item.minutes <= budget * 1.1) items.push(item);
    else deferred.push(item);
  }
  const extras = c.placement;
  const mode = catchUp ? 'catch_up' : planMode(cfg.examDate, state.today);
  const catchUpDays = catchUp ? Math.min(ENGINE.plan.catchUpMaxDays, Math.max(ENGINE.plan.catchUpMinDays, Math.ceil(load / Math.max(1, dueBudget)))) : 0;
  const message = catchUp
    ? `Önce tekrarları toparlayalım; ${catchUpDays} günde normale döneriz. Yeni konular bu günlerde bütçenin %20'si.`
    : mode === 'exam_final' ? 'Sınava 3 haftadan az kaldı: tekrar aralıkları en çok 7 gün, karma setler haftada iki kez.' : '';
  return { date: state.today, budgetMin: budget, items, deferred, extras, mode, catchUpDays, load, message };
}

/** Plan maddesi bugünkü duruma göre tamamlandı mı? */
export function isDone(item, current, planDate, index) {
  if (current.planDone[`${planDate}:${item.key}`]) return true;
  const concept = item.conceptId ? current.concepts[item.conceptId] : null;
  const onPlanDay = (iso) => !!iso && dayKey(new Date(iso)) === planDate;
  const setToday = (types, conceptId, track) => Object.values(current.sets).some((set) => set.doneAt && types.includes(set.type)
    && (!conceptId || set.conceptId === conceptId) && (!track || set.track === track) && onPlanDay(set.doneAt));
  switch (item.kind) {
    case 'review': return setToday(['review'], item.conceptId);
    case 'mastery': return setToday(['mastery', 'testout'], item.conceptId);
    case 'reteach': return !!concept && !concept.reteach && onPlanDay(concept.reteachDoneAt);
    case 'learn': {
      if (!concept) return false;
      if (onPlanDay(concept.lessonCompletedAt)) return true;
      const progress = lessonProgress(index.byId[item.conceptId], concept);
      return progress.done || progress.session > (item.session ?? 1);
    }
    case 'missed': return setToday(['missed']) || current.dueQueue.length === 0;
    case 'flashcards': return setToday(['flashcards']) || (current.dueCards.length === 0 && (current.newCards.length === 0 || current.newCardsAllowance === 0));
    case 'mixed': return setToday(['mixed'], null, item.track);
    case 'placement': return !!current.placement[item.track];
    default: return false;
  }
}

import { ENGINE } from './config.js';
import { addDays, dayKey } from './dates.js';

/**
 * Yanlış soru kuyruğu (spec §5.3): aynı soru geri gelir.
 * - Yanlış → adım 0, ertesi gün. Yeniden yanlış → yine ertesi gün.
 * - Doğru → +3, sonra +7 gün; art arda 2 doğru temizler ("Eminim" deyip yanlış yapılan, öncelikli soruda 3).
 * - "Eminim" ile yanlış → öncelikli; yeniden sorulmadan önce yanılgı kartı gösterilir.
 * - "Tahmin" ile doğru → 3 gün sonra bir kontrol.
 * - "Tahmin" ile gelen doğru temizleme sayısını artırmaz.
 */
export function applyBankAttempt(queue, attempt) {
  const day = dayKey(new Date(attempt.at));
  const steps = ENGINE.missed.steps;
  const current = queue[attempt.itemId];
  const active = current && current.status === 'active' ? current : null;
  const base = {
    itemId: attempt.itemId, questionId: attempt.questionId, conceptId: attempt.conceptId,
    archetypeId: attempt.archetypeId ?? null, exam: attempt.exam ?? null,
  };
  if (!attempt.correct) {
    const item = {
      ...base, ...(active ?? {}), kind: 'missed', status: 'active', step: 0, dueDay: addDays(day, steps[0]),
      consecutiveCorrect: 0, priority: (active?.priority ?? false) || attempt.confidence === 3,
      wrongCount: (current?.wrongCount ?? 0) + 1, firstMissedAt: current?.firstMissedAt ?? attempt.at,
      lastAt: attempt.at, lastChosen: attempt.chosen ?? null, clearedAt: null,
    };
    queue[attempt.itemId] = item;
    return { requeued: true, item };
  }
  if (!active) {
    if (attempt.confidence === 1) {
      queue[attempt.itemId] = {
        ...base, ...(current ?? {}), kind: 'guess', status: 'active', step: 1, dueDay: addDays(day, ENGINE.missed.guessCheckDays),
        consecutiveCorrect: 0, priority: false, wrongCount: current?.wrongCount ?? 0, firstMissedAt: current?.firstMissedAt ?? null,
        lastAt: attempt.at, clearedAt: null,
      };
    }
    return { requeued: false, item: queue[attempt.itemId] ?? null };
  }
  if (attempt.confidence === 1) {
    active.dueDay = addDays(day, ENGINE.missed.guessCheckDays);
    active.lastAt = attempt.at;
    return { requeued: false, item: active };
  }
  active.consecutiveCorrect += 1;
  active.lastAt = attempt.at;
  const needed = active.kind === 'missed' ? (active.priority ? ENGINE.missed.priorityClearAfter : ENGINE.missed.clearAfter) : 1;
  if (active.consecutiveCorrect >= needed) {
    active.status = 'cleared';
    active.clearedAt = attempt.at;
    active.dueDay = null;
  } else {
    active.step = Math.min(active.consecutiveCorrect, steps.length - 1);
    active.dueDay = addDays(day, steps[active.step]);
  }
  return { requeued: false, item: active };
}

/** Kardeş soru: aynı tipte görülmemiş bir soru ertesi gün yöntemi (cevabın ezberini değil) ölçer. */
export function addSibling(queue, event) {
  if (queue[event.itemId]?.status === 'active') return;
  queue[event.itemId] = {
    itemId: event.itemId, questionId: event.questionId, conceptId: event.conceptId, archetypeId: event.archetypeId ?? null,
    exam: event.exam ?? null, kind: 'sibling', status: 'active', step: 0, dueDay: event.dueDay,
    consecutiveCorrect: 0, priority: false, wrongCount: 0, firstMissedAt: null, lastAt: event.at,
    sourceItemId: event.sourceItemId ?? null, clearedAt: null,
  };
}

export function dueItems(queue, today) {
  return Object.values(queue)
    .filter((item) => item.status === 'active' && item.dueDay && item.dueDay <= today)
    .sort((a, b) => Number(b.priority) - Number(a.priority) || a.dueDay.localeCompare(b.dueDay) || a.itemId.localeCompare(b.itemId));
}

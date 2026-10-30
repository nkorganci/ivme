import { ENGINE } from './config.js';
import { addDays, daysBetween } from './dates.js';
import { lessonProgress, trackOf } from './plan.js';

const CONFIDENCE = { 1: 'Tahmin', 2: 'Emin değilim', 3: 'Eminim' };

/** Geçmiş zaman çizelgesi: gün, dakika, soru, doğruluk, açılan kavram (spec §12). */
export function historyRows(state, index) {
  return Object.values(state.days).sort((a, b) => b.day.localeCompare(a.day)).map((day) => ({
    key: day.day, day: day.day, minutes: Math.round(day.ms / 60000), questions: day.questions, correct: day.correct,
    accuracy: day.questions ? Math.round((100 * day.correct) / day.questions) : null, cards: day.cards, sections: day.sections,
    reviews: day.reviews, fixed: day.fixed, concepts: day.concepts.map((id) => index.byId[id]?.title ?? id).join(', '),
  }));
}

/** Dışa aktarım: gün × sınav toplamları (çözülen, doğru, dakika) mevcut takip tablosuna aktarılabilir. */
export function exportRows(state) {
  const rows = [];
  for (const day of Object.values(state.days).sort((a, b) => a.day.localeCompare(b.day))) {
    for (const [track, totals] of Object.entries(day.tracks)) {
      rows.push({ key: `${day.day}:${track}`, day: day.day, subject: `${track} Matematik`, solved: totals.questions, correct: totals.correct, wrong: totals.questions - totals.correct, minutes: Math.round(totals.ms / 60000) });
    }
  }
  return rows;
}

/** Kalibrasyon: güven düzeyine göre doğruluk; "Eminim" doğruluğu %80'in altındaysa aşırı güven uyarısı. */
export function calibration(state) {
  const buckets = { 1: { n: 0, correct: 0 }, 2: { n: 0, correct: 0 }, 3: { n: 0, correct: 0 } };
  for (const attempt of state.attempts) {
    if (attempt.itemType === 'flashcard' || attempt.context === 'pretest' || !buckets[attempt.confidence]) continue;
    buckets[attempt.confidence].n += 1;
    if (attempt.correct) buckets[attempt.confidence].correct += 1;
  }
  const rows = Object.entries(buckets).map(([level, value]) => ({
    key: level, level: Number(level), label: CONFIDENCE[level], n: value.n, correct: value.correct,
    accuracy: value.n ? Math.round((100 * value.correct) / value.n) : null,
  }));
  const sure = rows[2];
  const guess = rows[0];
  let note = 'Güven düzeyini işaretledikçe burada ne kadar isabetli tahmin ettiğin görünür.';
  if (sure.n >= 10 && sure.accuracy < 80) note = `"Eminim" dediğin soruların %${sure.accuracy}'i doğru: bazı yanılgılar sağlam görünüyor. Bu sorular öncelikli kuyruğa alınır ve yanılgı kartıyla geri gelir.`;
  else if (guess.n >= 10 && guess.accuracy >= 60) note = `"Tahmin" dediğin soruların %${guess.accuracy}'i doğru: bildiğinden daha az eminsin. Doğru tahminler 3 gün sonra bir kez daha sorulur.`;
  else if (sure.n >= 10) note = `Güvenin isabetli: "Eminim" dediğin soruların %${sure.accuracy}'i doğru.`;
  return { rows, note };
}

/**
 * Tahmin: kalan kavram × ortalama süre → sınava göre beklenen bitiş (spec §12).
 * Ortalama süre, dersin tahmini dakikası ile öğrencinin gerçek hızının oranıyla düzeltilir.
 */
export function forecast(state, index) {
  const cfg = state.settings;
  const finished = index.concepts.filter((m) => state.scope.has(m.id) && state.concepts[m.id].firstMasteredAt);
  const planned = finished.reduce((sum, m) => sum + m.minutes + m.mastery.minutes, 0);
  const spent = finished.reduce((sum, m) => sum + state.concepts[m.id].minutesSpent, 0);
  const ratio = finished.length >= 3 && planned > 0 ? Math.min(2.5, Math.max(0.5, spent / planned)) : 1;
  const perDay = Math.max(10, cfg.dailyMinutes * ENGINE.plan.newShare);
  return cfg.tracks.map((track) => {
    const concepts = index.concepts.filter((m) => trackOf(m, cfg) === track && state.scope.has(m.id));
    const left = concepts.filter((m) => !state.concepts[m.id].firstMasteredAt);
    const minutesLeft = Math.round(left.reduce((sum, m) => {
      const progress = lessonProgress(m, state.concepts[m.id]);
      return sum + (progress.done ? 0 : progress.totalLeft ?? m.minutes) + m.mastery.minutes;
    }, 0) * ratio);
    const share = cfg.tracks.length > 1 ? 0.5 : 1;
    const days = Math.ceil(minutesLeft / (perDay * share));
    const finish = addDays(state.today, days);
    const daysLeft = cfg.examDate ? daysBetween(state.today, cfg.examDate) : null;
    return {
      key: track, track, total: concepts.length, mastered: concepts.length - left.length, left: left.length, minutesLeft, days, finish,
      examDate: cfg.examDate || null, onTime: daysLeft == null ? null : days <= Math.max(0, daysLeft - 14), ratio: Math.round(ratio * 100) / 100,
    };
  });
}

/** Hatalarım: yanlış yapılan her soru, tip ve kavrama göre, kuyruk durumuyla. */
export function mistakeRows(state, index) {
  return Object.values(state.queue).filter((item) => item.kind !== 'sibling' || item.status !== 'active' || item.wrongCount > 0)
    .filter((item) => item.wrongCount > 0 || item.kind === 'guess')
    .map((item) => {
      const meta = index.byId[item.conceptId];
      return {
        key: item.itemId, code: item.itemId, questionId: item.questionId, conceptId: item.conceptId, concept: meta?.title ?? item.conceptId,
        archetypeId: item.archetypeId, archetype: meta?.archetypes.find((a) => a.id === item.archetypeId)?.title ?? 'Tip belirlenmedi',
        exam: item.exam ?? meta?.exams?.[0] ?? '', status: item.status, kind: item.kind, priority: item.priority, wrongCount: item.wrongCount,
        dueDay: item.dueDay, step: item.step, consecutiveCorrect: item.consecutiveCorrect, firstMissedAt: item.firstMissedAt, clearedAt: item.clearedAt,
      };
    })
    .sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active') || (a.dueDay ?? '9').localeCompare(b.dueDay ?? '9'));
}

/** Bugün kazanılanlar: yeni çözülebilen soru tipleri, düzeltilen hatalar, tamamlanan tekrarlar (motivasyon, spec §13). */
export function todayWins(state, start) {
  const today = state.days[state.today];
  const unlocked = [];
  for (const concept of Object.values(state.concepts)) {
    for (const archetype of concept.perArchetype) {
      const before = start?.concepts[concept.id]?.perArchetype.find((a) => a.id === archetype.id);
      const was = before && before.recentCorrect > 0 && before.acc >= ENGINE.mastery.solvedAcc;
      const now = archetype.recentCorrect > 0 && archetype.acc >= ENGINE.mastery.solvedAcc;
      if (now && !was) unlocked.push(`${concept.id}:${archetype.id}`);
    }
  }
  const points = (today?.reviews ?? 0) * 10 + (today?.fixed ?? 0) * 5 + (today?.correct ?? 0) + (today?.sections ?? 0) * 2;
  return { unlockedTypes: unlocked.length, fixed: today?.fixed ?? 0, reviews: today?.reviews ?? 0, minutes: Math.round((today?.ms ?? 0) / 60000), points };
}

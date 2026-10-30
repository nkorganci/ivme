import { ENGINE } from './config.js';
import { ageDays } from './dates.js';

/**
 * Ustalık puanı (spec §4). Her soru tipinin son 10 denemesi:
 *   w_i = (zorluk_i / 3) × 0.5^(yaş_gün / 14)
 *   acc_a = Σ w·doğru / Σ w   (hiç deneme yoksa 0)
 *   ustalık = 100 × Σ pay_a × acc_a   (pay: dersin sınav profili)
 */
export function masteryScore(archetypes, attemptsByArchetype, now, options = {}) {
  const window = options.window ?? ENGINE.mastery.window;
  const halfLife = options.halfLifeDays ?? ENGINE.mastery.halfLifeDays;
  const list = archetypes?.length ? archetypes : [];
  const shareTotal = list.reduce((sum, a) => sum + (a.share > 0 ? a.share : 0), 0);
  const perArchetype = list.map((archetype) => {
    const attempts = (attemptsByArchetype.get?.(archetype.id) ?? attemptsByArchetype[archetype.id] ?? []).slice(-window);
    let weighted = 0;
    let weights = 0;
    let correct = 0;
    for (const attempt of attempts) {
      const difficulty = Math.min(3, Math.max(1, Number(attempt.difficulty) || 2));
      const weight = (difficulty / 3) * 0.5 ** (ageDays(attempt.at, now) / halfLife);
      weights += weight;
      if (attempt.correct) {
        weighted += weight;
        correct += 1;
      }
    }
    const share = shareTotal > 0 ? Math.max(0, archetype.share) / shareTotal : 1 / list.length;
    return { id: archetype.id, share, acc: weights > 0 ? weighted / weights : 0, recent: attempts.length, recentCorrect: correct };
  });
  const score = perArchetype.reduce((sum, a) => sum + a.share * a.acc, 0);
  return { score: Math.round(100 * score), perArchetype };
}

/** "4/5 soru tipini çözebiliyorsun": son denemelerde ağırlıklı başarısı eşiği geçen tipler. */
export function solvedTypes(perArchetype, threshold = ENGINE.mastery.solvedAcc) {
  return perArchetype.filter((a) => a.recentCorrect > 0 && a.acc >= threshold).length;
}

/**
 * Bir sorunun hangi tiplere hazırlık yaptığını değil, bir setin sonucunu hesaplar.
 * Geçme: yüzde ≥ passPct ve setteki her tipte en az minCorrect doğru.
 */
export function setResult(attempts, { passPct = ENGINE.mastery.passPct, minCorrect = ENGINE.mastery.minCorrectPerArchetype } = {}) {
  const byArchetype = {};
  let correct = 0;
  for (const attempt of attempts) {
    const key = attempt.archetypeId || '_genel';
    byArchetype[key] ??= { total: 0, correct: 0 };
    byArchetype[key].total += 1;
    if (attempt.correct) {
      byArchetype[key].correct += 1;
      correct += 1;
    }
  }
  const total = attempts.length;
  const pct = total ? Math.round((100 * correct) / total) : 0;
  const typed = Object.entries(byArchetype).filter(([key]) => key !== '_genel');
  const everyType = typed.every(([, value]) => value.correct >= minCorrect);
  const weak = typed.filter(([, value]) => value.correct < Math.max(minCorrect, Math.ceil(value.total * 0.6)))
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total).map(([key]) => key);
  return { total, correct, pct, byArchetype, passed: total > 0 && pct >= passPct && everyType, weak };
}

/** En zayıf tip: önce son denemelerdeki ağırlıklı başarı, eşitlikte sınav payı büyük olan. */
export function weakestArchetype(perArchetype) {
  return [...perArchetype].sort((a, b) => a.acc - b.acc || b.share - a.share)[0]?.id ?? null;
}

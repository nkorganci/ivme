// Nüfus piramidi ve 5 yıllık kohort projeksiyonu (saf işlevler, öğretim amaçlı basitleştirilmiş model).
export const AGES = Array.from({ length: 17 }, (_, k) => (k === 16 ? '80+' : `${5 * k}–${5 * k + 4}`));
const FERTILE = [3, 4, 5, 6, 7, 8, 9]; // 15–49
const WEIGHTS = [0.05, 0.18, 0.27, 0.24, 0.16, 0.08, 0.02];

/** Ölüm hızı (yıllık) yaş ortası için: bebek ek ölümü + Gompertz. */
function hazards(e0, female) {
  const infant = Math.max(0.0015, 0.06 * Math.exp(-(e0 - 40) / 9));
  const lifeExpectancy = (A) => {
    let l = 1; let total = 0;
    for (let k = 0; k < 17; k += 1) {
      const mid = 5 * k + 2.5;
      const mu = (A * Math.exp(0.09 * mid) + (k === 0 ? infant : 0)) * (female ? 0.85 : 1);
      if (k === 16) { total += l / mu; break; }
      const next = l * Math.exp(-5 * mu);
      total += (5 * (l + next)) / 2;
      l = next;
    }
    return total;
  };
  let lo = -14; let hi = -1;
  for (let i = 0; i < 60; i += 1) { const mid = (lo + hi) / 2; if (lifeExpectancy(Math.exp(mid)) > e0) lo = mid; else hi = mid; }
  const A = Math.exp((lo + hi) / 2);
  return Array.from({ length: 17 }, (_, k) => (A * Math.exp(0.09 * (5 * k + 2.5)) + (k === 0 ? infant : 0)) * (female ? 0.85 : 1));
}

/** 5 yıllık hayatta kalma oranları (erkek, kadın). */
export function survival(e0) {
  return { male: hazards(e0, false).map((mu) => Math.exp(-5 * mu)), female: hazards(e0, true).map((mu) => Math.exp(-5 * mu)) };
}

/** Bir 5 yıllık adım: yaşlanma + ölüm + doğum + göç. pop = { male: [17], female: [17] } (milyon). */
export function step(pop, { tfr, e0, migration = 0 }) {
  const s = survival(e0);
  const age = (list, surv) => {
    const out = Array(17).fill(0);
    for (let k = 0; k < 15; k += 1) out[k + 1] = list[k] * surv[k];
    out[16] = list[15] * surv[15] + list[16] * surv[16];
    return out;
  };
  const male = age(pop.male, s.male); const female = age(pop.female, s.female);
  const births = FERTILE.reduce((sum, k, i) => sum + ((pop.female[k] + female[k]) / 2) * tfr * WEIGHTS[i], 0);
  male[0] = births * 0.512 * (1 + s.male[0]) / 2;
  female[0] = births * 0.488 * (1 + s.female[0]) / 2;
  if (migration) {
    const total = pop.male.reduce((p, v) => p + v, 0) + pop.female.reduce((p, v) => p + v, 0);
    const inflow = (total * migration) / 100;
    [4, 5, 6, 7].forEach((k) => { male[k] += (inflow * 0.6) / 4; female[k] += (inflow * 0.4) / 4; });
  }
  return { male, female };
}

export function project(start, params, steps) {
  let pop = start;
  for (let i = 0; i < steps; i += 1) pop = step(pop, params);
  return pop;
}

/** Yaş yapısı, bağımlılık oranları, medyan yaş ve piramit tipi. */
export function structure(pop) {
  const both = pop.male.map((m, k) => m + pop.female[k]);
  const total = both.reduce((p, v) => p + v, 0);
  const young = both.slice(0, 3).reduce((p, v) => p + v, 0);
  const old = both.slice(13).reduce((p, v) => p + v, 0);
  const working = total - young - old;
  let acc = 0; let median = 0;
  for (let k = 0; k < 17; k += 1) {
    if (acc + both[k] >= total / 2) { median = 5 * k + (5 * (total / 2 - acc)) / both[k]; break; }
    acc += both[k];
  }
  const youngShare = (young / total) * 100; const oldShare = (old / total) * 100;
  const type = youngShare >= 30 && oldShare < 8 ? 'Genişleyen (üçgen) piramit'
    : oldShare >= 18 && youngShare < 16 ? 'Daralan (ters / vazo) piramit' : 'Durağan (çan / arı kovanı) piramit';
  return { total, youngShare, oldShare, workingShare: (working / total) * 100, youngDep: (young / working) * 100, oldDep: (old / working) * 100, dependency: ((young + old) / working) * 100, median, type };
}

export function transitionStage(tfr, e0) {
  if (tfr > 4 && e0 < 60) return 'Demografik dönüşüm 2. evre: doğum yüksek, ölüm hızla düşüyor → hızlı artış';
  if (tfr > 2.1) return 'Demografik dönüşüm 3. evre: doğum düşüyor, artış yavaşlıyor';
  return 'Demografik dönüşüm 4.–5. evre: doğum ve ölüm düşük → artış durur, nüfus yaşlanır';
}

const fromShares = (shares, totalMillions, oldFemaleBias = 0.55) => {
  const sum = shares.reduce((p, v) => p + v, 0);
  const male = []; const female = [];
  shares.forEach((v, k) => { const n = (v / sum) * totalMillions; const fShare = k >= 13 ? oldFemaleBias : 0.495; female.push(n * fShare); male.push(n * (1 - fShare)); });
  return { male, female };
};

export const POP_PRESETS = [
  { id: 'genc', name: 'Gelişmekte olan ülke (genç nüfus)', tfr: 4.5, e0: 62, migration: 0, pop: fromShares(Array.from({ length: 17 }, (_, k) => 0.86 ** k), 100, 0.53) },
  { id: 'turkiye', name: 'Türkiye (yaklaşık 2020)', tfr: 1.6, e0: 78, migration: 0,
    pop: fromShares([7.3, 7.5, 7.6, 7.8, 7.8, 7.6, 7.9, 7.7, 7.0, 6.4, 5.8, 5.0, 4.3, 3.4, 2.4, 1.6, 1.9], 84) },
  { id: 'yasli', name: 'Gelişmiş ülke (yaşlı nüfus)', tfr: 1.3, e0: 84, migration: 0,
    pop: fromShares([3.6, 4.0, 4.3, 4.5, 4.9, 4.9, 5.3, 5.9, 6.6, 7.7, 7.0, 6.2, 5.9, 7.0, 7.4, 5.6, 9.0], 100, 0.58) },
  { id: 'goc', name: 'Göç alan sanayi şehri', tfr: 1.8, e0: 78, migration: 4,
    pop: (() => { const p = fromShares([6.8, 6.6, 6.4, 7.6, 10.5, 11.5, 10.8, 9.4, 7.2, 5.9, 4.8, 3.8, 3.0, 2.2, 1.6, 1.0, 0.9], 10); [4, 5, 6, 7].forEach((k) => { const extra = p.female[k] * 0.35; p.male[k] += extra; p.female[k] -= extra; }); return p; })() },
];

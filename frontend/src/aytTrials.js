import { calculateTrial, sortTrialsByDate } from './tytTrials.js';

// 2026-YKS Kılavuzu Tablo 1B ve 1E: alan testleri ve puan ağırlıkları.
export const AYT_TESTS = {
  math: { key: 'math', label: 'Matematik', questions: 40 },
  physics: { key: 'physics', label: 'Fizik', questions: 14 },
  chemistry: { key: 'chemistry', label: 'Kimya', questions: 13 },
  biology: { key: 'biology', label: 'Biyoloji', questions: 13 },
  literature: { key: 'literature', label: 'Edebiyat', questions: 24 },
  history1: { key: 'history1', label: 'Tarih-1', questions: 10 },
  geography1: { key: 'geography1', label: 'Coğrafya-1', questions: 6 },
  history2: { key: 'history2', label: 'Tarih-2', questions: 11 },
  geography2: { key: 'geography2', label: 'Coğrafya-2', questions: 11 },
  philosophy: { key: 'philosophy', label: 'Felsefe Grubu', questions: 12 },
  religion: { key: 'religion', label: 'Din / Ek Felsefe', questions: 6 },
  language: { key: 'language', label: 'Yabancı Dil (YDT)', questions: 80 },
};

export const AYT_AREAS = {
  SAY: { label: 'Sayısal', weights: { math: 30, physics: 10, chemistry: 10, biology: 10 }, qualifying: [['math'], ['physics', 'chemistry', 'biology']] },
  EA: { label: 'Eşit Ağırlık', weights: { math: 30, literature: 18, history1: 7, geography1: 5 }, qualifying: [['math'], ['literature', 'history1', 'geography1']] },
  SOZ: { label: 'Sözel', weights: { literature: 18, history1: 7, geography1: 5, history2: 8, geography2: 8, philosophy: 9, religion: 5 }, qualifying: [['literature', 'history1', 'geography1'], ['history2', 'geography2', 'philosophy', 'religion']] },
  DIL: { label: 'Dil (YDT)', weights: { language: 60 }, qualifying: [['language']] },
};

// ÖSYM 2026-YKS sınav puanlarının yığınsal dağılımı, SAY/SÖZ/EA/DİL sütunları.
// https://dokuman.osym.gov.tr/pdfdokuman/2026/YKS/SB/sayisal_ykdd21072026.pdf
const DISTRIBUTION = [
  [500, 1, 1, 1, 5], [480, 1453, 10, 52, 118], [460, 8786, 74, 307, 628],
  [440, 22370, 214, 874, 1795], [420, 39624, 560, 2097, 3632],
  [400, 58728, 1418, 4545, 6683], [380, 78806, 3936, 9486, 11576],
  [360, 100553, 10259, 23452, 18265], [340, 125045, 23653, 50608, 26469],
  [320, 153304, 47292, 89520, 35020], [300, 187034, 86560, 140784, 43883],
  [280, 228643, 148959, 210499, 52590], [260, 279885, 238848, 308127, 61992],
  [240, 344536, 360487, 440752, 72025], [220, 430074, 515916, 615366, 82982],
  [200, 549793, 699304, 832251, 94735], [180, 721488, 873860, 1069239, 107579],
  [160, 923753, 998826, 1272506, 120099], [140, 1078515, 1065157, 1391240, 128950],
  [120, 1134006, 1084720, 1420558, 132443],
];
const DISTRIBUTION_COLUMN = { SAY: 1, SOZ: 2, EA: 3, DIL: 4 };

export function latestTytTrial(rows) {
  return sortTrialsByDate((rows ?? []).filter((row) => row.date &&
    (Object.values(row.testNets ?? {}).some((value) => value !== '')
      || Object.keys(row.answers ?? {}).length > 0 || Object.keys(row.nets ?? {}).length > 0)
    && Number.isFinite(calculateTrial(row).score))).at(-1) ?? null;
}

export function validAytTrial(row) {
  return row && typeof row.id === 'string' && typeof row.date === 'string'
    && (row.date === '' || /^\d{4}-\d{2}-\d{2}$/.test(row.date))
    && row.testNets && typeof row.testNets === 'object'
    && Object.entries(row.testNets).every(([key, raw]) => {
      const test = AYT_TESTS[key];
      if (!test || typeof raw !== 'string' || !/^-?\d*(?:[.,]\d{0,2})?$/.test(raw)) return false;
      if (raw === '' || raw === '-' || raw === '.' || raw === '-.' || raw === ',' || raw === '-,') return true;
      const net = Number(raw.replace(',', '.'));
      return net >= -test.questions / 4 && net <= test.questions;
    });
}

export function createAytTrial(date = new Date().toLocaleDateString('sv-SE')) {
  return { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, date, testNets: {} };
}

export function estimateAytRank(score, area) {
  const column = DISTRIBUTION_COLUMN[area];
  if (!column || !Number.isFinite(score) || score < 120) return null;
  if (score >= 500) return 1;
  for (let i = 0; i < DISTRIBUTION.length - 1; i += 1) {
    const high = DISTRIBUTION[i];
    const low = DISTRIBUTION[i + 1];
    if (score >= low[0]) return Math.max(1, Math.round(high[column] +
      (high[0] - score) / (high[0] - low[0]) * (low[column] - high[column])));
  }
  return null;
}

export function calculateAytTrial(row, area, tytScore, obp = null) {
  const config = AYT_AREAS[area];
  const nets = Object.fromEntries(Object.keys(config.weights).map((key) => {
    const value = Number(String(row.testNets?.[key] ?? '').replace(',', '.'));
    return [key, Number.isFinite(value) ? value : 0];
  }));
  const net = Object.values(nets).reduce((sum, value) => sum + value, 0);
  const hasResult = Object.keys(config.weights).some((key) => row.testNets?.[key] !== undefined && row.testNets[key] !== '');
  const eligible = config.qualifying.some((group) => group.reduce((sum, key) => sum + nets[key], 0) >= 0.5);
  // Kılavuzdaki %40 TYT + %60 AYT/YDT ağırlığını 100–500 aralığına taşır.
  // ÖSYM'nin sınav yılı standart puanları bulunmadığından sonuç bir tahmindir.
  const score = hasResult && eligible && Number.isFinite(tytScore)
    ? Math.max(100, Math.min(500, 100 + 0.4 * (tytScore - 100) +
      400 * Object.entries(config.weights).reduce((sum, [key, weight]) =>
        sum + (weight / 100) * nets[key] / AYT_TESTS[key].questions, 0))) : null;
  return { nets, net, score, placement: score === null ? null : score + (obp === null ? 0 : obp * 0.12),
    rank: score === null ? null : estimateAytRank(score, area) };
}

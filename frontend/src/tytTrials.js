export const SUBJECTS = [
  { key: 'matematik', label: 'Matematik', questions: 30, test: 'math' },
  { key: 'geometri', label: 'Geometri', questions: 10, test: 'math' },
  { key: 'turkce', label: 'Türkçe', questions: 40, test: 'turkish' },
  { key: 'fizik', label: 'Fizik', questions: 7, test: 'science' },
  { key: 'kimya', label: 'Kimya', questions: 7, test: 'science' },
  { key: 'biyoloji', label: 'Biyoloji', questions: 6, test: 'science' },
  { key: 'tarih', label: 'Tarih', questions: 5, test: 'social' },
  { key: 'cografya', label: 'Coğrafya', questions: 5, test: 'social' },
  { key: 'felsefe', label: 'Felsefe', questions: 5, test: 'social' },
  { key: 'din', label: 'Din / Ek Felsefe', questions: 5, test: 'social' },
];

export const TESTS = [
  { key: 'math', label: 'Matematik', questions: 40 },
  { key: 'turkish', label: 'Türkçe', questions: 40 },
  { key: 'science', label: 'Fen Bilimleri', questions: 20 },
  { key: 'social', label: 'Sosyal Bilgiler', questions: 20 },
];

// Yaklaşık test ağırlıkları. Tek dershane referansı bütün ağırlıklara aynı oranda uygulanır.
const COEFFICIENT = { math: 3.8725, turkish: 3.8725, science: 3.9898, social: 3.9898 };
// 15 Matematik, 26 Türkçe, 11 Fen, 14 Sosyal net = dershane tahmini 320 TYT puanı.
// Tek referans gerçek ÖSYM puanını veya diğer denemelerin kesin sonucunu belirlemez.
const SCORE_CALIBRATION = (320 - 100) /
  (15 * COEFFICIENT.math + 26 * COEFFICIENT.turkish + 11 * COEFFICIENT.science + 14 * COEFFICIENT.social);

// ÖSYM 2026-YKS sınav puanlarının yığınsal dağılımı, TYT sütunu.
// https://dokuman.osym.gov.tr/pdfdokuman/2026/YKS/SB/sayisal_ykdd21072026.pdf
const TYT_DISTRIBUTION = [
  [500, 5], [480, 822], [460, 5524], [440, 17050], [420, 37770],
  [400, 67394], [380, 106404], [360, 155008], [340, 218156],
  [320, 302758], [300, 417935], [280, 577094], [260, 787244],
  [240, 1045340], [220, 1332391], [200, 1630698], [180, 1914717],
  [160, 2125244], [140, 2184873], [120, 2187723],
];

export function createTrial(date = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
})()) {
  return { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, date, name: '', answers: {}, nets: {}, testNets: {} };
}

export function sortTrialsByDate(trials) {
  return [...trials].sort((first, second) => {
    if (!first.date) return second.date ? 1 : 0;
    if (!second.date) return -1;
    return first.date.localeCompare(second.date);
  });
}

export function buildTytChartData(trials) {
  return sortTrialsByDate(trials).filter((trial) => trial.date).map((trial) => {
    const hasLegacyResult = Object.keys(trial.answers ?? {}).length > 0
      || Object.keys(trial.nets ?? {}).length > 0;
    const values = Object.fromEntries(TESTS.map(({ key }) => {
      const entered = trial.testNets?.[key];
      const available = entered === undefined ? hasLegacyResult : entered !== '';
      return [key, available ? trial.totals[key] : null];
    }));
    const complete = TESTS.every(({ key }) => values[key] !== null);
    return {
      id: trial.id,
      date: trial.date,
      label: `${trial.date.slice(8, 10)}.${trial.date.slice(5, 7)}.${trial.date.slice(0, 4)}`,
      ...values,
      net: complete ? trial.net : null,
      score: complete ? trial.score : null,
    };
  });
}

export function subjectNet(trial, subject) {
  const entered = trial.nets?.[subject.key];
  if (entered !== undefined) {
    const net = Number(String(entered).replace(',', '.'));
    return Number.isFinite(net) ? net : 0;
  }
  const answer = trial.answers?.[subject.key] ?? {};
  return Number(answer.correct ?? 0) - Number(answer.wrong ?? 0) / 4;
}

export function validTrial(trial) {
  return trial && typeof trial.id === 'string' && (trial.date === '' || /^\d{4}-\d{2}-\d{2}$/.test(trial.date))
    && typeof trial.name === 'string' && trial.answers && typeof trial.answers === 'object'
    && (trial.nets === undefined || (trial.nets && typeof trial.nets === 'object'
      && Object.entries(trial.nets).every(([key, raw]) => {
        const subject = SUBJECTS.find((item) => item.key === key);
        if (!subject || typeof raw !== 'string') return false;
        if (raw === '' || raw === '-' || raw === '.' || raw === '-.' || raw === ',' || raw === '-,') return true;
        if (!/^-?\d+(?:[.,]\d{0,2})?$/.test(raw)) return false;
        const net = Number(raw.replace(',', '.'));
        return net >= -subject.questions / 4 && net <= subject.questions;
      })))
    && (trial.testNets === undefined || (trial.testNets && typeof trial.testNets === 'object'
      && Object.entries(trial.testNets).every(([key, raw]) => {
        const test = TESTS.find((item) => item.key === key);
        if (!test || typeof raw !== 'string') return false;
        if (raw === '' || raw === '-' || raw === '.' || raw === '-.' || raw === ',' || raw === '-,') return true;
        if (!/^-?\d+(?:[.,]\d{0,2})?$/.test(raw)) return false;
        const net = Number(raw.replace(',', '.'));
        return net >= -test.questions / 4 && net <= test.questions;
      })))
    && SUBJECTS.every(({ key, questions }) => {
      const answer = trial.answers[key];
      if (answer === undefined) return true;
      const correct = Number(answer.correct ?? 0);
      const wrong = Number(answer.wrong ?? 0);
      return Number.isInteger(correct) && Number.isInteger(wrong)
        && correct >= 0 && wrong >= 0 && correct + wrong <= questions;
    });
}

export function calculateTrial(trial, obp = null) {
  const totals = { math: 0, turkish: 0, science: 0, social: 0 };
  let correct = 0;
  let wrong = 0;
  for (const subject of SUBJECTS) {
    const answer = trial.answers[subject.key] ?? {};
    const c = Number(answer.correct ?? 0);
    const w = Number(answer.wrong ?? 0);
    correct += c;
    wrong += w;
    totals[subject.test] += subjectNet(trial, subject);
  }
  for (const test of TESTS) {
    const entered = trial.testNets?.[test.key];
    if (entered !== undefined) {
      const value = Number(String(entered).replace(',', '.'));
      totals[test.key] = Number.isFinite(value) ? value : 0;
    }
  }
  const net = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const eligible = totals.math >= 0.5 || totals.turkish >= 0.5;
  const score = eligible ? 100 + SCORE_CALIBRATION * Object.entries(totals).reduce((sum, [test, value]) => sum + value * COEFFICIENT[test], 0) : null;
  const placement = score === null ? null : score + (obp === null ? 0 : obp * 0.12);
  return { totals, correct, wrong, blank: 120 - correct - wrong, net, score, placement,
    rank: score === null ? null : estimateTytRank(score) };
}

export function estimateTytRank(score) {
  if (!Number.isFinite(score) || score < 120) return null;
  if (score >= 500) return 1;
  for (let index = 0; index < TYT_DISTRIBUTION.length - 1; index += 1) {
    const [highScore, highCount] = TYT_DISTRIBUTION[index];
    const [lowScore, lowCount] = TYT_DISTRIBUTION[index + 1];
    if (score >= lowScore) {
      return Math.max(1, Math.round(highCount + (highScore - score) / (highScore - lowScore) * (lowCount - highCount)));
    }
  }
  return null;
}

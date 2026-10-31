import { pickPast, pickPractice, pickTest, topUp } from './selection.js';

// TAS-05: konu testi, çıkmış sorular ve tip alıştırması ortak PRATIK oturumu olarak açılır. Burada yalnız banka
// sorusu vardır (ders içi `lesson_q` ortak soru ekranında çözülemez); gösterilen sayı = kurulan setin boyutu.

export const TEST_SIZE = 12;
export const PRACTICE_SIZE = 6;
export const SET_KINDS = { test: 'TOPIC_TEST', cikmis: 'PAST_EXAM', practice: 'ARCHETYPE' };
export const SHARED_TYPES = Object.keys(SET_KINDS);

export const SET_TITLES = { test: 'Konu testi', cikmis: 'Çıkmış sorular', practice: 'Soru tipi alıştırması' };

/** Bu bankadan kurulabilecek tekil soru sayısı (bank, ikizleri tekilleştirilmiş loadBank çıktısıdır). */
export function plannedSize(type, bank, archetype = null) {
  switch (type) {
    case 'test': return Math.min(TEST_SIZE, bank.length);
    case 'cikmis': return bank.filter((q) => q.cikmis).length;
    case 'practice': return Math.min(PRACTICE_SIZE, bank.filter((q) => !archetype || q.archetype === archetype).length);
    default: return 0;
  }
}

/** Kısa açıklama: istenen sayı kurulamıyorsa gerçek sayı ve nedeni (aynı soruyla doldurulmaz). */
export function sizeNote(type, bank, archetype = null) {
  const size = plannedSize(type, bank, archetype);
  const wanted = type === 'test' ? TEST_SIZE : type === 'practice' ? PRACTICE_SIZE : null;
  if (wanted && size < wanted) return `Bankada bu kapsam için ${size} tekil soru var; set ${size} soruyla kurulur, aynı soruyla doldurulmaz.`;
  return '';
}

/**
 * Seçim: konu testi tip payına göre 12 soru (eksik kalırsa bankanın geri kalanından tamamlanır), çıkmış sorular bankadaki
 * bütün ÖSYM soruları yıl sırasıyla, tip alıştırması seçilen tipten 6 soru. Her öğe `{ type: 'bank', question, archetype }`.
 */
export function pickSharedSet({ type, meta, bank, state, seed, archetype = null }) {
  let items;
  switch (type) {
    case 'test': {
      const picked = pickTest({ meta, bank, state, seed, size: TEST_SIZE, practicePool: [] }).filter((item) => item.type === 'bank');
      items = topUp({ chosen: picked, bank, state, seed, size: plannedSize('test', bank) });
      break;
    }
    case 'cikmis':
      items = pickPast({ bank });
      break;
    case 'practice':
      items = pickPractice({ bank, state, archetype, count: PRACTICE_SIZE, seed });
      break;
    default:
      items = [];
  }
  const seen = new Set();
  return items.filter((item) => item.type === 'bank' && !seen.has(item.question.code) && seen.add(item.question.code));
}

/** Sunucu isteğindeki soru listesi (kimlik, tip, zorluk); sunucu her soruyu yeniden doğrular. */
export const requestItems = (items) => items.map((item) => ({
  questionId: item.question.id,
  archetypeId: item.archetype ?? item.question.archetype ?? null,
  difficulty: item.question.difficulty ?? null,
}));

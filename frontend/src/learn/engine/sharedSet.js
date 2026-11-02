import { pickPast, pickPractice, pickTest, topUp, visible } from './selection.js';
import { evidenceFor } from '../content/evidence.js';

// Kaynaklı kanıtı olan konunun (TAS-08/09) testi yalnız açıklaması tamamlanmış, derste çözümü gösterilmeyen sorulardan
// oluşur. Daha geniş çıkmış/pratik havuzlarının içerik incelemesi ayrı; eksik set rastgele soruyla doldurulmaz.
const testPool = (bank) => bank.filter((q) => !evidenceFor(q.conceptId) || evidenceFor(q.conceptId).independentCodes.includes(q.code));

// TAS-05: konu testi, çıkmış sorular ve tip alıştırması ortak PRATIK oturumu olarak açılır. Burada yalnız banka
// sorusu vardır (ders içi `lesson_q` ortak soru ekranında çözülemez); gösterilen sayı = kurulan setin boyutu.

export const TEST_SIZE = 12;
export const PRACTICE_SIZE = 6;
// `lab`: laboratuvar hedefine görseli okunarak eşlenmiş gerçek sorular (kodlar adreste). Sunucuda tip alıştırması
// türüyle, `lab-<hedef>` kimliğiyle ayrı tutulur; böylece konu tipinin açık setiyle karışmaz.
export const SET_KINDS = { test: 'TOPIC_TEST', cikmis: 'PAST_EXAM', practice: 'ARCHETYPE', lab: 'ARCHETYPE' };
export const SHARED_TYPES = Object.keys(SET_KINDS);

export const SET_TITLES = { test: 'Konu testi', cikmis: 'Çıkmış sorular', practice: 'Soru tipi alıştırması', lab: 'Laboratuvardan gerçek sorular' };

/**
 * Bu bankadan kurulabilecek tekil soru sayısı (bank, ikizleri tekilleştirilmiş loadBank çıktısıdır). state verilirse
 * öğrencinin "Tekrar gösterme" dediği sorular da hariçtir (TAS-06): gösterilen sayı = kurulan set.
 */
export function plannedSize(type, all, archetype = null, state = {}) {
  const bank = visible(all, state);
  switch (type) {
    case 'test': return Math.min(TEST_SIZE, testPool(bank).length);
    case 'cikmis': return bank.filter((q) => q.cikmis).length;
    case 'practice': return Math.min(PRACTICE_SIZE, bank.filter((q) => !archetype || q.archetype === archetype).length);
    default: return 0;
  }
}

/** Kısa açıklama: istenen sayı kurulamıyorsa gerçek sayı ve nedeni (aynı soruyla doldurulmaz). */
export function sizeNote(type, bank, archetype = null, state = {}) {
  const size = plannedSize(type, bank, archetype, state);
  const evidence = type === 'test' && evidenceFor(bank.find((q) => evidenceFor(q.conceptId))?.conceptId);
  if (evidence) return `Açıklamalı pilot: ${size} bağımsız aktarım sorusu. ${evidence.testScope}; bütün soru tiplerini kapsayan ustalık testi değildir. Diğer çıkmış soruların ayrıntılı çözüm incelemesi sürüyor.`;
  const wanted = type === 'test' ? TEST_SIZE : type === 'practice' ? PRACTICE_SIZE : null;
  if (wanted && size < wanted) return `Bankada bu kapsam için ${size} tekil soru var; set ${size} soruyla kurulur, aynı soruyla doldurulmaz.`;
  return '';
}

/**
 * Seçim: konu testi tip payına göre 12 soru (eksik kalırsa bankanın geri kalanından tamamlanır), çıkmış sorular bankadaki
 * bütün ÖSYM soruları yıl sırasıyla, tip alıştırması seçilen tipten 6 soru. Her öğe `{ type: 'bank', question, archetype }`.
 */
export function pickSharedSet({ type, meta, bank, state, seed, archetype = null, codes = [] }) {
  let items;
  switch (type) {
    case 'test': {
      const candidates = testPool(bank);
      const picked = pickTest({ meta, bank: candidates, state, seed, size: TEST_SIZE, practicePool: [] }).filter((item) => item.type === 'bank');
      items = topUp({ chosen: picked, bank: visible(candidates, state), state, seed, size: plannedSize('test', bank, null, state) });
      break;
    }
    case 'cikmis':
      items = pickPast({ bank, state });
      break;
    case 'practice':
      items = pickPractice({ bank, state, archetype, count: PRACTICE_SIZE, seed });
      break;
    case 'lab':
      items = pickCodes({ bank, state, codes });
      break;
    default:
      items = [];
  }
  const seen = new Set();
  return items.filter((item) => item.type === 'bank' && !seen.has(item.question.code) && seen.add(item.question.code));
}

/** Adresteki kod sırasıyla seçilen sorular; kitapçık ikizi olarak tekilleştirilmiş kod da kabul edilir. */
export function pickCodes({ bank, state = {}, codes }) {
  const pool = visible(bank, state);
  return codes.map((code) => pool.find((q) => q.code === code || q.twins?.includes(code))).filter(Boolean)
    .map((q) => ({ type: 'bank', question: q, archetype: q.archetype }));
}

/** Sunucu isteğindeki soru listesi (kimlik, tip, zorluk); sunucu her soruyu yeniden doğrular. */
export const requestItems = (items) => items.map((item) => ({
  questionId: item.question.id,
  archetypeId: item.archetype ?? item.question.archetype ?? null,
  difficulty: item.question.difficulty ?? null,
}));

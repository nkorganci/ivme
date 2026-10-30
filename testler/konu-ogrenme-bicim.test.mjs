// Yeni öğretim biçimine geçirilmiş derslerin yapısal denetimi. Bir ders dönüştürüldükçe YENI_BICIM listesine eklenir.
// Biçim: her bölümde üç düzeyi dolu ::duzey, en az bir ::sorgula, en az iki gerekçeli çözümlü örnek;
// her çözüm adımında "neden" ve her örnekte sonuç/kontrol satırı. Sorgulamadaki kontrol: ifadesi doğru seçeneğin sayısını vermeli.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLesson } from '../frontend/src/learn/content/parser.js';
import { evaluate, numericChoice } from '../frontend/src/learn/content/checks.js';

export const YENI_BICIM = ['bolme-bolunebilme', 'temel-kavramlar', 'sayi-basamaklari', 'ebob-ekok', 'rasyonel-sayilar', 'birinci-derece-denklemler', 'esitsizlikler', 'mutlak-deger', 'uslu-ifadeler', 'koklu-ifadeler', 'oran-oranti', 'sayi-kesir-problemleri', 'yas-isci-problemleri', 'yuzde-karisim', 'kar-zarar', 'hareket-problemleri', 'grafik-rutin-olmayan', 'onermeler', 'kosullu-onerme', 'kumeler-temel', 'kume-islemleri', 'merkezi-egilim', 'veri-grafikleri', 'sayma-permutasyon', 'kombinasyon', 'binom'];

const load = (id) => parseLesson(readFileSync(new URL(`../frontend/src/learn/content/dersler/${id}.ders`, import.meta.url), 'utf8'), id);
const firstNumber = (text) => {
  const exact = numericChoice(text);
  if (exact != null) return exact;
  const match = String(text).replace(/\$/g, '').match(/-?\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(',', '.')) : null;
};

for (const id of YENI_BICIM) {
  test(`${id}: her bölüm düzeyli anlatım, günlük hayat sorgulaması ve gerekçeli örnek içerir`, () => {
    const lesson = load(id);
    for (const section of lesson.sections) {
      const where = `${id}/${section.id}`;
      const leveled = section.blocks.filter((b) => b.type === 'leveled');
      assert.ok(leveled.length, `${where}: ::duzey yok`);
      for (const b of leveled) for (const level of ['L1', 'L2', 'L3']) assert.ok((b.levels[level] ?? '').length > 60, `${where}: ${level} eksik veya çok kısa`);
      const inquiries = section.blocks.filter((b) => b.type === 'inquiry');
      assert.ok(inquiries.length, `${where}: ::sorgula yok`);
      for (const q of inquiries) {
        assert.ok(q.id && q.title && q.situation && q.prompt && q.why && q.exam, `${where}/${q.id}: alan eksik`);
        assert.equal(q.choices.filter((c) => c.correct).length, 1, `${where}/${q.id}: tek doğru seçenek`);
        assert.ok(q.choices.length >= 3 && q.choices.every((c) => c.feedback), `${where}/${q.id}: en az 3 gerekçeli seçenek`);
        if (q.check) {
          const expected = evaluate(q.check);
          const actual = firstNumber(q.choices.find((c) => c.correct).text);
          assert.ok(expected != null && actual != null && Math.abs(expected - actual) < 1e-9, `${where}/${q.id}: kontrol ${q.check}=${expected}, doğru seçenek ${actual}`);
        }
      }
      const worked = section.blocks.filter((b) => b.type === 'worked');
      assert.ok(worked.length >= 2, `${where}: en az 2 çözümlü örnek (${worked.length})`);
      for (const b of section.blocks.filter((x) => x.type === 'worked' || x.type === 'faded')) {
        assert.ok(b.steps.every((s) => s.why), `${where}: “${b.title}” adımlarında gerekçe (||) eksik`);
        assert.ok(b.answer, `${where}: “${b.title}” sonuç satırı yok`);
      }
    }
  });
}

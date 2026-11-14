import test from 'node:test';
import assert from 'node:assert/strict';
import { denetimPaketi } from '../scripts/konu/denetim_paketi.mjs';

test('kör paket seçenek kimliği, anahtar ve çözüm gerekçesi sızdırmaz; verilen grafiği korur', () => {
  const r = denetimPaketi({ soru: 'İvme?', verilen: { tur: 'vt', n: [[0, 2], [3, 8]] }, secenekler: [
    { id: 'kolay-d', metin: '2', dogru: true, neden: 'GIZLI_COZUM' },
    { id: 'kolay-y0', metin: '6', neden: 'GIZLI_YANLIS' },
  ] });
  const text = JSON.stringify(r.kor);
  for (const banned of ['kolay-d', 'kolay-y0', 'GIZLI_COZUM', 'GIZLI_YANLIS', '"dogru"', '"neden"']) assert.ok(!text.includes(banned));
  assert.deepEqual(r.kor.sorular[0].verilen.n, [[0, 2], [3, 8]]);
  const expected = r.karsilastirma[0].beklenen[0];
  assert.equal(r.kor.sorular[0].secenekler.find(s => s.harf === expected).metin, '2');
});
test('hatalı adım ve sınıflama yanıtları yalnız ikinci aşamada kalır', () => {
  const r = denetimPaketi([
    { tur: 'hata', soru: 'Hangi adım?', adimlar: [{ metin: 'a' }, { metin: 'b', hatali: true, neden: 'GIZLI' }] },
    { tur: 'sinifla', soru: 'Grupla', kutular: ['K', 'L'], ogeler: [{ metin: 'cisim', kutular: ['K'] }] },
  ]);
  assert.deepEqual(r.kor.sorular[1].ogeler, ['cisim']);
  assert.deepEqual(r.karsilastirma[0].beklenen, [2]);
  assert.deepEqual(r.karsilastirma[1].beklenen, [['K']]);
  assert.ok(!JSON.stringify(r.kor).includes('GIZLI'));
});
test('gerçek sorunun görüntüsü yokken uydurma metin/cevap üretilmez', () => {
  const r = denetimPaketi({ tur: 'cikmis', kod: 'TYT-TEST', adimlar: [{ ne: 'GIZLI' }] });
  assert.equal(r.kor.sorular[0].kaynakGorseliGerekli, true);
  assert.ok(!JSON.stringify(r.kor).includes('GIZLI'));
});

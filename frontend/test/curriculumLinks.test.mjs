import assert from 'node:assert/strict';
import test from 'node:test';
import { questionLinks } from '../src/curriculumLinks.js';

test('konu bağlantısı yalnız aynı sınav, ders ve birebir etiket için açılır', () => {
  const rows = [
    { bank: 'CIKMIS', examType: 'TYT', subject: 'Türkçe', topic: 'Noktalama İşaretleri', count: 18 },
    { bank: 'OGM', examType: 'TYT', subject: 'Türkçe', topic: 'Ses Bilgisi ve Yazım', count: 758 },
    { bank: 'CIKMIS', examType: 'AYT', subject: 'Türkçe', topic: 'Noktalama İşaretleri', count: 4 },
    { bank: 'CIKMIS', examType: 'TYT', subject: 'Tarih', topic: 'Noktalama İşaretleri', count: 3 },
  ];
  const links = questionLinks('TYT', 'turkce', 'Noktalama işaretleri', rows);
  assert.equal(links.length, 1);
  assert.match(links[0].to, /^\/cikmis-sorular\?examType=TYT&subject=T%C3%BCrk%C3%A7e&topic=Noktalama/);
  assert.deepEqual(questionLinks('TYT', 'turkce', 'Yazım kuralları', rows), []);
});

test('AYT tarih kaynakları ayrı test etiketlerini korur', () => {
  const rows = [
    { bank: 'CIKMIS', examType: 'AYT', subject: 'Tarih-1', topic: 'Millî Mücadele', count: 19 },
    { bank: 'CIKMIS', examType: 'AYT', subject: 'Tarih-2', topic: 'Millî Mücadele', count: 18 },
  ];
  const links = questionLinks('AYT', 'tarih', 'Millî Mücadele', rows);
  assert.equal(links.length, 2);
  assert.notEqual(links[0].to, links[1].to);
});

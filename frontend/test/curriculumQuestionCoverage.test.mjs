import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCikmisCoverage, invalidCikmisAliases, sourceSubject } from '../src/curriculumQuestionCoverage.js';
import { topicId } from '../src/curriculum.js';
import taxonomy from '../../backend/src/main/resources/content-taxonomy.json' with {type:'json'};
const coverageFor=(rows,exam)=>buildCikmisCoverage(rows,exam,taxonomy.categories);

test('kaynak dersleri geometri ve felsefe grubu alt derslerine ayrılır', () => {
  assert.equal(sourceSubject({ subject: 'Matematik', topic: 'Özel Dörtgenler' }), 'geometri');
  assert.equal(sourceSubject({ subject: 'Matematik', topic: 'Türev' }), 'matematik');
  assert.equal(sourceSubject({ subject: 'Felsefe Grubu', topic: 'Mantık – Kıyas' }), 'mantik');
  assert.equal(sourceSubject({ subject: 'Felsefe Grubu', topic: 'Psikoloji – Bellek ve Bellek Türleri' }), 'psikoloji');
});

test('çıkmış sorular tek satıra yerleşir; birleşik etiket ve sınıflandırılmayanlar görünür kalır', () => {
  const rows = [
    { bank: 'CIKMIS', examType: 'TYT', subject: 'Türkçe', topic: 'Paragrafın Yapısı', count: 38 },
    { bank: 'CIKMIS', examType: 'TYT', subject: 'Türkçe', topic: 'Paragrafta Anlam', count: 134 },
    { bank: 'CIKMIS', examType: 'AYT', subject: 'Tarih-1', topic: 'Millî Mücadele', count: 19 },
    { bank: 'CIKMIS', examType: 'AYT', subject: 'Tarih-2', topic: 'Millî Mücadele', count: 18 },
    { bank: 'CIKMIS', examType: 'AYT', subject: 'Kimya', topic: 'Sınıflandırılmadı', count: 3 },
    { bank: 'OGM', examType: 'TYT', subject: 'Türkçe', topic: 'Paragrafta Anlam', count: 500 },
  ];
  const coverage = coverageFor(rows);
  assert.deepEqual(coverage.totals, {
    total: 212, curriculum: 209, sourceOnly: 0, unclassified: 3, unsupported: 0,
  });
  assert.equal(coverage.byTopic.get(topicId('TYT','turkce','Paragraf'))?.[0].count, 38);
  assert.equal(coverage.byTopic.get(topicId('TYT','turkce','Paragraf'))?.[1].count, 134);
  assert.equal(coverage.byTopic.get(topicId('AYT', 'tarih', 'Millî Mücadele'))?.length, 2);
  assert.equal(coverage.extraBySubject.has('TYT|turkce'),false);
  assert.equal([...coverage.extraBySubject.get('AYT|kimya').values()][0].unclassified, true);
});

test('eş anlamlı kaynak etiketlerinin tüm hedefleri müfredatta bulunur', () => {
  assert.deepEqual(invalidCikmisAliases(taxonomy.categories), []);
});

test('seçili sınav yalnız kendi çıkmış sorularını gösterir; soru bankası ve geçersiz sayımlar dışarıda kalır', () => {
  const rows = [
    { bank: 'CIKMIS', examType: 'TYT', subject: 'Fizik', topic: 'Basınç', count: 8 },
    { bank: 'CIKMIS', examType: 'AYT', subject: 'Fizik', topic: 'Vektörler', count: 5 },
    { bank: 'CIKMIS', examType: 'AYT', subject: 'Fizik', topic: 'Kaynak etiketi', count: 2 },
    { bank: 'OGM', examType: 'TYT', subject: 'Fizik', topic: 'Basınç', count: 100 },
    { bank: 'CIKMIS', examType: 'TYT', subject: 'Fizik', topic: 'Dalgalar', count: 0 },
    { bank: 'CIKMIS', examType: 'TYT', subject: 'Fizik', topic: 'Optik', count: -1 },
  ];
  for (const exam of ['TYT', 'AYT']) {
    const coverage = coverageFor(rows, exam);
    assert.equal(coverage.totals.total, exam === 'TYT' ? 8 : 7);
    assert.equal(coverage.byExam[exam === 'TYT' ? 'AYT' : 'TYT'].total, 0);
    const links = [...coverage.byTopic.values()].flat().concat(
      [...coverage.extraBySubject.values()].flatMap((extras) => [...extras.values()].flatMap((row) => row.links)));
    assert.ok(links.length > 0);
    assert.ok(links.every((link) => link.bank === 'CIKMIS' && link.examType === exam && link.count > 0));
    assert.ok(links.every((link) => new URL(link.to, 'http://localhost').searchParams.get('examType') === exam));
  }
});

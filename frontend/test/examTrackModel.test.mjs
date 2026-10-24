import test from 'node:test';
import assert from 'node:assert/strict';
import { featureReady, trackExams } from '../src/examTrackModel.js';
import { questionSourcesFor, readQuestionSources, questionSourceScope, writeQuestionSources, QUESTION_SOURCES } from '../src/questionSources.js';
import { examBranchesFor, groupExamBranches, summarizeExamRows, EXAM_BRANCHES } from '../src/studyStatistics.js';

const KPSS = {
  id: 'KPSS_ORTAOGRETIM', family: 'KPSS', status: 'ACTIVE', name: 'KPSS Ortaöğretim',
  readyFeatures: ['home', 'curriculum', 'study', 'past-questions', 'statistics'],
  sections: [
    { examId: 'KPSS_OO_GY', name: 'Genel Yetenek', detail: '60 soru · 65 dakika', minutes: 65,
      subjects: [{ name: 'Türkçe', questions: 30 }, { name: 'Matematik', questions: 30 }] },
    { examId: 'KPSS_OO_GK', name: 'Genel Kültür', detail: '60 soru · 65 dakika', minutes: 65,
      subjects: [{ name: 'Tarih', questions: 27 }, { name: 'Coğrafya', questions: 18 },
        { name: 'Vatandaşlık', questions: 9 }, { name: 'Güncel Bilgiler', questions: 6 }] },
  ],
};
const YKS = { id: 'YKS', family: 'YKS', status: 'ACTIVE', readyFeatures: [],
  sections: [{ examId: 'TYT', name: 'TYT' }, { examId: 'AYT', name: 'AYT' }] };

test('the selected exam supplies its own tests; teachers and YKS keep TYT/AYT', () => {
  assert.deepEqual(trackExams(KPSS).map(e => [e.id, e.name, e.minutes]), [['KPSS_OO_GY', 'Genel Yetenek', 65], ['KPSS_OO_GK', 'Genel Kültür', 65]]);
  assert.deepEqual(trackExams(YKS).map(e => e.id), ['TYT', 'AYT']);
  assert.deepEqual(trackExams(null).map(e => e.id), ['TYT', 'AYT']);
});

test('only ready sections of an active exam open; planned exams open nothing', () => {
  assert.equal(featureReady(KPSS, 'past-questions'), true);
  assert.equal(featureReady(KPSS, 'question-bank'), false);
  assert.equal(featureReady(KPSS, 'yks-trials'), false);
  assert.equal(featureReady(YKS, 'question-bank'), true, 'empty list means every section is ready');
  assert.equal(featureReady({ ...KPSS, status: 'PLANNED' }, 'curriculum'), false);
  assert.equal(featureReady(null, 'curriculum'), true);
});

test('KPSS question sources are the past questions of each test, never YKS sources', () => {
  const sources = questionSourcesFor(KPSS, trackExams(KPSS));
  assert.deepEqual(sources.map(s => [s.id, s.label, s.bank, s.examType]), [
    ['CIKMIS_KPSS_OO_GY', 'Genel Yetenek Çıkmış Sorular', 'CIKMIS', 'KPSS_OO_GY'],
    ['CIKMIS_KPSS_OO_GK', 'Genel Kültür Çıkmış Sorular', 'CIKMIS', 'KPSS_OO_GK']]);
  assert.equal(questionSourcesFor(YKS, trackExams(YKS)), QUESTION_SOURCES);
  // A stale YKS link is ignored in KPSS; empty selection means every KPSS source.
  assert.deepEqual(readQuestionSources(new URLSearchParams('source=CIKMIS_TYT'), sources), []);
  assert.deepEqual(readQuestionSources(new URLSearchParams(''), sources), ['CIKMIS_KPSS_OO_GY', 'CIKMIS_KPSS_OO_GK']);
  const params = writeQuestionSources(new URLSearchParams(), ['CIKMIS_KPSS_OO_GK'], sources);
  assert.equal(params.toString(), 'source=CIKMIS_KPSS_OO_GK&bank=CIKMIS&examType=KPSS_OO_GK');
  assert.deepEqual(questionSourceScope(['CIKMIS_KPSS_OO_GY', 'CIKMIS_KPSS_OO_GK'], sources), { bank: 'CIKMIS', examType: '' });
});

test('KPSS statistics use the exam subjects and tests', () => {
  const branches = examBranchesFor(trackExams(KPSS), true);
  assert.deepEqual(branches.map(b => b.subjects[0]), ['Türkçe', 'Matematik', 'Tarih', 'Coğrafya', 'Vatandaşlık', 'Güncel Bilgiler']);
  assert.equal(examBranchesFor(trackExams(YKS), false), EXAM_BRANCHES);
  const grouped = groupExamBranches([{ subject: 'Vatandaşlık', total: 9, correct: 5, wrong: 2, blank: 2 }], branches);
  assert.deepEqual(Object.values(grouped).filter(Boolean), [{ total: 9, correct: 5, wrong: 2, blank: 2 }]);
  const summary = summarizeExamRows([{ examType: 'KPSS_OO_GY', status: 'COMPLETED', questionCount: 60, correct: 40, wrong: 10, blank: 10 }],
    ['KPSS_OO_GY', 'KPSS_OO_GK']);
  assert.deepEqual(summary.map(s => [s.examType, s.sessions, s.correct]), [['KPSS_OO_GY', 1, 40], ['KPSS_OO_GK', 0, 0]]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTION_SOURCES, readQuestionSources, questionSourceScope, writeQuestionSources, readQuestionHistory, writeQuestionHistory } from '../src/questionSources.js';

test('history choices survive reload independently of sources and the solved preference', () => {
  const params = new URLSearchParams('source=OGM_TYT&includeSolved=false&categoryId=topic');
  writeQuestionHistory(params, ['WRONG', 'CORRECT', 'WRONG', 'UNKNOWN']);
  assert.deepEqual(readQuestionHistory(new URLSearchParams(params.toString())), ['CORRECT', 'WRONG']);
  assert.deepEqual(readQuestionSources(params), ['OGM_TYT']);
  assert.equal(params.get('includeSolved'), 'false');
  assert.equal(params.get('categoryId'), 'topic');
  writeQuestionSources(params, []);
  assert.deepEqual(readQuestionHistory(params), ['CORRECT', 'WRONG']);
  assert.deepEqual(readQuestionSources(params), []);
  writeQuestionHistory(params, []);
  assert.equal(params.has('history'), false);
});

test('existing bank/exam links select the matching source checkboxes', () => {
  assert.equal(readQuestionSources(new URLSearchParams()).length, 4);
  assert.deepEqual(readQuestionSources(new URLSearchParams('bank=OGM&examType=TYT')), ['OGM_TYT']);
  assert.deepEqual(readQuestionSources(new URLSearchParams('examType=AYT')), ['CIKMIS_AYT', 'OGM_AYT']);
});

test('mixed pairs survive URL reload without expanding into a cross product', () => {
  const selected = ['CIKMIS_AYT', 'OGM_TYT'];
  const params = writeQuestionSources(new URLSearchParams('bank=OGM&examType=AYT&mode=sinav'), selected);
  assert.deepEqual(readQuestionSources(new URLSearchParams(params.toString())), selected);
  assert.deepEqual(questionSourceScope(selected), { bank: '', examType: '' });
  assert.equal(params.get('mode'), 'sinav');
  assert.deepEqual(questionSourceScope(['CIKMIS_AYT', 'CIKMIS_TYT']), { bank: 'CIKMIS', examType: '' });
  assert.deepEqual(questionSourceScope(['CIKMIS_TYT', 'OGM_TYT']), { bank: '', examType: 'TYT' });
});

test('empty selection stays empty after reload, and summary selection replaces mixed choices', () => {
  const params = writeQuestionSources(new URLSearchParams(), []);
  assert.deepEqual(readQuestionSources(new URLSearchParams(params.toString())), []);
  for (const source of QUESTION_SOURCES) {
    writeQuestionSources(params, [source.id]);
    assert.deepEqual(readQuestionSources(params), [source.id]);
    assert.equal(params.get('bank'), source.bank);
    assert.equal(params.get('examType'), source.examType);
  }
});

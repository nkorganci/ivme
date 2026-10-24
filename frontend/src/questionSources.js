// Shared by the pool summary and practice selection. Each option is one bank/exam pair.
export const QUESTION_SOURCES = [
  { id: 'CIKMIS_AYT', field: 'ayt', headerName: 'AYT', label: 'AYT Çıkmış Sorular', bank: 'CIKMIS', examType: 'AYT' },
  { id: 'CIKMIS_TYT', field: 'tyt', headerName: 'TYT', label: 'TYT Çıkmış Sorular', bank: 'CIKMIS', examType: 'TYT' },
  { id: 'OGM_AYT', field: 'bankAyt', headerName: 'Soru Bankası-AYT', label: 'AYT Soru Bankası', bank: 'OGM', examType: 'AYT' },
  { id: 'OGM_TYT', field: 'bankTyt', headerName: 'Soru Bankası-TYT', label: 'TYT Soru Bankası', bank: 'OGM', examType: 'TYT' },
];

/** Seçili sınavın kaynakları: YKS'de dört kaynak; KPSS'de her testin çıkmış soruları (soru bankası henüz yok). */
export function questionSourcesFor(track, exams = []) {
  if (!track || track.family !== 'KPSS') return QUESTION_SOURCES;
  return exams.map(exam => ({ id: `CIKMIS_${exam.id}`, field: exam.id.toLowerCase(), headerName: exam.name,
    label: `${exam.name} Çıkmış Sorular`, bank: 'CIKMIS', examType: exam.id }));
}

export const QUESTION_HISTORY_SOURCES = [
  { id: 'CORRECT', label: 'Daha önce doğru çözdüğüm sorular' },
  { id: 'WRONG', label: 'Daha önce yanlış çözdüğüm sorular' },
];

export function readQuestionHistory(params) {
  return QUESTION_HISTORY_SOURCES.filter(option => params.getAll('history').includes(option.id)).map(option => option.id);
}

export function writeQuestionHistory(params, ids) {
  params.delete('history');
  QUESTION_HISTORY_SOURCES.filter(option => ids.includes(option.id)).forEach(option => params.append('history', option.id));
  return params;
}

export function readQuestionSources(params, sources = QUESTION_SOURCES) {
  return sources.filter(source => params.has('source') ? params.getAll('source').includes(source.id)
    : (!params.get('bank') || params.get('bank') === source.bank)
      && (!params.get('examType') || params.get('examType') === source.examType)).map(source => source.id);
}

export function questionSourceScope(ids, options = QUESTION_SOURCES) {
  const sources = options.filter(source => ids.includes(source.id));
  const common = key => new Set(sources.map(source => source[key])).size === 1 ? sources[0][key] : '';
  return { bank: common('bank'), examType: common('examType') };
}

export function writeQuestionSources(params, ids, options = QUESTION_SOURCES) {
  params.delete('source');
  if (ids.length) options.filter(source => ids.includes(source.id)).forEach(source => params.append('source', source.id));
  else params.set('source', '');
  for (const [key, value] of Object.entries(questionSourceScope(ids, options))) {
    if (value) params.set(key, value); else params.delete(key);
  }
  return params;
}

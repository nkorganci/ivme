import { qs } from './api.js';

// Kaynak etiketlerini müfredat derslerine bağlayan dar kapsamlı eşleme.
// Konu adları yalnız noktalama/büyük-küçük harf farkı giderilerek birebir karşılaştırılır.
const SUBJECTS = {
  turkce: { CIKMIS: ['Türkçe'], OGM: ['Türkçe'] },
  matematik: { CIKMIS: ['Matematik'], OGM: ['Matematik'] },
  geometri: { CIKMIS: ['Matematik'], OGM: ['Geometri'] },
  edebiyat: { CIKMIS: ['Türk Dili ve Edebiyatı'], OGM: ['Türk Dili ve Edebiyatı'] },
  tarih: { CIKMIS: ['Tarih', 'Tarih-1', 'Tarih-2'], OGM: ['Tarih'] },
  cografya: { CIKMIS: ['Coğrafya', 'Coğrafya-1', 'Coğrafya-2'], OGM: ['Coğrafya'] },
  felsefe: { CIKMIS: ['Felsefe', 'Felsefe Grubu'], OGM: ['Felsefe'] },
  psikoloji: { CIKMIS: ['Felsefe Grubu'], OGM: ['Felsefe'] },
  sosyoloji: { CIKMIS: ['Felsefe Grubu'], OGM: ['Felsefe'] },
  mantik: { CIKMIS: ['Felsefe Grubu'], OGM: ['Felsefe'] },
  din: { CIKMIS: ['Din Kültürü'], OGM: ['Din Kültürü'] },
  fizik: { CIKMIS: ['Fizik'], OGM: ['Fizik'] },
  kimya: { CIKMIS: ['Kimya'], OGM: ['Kimya'] },
  biyoloji: { CIKMIS: ['Biyoloji'], OGM: ['Biyoloji'] },
};

export function normaliseTopic(value) {
  return (value || '').toLocaleLowerCase('tr-TR').replaceAll('ı', 'i')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

export function questionLinks(exam, subjectId, title, filterRows) {
  const options = SUBJECTS[subjectId];
  if (!options || !filterRows) return [];
  return filterRows.filter((row) => row.examType === exam && row.count > 0
    && options[row.bank]?.includes(row.subject)
    && normaliseTopic(row.topic) === normaliseTopic(title))
    .map((row) => ({
      key: `${row.bank}:${row.subject}:${row.topic}`,
      label: `${row.bank === 'CIKMIS' ? 'Çıkmış' : 'Soru bankası'}${options[row.bank].length > 1 ? ` · ${row.subject}` : ''} (${row.count})`,
      to: `${row.bank === 'CIKMIS' ? '/cikmis-sorular' : '/soru-bankasi'}${qs({ examType: exam, subject: row.subject, topic: row.topic })}`,
    }));
}

export const pdfKindLabel = {
  video_notes: 'Anlatım PDF',
  presentation: 'Ders sunusu',
  topic_summary: 'Konu özeti',
};

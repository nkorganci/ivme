// Matching proposes categories from the Excel registry; it never creates a topic.
export const norm = value => String(value || '').toLocaleLowerCase('tr-TR').replaceAll('ı', 'i')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const excelBranch = id => id;

// These are the units in worksheet zero. Each source row has exactly one lesson,
// including rows covered by both exams. The workbook's original lesson stays in distribution.
const splitUnits = {
  'Matematik + Geometri': [
    ['matematik', 'Matematik', ['Denklem ve Eşitsizlikler', 'Mantık', 'Kümeler', 'Veri', 'Fonksiyonlar', 'Polinomlar',
      'Sayma ve Olasılık', 'İkinci Dereceden Denklemler', 'Fonksiyonlarda Uygulamalar', 'Trigonometri',
      'Üstel ve Logaritmik Fonksiyonlar', 'Diziler', 'Türev', 'İntegral']],
    ['geometri', 'Geometri', ['Üçgenler', 'Geometri', 'Uzay Geometri', 'Dörtgenler ve Çokgenler', 'Analitik Geometri']],
  ],
  'Türkçe / Edebiyat': [
    ['turkce', 'Türkçe', ['Anlam Bilgisi', 'Ses ve Yapı Bilgisi', 'Sözcük Türleri', 'Cümle Bilgisi', 'Yazım ve Noktalama', 'Anlatım Bozukluğu']],
    ['edebiyat', 'Edebiyat', ['Edebiyat Bilgileri', 'Türk Edebiyatı Dönemleri', 'Edebî Akımlar']],
  ],
};
export function splitExcelSubject(row) {
  const scopes = splitUnits[row.subject];
  if (!scopes) return null;
  const matches = scopes.filter(([, , units]) => units.includes(row.unit));
  if (matches.length !== 1) throw Error(`Excel lesson needs a unique unit classification: ${row.subject} / ${row.unit} / ${row.topic}`);
  const [subjectId, subject] = matches[0];
  return { subjectId, subject };
}
const stop = new Set('ve ile bir ilgili genel temel bilgi bilgisi kavram kavrami kavramlar konu konulari uygulama uygulamalari incelenmesi sinif tyt ayt'.split(' '));
const tokens = text => norm(text).split(' ').filter(t => t.length > 2 && !stop.has(t));
export const topicTerms = category => [...new Set([category.topic, category.topic.replace(/\([^)]*\)/g, ''),
  ...[...category.topic.matchAll(/\(([^)]+)\)/g)].flatMap(m => m[1].split(/[,;/]/)),
  ...category.topic.split(/\s*[/=]\s*|,\s*/),...(category.aliases||[])].map(norm).filter(t => t.length >= 4))];

export function createExcelMatcher(categories) {
  const scopes = new Map();
  for (const category of categories.filter(c => c.curriculumSource === 'EXCEL_FIRST_SHEET')) {
    const key = `${category.exam}:${category.subjectId}`;
    if (!scopes.has(key)) scopes.set(key, []);
    scopes.get(key).push({ category, terms: topicTerms(category), tokens: new Set(tokens(category.topic)) });
  }
  const cache = new Map();
  return (texts, exam, branch, { broad = false } = {}) => {
    const key = JSON.stringify([texts, exam, branch, broad]);
    if (cache.has(key)) return cache.get(key);
    const pool = scopes.get(`${exam}:${excelBranch(branch)}`) || [];
    const input = texts.map(norm).filter(Boolean);
    const scored = pool.map(entry => {
      let score = 0;
      for (let index = 0; index < input.length; index++) {
        const text = input[index], words = new Set(tokens(text));
        const exact = entry.terms.some(term => term === text);
        const phrases = entry.terms.filter(term => (` ${text} `).includes(` ${term} `));
        const overlaps = [...entry.tokens].filter(t => words.has(t)).length;
        const similarity = overlaps / Math.max(1, Math.min(words.size, entry.tokens.size));
        const inverse = text.length >= 5 && !stop.has(text) && entry.terms.some(term => (` ${term} `).includes(` ${text} `)
          || !text.includes(' ') && term.split(' ').some(word => word.startsWith(text) && /^(ta|te|da|de|in|nin|i|si)$/.test(word.slice(text.length))));
        const value = exact ? 1000 : phrases.length ? 120 + Math.max(...phrases.map(t => t.length)) : inverse ? 90
          : overlaps >= 2 && similarity >= .6 ? 30 + 40 * similarity + overlaps : 0;
        score = Math.max(score, value * (index === 0 ? 1.2 : 1));
      }
      return { id: entry.category.id, score };
    }).filter(s => s.score > 0).sort((a,b) => b.score-a.score);
    let result = scored.filter(s => s.score >= scored[0]?.score * .94).map(s => s.id);
    if (!result.length && broad) result = pool.filter(entry => input.includes(norm(entry.category.unit))).map(entry => entry.category.id);
    cache.set(key, result);
    return result;
  };
}

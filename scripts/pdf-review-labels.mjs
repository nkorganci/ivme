import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { SOURCE_CURRICULUM as CURRICULUM, topicId } from '../frontend/src/curriculum.js';
import { normalise, matchTopics, cleanHeading, canonicalPhysicsSubtopics } from './pdf-review-taxonomy.mjs';
import { aliasTerm, controlledCategory, categoryForTerms, taxonomy } from './content-taxonomy.mjs';
import { physicsTargets } from './physics-topics.mjs';
import {suggestUnits} from './canonical-units.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'backend/src/main/resources/pdf-review-labels.json');
const evidenceFile = path.join(root, 'veri/pdf-review-headings.json');
if (!fs.existsSync(evidenceFile)) {
  if (fs.existsSync(destination)) { console.log('PDF labels: using preserved heading inventory.'); process.exit(0); }
  throw new Error('Run python scripts/pdf-review-headings.py first.');
}
const extraFile = path.join(root, 'veri/content-labels/supplemental-pdf-inventory.json');
const sources = [...JSON.parse(fs.readFileSync(evidenceFile, 'utf8')).sources,
  ...(fs.existsSync(extraFile) ? JSON.parse(fs.readFileSync(extraFile, 'utf8')).sources : [])]
  .filter(r => !r.relativePath || r.relativePath.toLowerCase().endsWith('.pdf'));
if (new Set(sources.map(s => s.id)).size !== sources.length) throw new Error('Duplicate PDF source identity');
const base = JSON.parse(fs.readFileSync(path.join(root, 'backend/src/main/resources/content-review-catalog.json'), 'utf8'));
const categories = new Map(base.categories.filter(c => c.origin === 'CURRICULUM').map(c => [c.id, c]));
const branches = new Map(base.branches.map(b => [b.id, b.name]));
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 20);
const display = value => {
  const text = cleanHeading(value);
  return text === text.toLocaleUpperCase('tr-TR') ? text[0]?.toLocaleUpperCase('tr-TR') + text.slice(1).toLocaleLowerCase('tr-TR') : text;
};
const aliasKey = text => aliasTerm(cleanHeading(text), 'pdf');
const canonicalTitle = title => {
  const key = normalise(cleanHeading(title));
  const aliases = [
    [/^(?:kelimede|kelime|sozcukte|sozcuk) anlam$/, 'Sözcükte anlam'],
    [/^sifat(?: on ad)?(?:lar)?$/, 'Sıfatlar'], [/^zamir(?: adil)?(?:ler)?$/, 'Zamirler'],
    [/^zarf(?: belirtec)?(?:lar)?$/, 'Zarflar'], [/^edat(?: ilgec)?(?:lar)?$/, 'Edatlar'],
    [/^fiil(?: eylem)?(?:ler)?$/, 'Fiiller'], [/^kimyasal tepkimelerde hiz$/, 'Tepkime hızı'],
  ];
  return aliases.find(([pattern]) => pattern.test(key))?.[1] || display(title);
};
const categoryByName = new Map();
for (const c of categories.values()) categoryByName.set([c.exam, c.subjectId, aliasKey(c.topic), aliasKey(c.subtopic)].join('|'), c);
function category(exam, branch, topic, subtopic = '') {
  const key = [exam, branch, aliasKey(topic), aliasKey(subtopic)].join('|');
  if (categoryByName.has(key)) return categoryByName.get(key);
  if (branch === 'fizik') {
    const registered = taxonomy.categories.find(c=>c.exam===exam && c.subjectId===branch &&
      [c.topic,...(c.aliases || [])].some(t=>aliasKey(t)===aliasKey(topic)) && aliasKey(c.subtopic)===aliasKey(subtopic));
    const targets = physicsTargets({exam,topic,subtopic});
    const fallback = registered || (targets.length===1 ? taxonomy.categories.find(c=>c.id===targets[0]) :
      subtopic ? category(exam,branch,topic) : taxonomy.categories.find(c=>c.id===`system.fizik.${exam.toLowerCase()}.konu-incelemesi`));
    categories.set(fallback.id,fallback);categoryByName.set(key,fallback);return fallback;
  }
  const registered = categoryForTerms(exam,branch,topic,subtopic,'pdf');
  if (registered) { categories.set(registered.id,registered); categoryByName.set(key,registered); return registered; }
  const parent = subtopic ? category(exam, branch, topic) : null;
  const proposedId=subtopic ? `pdf-subtopic:${parent.id}:${hash(aliasKey(subtopic))}` : topicId(exam,branch,topic);
  if(!taxonomy.categories.some(c=>c.id===proposedId)) {
    const ids=suggestUnits([subtopic,topic],exam,branch);
    const fallback=taxonomy.categories.find(c=>c.id===(ids.length===1?ids[0]:`system.${branch}.${exam.toLowerCase()}.konu-incelemesi`))||parent||taxonomy.categories.find(c=>c.id==='system.kapsam-incelemesi');
    categories.set(fallback.id,fallback);categoryByName.set(key,fallback);return fallback;
  }
  const c = controlledCategory({ id: subtopic ? `pdf-subtopic:${parent.id}:${hash(aliasKey(subtopic))}` : topicId(exam, branch, topic),
    ...(parent ? { parentId: parent.id } : {}), exam, subjectId: branch, subject: branches.get(branch) || 'Genel kaynaklar',
    topic: parent?.topic || topic, subtopic, origin: 'PDF_HEADING' });
  categories.set(c.id, c); categoryByName.set(key, c); return c;
}
const fallback = [];
const records = [];
const usefulHeading = text => {
  const value = normalise(text);
  return value.length >= 4 && text.length < 160 && !/[•\uf000-\uf8ff]/.test(text) && !/[.;]$/.test(text)
    && !/\b(?:asagidaki|hangisi|verilmistir|olduguna gore|sekildeki|iliskileri inceleyen|bir bilimdir|sahiptir)\b/.test(value)
    && !/^(?:ogm|materyal|ortaogretim|sinif|slayt|ders adi|soru|ornek|cozum|cevap|test|video|yks|tyt|ayt|kazanim|unite|icerik|hazirlayan|kaynak|www|http)/.test(value)
    && !/\d+ sinif|soru cozumu|sorular|mudurlugu|sorularin|ogm materyal|a b c d e/.test(value)
    && ![...branches.values()].some(b => normalise(b) === value);
};
const allowed = (exam, branch) => new Set(CURRICULUM[exam]?.find(b => b.id === branch)?.units.flatMap(u => u.topics) || []);
const geometry = /ucgen|dortgen|cokgen|cember|daire|prizma|piramit|silindir|koni|kure|analitik|aciortay|kenarortay|dogruya|dogrunun|dogru denklem|uzay geometri|donusum|oteleme|simetri|yonlu aci/;

for (const source of sources) {
  const title = cleanHeading(source.sourceTitle);
  const headings = source.headings.filter(h => usefulHeading(h.text));
  // A title-line OCR or the presentation's cover lesson is direct PDF evidence.
  const internalTitle = headings.find(h => h.method === 'heading_ocr' && aliasKey(h.text) === aliasKey(title))
    || headings.find(h => aliasKey(h.text) === aliasKey(title));
  const titleText = internalTitle?.text || title;
  const format = source.explicitFormat || (/cevap anahtari/.test(normalise(title)) ? 'CEVAP_ANAHTARI'
    : /rehber/.test(normalise(title)) ? 'CALISMA_REHBERI'
    : /deneme/i.test(normalise(source.source)) ? 'DENEME'
    : /soru bankasi|test|kampi|tum sorular/.test(normalise(source.source + ' ' + title)) ? 'TEST'
    : /ozet/.test(normalise(source.source)) ? 'KONU_OZETI' : /rehber/.test(normalise(title)) ? 'KARMA' : 'KONU_ANLATIMI');
  const broad = /(?:tyt|ayt).*?(?:konu ozeti|soru bankasi|pekistirme|tarama|test \d|fizik$|kimya$|biyoloji$|matematik$|tarih$|cografya$|turkce$|felsefe grubu)/.test(normalise(title))
    || /\btest$|tum uniteler/.test(normalise(title)) || format === 'DENEME' || source.subjectId === 'genel';
  const exams = ['TYT', 'AYT'].includes(source.exam) ? [source.exam] : ['TYT', 'AYT'];
  const labels = [];
  const add = (c, relation = 'PRIMARY') => { if (!labels.some(a => a.categoryId === c.id)) labels.push({ categoryId: c.id, relation }); };
  let branch = source.subjectId;
  if (branch === 'edebiyat' && /^(sozcukte anlam|isimler)$/.test(normalise(title))) branch = 'turkce';
  if (branch === 'matematik' && (geometry.test(normalise(title)) || /yamuk|deltoid|paralelkenar|dikdortgen|eskenar dortgen/.test(normalise(title))) && !/trigonometri|sinus|cosinus|kosinus|fonksiyon|turev/.test(normalise(title))) branch = 'geometri';
  if (branch === 'felsefe') {
    for (const candidate of ['psikoloji', 'sosyoloji', 'mantik']) if (normalise(title).includes(candidate)) branch = candidate;
  }
  const actualExams = branch === 'turkce' ? ['TYT'] : ['psikoloji', 'sosyoloji', 'mantik', 'edebiyat'].includes(branch) ? ['AYT'] : exams;
  if (source.explicitTargets) {
    for (const t of source.explicitTargets) {
      if(t.categoryId) {
        const c=taxonomy.categories.find(c=>c.id===t.categoryId);
        if(!c)throw new Error(`Unknown intake category ${t.categoryId}`);
        categories.set(c.id,c);add(c);continue;
      }
      add(category(t.exam, t.subjectId, t.topic, t.subtopic));
      add(category(t.exam, t.subjectId, t.topic));
    }
  }
  for (const exam of source.explicitTargets ? [] : actualExams) {
    if (broad) {
      const covered = branch === 'genel' ? CURRICULUM[exam].map(b => b.id) : [branch];
      for (const b of covered) {
        const main = category(exam, b, b === 'genel' ? 'Genel kaynaklar' : 'Dersin genel kapsamı');
        add(category(exam, b, main.topic, format === 'DENEME' ? 'Deneme sınavları'
          : format === 'CEVAP_ANAHTARI' ? 'Deneme cevap anahtarları'
          : format === 'TEST' ? 'Karma konu testleri' : format === 'KONU_OZETI' ? 'Genel konu özeti' : 'Çalışma rehberleri'));
      }
      // Contents headings add specific coverage only when their text is explicit.
      for (const h of headings.filter(h => h.page >= 2 && h.page <= 8)) {
        const b = branch === 'matematik' && geometry.test(normalise(h.text)) ? 'geometri' : branch;
        for (const topic of matchTopics(h.text, b, allowed(exam, b))) if (labels.length < 45) add(category(exam, b, topic), 'SECONDARY');
      }
      continue;
    }
    const candidates = allowed(exam, branch);
    let topics = matchTopics(titleText, branch, candidates);
    // Consult the actual PDF cover/unit headings when the lesson title alone is insufficient.
    if (!topics.length) topics = matchTopics(titleText, branch);
    for (const part of titleText.split(/\s+(?:VE|ve)\s+|[;/]/)) {
      if (normalise(part).length < 5) continue;
      const related = matchTopics(part, branch, candidates);
      topics.push(...related.filter(t => !topics.includes(t)));
    }
    if (!topics.length) for (const h of headings.filter(h => h.page <= 2)) {
      topics = matchTopics(h.text, branch, candidates); if (topics.length) break;
    }
    if (!topics.length) {
      const cover = headings.find(h => h.page === 1 && h.method === 'heading_font' && h.text.length < 110);
      topics = [display(cover?.text || title)];
      fallback.push({ id: source.id, exam, branch, title, parent: topics[0] });
    }
    for (const topic of topics) {
      const main = category(exam, branch, topic);
      const subtopic = aliasKey(titleText) === aliasKey(topic) ? 'Temel kavramlar ve kapsam' : canonicalTitle(titleText);
      // Existing physics lesson IDs win when the PDF uses precisely the same heading.
      const existing = [...categories.values()].find(c => c.exam === exam && c.subjectId === branch
        && aliasKey(c.topic) === aliasKey(topic) && c.subtopic && aliasKey(c.subtopic) === aliasKey(subtopic));
      const physicsSubtopics = branch === 'fizik' ? canonicalPhysicsSubtopics(topic, titleText) : [];
      if (physicsSubtopics.length) for (const sub of physicsSubtopics) add(category(exam, branch, main.topic, sub));
      else add(existing || category(exam, branch, main.topic, subtopic));
      add(main);
    }
  }
  if (!labels.length || labels.length > 50) throw new Error(`Invalid labels for ${source.id}`);
  const first = categories.get(labels[0].categoryId);
  const key = `pdf:${source.id}`;
  records.push({ key, kind: 'PDF', catalogId: source.id, title: source.sourceTitle, exam: source.exam,
    subjectId: branch, subject: branches.get(branch) || 'Genel kaynaklar', source: source.source,
    topic: first.topic, subtopic: first.subtopic, grade: source.grade, pageCount: source.pageCount,
    availability: source.availability, sourceSha256: source.sourceSha256 || '',
    url: `/api/operator/content-review/pdf/${source.id}`,
    relativePath: source.relativePath, ...(source.sourceScope ? {sourceScope:source.sourceScope} : {}),
    suggestedCategoryIds: labels.map(a => a.categoryId),
    automaticLabels: { assignments: labels, difficulty: 'BELIRLENMEDI', contentFormat: format, skills: [],
      grades: source.grade ? [source.grade] : [], provenance: 'PDF_HEADINGS',
      evidence: source.explicitTargets ? source.headings : headings.filter(h => aliasKey(h.text) === aliasKey(title)
        || matchTopics(h.text, branch, new Set(labels.map(a => categories.get(a.categoryId).topic))).length).slice(0, 6),
      ...(source.pageSegments?.length ? {pageSegments:source.pageSegments} : {}),
      reviewReasons: source.reviewReasons || [],
      basis: source.explicitTargets ? 'INSPECTED_DOCUMENT_SCOPE' : internalTitle ? 'INTERNAL_HEADING' : headings.length ? 'HEADING_AND_SOURCE_TITLE' : 'SOURCE_TITLE_ONLY' } });
}
const newCategories = [...categories.values()].filter(c => !base.categories.some(b => b.id === c.id));
const result = { version: 1, method: 'PDF_HEADINGS', categories: newCategories, items: records };
const output = JSON.stringify(result, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(destination, 'utf8') !== output) throw new Error('Run node scripts/pdf-review-labels.mjs');
} else fs.writeFileSync(destination, output);
fs.writeFileSync(path.join(root, 'veri/pdf-review-label-report.json'), JSON.stringify({ sources: records.length,
  unlabelled: records.filter(r => !r.automaticLabels.assignments.length).length,
  categories: newCategories.length, fallbacks: fallback,
  byBranch: Object.fromEntries([...new Set(records.map(r => r.subjectId))].map(b => [b, records.filter(r => r.subjectId === b).length])) }, null, 2));
console.log(`PDF heading labels: ${records.length} records, ${newCategories.length} categories, 0 unlabelled; ${fallback.length} PDF-derived parent headings.`);

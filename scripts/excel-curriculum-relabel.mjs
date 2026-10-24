// Reclassify the published source snapshot without re-extracting PDFs or touching student records.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { taxonomy, taxonomyVersion } from './content-taxonomy.mjs';
import { canonicalizeUnits } from './canonical-units.mjs';
import { normaliseTerm } from './content-taxonomy.mjs';
import { displayResourceTitle } from '../frontend/src/resourceMetadata.js';
const state = new URL('../veri/content-labels/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, state), 'utf8'));
const payload = read('labels.json'), prior = read('report.json');
if (taxonomy.unitReference?.type !== 'EXCEL_FIRST_SHEET') throw Error('Import the first Excel worksheet first');
const refreshDefinitions = process.argv.includes('--refresh-definitions');
const previousCategories = new Map(payload.categories.map(c => [c.id,c]));
const categories = new Map(payload.categories.map(c => [c.id,c]));
for (const c of taxonomy.categories) categories.set(c.id,c);
const categoryHash = category => createHash('sha256').update(JSON.stringify(category)).digest('hex');
const dryRun = process.argv.includes('--dry-run');

// The broad unit mapping dropped the question's own source subtopic. A reliable source name that is
// exactly one Excel topic narrows the question to that topic; model guesses and unit-wide headings keep
// their existing candidates. OGM cards record how their subtopic was assigned (`yon`).
const reliableSubtopic = new Set(['kaz', 'kaz-ikiz', 'elle', 'baslik', 'baslik-elle']);
const cardDirectory = new URL('../../icerik/data/ogm/q/', import.meta.url);
const cards = new Map();
for (const file of fs.readdirSync(cardDirectory).filter(name => name.endsWith('.js'))) {
  const text = fs.readFileSync(new URL(file, cardDirectory), 'utf8');
  for (const card of JSON.parse(text.slice(text.indexOf('=[') + 1).replace(/;\s*$/, ''))) cards.set(card.id, card);
}
const splitSubjects = { matematik: 'geometri', geometri: 'matematik', turkce: 'edebiyat', edebiyat: 'turkce' };
// Same words in any order: "Türk Kültürü ve Kültür Bölgeleri" is "Kültür Bölgeleri ve Türk Kültürü".
const wordSet = text => normaliseTerm(text).split(' ').filter(word => word && !['ve', 'ile'].includes(word)).sort().join(' ');
const excelTopics = [...categories.values()].filter(c => c.selectable && c.curriculumSource === 'EXCEL_FIRST_SHEET');
const unitSizes = new Map(), topicsByName = new Map();
for (const c of excelTopics) {
  unitSizes.set(c.unitId, (unitSizes.get(c.unitId) || 0) + 1);
  const key = `${c.exam}:${c.subjectId}:${wordSet(c.topic)}`;
  topicsByName.set(key, [...(topicsByName.get(key) || []), c]);
}
// Topic-like evidence that never narrows a question on its own but blocks a contradicting match.
const contextEvidence = new Set(['SOURCE_TOPIC', 'PRESERVED_SOURCE_CORRECTION', 'pdf_section_and_mapping', 'pdf_section_heading',
  'pdf_test_heading', 'ogm_outcome_explicit_topic', 'ogm_outcome_and_mapping', 'source_record_subtopic', 'prior_source_annotation',
  'legacy_subtopic_annotation', 'source_csv_topic', 'AI_SOURCE_READING', 'AI_VISUAL_OBSERVATION', 'AI_ORIGINAL_PDF_VISUAL_READING']);
const sourceSubtopicMatches = { assigned: 0, narrowed: 0, corrected: 0, conflicting: 0 };
const sourceSubtopicChanges = [];
function refineFromSourceSubtopic(item) {
  if (item.kind !== 'QUESTION') return;
  const labels = item.automaticLabels, card = cards.get(item.questionCode), evidence = labels.evidence || [];
  // A subtopic that differs from the card's own is a preserved manual correction and replaces the card.
  const corrected = evidence.filter(e => e.type === 'SOURCE_SUBTOPIC' && e.text !== card?.alt).map(e => e.text);
  const names = [...evidence.filter(e => e.type === 'SOURCE_HEADING').map(e => e.text), ...corrected,
    ...(!corrected.length && card?.alt && reliableSubtopic.has(card.yon) ? [card.alt] : [])];
  const related = labels.assignments.filter(a => a.relation !== 'PREREQUISITE');
  const current = related.map(a => categories.get(a.categoryId)).filter(c => c?.selectable);
  const subjects = new Set([...(current.length ? current.map(c => c.subjectId) : [item.subjectId])]
    .flatMap(subject => [subject, splitSubjects[subject]]).filter(Boolean));
  const topicsNamed = texts => {
    const found = new Map();
    for (const name of new Set(texts.map(wordSet))) for (const subject of subjects)
      for (const topic of topicsByName.get(`${item.exam}:${subject}:${name}`) || [])
        // A topic named after its own multi-topic unit is still a unit-wide source name.
        if (!(wordSet(topic.unit) === name && unitSizes.get(topic.unitId) > 1)) found.set(topic.id, topic);
    return found;
  };
  const matches = topicsNamed(names);
  if (matches.size !== 1) return;
  const [target] = matches.values();
  if ([...topicsNamed(evidence.filter(e => contextEvidence.has(e.type)).map(e => e.text)).keys()].some(id => id !== target.id)) {
    sourceSubtopicMatches.conflicting++;
    return;
  }
  if (related.length === 1 && related[0].categoryId === target.id) return;
  const change = !current.length ? 'assigned' : related.some(a => a.categoryId === target.id) ? 'narrowed' : 'corrected';
  const previous = related.find(a => a.relation === 'PRIMARY') || related[0] || labels.assignments[0];
  const locators = previous?.locators?.filter(l => ['QUESTION', 'NOTE'].includes(l.type)) || [];
  const fingerprint = categoryHash(target);
  labels.assignments = [{ ...structuredClone(previous), categoryId: target.id, relation: 'PRIMARY',
    relationKey: 'relation:' + createHash('sha256').update(`${item.key}|${target.id}`).digest('hex').slice(0, 24),
    categoryFingerprint: fingerprint, confidence: 'HIGH', scopeStatus: 'CANDIDATE',
    confidenceReason: 'Kaynaktaki alt konu/başlık adı Excel ilk sayfasındaki konuyla birebir aynı; öğretmen onayı değildir.',
    locators, locatorStatus: locators.length ? previous.locatorStatus : 'MISSING',
    review: { status: 'PENDING', reviewer: null, reviewedAt: null, sourceVersion: item.sourceVersion, categoryFingerprint: fingerprint } },
    ...labels.assignments.filter(a => a.relation === 'PREREQUISITE')];
  delete labels.unitReview;
  const grades = (String(target.gradeLabel || '').match(/\d+/g) || []).map(Number);
  if (grades.length) labels.grades = grades;
  labels.evidence = [...labels.evidence, { type: 'SOURCE_SUBTOPIC_EXCEL_MATCH', text: target.topic,
    reference: `${taxonomy.unitReference.file}#${taxonomy.unitReference.sheet}` }];
  item.topic = target.topic; item.subjectId = target.subjectId; item.subject = target.subject;
  if (item.unitMigration) item.unitMigration.status = 'MAPPED';
  item.displayTitle = displayResourceTitle(item, categories);
  sourceSubtopicMatches[change]++;
  sourceSubtopicChanges.push({ key: item.key, bank: item.bank, exam: item.exam, change,
    before: current.map(c => c.topic), after: target.topic, unit: target.unit, subject: target.subject });
}
if (refreshDefinitions) for (const previous of previousCategories.values()) {
  if (previous.curriculumSource !== 'EXCEL_FIRST_SHEET') continue;
  const current = categories.get(previous.id);
  if (!current?.selectable || ['exam','excelRowId','unitId','unit','topic'].some(key=>current[key]!==previous[key]))
    throw Error(`Definition refresh cannot change topic identity or content: ${previous.id}`);
}
const counts = { matched: 0, unresolved: 0, multipleCandidates: 0 };
for (const item of payload.items) {
  const labels = item.automaticLabels;
  // Recover the detailed source labels from before the former broad-unit mapping.
  const needsMapping = !refreshDefinitions && (process.argv.includes('--force') || item.unitMigration?.reference!==taxonomy.unitReference.sha256 || item.taxonomyVersion!==taxonomyVersion);
  if (needsMapping && labels.legacyUnitAssignments?.length) {
    labels.assignments = labels.legacyUnitAssignments.filter(a=>categories.has(a.categoryId))
      .map(a=>({ ...structuredClone(labels.assignments.find(old=>old.categoryId===a.categoryId)||labels.assignments[0]), ...a }));
  }
  if(needsMapping) canonicalizeUnits(item, categories);
  if (!refreshDefinitions) refineFromSourceSubtopic(item);
  item.taxonomyVersion = taxonomyVersion;
  item.categoryIds = labels.assignments.map(a=>a.categoryId);
  const selected = item.categoryIds.map(id=>categories.get(id));
  if (refreshDefinitions) {
    for (const assignment of labels.assignments) {
      const fingerprint = categoryHash(categories.get(assignment.categoryId));
      if (assignment.categoryFingerprint !== fingerprint) {
        assignment.categoryFingerprint = fingerprint;
        assignment.review = { status:'PENDING', reviewer:null, reviewedAt:null, sourceVersion:item.sourceVersion, categoryFingerprint:fingerprint };
      }
    }
    const primary = categories.get(labels.assignments.find(a=>a.relation==='PRIMARY')?.categoryId) || selected[0];
    if (primary) { item.subjectId=primary.subjectId; item.subject=primary.subject; }
    item.displayTitle=displayResourceTitle(item,categories);
  }
  item.subjectIds = [...new Set(selected.map(c=>c.subjectId))];
  item.examIds = [...new Set(selected.map(c=>c.exam))];
  item.searchText = normaliseTerm([item.title,item.originalTitle,item.sourceTopic,...selected.flatMap(c=>[c.subject,c.unit,c.topic])].filter(Boolean).join(' '));
  if (item.kind === 'QUESTION' && item.bank !== 'NOTE') {
    counts[selected.some(c=>c.excelRowId)?'matched':'unresolved']++;
    if (selected.filter(c=>c.excelRowId).length>1) counts.multipleCandidates++;
  }
}
fs.writeFileSync(new URL(`source-subtopic-matches-from-${prior.runKey}${dryRun ? '.preview' : ''}.json`, state),
  JSON.stringify({ previousRunKey: prior.runKey, counts: sourceSubtopicMatches, changes: sourceSubtopicChanges }, null, 1) + '\n');
if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, ...counts, sourceSubtopicMatches }));
  process.exit(0);
}
payload.categories = [...categories.values()].sort((a,b)=>a.id.localeCompare(b.id,'en'));
const output = JSON.stringify(payload)+'\n';
const runKey = 'labels-v1-'+createHash('sha256').update(output).digest('hex').slice(0,24);
const summary = { ...prior, runKey, categories: categories.size, canonicalUnits: taxonomy.unitReference.examTopics,
  curriculumReference: taxonomy.unitReference, excelClassification: counts, sourceSubtopicMatches,
  definitionRefresh: refreshDefinitions,
  unitSelectionRequired: payload.items.filter(i=>i.automaticLabels.unitReview).length };
const backup = new URL(`../yedek/labels-before-excel-${prior.runKey}-${payload.items.length}.json`, state);
fs.mkdirSync(new URL('.',backup), { recursive:true });
if (!fs.existsSync(backup)) fs.copyFileSync(new URL('labels.json',state),backup);
fs.writeFileSync(new URL('labels.tmp',state),output);
fs.renameSync(new URL('labels.tmp',state),new URL('labels.json',state));
fs.writeFileSync(new URL('report.json',state),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({runKey,resources:payload.items.length,...counts,reference:taxonomy.unitReference}));

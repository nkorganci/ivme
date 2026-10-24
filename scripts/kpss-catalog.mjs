// Adds one KPSS exam's reference topics (categories) and past questions (items) to the shared label payload.
// The exam is described by <data-dir>/konular.json (track, prefixes, reference paths) written by its derle.py.
// YKS and other KPSS entries are copied unchanged; this exam's previous entries are replaced (idempotent).
// Usage: node --max-old-space-size=6144 scripts/kpss-catalog.mjs <data-dir> <stamps.json> <published-run-key>
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { taxonomyVersion } from './content-taxonomy.mjs';
import { validateResource } from './learning-resource-contract.mjs';
import { displayResourceTitle } from '../frontend/src/resourceMetadata.js';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.dirname(app);
const state = path.join(app, 'veri/content-labels');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = value => createHash('sha256')
  .update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const [dataArg, stampsArg, publishedRun] = process.argv.slice(2);
assert.ok(dataArg && stampsArg && publishedRun, 'Usage: kpss-catalog.mjs <data-dir> <stamps.json> <published-run-key>');
const dataDir = path.resolve(root, dataArg);
const dataRef = path.relative(root, dataDir).replaceAll('\\', '/');

const stamps = read(path.resolve(stampsArg));
const reference = read(path.join(dataDir, 'konular.json'));
const questions = read(path.join(dataDir, 'sorular.json'));
const { track, kategoriOnek: categoryPrefix, kodOnek: codePrefix, gorselKlasoru: imageDir, referans: REFERENCE, kararlar: DECISIONS } = reference;
assert.ok(track && categoryPrefix && codePrefix && imageDir && REFERENCE && DECISIONS, 'konular.json lacks publication fields; rerun derle.py');
const itemPrefix = `question:${codePrefix}`;
const referenceSha = createHash('sha256').update(fs.readFileSync(path.join(root, REFERENCE))).digest('hex');
assert.equal(referenceSha, reference.agacSha256, 'konular.json is stale; rerun derle.py');
assert.equal(questions.agacSha256, reference.agacSha256, 'sorular.json and konular.json differ');

const categories = reference.konular.map(k => {
  assert.ok(k.id.startsWith(categoryPrefix), `${k.id}: outside ${categoryPrefix}`);
  return {
    id: k.id, exam: k.examId, subjectId: k.dersId, subject: k.ders, sourceSubject: k.ders,
    unit: k.unite, unitId: k.uniteId, unitNumber: k.uniteNo, topic: k.konu, subtopic: '',
    origin: 'CURRICULUM', curriculumSource: 'KPSS_REFERENCE', selectable: true, canonicalUnit: true, canonicalTopic: true,
    order: 10000 + k.sira, topicNumber: k.konuNo, grade: null, gradeLabel: '', estimatedGrades: [], aliases: [], matchingPatterns: [],
    excelRowId: k.id, track, testName: k.test,
    curriculumReference: { file: REFERENCE, sha256: reference.agacSha256, kind: 'KPSS_REFERENCE', basis: k.dayanak },
    distribution: { row: k.sira, subject: k.ders, unit: k.unite, topic: k.konu, test: k.test, years: reference.yillar,
      yearCounts: k.yillar, total: k.toplam, last10: k.son10, recent: k.son3, activeQuestions: k.aktifSoru,
      teacherReviewPending: k.ogretmenOnayiBekleyen, recentYears: reference.son3, last10Years: reference.son10 },
  };
});
const byId = new Map(categories.map(c => [c.id, c]));
const confidence = { H: 'HIGH', M: 'MEDIUM', L: 'LOW' };
const reason = {
  H: 'Soru metni/görseli okunarak tek konuya bağlandı; öğretmen onayı değildir.',
  M: 'Soru okunarak en yakın konuya bağlandı; konu sınırı tartışmalı, öğretmen onayı gerekiyor.',
  L: 'Kaynakta soru eksik veya konu belirsiz; konu tahminidir, öğretmen onayı gerekiyor.',
};
const availability = { AKTIF: 'available', ESKI: 'source_only', EKSIK_SIK: 'needs_repair', EKSIK_KOK: 'needs_repair' };

const items = questions.sorular.map(q => {
  assert.ok(q.kod.startsWith(codePrefix), `${q.kod}: outside ${codePrefix}`);
  const key = `question:${q.kod}`;
  const category = byId.get(q.konuId);
  assert.ok(category, `${q.kod}: unknown category ${q.konuId}`);
  const stamp = stamps[q.kod];
  assert.ok(stamp, `${q.kod}: missing DB source stamp; publish questions first`);
  const sourceVersion = hash({ code: q.kod, source: q.kaynak, page: q.sayfa, answer: q.cevap, image: q.gorsel, topic: q.konuId, status: q.durum });
  const evidenceRef = `${DECISIONS}/${q.yil}.tsv#${q.test}-${q.no}`;
  const visible = q.durum === 'AKTIF';
  const fingerprint = hash(category);
  const item = {
    key, url: `/soru/${q.kod}`, bank: 'CIKMIS', exam: q.examType, kind: 'QUESTION', title: q.kod, topic: q.konu,
    examIds: [q.examType], subject: q.ders, subjectId: q.dersId, subjectIds: [q.dersId], categoryIds: [q.konuId],
    searchText: `${q.kod} ${q.yil} ${reference.sinav} ${q.ders} ${q.unite} ${q.konu}`.toLocaleLowerCase('tr-TR'),
    sourceImage: { reference: `${imageDir}/${q.dersId.replace(/^kpss-/, '')}/${q.kod}.webp`, originalReference: `${q.kaynak}#page=${q.sayfa}`,
      status: 'PRESERVED_REFERENCE', reason: 'ÖSYM kitapçığından kırpılmış soru görseli; ortak metin varsa görselin üstündedir.' },
    sourceLabel: 'CIKMIS', sourceTopic: q.konu, availability: availability[q.durum], questionCode: q.kod,
    resourceRole: visible ? 'ACTIVE_QUESTION' : 'ARCHIVE_QUESTION', originalTitle: q.kod, sourceVersion,
    exampleSources: [], studentVisible: visible, contractVersion: 2, sourceRecordRef: `${dataRef}/sorular.json#kod=${q.kod}`,
    sourceUpdatedAt: stamp, taxonomyVersion, originalFilename: null, supportingSources: [],
    sourceLocationStatus: 'NOT_APPLICABLE', sourceLocationReason: `Özgün kitapçık sayfası: ${q.kaynak} s. ${q.sayfa}; katalog PDF'i değildir.`,
    officialExam: { track, year: q.yil, test: q.test, number: q.no, status: q.durum, statusReason: q.durumNedeni || null },
    automaticLabels: {
      basis: 'CONTENT_READ', grades: [], skills: [], difficulty: 'BELIRLENMEDI', provenance: 'CONTENT_READ',
      evidence: [{ type: 'CONTENT_READ', text: q.konu, reference: evidenceRef }],
      gradeStatus: 'NOT_APPLICABLE', gradeReason: 'KPSS sınıf düzeyi kullanmaz.', sourceMethod: 'content_read', contentFormat: 'SORU',
      reviewReasons: q.guven === 'H' ? [] : ['TOPIC_APPROVAL_REQUIRED'], reviewRequired: true, inputFingerprint: sourceVersion,
      assignments: [{
        review: { status: 'PENDING', reviewer: null, reviewedAt: null, sourceVersion, categoryFingerprint: fingerprint },
        evidence: [{ type: 'CONTENT_READ', text: q.konu, method: 'CONTENT_READ', reference: evidenceRef, association: 'RELATION',
          readability: 'NOT_MEASURED', sourceVersion, ...(q.karar_notu ? { note: q.karar_notu } : {}) }],
        locators: [{ type: 'QUESTION', questionCode: q.kod, questionNumbers: [q.no] }],
        relation: 'PRIMARY', categoryId: q.konuId, confidence: confidence[q.guven],
        relationKey: 'relation:' + hash(`${key}|${q.konuId}`).slice(0, 24), scopeStatus: 'CANDIDATE',
        locatorReason: 'Sabit soru kodu ve özgün kitapçık numarası.', locatorStatus: 'VERIFIED', sourceVersion,
        confidenceReason: reason[q.guven], categoryFingerprint: fingerprint,
      }],
    },
  };
  item.displayTitle = displayResourceTitle(item, byId);
  return item;
});
const errors = items.flatMap(item => validateResource(item, byId));
assert.deepEqual(errors.slice(0, 5), [], 'KPSS resources violate the label contract');

const payloadFile = path.join(state, 'labels.json');
const before = fs.readFileSync(payloadFile);
const previousRun = 'labels-v1-' + hash(before).slice(0, 24);
const payload = JSON.parse(before.toString('utf8'));
const exams = new Set(questions.sorular.map(q => q.examType));
const keptCategories = payload.categories.filter(c => !c.id.startsWith(categoryPrefix));
const keptItems = payload.items.filter(i => !i.key.startsWith(itemPrefix));
const foreign = keptItems.find(i => i.kind === 'QUESTION' && exams.has(i.exam));
assert.ok(!foreign, `Unexpected ${foreign?.exam} item outside the managed prefix: ${foreign?.key}`);
payload.categories = [...keptCategories, ...categories];
payload.items = [...keptItems, ...items];
const output = JSON.stringify(payload);
fs.writeFileSync(payloadFile, output);
const runKey = 'labels-v1-' + hash(output).slice(0, 24);

const count = (field, values) => Object.fromEntries(values.map(v => [v, questions.sorular.filter(q => q[field] === v).length]));
const summary = {
  reference: REFERENCE, referenceSha256: reference.agacSha256, decisionsSha256: reference.siniflandirmaSha256,
  categories: categories.length, items: items.length, studentVisible: items.filter(i => i.studentVisible).length,
  byStatus: count('durum', ['AKTIF', 'ESKI', 'EKSIK_SIK', 'EKSIK_KOK']),
  byConfidence: Object.fromEntries(Object.entries(count('guven', ['H', 'M', 'L'])).map(([k, v]) => [confidence[k], v])),
};
const questionCount = payload.items.filter(i => i.kind === 'QUESTION').length;
const reportFile = path.join(state, 'report.json');
const report = read(reportFile);
Object.assign(report, { runKey, resources: payload.items.length, categories: payload.categories.length, questions: questionCount });
report.byKind = { ...report.byKind, QUESTION: questionCount };
report.kpss = { ...(report.kpss || {}), [track]: summary };
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');

const refsFile = path.join(state, 'curriculum-reference-labels.json');
const refs = read(refsFile).filter(r => r.source !== REFERENCE);
refs.push({ source: REFERENCE, sha256: reference.agacSha256, hashScope: 'FILE', kind: 'CURRICULUM_REFERENCE', categoryIds: categories.map(c => c.id) });
fs.writeFileSync(refsFile, JSON.stringify(refs, null, 2) + '\n');

const auditFile = path.join(state, 'audit.json');
const audit = read(auditFile);
// The publication guard requires the database run this payload was built on (scripts/kpss-yayinla.py reads it).
Object.assign(audit, { type: 'TRACK_CURRICULUM_ADDITION', runKey, previousRunKey: publishedRun, resources: payload.items.length,
  sourcePreserved: true, unlabelled: 0, failures: [], curriculumReferences: refs.length,
  trackAdditionNote: 'Diğer sınavların kaynakları ve kategorileri değişmeden kopyalandı; yalnız bu KPSS sınavının kayıtları eklendi/yenilendi.' });
audit.kpss = { ...(audit.kpss || {}), [track]: summary };
fs.writeFileSync(auditFile, JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify({ track, previousRun, runKey, ...summary }));

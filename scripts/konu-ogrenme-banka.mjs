#!/usr/bin/env node
// Konuyu Öğrenelim banka eşlemesi: TYT–AYT Matematik sorularını ders kavramlarına ve soru tiplerine bağlar.
//   node scripts/konu-ogrenme-banka.mjs            → frontend/src/learn/bank/<kavram>.json + _ozet.json
//   node scripts/konu-ogrenme-banka.mjs --rapor    → yalnız kapsam raporu (dosya yazmaz)
//   node scripts/konu-ogrenme-banka.mjs --ornek <kavram> [tip]  → eşlenen soruların metninden örnekler
//   node scripts/konu-ogrenme-banka.mjs --basliklar <kategori-kimliği-sonu>  → kategorideki OGM başlıklarının sıklığı
// Girdi: PostgreSQL `ivme` (etkin, öğrenciye açık sorular ve ortak katalog kategorileri), OGM kayıt dosyaları
// (kitap/test başlığı, kazanım, PDF metni), ÖSYM çıkmış soru kitapçığı metni ve ders dosyalarındaki kategori,
// başlık kuralı ve anahtar kelimeler.
// Çıktıda cevap anahtarı yoktur; puanlama sunucuda yapılır.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLesson } from '../frontend/src/learn/content/parser.js';
import { WORKED_EXAMS } from '../frontend/src/learn/content/worked-exams.js';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS = join(APP, 'frontend/src/learn/content/dersler');
const OUT = join(APP, 'frontend/src/learn/bank');
const KAYIT = resolve(APP, '../veri-hatti/ogm-sorular/kayit');
const CIKMIS = resolve(APP, '../veri-hatti/ogm-yks-cikmis/ham/sorular_son.json');
const args = process.argv.slice(2);
const reportOnly = args.includes('--rapor');
const sampleIndex = args.indexOf('--ornek');
const headingsIndex = args.indexOf('--basliklar');

const FOLD = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
export const fold = (text) => String(text ?? '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, (c) => FOLD[c]).replace(/\s+/g, ' ');

function compile(rule) {
  const source = rule.startsWith('/') && rule.endsWith('/') && rule.length > 2 ? rule.slice(1, -1) : fold(rule).replace(/[.*+?^${}()[\]\\]/g, '\\$&');
  return new RegExp(rule.startsWith('/') ? fold(source) : source);
}

function query(sql) {
  const file = join(tmpdir(), `konu-ogrenme-${process.pid}.json`);
  const script = [
    `Set-Location '${APP}'`, '. ./yerel-ortam.ps1', '$s = Get-IvmeLocalEnvironment', '$env:PGPASSWORD = $s.DbPassword', "$env:PGCLIENTENCODING = 'UTF8'",
    `& 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe' -X -v ON_ERROR_STOP=1 -h localhost -U $s.DbUser -d ivme -At -o '${file}' -c "${sql.replace(/"/g, '\\"').replace(/\s+/g, ' ')}"`,
  ].join('; ');
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], { stdio: ['ignore', 'inherit', 'inherit'] });
  const text = readFileSync(file, 'utf8');
  rmSync(file, { force: true });
  return JSON.parse(text.trim() || '[]');
}

function loadQuestions() {
  return query(`SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.code), '[]'::json) FROM (
    SELECT DISTINCT ON (q.code) q.id, q.code, q.bank, q.exam_type AS exam, q.topic, q.exam_year AS year, q.source, q.choice_count AS choices,
      (coalesce(q.solution_image, '') <> '') AS sol, i.category_ids AS cats,
      (SELECT o.observations->>'text' FROM learning_catalog.question_content_observations o WHERE o.question_code = q.code ORDER BY o.recorded_at DESC LIMIT 1) AS ocr
    FROM questions q JOIN learning_catalog.current_items i ON i.question_code = q.code
    WHERE q.active AND q.subject = 'Matematik' AND q.exam_type IN ('TYT','AYT') AND i.student_visible AND i.availability = 'available'
    ORDER BY q.code) t`);
}

/** OGM kayıtlarından başlık, test ve metin (soru kimliği → kayıt). */
function loadRecords(codes) {
  const wanted = new Set(codes);
  const out = new Map();
  if (!existsSync(KAYIT)) return out;
  for (const name of readdirSync(KAYIT).filter((n) => n.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(KAYIT, name), 'utf8'));
    const records = Array.isArray(data) ? data : data.kayitlar ?? [];
    for (const record of records) {
      if (!wanted.has(record.id)) continue;
      out.set(record.id, {
        heading: [record.konu_basligi, record.test, record.kazanim_kod4, record.kazanim, record.unite].filter(Boolean).join(' · '),
        test: record.test ?? '', text: record.metin ?? '', fen: String(record.urlKod ?? '').startsWith('fl-'), solved: !!record.cozumlu,
      });
    }
  }
  return out;
}

/** ÖSYM çıkmış soruların kitapçık metni (OCR gözlemi olmayan sorular için; soru kimliği → metin). */
function loadPastTexts(codes) {
  const wanted = new Set(codes);
  const out = new Map();
  if (!existsSync(CIKMIS)) return out;
  for (const item of JSON.parse(readFileSync(CIKMIS, 'utf8')).sorular ?? []) {
    if (wanted.has(item.id) && item.metin) out.set(item.id, String(item.metin).replace(/^\d+\.\s*/, ''));
  }
  return out;
}

function difficultyOf(q, record) {
  const prefix = q.code.split('-')[0];
  if (q.bank === 'CIKMIS') return q.exam === 'AYT' ? 3 : 2;
  const test = fold(record?.test ?? '');
  if (prefix === '3a') {
    const step = test.match(/(\d)\. adim/);
    return step ? Math.min(3, Number(step[1])) : 2;
  }
  if (prefix === 'dd') {
    if (test.includes('cozumlu')) return 2;
    const n = test.match(/(\d)\. test/);
    return n ? ({ 1: 1, 2: 2, 3: 2, 4: 3 }[n[1]] ?? 2) : 2;
  }
  if (prefix === 'sb') return record?.fen ? 3 : 2;
  if (prefix === 'yk') return 3;
  return 2;
}

const SOURCE = { '3a': '3 Adım', dd: 'Dört Dörtlük', sb: 'OGM Soru Bankası', mt: 'MEBİ Tarama', yk: 'YKS Kampı', md: 'MEBİ Deneme', '3d': 'Deneme', cd: 'Deneme', mn: 'Mini Deneme' };

function main() {
  const lessons = readdirSync(LESSONS).filter((n) => n.endsWith('.ders')).map((n) => parseLesson(readFileSync(join(LESSONS, n), 'utf8'), n.replace(/\.ders$/, '')));
  if (!lessons.length) throw new Error('Ders dosyası yok.');
  const rules = lessons.map((lesson) => ({
    lesson,
    categories: new Set(lesson.categories),
    headings: lesson.headingRules.map(compile),
    excludes: lesson.excludeRules.map(compile),
    keywords: lesson.keywords.map(compile),
    archetypes: lesson.archetypes.map((a) => ({ id: a.id, keywords: a.keywords.map(compile), exclude: (a.exclude ?? []).map(compile) })),
  }));
  const questions = loadQuestions();
  const records = loadRecords(questions.map((q) => q.code));
  const pastTexts = loadPastTexts(questions.filter((q) => q.bank === 'CIKMIS').map((q) => q.code));
  if (headingsIndex >= 0) {
    const key = args[headingsIndex + 1] ?? '';
    const counts = {};
    for (const q of questions.filter((item) => (item.cats ?? []).some((c) => c.endsWith(key)))) {
      const heading = `${q.exam} ${records.get(q.code)?.heading ?? q.topic ?? '-'}`.slice(0, 150);
      counts[heading] = (counts[heading] ?? 0) + 1;
    }
    for (const [heading, n] of Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.ORNEK ?? 80))) console.log(`${String(n).padStart(4)}  ${heading}`);
    return;
  }
  const byConcept = Object.fromEntries(lessons.map((l) => [l.id, []]));
  const unassigned = {};
  const reasons = { heading: 0, keyword: 0, single: 0, default: 0, fallback: 0 };
  for (const q of questions) {
    const record = records.get(q.code);
    const heading = fold(record?.heading ?? q.topic ?? '');
    const text = fold(`${record?.text ?? ''} ${q.ocr ?? ''} ${q.ocr ? '' : pastTexts.get(q.code) ?? ''}`);
    const cats = q.cats ?? [];
    const reviewed = WORKED_EXAMS[q.code];
    const candidates = rules.filter((r) => (reviewed ? r.lesson.id === reviewed.conceptId : cats.some((c) => r.categories.has(c))) && r.lesson.exams.includes(q.exam));
    if (!candidates.length) {
      for (const c of cats) unassigned[c] = (unassigned[c] ?? 0) + 1;
      continue;
    }
    const scored = candidates.map((r) => {
      if (r.excludes.some((re) => re.test(heading) || re.test(text))) return { r, score: -100, how: 'exclude' };
      const head = r.headings.some((re) => re.test(heading)) ? 10 : 0;
      const keys = Math.min(5, r.keywords.filter((re) => re.test(text)).length);
      const arch = Math.max(0, ...r.archetypes.map((a) => a.keywords.filter((re) => re.test(text)).length));
      return { r, score: head + keys + Math.min(3, arch) * 0.5, how: head ? 'heading' : keys || arch ? 'keyword' : 'none' };
    }).sort((a, b) => b.score - a.score || a.r.lesson.order - b.r.lesson.order);
    let best = scored[0];
    if (reviewed) best = { ...best, score: 100, how: 'visual_review' };
    if (best.score <= 0) {
      const fallback = scored.find((item) => item.r.lesson.bankDefault && item.score > -100);
      if (candidates.length === 1 && best.score > -100) best = { ...best, how: 'single' };
      else if (fallback) best = { ...fallback, how: 'default' };
      else {
        for (const c of cats) unassigned[c] = (unassigned[c] ?? 0) + 1;
        continue;
      }
    }
    if (best.score > 0 && scored[1] && scored[1].score === best.score && best.how !== 'heading') reasons.fallback += 1;
    reasons[best.how] = (reasons[best.how] ?? 0) + 1;
    const archetypeScores = best.r.archetypes.map((a) => ({ id: a.id, score: a.exclude.some((re) => re.test(text)) ? -1 : a.keywords.filter((re) => re.test(text) || re.test(heading)).length }))
      .sort((a, b) => b.score - a.score);
    const archetype = reviewed?.archetype ?? (archetypeScores[0]?.score > 0 && archetypeScores[0].score > (archetypeScores[1]?.score ?? 0) ? archetypeScores[0].id : null);
    byConcept[best.r.lesson.id].push({
      c: q.code, i: q.id, a: archetype, d: difficultyOf(q, record), x: q.exam, ...(q.bank === 'CIKMIS' ? { k: 1, y: q.year ?? undefined } : {}),
      s: q.bank === 'CIKMIS' ? 'ÖSYM' : SOURCE[q.code.split('-')[0]] ?? 'OGM', ...(q.sol ? { w: 1 } : {}), ...(q.choices !== 5 ? { n: q.choices } : {}),
      _t: text.slice(0, 400), _h: heading.slice(0, 160),
    });
  }

  if (sampleIndex >= 0) {
    const concept = args[sampleIndex + 1];
    const type = args[sampleIndex + 2];
    const list = (byConcept[concept] ?? []).filter((q) => !type || (type === '-' ? !q.a : q.a === type));
    for (const q of list.slice(0, Number(process.env.ORNEK ?? 25))) console.log(`${q.c} [${q.a ?? '-'}] d${q.d} ${q.x}${q.k ? ' ÇIKMIŞ' : ''} :: ${q._h}\n   ${q._t.slice(0, 260)}\n`);
    console.log(`toplam ${list.length}`);
    return;
  }

  const summary = { concepts: {} };
  const report = [];
  for (const lesson of lessons) {
    const list = byConcept[lesson.id].sort((a, b) => a.c.localeCompare(b.c));
    const archetypes = Object.fromEntries(lesson.archetypes.map((a) => [a.id, list.filter((q) => q.a === a.id).length]));
    const cikmis = { TYT: list.filter((q) => q.k && q.x === 'TYT').length, AYT: list.filter((q) => q.k && q.x === 'AYT').length };
    summary.concepts[lesson.id] = { total: list.length, cikmis, archetypes, untyped: list.filter((q) => !q.a).length };
    const mixNeed = lesson.mastery.mix.filter((m) => archetypes[m.archetype] < m.count * 3).map((m) => `${m.archetype}:${archetypes[m.archetype]}`);
    report.push(`${lesson.id.padEnd(28)} ${String(list.length).padStart(5)} soru · çıkmış T${cikmis.TYT}/A${cikmis.AYT} · tipsiz ${summary.concepts[lesson.id].untyped}`
      + ` · ${Object.entries(archetypes).map(([k, v]) => `${k}=${v}`).join(' ')}${mixNeed.length ? `  ⚠ az: ${mixNeed.join(', ')}` : ''}`);
    if (!reportOnly) {
      mkdirSync(OUT, { recursive: true });
      writeFileSync(join(OUT, `${lesson.id}.json`), `${JSON.stringify({ concept: lesson.id, questions: list.map(({ _t, _h, ...rest }) => rest) })}\n`);
    }
  }
  if (!reportOnly) {
    for (const name of readdirSync(OUT).filter((n) => n.endsWith('.json') && n !== '_ozet.json')) {
      if (!byConcept[name.replace(/\.json$/, '')]) rmSync(join(OUT, name));
    }
    writeFileSync(join(OUT, '_ozet.json'), `${JSON.stringify(summary, null, 1)}\n`);
  }
  const assigned = Object.values(byConcept).reduce((s, l) => s + l.length, 0);
  console.log(report.join('\n'));
  console.log(`\nToplam ${questions.length} soru · eşlenen ${assigned} · eşlenmeyen ${questions.length - assigned} · yol: ${JSON.stringify(reasons)}`);
  const top = Object.entries(unassigned).sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (top.length) console.log(`Eşlenmeyen kategoriler: ${top.map(([k, v]) => `${k}=${v}`).join(' ')}`);
}

main();

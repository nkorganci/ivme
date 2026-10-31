#!/usr/bin/env node
// TAS-05 tanılama ve ikiz görsel haritası: Konuyu Öğrenelim banka sorularında aynı kimlik / aynı görsel baytı / yanlış sınav konumu var mı?
//   node scripts/ortak-set-tani.mjs [kavram ...]   → rapor (DB'yi yalnız okur, dosya yazmaz)
//   node scripts/ortak-set-tani.mjs --yaz          → frontend/src/learn/bank/_gorsel.json (kavram içi ikiz görsel grupları)
//   node scripts/ortak-set-tani.mjs --kontrol      → _gorsel.json güncel mi? (güncel değilse çıkış kodu 1)
// Aynı soru farklı kodla (ör. Eşit Ağırlık ve Sayısal kitapçıkları) gelebilir; ortak PRATIK setinde ve ders
// motorunda kod değil öğrencinin gördüğü görsel baytı tekil olmalıdır. Sunucu (LearnPracticeSets) aynı özeti
// `images.load()` ile hesaplar ve ikiz içeren seti reddeder; bu harita ön yüzün baştan tekil seçmesini sağlar.
// Görünen varyant: onarılmış görsel (manifest doğruysa) > kırpılmış kopya > özgün dosya (LocalImageStorage.load ile aynı sıra).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BANK = join(APP, 'frontend/src/learn/bank');
const OUT = join(BANK, '_gorsel.json');
const IMAGES = join(APP, 'veri/resimler-pilot');
const args = process.argv.slice(2);
const write = args.includes('--yaz');
const check = args.includes('--kontrol');
const wanted = args.filter((a) => !a.startsWith('--'));

function query(sql) {
  const file = join(tmpdir(), `ortak-set-tani-${process.pid}.json`);
  const script = [
    `Set-Location '${APP}'`, '. ./yerel-ortam.ps1', '$s = Get-IvmeLocalEnvironment', '$env:PGPASSWORD = $s.DbPassword', "$env:PGCLIENTENCODING = 'UTF8'",
    `& 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe' -X -v ON_ERROR_STOP=1 -h localhost -U $s.DbUser -d ivme -At -o '${file}' -c "${sql.replace(/"/g, '\\"').replace(/\s+/g, ' ')}"`,
  ].join('; ');
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], { stdio: ['ignore', 'inherit', 'inherit'] });
  const text = readFileSync(file, 'utf8');
  rmSync(file, { force: true });
  return JSON.parse(text.trim() || '[]');
}

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const manifestPath = join(IMAGES, 'onarilmis/manifest.json');
const repairs = new Map();
if (existsSync(manifestPath)) {
  for (const record of JSON.parse(readFileSync(manifestPath, 'utf8')).records ?? []) {
    if (record.state === 'APPLIED_DERIVED_RENDER') repairs.set(record.originalImage, record);
  }
}

/** Öğrencinin gördüğü dosya (LocalImageStorage.load sırası). */
function servedFile(image) {
  const original = join(IMAGES, image);
  if (!existsSync(original)) return null;
  const repair = repairs.get(image);
  if (repair && sha256(original) === repair.originalSha256) {
    const rendered = join(IMAGES, 'onarilmis', image);
    if (existsSync(rendered) && sha256(rendered) === repair.renderedImageSha256) return rendered;
  }
  const cropped = join(IMAGES, 'kirpilmis', image);
  return existsSync(cropped) ? cropped : original;
}

const files = readdirSync(BANK).filter((n) => n.endsWith('.json') && !n.startsWith('_') && (!wanted.length || wanted.includes(n.replace(/\.json$/, ''))));
const banks = Object.fromEntries(files.map((n) => [n.replace(/\.json$/, ''), JSON.parse(readFileSync(join(BANK, n), 'utf8')).questions]));
const rows = query(`SELECT coalesce(json_agg(json_build_object('code', code, 'id', id, 'image', image, 'bank', bank, 'year', exam_year, 'active', active)), '[]'::json) FROM questions WHERE subject = 'Matematik' AND exam_type IN ('TYT','AYT')`);
const byCode = new Map(rows.map((r) => [r.code, r]));
const hashCache = new Map();
const hashOf = (image) => {
  if (!hashCache.has(image)) {
    const file = servedFile(image);
    hashCache.set(image, file ? sha256(file) : null);
  }
  return hashCache.get(image);
};

const codeOwner = new Map();
const report = [];
const groups = {};
let problems = 0;
for (const [concept, questions] of Object.entries(banks)) {
  const codes = new Set();
  const ids = new Set();
  const hashes = new Map();
  let missingImage = 0, inactive = 0, idMismatch = 0, pastNoYear = 0;
  for (const q of questions) {
    const row = byCode.get(q.c);
    if (codes.has(q.c)) { report.push(`${concept}: yinelenen code ${q.c}`); problems += 1; }
    if (ids.has(q.i)) { report.push(`${concept}: yinelenen id ${q.i}`); problems += 1; }
    codes.add(q.c); ids.add(q.i);
    if (codeOwner.has(q.c) && codeOwner.get(q.c) !== concept) { report.push(`${q.c}: hem ${codeOwner.get(q.c)} hem ${concept} bankasında`); problems += 1; }
    codeOwner.set(q.c, concept);
    if (!row) { idMismatch += 1; continue; }
    if (row.id !== q.i) idMismatch += 1;
    if (!row.active) inactive += 1;
    if (q.k && !(row.bank === 'CIKMIS' && row.year)) pastNoYear += 1;
    const hash = hashOf(row.image);
    if (!hash) { missingImage += 1; continue; }
    if (!hashes.has(hash)) hashes.set(hash, []);
    hashes.get(hash).push(q.c);
  }
  const same = [...hashes.entries()].filter(([, list]) => list.length > 1);
  const pastCodes = new Set(questions.filter((q) => q.k).map((q) => q.c));
  const pastSame = same.filter(([, list]) => list.some((c) => pastCodes.has(c)));
  for (const [hash, list] of same) for (const code of list) groups[code] = hash.slice(0, 12);
  // İkiz görsel bir sorunun veri hatası değil bilgidir (kitapçık kopyası); eksik/pasif/yanlış kayıtlar sorundur.
  problems += missingImage + inactive + idMismatch + pastNoYear;
  report.push(`${concept.padEnd(28)} ${String(questions.length).padStart(4)} soru · çıkmış ${String(past(questions)).padStart(3)} · ikiz görsel grubu ${String(same.length).padStart(2)} (çıkmışta ${pastSame.length}) · tekil ${questions.length - same.reduce((n, [, l]) => n + l.length - 1, 0)}`
    + ` · eksik görsel ${missingImage} · etkin değil ${inactive} · kimlik uyuşmaz ${idMismatch} · çıkmış yılsız ${pastNoYear}`);
}
function past(questions) { return questions.filter((q) => q.k).length; }

const artifact = `${JSON.stringify({ groups: Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) })}\n`;
if (write) {
  if (wanted.length) { console.error('--yaz tüm kavramlarla çalışır.'); process.exit(2); }
  writeFileSync(OUT, artifact);
}
if (check) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (wanted.length) { console.error('--kontrol tüm kavramlarla çalışır.'); process.exit(2); }
  if (current !== artifact) { console.error('_gorsel.json güncel değil: node scripts/ortak-set-tani.mjs --yaz'); process.exit(1); }
}
console.log(report.join('\n'));
console.log(`\nToplam sorun: ${problems} · ikiz görselli kod: ${Object.keys(groups).length}${write ? ' · _gorsel.json yazıldı' : ''}${check ? ' · _gorsel.json güncel' : ''}`);
process.exitCode = problems ? 1 : 0;

// "Soru Bankası" (OGM kaynakları) için içe aktarma dosyası üretir: veri/sorular-ogm.csv
// Kaynak: icerik/data/ogm/q/*.js (kartlar) + icerik/data/ogm/img/ (görseller). Bu betik yalnızca kaynak verinin
// bulunduğu çalışma alanında çalışır; çıktılar depoya girmez (veri/ .gitignore'dadır).
//
// Kullanım:  node ogm_uret.mjs            → CSV'yi yazar, görselleri veri/resimler-pilot/ogm altına KLASÖR BAĞLANTISI (junction) ile bağlar
//            node ogm_uret.mjs --kopyala  → görselleri bağlamak yerine kopyalar (~3 GB; başka bilgisayara taşımak için)
//
// Alınanlar: tek cevaplı (A–E) kartlar. Atlananlar: ÖSYM çıkmış soru olarak işaretli kartlar ("AYT-TYT Çıkmış Sorular"
// koleksiyonunda zaten var) ve çok cevaplı / cevapsız kartlar (tek cevaplı modele uymaz).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const burasi = path.dirname(fileURLToPath(import.meta.url));
const uygulama = path.resolve(burasi, '..');
const ogm = path.resolve(uygulama, '..', 'icerik', 'data', 'ogm');
const veri = path.join(uygulama, 'veri');
const kopyala = process.argv.includes('--kopyala');

if (!fs.existsSync(path.join(ogm, 'indeks.js'))) {
  console.error(`OGM verisi bulunamadı: ${ogm}`);
  process.exit(1);
}

const cozJs = (dosya, onEk) => {
  const s = fs.readFileSync(dosya, 'utf8');
  const m = s.match(onEk);
  return JSON.parse(s.slice(m.index + m[0].length).replace(/;\s*$/, ''));
};
const idx = cozJs(path.join(ogm, 'indeks.js'), /window\.OGM_IDX\s*=\s*/);
const kaynakAd = idx.kaynak_ad;

const kartlar = [];
for (const f of fs.readdirSync(path.join(ogm, 'q'))) {
  kartlar.push(...cozJs(path.join(ogm, 'q', f), /window\.OGM_Q\["[^"]+"\]=/));
}

const resim = (r, cozum) => (r.gk === 'sb' ? `sb/${r.id.slice(3)}.webp` : `${r.gk}/${r.id}${cozum ? '-cozum' : ''}.webp`);
const var_ = (rel) => fs.existsSync(path.join(ogm, 'img', rel));
const csvHucre = (d) => {
  const s = String(d ?? '');
  return /[",;\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

const baslik = ['code', 'exam_type', 'subject', 'topic', 'year', 'source', 'image', 'correct_answer', 'choice_count', 'solution_url', 'active', 'bank', 'solution_image'];
const satirlar = [baslik.join(',')];
const sayac = { cikmis: 0, cevapsiz: 0, gorselsiz: 0, cozumGorselsiz: 0, alinan: 0, cozumlu: 0, video: 0 };
for (const r of kartlar) {
  if (r.ck) { sayac.cikmis++; continue; }
  if (r.cev?.length !== 1 || !/^[A-E]$/.test(r.cev[0])) { sayac.cevapsiz++; continue; }
  const g = resim(r, false);
  if (!var_(g)) { sayac.gorselsiz++; continue; }
  let cozum = '';
  if (r.coz) {
    const c = resim(r, true);
    if (var_(c)) { cozum = `ogm/${c}`; sayac.cozumlu++; } else sayac.cozumGorselsiz++;
  }
  const video = (r.qr || []).find((q) => q.t === 'soru' && /^https?:\/\//.test(q.u || ''))?.u || '';
  if (video) sayac.video++;
  const ad = kaynakAd[r.kay] || r.kay;
  const test = r.test || '';
  // OGM Soru Bankası test adı "Sınıf · Konu · Kazanım" biçimindedir; konu zaten ayrı sütunda olduğundan kaynakta tekrarlanmaz
  const parcalar = test.split(' · ');
  const testKisa = r.kay === 'sb' && parcalar.length === 3 ? `${parcalar[0]} · ${parcalar[2]}` : test;
  const kaynak = [ad, r.kit && !testKisa.toLocaleLowerCase('tr').includes(r.kit.toLocaleLowerCase('tr')) ? r.kit : '', testKisa].filter(Boolean).join(' · ').slice(0, 200);
  satirlar.push([
    r.id, r.sinav, r.ders, r.konu || '', '', kaynak, `ogm/${g}`, r.cev[0], 5, video.slice(0, 500), 'true', 'OGM', cozum,
  ].map(csvHucre).join(','));
  sayac.alinan++;
}

fs.mkdirSync(veri, { recursive: true });
fs.writeFileSync(path.join(veri, 'sorular-ogm.csv'), '﻿' + satirlar.join('\n') + '\n', 'utf8');
console.log(`Kart: ${kartlar.length} | alınan: ${sayac.alinan} (çözüm görselli ${sayac.cozumlu}, video bağlantılı ${sayac.video})`);
console.log(`Atlanan: ÖSYM çıkmış ${sayac.cikmis}, çok cevaplı/cevapsız ${sayac.cevapsiz}, görselsiz ${sayac.gorselsiz}; çözüm görseli bulunamayan ${sayac.cozumGorselsiz}`);

// Görseller: veri/resimler-pilot/ogm → icerik/data/ogm/img; eski veri/resimler bağlantılarına dokunulmaz.
const hedef = path.join(veri, 'resimler-pilot', 'ogm');
fs.mkdirSync(path.dirname(hedef), { recursive: true });
let bagVar = false;
try { fs.lstatSync(hedef); bagVar = true; } catch (e) { if (e.code !== 'ENOENT') throw e; }
if (bagVar) {
  if (!fs.existsSync(hedef)) throw new Error(`Görsel bağlantısı bozuk: ${hedef}`);
  console.log(`Görsel klasörü zaten var: ${hedef}`);
} else if (kopyala) {
  console.log('Görseller kopyalanıyor (birkaç dakika sürebilir)...');
  fs.cpSync(path.join(ogm, 'img'), hedef, { recursive: true });
  console.log('Kopyalandı.');
} else {
  fs.symlinkSync(path.join(ogm, 'img'), hedef, 'junction');
  console.log(`Klasör bağlantısı oluşturuldu: ${hedef} → ${path.join(ogm, 'img')}`);
}
console.log(`CSV: ${path.join(veri, 'sorular-ogm.csv')}`);

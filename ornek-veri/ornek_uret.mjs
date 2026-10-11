// Örnek veri üretici: icerik/data/ogmck/sorular.js içinden ~50 soru seçer,
// görselleri resimler/ altına kopyalar ve sorular.csv dosyasını yazar.
// Kullanım:  node ornek_uret.mjs          → ~50 soruluk örnek veri (ornek-veri/, depoya girer)
//            node ornek_uret.mjs --tum    → eldeki TÜM tek cevaplı çıkmış sorular (veri/sorular-tum.csv + veri/resimler/, depo dışı: .gitignore)
// Bu betik yalnızca kaynak soru verisinin bulunduğu çalışma alanında çalışır (icerik/data/ogmck gerekir);
// üretilmiş çıktılar (sorular.csv ve resimler/) depoda hazır gelir, normal kullanımda çalıştırmak gerekmez.
// Not: sorularda zorluk alanı yoktur (zorluk yalnız kullanıcı oyu olarak toplanır).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const burasi = path.dirname(fileURLToPath(import.meta.url));
const kok = path.resolve(burasi, '..', '..');
const veriKlasoru = path.join(kok, 'icerik', 'data', 'ogmck');
const js = fs.readFileSync(path.join(veriKlasoru, 'sorular.js'), 'utf8');
const veri = JSON.parse(js.slice(js.indexOf('{'), js.lastIndexOf('}') + 1));

// ders -> kaç soru
const istek = {
  'TYT|Türkçe': 6, 'TYT|Matematik': 6, 'TYT|Fizik': 3, 'TYT|Kimya': 3, 'TYT|Biyoloji': 3,
  'TYT|Tarih': 2, 'TYT|Coğrafya': 2, 'TYT|Felsefe': 2, 'TYT|Din Kültürü': 2,
  'AYT|Matematik': 6, 'AYT|Fizik': 3, 'AYT|Kimya': 3, 'AYT|Biyoloji': 3,
  'AYT|Türk Dili ve Edebiyatı': 4, 'AYT|Tarih-1': 2,
};
const tum = process.argv.includes('--tum');
const uygulama = path.resolve(burasi, '..');
const hedefKlasor = tum ? path.join(uygulama, 'veri') : burasi;
const secilen = [];
if (tum) {
  // Çok cevaplı (ortak parçalı) kayıtlar tek cevaplı modele uymaz; atlanır
  secilen.push(...veri.sorular.filter(x => x.c?.length === 1 && /^[A-E]$/.test(x.c[0]) && x.g));
  console.log(`Atlanan (çok cevaplı/geçersiz): ${veri.sorular.length - secilen.length}`);
}
for (const [anahtar, adet] of tum ? [] : Object.entries(istek)) {
  const [sinav, ders] = anahtar.split('|');
  const aday = veri.sorular.filter(x => x.s === sinav && x.d === ders && x.c?.length === 1 && !x.a && x.g);
  const adim = Math.max(1, Math.floor(aday.length / adet));
  for (let i = 0; i < adet; i++) secilen.push(aday[Math.min(i * adim, aday.length - 1)]);
}

const csvHucre = (d) => {
  const s = String(d ?? '');
  return /[",;\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
const baslik = ['code', 'exam_type', 'subject', 'topic', 'year', 'source', 'image', 'correct_answer', 'choice_count', 'solution_url', 'active'];
const satirlar = [baslik.join(',')];
secilen.forEach((x) => {
  const gorsel = x.g.replace(/^img\//, '');           // örn. TYT/turkce/TYT-0001.webp
  const hedef = path.join(hedefKlasor, 'resimler', gorsel);
  fs.mkdirSync(path.dirname(hedef), { recursive: true });
  fs.copyFileSync(path.join(veriKlasoru, x.g), hedef);
  satirlar.push([
    x.i, x.s, x.d, (x.a ? `${x.k} – ${x.a}` : x.k), x.y, `OGM YKS Çıkmış Soru Kitapçığı ${x.y} ${x.s}`,
    gorsel, x.c[0], 5, x.q?.[0]?.u ?? '', 'true',
  ].map(csvHucre).join(','));
});
fs.mkdirSync(hedefKlasor, { recursive: true });
fs.writeFileSync(path.join(hedefKlasor, tum ? 'sorular-tum.csv' : 'sorular.csv'), '\ufeff' + satirlar.join('\n') + '\n', 'utf8');
console.log(`${secilen.length} soru yazıldı.`);

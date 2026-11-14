// İki aşamalı bağımsız denetim: ilk paket cevap/gerekçe içermez; ikinci dosya karşılaştırma içindir.
// Kullanım: node scripts/konu/denetim_paketi.mjs [çıktı-dizini]
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import paket from '../../frontend/src/learn/konu/paketler/fizik-hareket.v2.js';
import araclar from '../../frontend/src/learn/konu/paketler/arac-kutusu-fizik.js';

const hash = s => createHash('sha256').update(s).digest('hex');
const gizli = new Set(['id', 'dogru', 'neden', 'hatali', 'cevap', 'arka', 'aciklama', 'sonuc', 'kontrol', 'ciz', 'asamalar', 'isaret', 'ders']);
const temizle = o => Array.isArray(o) ? o.map(temizle) : o && typeof o === 'object'
  ? Object.fromEntries(Object.entries(o).filter(([k]) => !gizli.has(k)).map(([k, v]) => [k, temizle(v)])) : o;

export function denetimPaketi(icerik) {
  const sorular = [], anahtar = [], gorulen = new Map();
  const kaydet = (kok, cozum, yol) => {
    const key = hash(JSON.stringify(kok));
    if (gorulen.has(key)) { anahtar[gorulen.get(key)].yerler.push(yol); return; }
    const i = sorular.length, id = `D${String(i + 1).padStart(3, '0')}`;
    gorulen.set(key, i);
    sorular.push({ id, ...kok });
    anahtar.push({ id, yerler: [yol], beklenen: cozum });
  };
  const tara = (o, yol = '$') => {
    if (!o || typeof o !== 'object') return;
    if (o.secenekler && typeof o.soru === 'string') {
      // Kaynakta ilk doğru veya '-d' kimliği kullanılmış olabilir: ikisini de kör paketten kaldır.
      const opts = o.secenekler.map((s, i) => ({ original: i, deger: temizle(s) }))
        .sort((a, b) => hash(`${o.soru}:${JSON.stringify(a.deger)}`).localeCompare(hash(`${o.soru}:${JSON.stringify(b.deger)}`)));
      kaydet({ tur: 'secim', soru: o.soru, ...(o.verilen ? { verilen: temizle(o.verilen) } : {}),
        ...(o.kod ? { kaynakKodu: o.kod, kaynakGorseliGerekli: true } : {}),
        secenekler: opts.map((s, i) => ({ harf: String.fromCharCode(65 + i), ...s.deger })) },
      opts.flatMap((s, i) => o.secenekler[s.original].dogru ? [String.fromCharCode(65 + i)] : []), yol);
    } else if (o.tur === 'hata') {
      kaydet({ tur: 'hata', soru: o.soru, adimlar: o.adimlar.map(a => ({ metin: a.metin })) },
        o.adimlar.flatMap((a, i) => a.hatali ? [i + 1] : []), yol);
    } else if (o.tur === 'yargi') {
      kaydet({ tur: 'yargi', soru: o.kok || o.soru, yargilar: o.yargilar.map(y => y.metin) }, o.yargilar.map(y => y.dogru), yol);
    } else if (o.tur === 'sinifla') {
      kaydet({ tur: 'sinifla', soru: o.soru, kutular: o.kutular, ogeler: o.ogeler.map(g => g.metin) }, o.ogeler.map(g => g.kutular), yol);
    } else if (o.tur === 'ceviri' && o.bicim === 'hata') {
      kaydet({ tur: 'ceviri-hata', soru: o.soru, verilen: temizle(o.verilen), cumleler: o.cumleler.map(c => c.metin) },
        o.cumleler.flatMap((c, i) => !c.dogru ? [i + 1] : []), yol);
    } else if (o.tur === 'ornek') {
      kaydet({ tur: 'acik', soru: o.soru }, o.adimlar, yol);
    } else if (o.tur === 'cikmis') {
      kaydet({ tur: 'kaynak', kaynakKodu: o.kod, kaynakGorseliGerekli: true }, o.adimlar, yol);
    }
    for (const [k, v] of Object.entries(o)) if (!['secenekler', 'adimlar', 'yargilar', 'cumleler'].includes(k)) tara(v, `${yol}.${k}`);
  };
  tara(icerik);
  return { kor: { talimat: 'Cevap anahtarı ve gerekçeleri görmeden çöz. Her id için cevap, kısa bağımsız hesap/ilke, belirsizlik ve eksik kaynak belirt. Görseli bulunmayan gerçek soruya cevap uydurma. Bu aşamada kod, paket veya karşılaştırma dosyasını okuma.', sorular }, karsilastirma: anahtar };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = resolve(process.argv[2] || join(tmpdir(), 'ivme-1604-denetim'));
  const { kor, karsilastirma } = denetimPaketi({ paket, araclar });
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const blindText = JSON.stringify(kor, null, 2) + '\n';
  await mkdir(out, { recursive: true });
  await writeFile(join(out, '01-kor-sorular.json'), blindText);
  await writeFile(join(out, '02-karsilastirma.json'), JSON.stringify({ commit, sorular: karsilastirma }, null, 2) + '\n');
  await writeFile(join(out, 'manifest.json'), JSON.stringify({ commit, korSha256: hash(blindText), soruSayisi: kor.sorular.length, durum: 'HAZIR_DENETLENMEDI' }, null, 2) + '\n');
  console.log(JSON.stringify({ out, commit, soruSayisi: kor.sorular.length, korSha256: hash(blindText), durum: 'HAZIR_DENETLENMEDI' }));
}

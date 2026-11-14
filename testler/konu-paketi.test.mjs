// Konu paketi v1 yapı ve doğruluk denetimi (model konu: fizik-hareket).
// Yapı kuralları docs/urun/ogretim-standardi.md "Konu paketi standardı" bölümündedir. Sayısal cevaplar burada
// paketten bağımsız yeniden hesaplanır; gerçek soru kodları banka CSV'siyle karşılaştırılır.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import paket from '../frontend/src/learn/konu/paketler/fizik-hareket.js';

const oku = (yol) => fs.readFileSync(new URL(yol, import.meta.url), 'utf8');
const sorular = JSON.parse(oku('../frontend/src/learn/konu/paketler/fizik-hareket.sorular.json'));
const tipKimlikleri = new Set(paket.tipler.map((t) => t.id));
const bloklar = paket.duraklar.flatMap((d) => d.bloklar.map((b) => ({ ...b, durak: d.id })));
const tekDogru = (secenekler, yer) => {
  assert.equal(secenekler.filter((s) => s.dogru).length, 1, `${yer}: tam bir doğru seçenek olmalı`);
  for (const s of secenekler) assert.ok(s.neden?.length >= 25, `${yer}: her seçeneğin kendine özel açıklaması olmalı (${s.metin})`);
  assert.equal(new Set(secenekler.map((s) => s.metin)).size, secenekler.length, `${yer}: seçenekler tekil olmalı`);
};

test('kimlik, kaynak ve tip alanları tamdır', () => {
  assert.match(paket.id, /^[a-z-]+$/);
  assert.equal(paket.onay, 'OGRETMEN_BEKLIYOR');
  assert.ok(paket.kaynaklar.length >= 1 && paket.kaynaklar.every((k) => k.ad && k.sayfa >= 1 && k.gorsel));
  for (const k of paket.kaynaklar) assert.ok(fs.existsSync(new URL(`../frontend/public${k.gorsel}`, import.meta.url)), `kaynak görseli yok: ${k.gorsel}`);
  for (const t of paket.tipler) {
    for (const alan of ['ad', 'ilkHamle', 'kural', 'kosul', 'tuzak']) assert.ok(t[alan]?.length > 10, `${t.id}.${alan}`);
    assert.ok(t.gor.length >= 1 && t.sorular.length >= 4, `${t.id}: tanı işareti ve en az dört gerçek soru`);
  }
  assert.equal(tipKimlikleri.size, paket.tipler.length);
});

test('her durak standart akışı taşır', () => {
  const kaynaklar = new Set(paket.kaynaklar.map((k) => k.id));
  for (const d of paket.duraklar) {
    const turler = d.bloklar.map((b) => b.tur);
    for (const zorunlu of ['neden', 'model', 'fikir', 'ornek', 'puf', 'tipler', 'sina']) assert.ok(turler.includes(zorunlu), `${d.id}: ${zorunlu} bloğu eksik`);
    assert.ok(turler.indexOf('neden') < turler.indexOf('fikir') && turler.indexOf('fikir') < turler.indexOf('ornek') && turler.indexOf('ornek') < turler.indexOf('puf'), `${d.id}: sıra neden → fikir → örnek → püf`);
    assert.equal(turler.at(-1), 'sina', `${d.id}: durak geri çağırma ile biter`);
    assert.ok(d.tipler.length >= 1 && d.tipler.every((t) => tipKimlikleri.has(t)), `${d.id}: tipler`);
    assert.ok(d.kaynak.length >= 1 && d.kaynak.every((k) => kaynaklar.has(k)), `${d.id}: kaynak sayfası`);
  }
  const kullanilan = new Set(paket.duraklar.flatMap((d) => d.tipler));
  assert.deepEqual([...tipKimlikleri].filter((t) => !kullanilan.has(t)), [], 'her soru tipi bir durakta öğretilir');
});

test('bloklar: gerekçe, koşul ve yanlışa özel geri bildirim', () => {
  for (const b of bloklar) {
    const yer = `${b.durak}/${b.tur}`;
    if (b.tur === 'neden') tekDogru(b.tahmin.secenekler, yer);
    if (b.tur === 'ornek') {
      assert.ok(b.adimlar.length >= 3 && b.adimlar.every((a) => a.ne && a.neden?.length >= 20), `${yer}: her adımda ne ve neden`);
      assert.ok(b.kontrol?.length >= 20, `${yer}: sonucu kontrol etme yolu`);
      assert.ok((b.gizli ?? 0) < b.adimlar.length, `${yer}: gizli adım sayısı`);
    }
    if (b.tur === 'puf') for (const alan of ['kural', 'kosul', 'tuzak', 'sinav']) assert.ok(b[alan]?.length >= 20, `${yer}.${alan}`);
    if (b.tur === 'cikmis') assert.ok(b.isaret && b.sonuc && b.ders && b.adimlar.every((a) => a.ne && a.neden), yer);
    if (b.tur === 'tani') tekDogru(b.secenekler, yer);
    if (b.tur === 'sina') {
      assert.ok(b.ogeler.length >= 2 && new Set(b.ogeler.map((o) => o.tur)).size >= 2, `${yer}: en az iki farklı biçimde sınama`);
      for (const o of b.ogeler) {
        if (o.tur === 'secim') tekDogru(o.secenekler, yer);
        if (o.tur === 'yargi') assert.ok(o.yargilar.length === 3 && o.yargilar.every((y) => typeof y.dogru === 'boolean' && y.neden?.length >= 20) && new Set(o.yargilar.map((y) => y.dogru)).size === 2, `${yer}: üç yargı, karışık doğruluk, her birine gerekçe`);
        if (o.tur === 'hata') assert.ok(o.adimlar.filter((a) => a.hatali).length === 1 && o.adimlar.find((a) => a.hatali).neden?.length >= 30, `${yer}: tek hatalı adım ve nedeni`);
      }
    }
  }
  assert.ok(bloklar.filter((b) => b.tur === 'ornek' && b.gizli > 0).length >= 4, 'azalan yardım: en az dört örnekte son adım öğrenciye bırakılır');
});

test('karışık tur her soruda tipi tanıtır ve tipleri karıştırır', () => {
  assert.ok(paket.karma.length >= 6);
  for (const [i, k] of paket.karma.entries()) { assert.ok(tipKimlikleri.has(k.tip), `karma ${i}`); tekDogru(k.secenekler, `karma ${i}`); }
  assert.ok(new Set(paket.karma.map((k) => k.tip)).size >= 5, 'en az beş farklı tip');
  for (let i = 1; i < paket.karma.length; i += 1) assert.notEqual(paket.karma[i].tip, paket.karma[i - 1].tip, 'ardışık iki soru aynı tipte olmaz');
});

test('gerçek soru kodları bankada vardır; çözümü gösterilen soru bağımsız listede yoktur', () => {
  const rehberli = bloklar.filter((b) => b.tur === 'cikmis' || b.tur === 'tani').map((b) => b.kod);
  assert.equal(new Set(rehberli).size, rehberli.length, 'aynı gerçek soru iki kez işlenmez');
  const bagimsiz = paket.tipler.flatMap((t) => t.sorular);
  assert.equal(new Set(bagimsiz).size, bagimsiz.length, 'bir soru yalnız bir tipin listesindedir');
  for (const kod of [...rehberli, ...bagimsiz, ...paket.tipler.flatMap((t) => t.osym)]) assert.ok(sorular[kod]?.id, `bankada yok: ${kod}`);
  assert.deepEqual(bagimsiz.filter((k) => rehberli.includes(k)), []);
  assert.ok(!JSON.stringify(sorular).includes('correct'), 'soru bağı cevap anahtarı taşımaz');
  const csvYolu = new URL('../veri/sorular-tum.csv', import.meta.url);
  if (fs.existsSync(csvYolu)) { // çözümü yazılan ÖSYM sorularının resmî anahtarı, yazılan çözümün vardığı şıktır
    const satirlar = fs.readFileSync(csvYolu, 'utf8').split('\n').map((s) => s.split(',')).filter((s) => rehberli.includes(s[0]));
    const anahtar = Object.fromEntries(satirlar.map((s) => [s[0], s.find((h) => /^[A-E]$/.test(h))]));
    assert.deepEqual(anahtar, { 'TYT-0909': 'C', 'TYT-0910': 'B', 'TYT-0911': 'D', 'TYT-0912': 'A', 'TYT-0913': 'B' });
  }
});

test('sayısal cevaplar bağımsız hesapla aynıdır', () => {
  const havuz = [...bloklar.filter((b) => b.tur === 'sina').flatMap((b) => b.ogeler), ...paket.karma].filter((o) => o.secenekler);
  const dogruMetin = (parca) => {
    const oge = havuz.find((o) => o.soru.includes(parca));
    assert.ok(oge, `soru bulunamadı: ${parca}`);
    return oge.secenekler.find((s) => s.dogru).metin;
  };
  assert.equal(dogruMetin('yarım tur'), `Yer değiştirme ${2 * 10} m, yol ${3 * 10} m`);
  assert.equal(dogruMetin('doğuya 40 km, sonra güneye 30 km gidiyor ve yolculuk 2 saat'), `${Math.hypot(40, 30) / 2} ve ${(40 + 30) / 2}`);
  assert.ok(Math.abs(Number(dogruMetin('ilk yarısını 60 km/h')) - 2 / (1 / 60 + 1 / 20)) < 1e-9, 'eşit yollarda harmonik ortalama');
  assert.equal(Number(dogruMetin('150 m uzunluğundaki bir tren')), (150 + 100) / (150 / 15));
  assert.equal(Number(dogruMetin('(0–3) s aralığında hız 20 m/s')), 20 * 3 + 30 * 3);
  assert.equal(Number(dogruMetin('5 saniyede hızını 100 m/s')), 100 / 5);
  assert.ok(dogruMetin('düzgün artan bir doğrudur').startsWith(`${(6 - 2) / 2} m/s²`));
  assert.equal(dogruMetin('Bir yüzücü 50 m'), `${0 / 100} ve ${100 / (40 + 60)}`);
  const alanlar = [2, -1, 1];
  assert.equal(Number(dogruMetin('hızı (0–t) aralığında 2v')), alanlar.reduce((t, a) => t + Math.abs(a), 0) / Math.abs(alanlar.reduce((t, a) => t + a, 0)));
  assert.equal((50 / 20) % 1, 0.5, '50. saniye yarım tur fazlasıdır');
  assert.equal(Number(dogruMetin('Yarıçapı 20 m olan çembersel pistte')), 2 * 20);
  const konumlar = [-20, 0, 10, 10, 0];
  const yol = konumlar.slice(1).reduce((t, x, i) => t + Math.abs(x - konumlar[i]), 0);
  assert.equal(Number(dogruMetin('(5–7) s arasında +10 m')), yol / Math.abs(konumlar.at(-1) - konumlar[0]));
  assert.ok(dogruMetin('Ortalama ivmesi ve süratindeki değişim').startsWith(`+${(-3 - -6) / 3} m/s², sürat azalır`));
  const ornek = (parca) => bloklar.find((b) => b.tur === 'ornek' && b.soru.includes(parca)).adimlar.map((a) => a.ne).join(' ');
  assert.ok(ornek('30 km/h süratle gidip').includes(String(300 / (150 / 30 + 150 / 50)).replace('.', ',')));
  assert.ok(ornek('+5 m').includes(`${Math.abs(5 - -3) + Math.abs(-1 - 5)} m`) && ornek('+5 m').includes('+2 m'));
  assert.ok(ornek('Aralarında 300 m').includes(`${300 / (10 + 5)} s`));
  assert.ok(ornek('(4–6) s aralığında +15').includes('90 m') && ornek('(4–6) s aralığında +15').includes('+10 m'));
  assert.ok(ornek('sabit ivmesi +3').includes(`${-6 + 3 * 1} m/s`.replace('-', '−')) && ornek('sabit ivmesi +3').includes('+3 m/s'));
});

test('tekrar kartları ve video bağlantıları', () => {
  assert.ok(paket.tekrar.length >= 6 && paket.tekrar.every((k) => k.soru.endsWith('?') && k.cevap.length >= 20));
  assert.ok(paket.videolar.every((v) => /^https:\/\//.test(v.adres)), 'video yerel dosya değil, bağlantıdır');
});

// Konu paketi blok kataloğu (v1). Her blok yalnız veriden çizilir; konuya özel JSX buraya yazılmaz.
// Yeni blok türü ancak en az üç konuda kullanılacaksa eklenir (docs/urun/ogretim-standardi.md).
import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import QuestionImage from '../../components/QuestionImage.jsx';
import { Markdown } from '../math.jsx';
import { secenekSirasi } from './v2Kurallari.js';

// Etkileşimli model motorları: paket yalnız motor adını ve parametresini söyler.
const MOTORLAR = {
  'hareket-lab': lazy(() => import('../physics/experiments.jsx')),
};

const dogruIndex = (secenekler) => secenekler.findIndex((s) => s.dogru);

/** Tek doğru cevaplı soru: her şıkkın kendi açıklaması vardır; yanlışta yeniden denenir. */
export function Secim({ soru, secenekler: source, baslik, onSonuc }) {
  const secenekler = useMemo(() => secenekSirasi(source, soru), [source, soru]);
  const [secili, setSecili] = useState(null);
  const [denemeler, setDenemeler] = useState(0);
  const dogru = dogruIndex(secenekler);
  const sec = (i) => {
    if (secili === dogru) return;
    setSecili(i);
    setDenemeler((d) => d + 1);
    if (i === dogru) onSonuc?.(denemeler === 0);
  };
  return <div className="kp-soru">
    {baslik && <p className="kp-etiket">{baslik}</p>}
    <div className="kp-kok"><Markdown text={soru} /></div>
    <div className="kp-secenekler" role="group" aria-label="Seçenekler">
      {secenekler.map((s, i) => <button key={s.metin} type="button" className="kp-secenek" aria-pressed={secili === i}
        data-durum={secili === i ? (i === dogru ? 'dogru' : 'yanlis') : undefined} onClick={() => sec(i)}>
        <span className="kp-harf">{'ABCDE'[i]}</span><span>{s.metin}</span></button>)}
    </div>
    {secili !== null && <div className={`kp-geri ${secili === dogru ? 'kp-dogru' : 'kp-yeniden'}`} role="status">
      <strong>{secili === dogru ? (denemeler === 1 ? 'Doğru. ' : 'Şimdi oldu. ') : 'Bir noktayı yeniden düşün. '}</strong>{secenekler[secili].neden}
    </div>}
  </div>;
}

/** Öncüllü yargı sorusu (sınavdaki I–II–III biçimi): her yargı ayrı ayrı doğru/yanlış diye işaretlenir. */
export function Yargi({ kok, yargilar, onSonuc }) {
  const [isaret, setIsaret] = useState({});
  const [kontrol, setKontrol] = useState(false);
  const hepsi = yargilar.every((_, i) => isaret[i] !== undefined);
  const dogruSayisi = yargilar.filter((y, i) => isaret[i] === y.dogru).length;
  const bitir = () => { setKontrol(true); onSonuc?.(dogruSayisi === yargilar.length); };
  return <div className="kp-soru">
    <p className="kp-etiket">Yargıları tek tek değerlendir</p>
    <div className="kp-kok"><Markdown text={kok} /></div>
    <ol className="kp-yargilar">
      {yargilar.map((y, i) => <li key={y.metin} data-durum={kontrol ? (isaret[i] === y.dogru ? 'dogru' : 'yanlis') : undefined}>
        <span className="kp-yargi-metin"><b>{['I', 'II', 'III', 'IV'][i]}.</b> {y.metin}</span>
        <span className="kp-dy" role="group" aria-label={`${i + 1}. yargı`}>
          {[[true, 'Doğru'], [false, 'Yanlış']].map(([deger, ad]) => <button key={ad} type="button" className="kp-dy-dugme" disabled={kontrol}
            aria-pressed={isaret[i] === deger} onClick={() => setIsaret((s) => ({ ...s, [i]: deger }))}>{ad}</button>)}
        </span>
        {kontrol && <p className="kp-yargi-neden"><strong>{y.dogru ? 'Doğru.' : 'Yanlış.'}</strong> {y.neden}</p>}
      </li>)}
    </ol>
    {!kontrol && <button type="button" className="btn btn-primary" disabled={!hepsi} onClick={bitir}>Kontrol et</button>}
    {kontrol && <p className={`kp-geri ${dogruSayisi === yargilar.length ? 'kp-dogru' : 'kp-yeniden'}`} role="status">
      {dogruSayisi === yargilar.length ? 'Üçünü de doğru değerlendirdin.' : `${yargilar.length} yargının ${dogruSayisi} tanesini doğru değerlendirdin. Kaçırdığın yargının gerekçesini oku: sınavda şıkkı o belirler.`}</p>}
  </div>;
}

/** Hatalı çözüm: öğrenci yanlış adımı bulur. Başkasının hatasını görmek kendi hatasını yakalamayı öğretir. */
export function HataBul({ soru, adimlar, onSonuc }) {
  const [secili, setSecili] = useState(null);
  const [denemeler, setDenemeler] = useState(0);
  const hatali = adimlar.findIndex((a) => a.hatali);
  const sec = (i) => { if (secili === hatali) return; setSecili(i); setDenemeler((d) => d + 1); if (i === hatali) onSonuc?.(denemeler === 0); };
  return <div className="kp-soru">
    <p className="kp-etiket">Hatayı bul</p>
    <div className="kp-kok"><Markdown text={soru} /></div>
    <ol className="kp-hata">{adimlar.map((a, i) => <li key={a.metin}><button type="button" className="kp-secenek" aria-pressed={secili === i}
      data-durum={secili === i ? (i === hatali ? 'dogru' : 'yanlis') : undefined} onClick={() => sec(i)}><span className="kp-harf">{i + 1}</span><span>{a.metin}</span></button></li>)}</ol>
    {secili !== null && <div className={`kp-geri ${secili === hatali ? 'kp-dogru' : 'kp-yeniden'}`} role="status">
      {secili === hatali ? <><strong>Hata burada. </strong>{adimlar[hatali].neden}</> : 'Bu adım doğru. Hangi adımda tanım yanlış kullanılmış?'}</div>}
  </div>;
}

const OGE = { secim: Secim, yargi: Yargi, hata: HataBul };

export function Neden({ blok, onSonuc }) {
  return <section className="kp-blok kp-neden">
    <p className="kp-etiket">Neden önemli?</p>
    <div className="kp-hikaye"><Markdown text={blok.metin} /></div>
    {blok.tahmin && <Secim baslik="Önce tahmin et" soru={blok.tahmin.soru} secenekler={blok.tahmin.secenekler} onSonuc={onSonuc} />}
  </section>;
}

export function Model({ blok, motor }) {
  const Motor = MOTORLAR[motor];
  if (!Motor) return null;
  return <section className="kp-blok kp-model">
    <p className="kp-etiket">Gör ve dene</p>
    <p className="kp-gorev"><strong>Görevin:</strong> {blok.gorev}</p>
    <Suspense fallback={<p className="muted">Laboratuvar yükleniyor…</p>}><Motor sectionId={blok.deney} /></Suspense>
  </section>;
}

export function Fikir({ blok }) {
  return <section className="kp-blok kp-fikir">
    <p className="kp-etiket">Temel fikir</p>
    <h3>{blok.baslik}</h3>
    <Markdown text={blok.metin} />
    {blok.derin && <details className="kp-derin"><summary>Bir adım derine in</summary><Markdown text={blok.derin} /></details>}
  </section>;
}

/** Çözümlü örnek: adımlar sırayla açılır; son `gizli` adımı öğrenci önce kendi yazar (azalan yardım). */
export function Ornek({ blok, onSonuc }) {
  const [acik, setAcik] = useState(0);
  const [taslak, setTaslak] = useState('');
  const toplam = blok.adimlar.length;
  const ogrenciAdimi = acik >= toplam - (blok.gizli ?? 0) && acik < toplam;
  return <section className="kp-blok kp-ornek">
    <p className="kp-etiket">Birlikte çöz</p>
    <div className="kp-kok"><Markdown text={blok.soru} /></div>
    <ol className="kp-adimlar">{blok.adimlar.slice(0, acik).map((a, i) => <li key={a.ne}>
      <span className="kp-adim-no">{i + 1}</span><div><p className="kp-ne">{a.ne}</p><p className="kp-neden-satir"><strong>Neden?</strong> {a.neden}</p></div></li>)}</ol>
    {acik < toplam && <div className="kp-adim-eylem">
      {ogrenciAdimi && <label className="kp-sen">Sıra sende: {acik + 1}. adımı önce kendin yaz.
        <textarea rows={2} value={taslak} onChange={(e) => setTaslak(e.target.value)} placeholder="Bu adımda ne yaparsın ve neden?" /></label>}
      <button type="button" className="btn btn-primary" disabled={ogrenciAdimi && !taslak.trim()} onClick={() => { setAcik((a) => a + 1); setTaslak(''); if (acik + 1 === toplam) onSonuc?.(true); }}>
        {acik === 0 ? 'İlk adımı göster' : ogrenciAdimi ? 'Benimkini karşılaştır' : `Sonraki adım (${acik}/${toplam})`}</button>
    </div>}
    {acik === toplam && blok.kontrol && <p className="kp-kontrol"><strong>Nasıl kontrol ederim?</strong> {blok.kontrol}</p>}
  </section>;
}

export function Puf({ blok }) {
  const hucreler = [['Püf noktası', blok.kural, 'kural'], ['Hangi koşulda geçerli?', blok.kosul, 'kosul'], ['Nerede yanıltır?', blok.tuzak, 'tuzak'], ['Sınavda nasıl gelir?', blok.sinav, 'sinav']];
  return <section className="kp-blok kp-puf">
    {hucreler.filter(([, metin]) => metin).map(([ad, metin, tur]) => <div key={tur} className={`kp-puf-hucre kp-puf-${tur}`}><h4>{ad}</h4><Markdown text={metin} /></div>)}
  </section>;
}

/** Soru tipi kartı: soruda ne görürsen → ilk hamle → kural ve koşulu → tuzak. */
export function TipKarti({ tip, sorular, onGercek }) {
  const yillar = tip.osym.map((kod) => sorular[kod]?.yil).filter(Boolean);
  return <article className="kp-tip">
    <header><h4>{tip.ad}</h4><p className="kp-tip-sayi">Bankada yaklaşık {tip.banka} soru{yillar.length > 0 && <> · ÖSYM TYT: <b>{yillar.join(', ')}</b></>}</p></header>
    <dl>
      <dt>Soruda bunu görürsen</dt><dd><ul>{tip.gor.map((g) => <li key={g}>{g}</li>)}</ul></dd>
      <dt>İlk hamlen</dt><dd className="kp-tip-hamle">{tip.ilkHamle}</dd>
      <dt>Kural</dt><dd><Markdown text={tip.kural} /></dd>
      <dt>Koşul</dt><dd>{tip.kosul}</dd>
      <dt>Tuzak</dt><dd className="kp-tip-tuzak">{tip.tuzak}</dd>
    </dl>
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => onGercek(tip.id)}>Bu tipten gerçek sorular ({tip.sorular.length}) →</button>
  </article>;
}

function SoruGorseli({ kod, sorular }) {
  const soru = sorular[kod];
  if (!soru) return <p className="field-error">Soru bulunamadı: {kod}</p>;
  return <figure className="kp-gercek-gorsel">
    <figcaption>{soru.yil ? `${soru.yil} ${soru.sinav} · ÖSYM` : soru.kaynak} · <Link to={`/soru/${encodeURIComponent(kod)}`} target="_blank" rel="noreferrer">Soru sayfası ↗</Link></figcaption>
    <QuestionImage id={soru.id} readingWidth alt={`${soru.yil ?? ''} ${soru.sinav} sorusu ${kod}`} />
  </figure>;
}

/** Gerçek sınav sorusu, adım adım: önce işareti fark et, sonra çözümü sırayla aç. */
export function Cikmis({ blok, sorular }) {
  const [acik, setAcik] = useState(0);
  const bitti = acik === blok.adimlar.length;
  return <section className="kp-blok kp-cikmis">
    <p className="kp-etiket">Gerçek sınav sorusu · birlikte çözelim</p>
    <h3>{blok.baslik}</h3>
    <SoruGorseli kod={blok.kod} sorular={sorular} />
    <p className="small muted">Çözümü açmadan önce ilk hamleni kendin düşün. Bu soru çözümlü örnektir; bağımsız soru setlerine girmez.</p>
    {acik > 0 && <p className="kp-isaret"><strong>Soruda neyi fark ediyoruz?</strong> {blok.isaret}</p>}
    <ol className="kp-adimlar">{blok.adimlar.slice(0, acik).map((a, i) => <li key={a.ne}>
      <span className="kp-adim-no">{i + 1}</span><div><div className="kp-ne"><Markdown text={a.ne} /></div><p className="kp-neden-satir"><strong>Neden?</strong> {a.neden}</p></div></li>)}</ol>
    {!bitti && <button type="button" className="btn btn-primary" onClick={() => setAcik((a) => a + 1)}>{acik ? `Sonraki adım (${acik}/${blok.adimlar.length})` : 'Çözümü adım adım aç'}</button>}
    {bitti && <div className="kp-cikmis-son"><p><strong>Sonuç:</strong> {blok.sonuc}</p><div className="kp-ders"><strong>Bu sorudan alacağın ders:</strong> <Markdown text={blok.ders} /></div></div>}
  </section>;
}

/** İlk hamle antrenmanı: gerçek soruyu çözmeden, yalnız nasıl başlanacağına karar ver. */
export function Tani({ blok, sorular, onSonuc }) {
  return <section className="kp-blok kp-tani">
    <p className="kp-etiket">İlk hamle antrenmanı</p>
    <p className="small muted">Soruyu çözme. Yalnız nasıl başlayacağına karar ver: sınavda ilk on saniyede verdiğin karar budur.</p>
    <SoruGorseli kod={blok.kod} sorular={sorular} />
    <Secim soru={blok.soru} secenekler={blok.secenekler} onSonuc={onSonuc} />
  </section>;
}

export function Sina({ blok, onSonuc }) {
  return <section className="kp-blok kp-sina">
    <p className="kp-etiket">Kendini sına</p>
    <p className="small muted">Okumak öğrenmek değildir: bu soruları cevaplamadan durak tamamlanmış sayılmaz. Her yanlış şıkkın kendi açıklaması var.</p>
    {blok.ogeler.map((oge, i) => { const Oge = OGE[oge.tur]; return <Oge key={i} {...oge} onSonuc={(ilk) => onSonuc?.(i, ilk)} />; })}
  </section>;
}

/** Karışık tur ögesi: önce soru tipini tanı, sonra çöz. Tipler sırasız geldiği için yöntem seçmeyi çalıştırır. */
export function KarmaOge({ oge, tipler, sira, onSonuc }) {
  const [tipSecimi, setTipSecimi] = useState(null);
  const adaylar = tipAdaylari(oge.tip, tipler, sira);
  const tipDogru = tipSecimi === oge.tip;
  return <div className="kp-karma-oge">
    <p className="kp-etiket">Soru {sira + 1}</p>
    <div className="kp-kok"><Markdown text={oge.soru} /></div>
    <div className="kp-tip-sec"><p><strong>Önce karar ver:</strong> bu hangi soru tipi?</p>
      <div className="kp-secenekler">{adaylar.map((t) => <button key={t.id} type="button" className="kp-secenek" aria-pressed={tipSecimi === t.id} disabled={tipDogru}
        data-durum={tipSecimi === t.id ? (t.id === oge.tip ? 'dogru' : 'yanlis') : undefined} onClick={() => setTipSecimi(t.id)}><span>{t.ad}</span></button>)}</div>
      {tipSecimi && !tipDogru && <p className="kp-geri kp-yeniden" role="status">Soruda sorulan büyüklüğe ve verilen biçime (grafik mi, yol mu, iki araç mı) yeniden bak.</p>}
      {tipDogru && <p className="kp-geri kp-dogru" role="status"><strong>Tip doğru. İlk hamle:</strong> {tipler.find((t) => t.id === oge.tip).ilkHamle}</p>}
    </div>
    {tipDogru && <Secim soru="Şimdi çöz:" secenekler={oge.secenekler} onSonuc={onSonuc} />}
  </div>;
}

// Doğru tipin yanına iki çeldirici tip: her soru için sabit (sıraya bağlı) seçilir, yeniden çizimde değişmez.
export function tipAdaylari(tipId, tipler, sira) {
  const digerleri = tipler.filter((t) => t.id !== tipId);
  const secilen = [digerleri[(sira * 3 + 1) % digerleri.length], digerleri[(sira * 5 + 4) % digerleri.length]];
  const adaylar = [tipler.find((t) => t.id === tipId), ...new Set(secilen)];
  return adaylar.sort((a, b) => ((a.id.length * 7 + sira) % 5) - ((b.id.length * 7 + sira) % 5) || a.id.localeCompare(b.id));
}

export const BLOKLAR = { neden: Neden, model: Model, fikir: Fikir, ornek: Ornek, puf: Puf, cikmis: Cikmis, tani: Tani, sina: Sina };

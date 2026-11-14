// Konu sayfası (v1): bir konu paketini standart akışla çizer.
// Neden → Gör ve dene → Temel fikir → Birlikte çöz → Püf noktası → Soru tipleri → Kendini sına;
// sonunda karışık tur, gerçek sorular, tekrar kartları, video ve kaynak sayfaları.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth.jsx';
import { Loading } from '../../components/States.jsx';
import { usePageTitle } from '../../hooks.js';
import { Markdown } from '../math.jsx';
import { BASE } from '../ui.jsx';
import FigureZoom from '../lesson/FigureZoom.jsx';
import { BLOKLAR, KarmaOge, TipKarti } from './bloklar.jsx';
import { PAKETLER } from './paketler/index.js';
import '../physics/physics.css';
import '../lesson/learning-experience.css';
import './konu.css';

const SON_BOLUMLER = [['karma', 'Karışık tur'], ['gercek', 'Gerçek sorular'], ['tekrar', 'Tekrar ve kaynak']];

// İlerleme tarayıcıda, kullanıcıya özel anahtarla tutulur. Ustalık motoruna bağlanması 16.06 işidir.
function useIlerleme(paketId) {
  const { user } = useAuth();
  const anahtar = `ivme:konu-paketi:${paketId}:${user?.id ?? 'anon'}:v1`;
  const [durum, setDurum] = useState(() => { try { return JSON.parse(localStorage.getItem(anahtar) ?? '{}'); } catch { return {}; } });
  const yaz = useCallback((bolum, oge, ilkDenemede) => setDurum((onceki) => {
    if (onceki[bolum]?.[oge] !== undefined) return onceki;
    const sonraki = { ...onceki, [bolum]: { ...onceki[bolum], [oge]: ilkDenemede } };
    try { localStorage.setItem(anahtar, JSON.stringify(sonraki)); } catch { /* özel kipte kayıt olmayabilir */ }
    return sonraki;
  }), [anahtar]);
  return [durum, yaz];
}

// Bir duraktaki cevaplanabilir öge sayısı: tahmin + ilk hamle + kendini sına ögeleri.
export const olculenOgeSayisi = (durak) => durak.bloklar.reduce((n, b) => n + (b.tur === 'neden' && b.tahmin ? 1 : 0) + (b.tur === 'tani' ? 1 : 0) + (b.tur === 'sina' ? b.ogeler.length : 0), 0);

function Sinavda({ paket, sorular, git }) {
  const enCok = Math.max(...paket.tipler.map((t) => t.banka));
  return <section className="card kp-kart kp-sinavda">
    <p className="kp-etiket">Başlamadan: sınavda bu konu nasıl gelir?</p>
    <Markdown text={paket.sinavda.ozet} />
    <ul className="kp-tip-tablo" aria-label="Soru tiplerinin bankadaki ağırlığı ve ÖSYM'de sorulduğu yıllar">
      <li className="kp-tip-baslik" aria-hidden="true"><span>Soru tipi</span><span>Bankadaki ağırlığı</span><span>ÖSYM TYT</span></li>
      {[...paket.tipler].sort((a, b) => b.osym.length - a.osym.length || b.banka - a.banka).map((t) => <li key={t.id}>
        <strong>{t.ad}</strong>
        <span><span className="kp-cubuk" style={{ width: `${Math.round((t.banka / enCok) * 100)}%` }} aria-hidden="true" /><span className="kp-cubuk-sayi">yaklaşık {t.banka} soru</span></span>
        <span>{t.osym.length ? t.osym.map((k) => sorular[k]?.yil).join(', ') : '–'}</span></li>)}</ul>
    <div className="kp-bicim"><strong>Soru biçimi:</strong> <Markdown text={paket.sinavda.bicim} /></div>
    <p className="small muted">Sayılar bankadaki Hareket sorularının görselleri tek tek incelenerek çıkarıldı; tekrar eden kopyalar ayıklandı. ÖSYM sütunu 2018–2026 TYT sorularıdır.</p>
    <button type="button" className="btn btn-primary" onClick={() => git(paket.duraklar[0].id)}>İlk durağa başla →</button>
  </section>;
}

const ADIM_ADI = { neden: 'Neden önemli?', model: 'Gör ve dene', fikir: 'Temel fikir', ornek: 'Birlikte çöz', puf: 'Püf noktası', cikmis: 'Gerçek soru',
  tani: 'İlk hamle', tipler: 'Soru tipleri', sina: 'Kendini sına', kaynak: 'Kaynak' };

// Bir durak = sırayla açılan adımlar. Her adımda tek şey görünür; üstte 1 2 3… çubuğu ve geri/ileri okları vardır.
function Durak({ paket, durak, sira, sorular, motor, ilerleme, yaz, git, adim, adimGit }) {
  const tipler = paket.tipler.filter((t) => durak.tipler.includes(t.id));
  const cevaplanan = Object.keys(ilerleme[durak.id] ?? {}).length;
  const toplam = olculenOgeSayisi(durak);
  let sayac = 0;
  const adimlar = [...durak.bloklar.map((blok, i) => {
    const taban = sayac;
    if (blok.tur === 'neden' && blok.tahmin) sayac += 1;
    if (blok.tur === 'tani') sayac += 1;
    if (blok.tur === 'sina') sayac += blok.ogeler.length;
    return { id: `b${i}`, tur: blok.tur, blok, taban };
  }), { id: 'kaynak', tur: 'kaynak' }];
  const son = adimlar.length - 1;
  const simdi = Math.min(Math.max(adim, 0), son);
  const sonDurak = sira + 1 >= paket.duraklar.length;
  const geri = () => (simdi > 0 ? adimGit(simdi - 1) : sira > 0 ? git(paket.duraklar[sira - 1].id, null, 'son') : git('giris'));
  const ileri = () => (simdi < son ? adimGit(simdi + 1) : git(sonDurak ? 'karma' : paket.duraklar[sira + 1].id));
  const ileriAd = simdi < son ? `${ADIM_ADI[adimlar[simdi + 1].tur]} →` : sonDurak ? 'Karışık tura geç →' : 'Sonraki durak →';
  const gezin = (ust) => <div className={ust ? 'kp-adim-gezin kp-adim-ust' : 'kp-adim-gezin'}>
    <button type="button" className="btn btn-secondary" onClick={geri}>← Geri</button>
    <span className="kp-adim-sayac" aria-live="polite">Adım {simdi + 1} / {adimlar.length}</span>
    <button type="button" className="btn btn-primary" onClick={ileri}>{ust ? 'İleri →' : ileriAd}</button>
  </div>;
  return <section className="card kp-kart" key={durak.id}>
    <p className="kp-etiket">Durak {sira + 1} / {paket.duraklar.length} · {cevaplanan}/{toplam} soru cevaplandı</p>
    <h2 className="kp-durak-baslik" tabIndex={-1}>{durak.baslik}</h2>
    <nav className="kp-adim-cubuk" aria-label="Durak adımları">{adimlar.map((a, i) => <button key={a.id} type="button" aria-current={i === simdi ? 'step' : undefined}
      data-yapildi={i < simdi ? 'evet' : undefined} onClick={() => adimGit(i)} aria-label={`${i + 1}. adım: ${ADIM_ADI[a.tur]}`}>
      <b>{i < simdi ? '✓' : i + 1}</b><span>{ADIM_ADI[a.tur]}</span></button>)}</nav>
    {gezin(true)}
    <div className="kp-adim">
      {adimlar.map((a, i) => {
        const gorunur = i === simdi;
        if (a.tur === 'kaynak') return <section key={a.id} hidden={!gorunur} className="kp-blok kp-kaynak-adim">
          <p className="kp-etiket">Bu durağın kaynağı</p>
          {paket.kaynaklar.filter((k) => durak.kaynak.includes(k.id)).map((k) => <figure key={k.id}><figcaption>{k.ad} · PDF s. {k.sayfa}</figcaption>
            <FigureZoom label="Kaynak sayfasını büyüt"><img src={k.gorsel} alt={`${k.ad}, sayfa ${k.sayfa}`} /></FigureZoom>
            {gorunur && <img loading="lazy" src={k.gorsel} alt={`${k.ad}, sayfa ${k.sayfa}`} />}</figure>)}
          <p className="small muted">Deneyler, çözümlü örnekler ve kendini sınama soruları bu konu için hazırlanmıştır; öğretmen kontrolü bekliyor.</p></section>;
        if (a.tur === 'tipler') return <section key={a.id} hidden={!gorunur} className="kp-blok kp-tipler">
          <p className="kp-etiket">Bu fikir sınavda hangi kılıkla gelir?</p>
          <div className="kp-tip-izgara">{tipler.map((t) => <TipKarti key={t.id} tip={t} sorular={sorular} onGercek={(id) => git('gercek', id)} />)}</div></section>;
        const Blok = BLOKLAR[a.tur];
        if (!Blok || (a.tur === 'model' && !gorunur)) return null; // laboratuvar yalnız görünürken kurulur (boyut ölçümü)
        const sonuc = a.tur === 'sina' ? (j, ilk) => yaz(durak.id, a.taban + j, ilk) : (ilk) => yaz(durak.id, a.taban, ilk);
        return <div key={a.id} hidden={!gorunur}><Blok blok={a.blok} sorular={sorular} motor={motor} onSonuc={sonuc} /></div>;
      })}
    </div>
    {gezin(false)}
  </section>;
}

function Karma({ paket, ilerleme, yaz, git }) {
  const sonuc = ilerleme.karma ?? {};
  const cevaplanan = Object.keys(sonuc).length;
  return <section className="card kp-kart">
    <p className="kp-etiket">Karışık tur · {cevaplanan}/{paket.karma.length}</p>
    <h2 className="kp-durak-baslik" tabIndex={-1}>Tipler karışık gelince tanıyabiliyor musun?</h2>
    <p>Duraklarda soru tipini biliyordun. Sınavda bilmeyeceksin. Burada önce <strong>tipi tanı</strong>, sonra çöz.</p>
    {paket.karma.map((oge, i) => <KarmaOge key={i} oge={oge} sira={i} tipler={paket.tipler} onSonuc={(ilk) => yaz('karma', i, ilk)} />)}
    {cevaplanan === paket.karma.length && <p className="kp-geri kp-dogru" role="status">Karışık turu bitirdin: {Object.values(sonuc).filter(Boolean).length}/{paket.karma.length} soruyu ilk denemede çözdün. Şimdi gerçek sınav sorularına geç.</p>}
    <footer className="kp-gezin"><span /><button type="button" className="btn btn-primary" onClick={() => git('gercek')}>Gerçek sorulara geç →</button></footer>
  </section>;
}

function Gercek({ paket, sorular, tip }) {
  const cozulmus = new Set(paket.duraklar.flatMap((d) => d.bloklar).filter((b) => b.tur === 'cikmis' || b.tur === 'tani').map((b) => b.kod));
  const gosterilen = tip ? paket.tipler.filter((t) => t.id === tip) : paket.tipler;
  return <section className="card kp-kart">
    <p className="kp-etiket">Gerçek sorular</p>
    <h2 className="kp-durak-baslik" tabIndex={-1}>{tip ? gosterilen[0]?.ad : 'Tipe göre gerçek banka soruları'}</h2>
    <p>Her soru kendi sayfasında açılır; cevabını orada verirsin ve kaydın tutulur. Soruya başlamadan önce tip kartındaki <strong>ilk hamleyi</strong> kendine söyle.</p>
    {tip && <p><Link to="?bolum=gercek">Bütün tipleri göster</Link></p>}
    {gosterilen.map((t) => <div key={t.id} className="kp-gercek-tip">
      <h3>{t.ad}</h3><p className="kp-tip-hamle"><strong>İlk hamle:</strong> {t.ilkHamle}</p>
      <ul className="kp-kod-liste">
        {t.osym.map((kod) => <li key={kod}><Link to={`/soru/${encodeURIComponent(kod)}`} target="_blank" rel="noreferrer">{sorular[kod]?.yil} {sorular[kod]?.sinav} · ÖSYM ↗</Link>{cozulmus.has(kod) && <span className="kp-rozet">derste incelendi</span>}</li>)}
        {t.sorular.map((kod, i) => <li key={kod}><Link to={`/soru/${encodeURIComponent(kod)}`} target="_blank" rel="noreferrer">Soru {i + 1} ↗</Link><span className="small muted"> {sorular[kod]?.kaynak?.split(' · ')[0]}</span></li>)}
      </ul></div>)}
  </section>;
}

function Tekrar({ paket }) {
  return <section className="card kp-kart">
    <p className="kp-etiket">Tekrar</p>
    <h2 className="kp-durak-baslik" tabIndex={-1}>Kapatmadan önce: aklında ne kaldı?</h2>
    <p>Her soruyu önce <strong>kendi cümlenle</strong> cevapla, sonra aç. Bakmadan hatırlamaya çalışmak, yeniden okumaktan daha kalıcı öğretir.</p>
    <div className="kp-kartlar">{paket.tekrar.map((k) => <details key={k.soru} className="kp-tekrar-kart"><summary>{k.soru}</summary><p>{k.cevap}</p></details>)}</div>
    <p className="small muted">Bu kartları 1, 3 ve 7 gün sonra yeniden dene. Otomatik hatırlatma, konu ustalık motoruna bağlandığında gelecek.</p>
    <h3>Video</h3>
    <ul className="kp-kod-liste">{paket.videolar.map((v) => <li key={v.adres}><a href={v.adres} target="_blank" rel="noreferrer">{v.ad} ↗</a><span className="small muted"> {v.not}</span></li>)}</ul>
    <h3>Kaynak sayfaları</h3>
    <ul className="kp-kod-liste">{paket.kaynaklar.map((k) => <li key={k.id}><a href={k.gorsel} target="_blank" rel="noreferrer">{k.ad} · s. {k.sayfa} ↗</a></li>)}</ul>
  </section>;
}

export default function KonuSayfasi() {
  const { paketId } = useParams();
  const kayit = PAKETLER[paketId];
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState(null);
  const [params, setParams] = useSearchParams();
  const [ilerleme, yaz] = useIlerleme(paketId);
  const ana = useRef(null);
  usePageTitle(kayit ? `${kayit.baslik} · ${kayit.ders}` : 'Konu');
  useEffect(() => { setVeri(null); kayit?.yukle().then(setVeri, setHata); }, [kayit]);
  const bolum = params.get('bolum') ?? 'giris';
  const adimNo = params.get('adim') === 'son' ? 999 : Math.max(0, Number(params.get('adim') ?? 1) - 1);
  useEffect(() => { const baslik = ana.current?.querySelector('.kp-durak-baslik'); if (baslik) { baslik.focus({ preventScroll: true }); ana.current.scrollIntoView({ block: 'start' }); } }, [bolum, adimNo, veri]);
  if (!kayit) return <Navigate to={`${BASE}/harita`} replace />;
  if (hata) return <div className="card"><p className="field-error" role="alert">Konu yüklenemedi: {hata.message}</p></div>;
  if (!veri) return <Loading text="Konu yükleniyor…" />;
  const { paket, sorular } = veri;
  const git = (id, tip, adim) => setParams({ bolum: id, ...(tip ? { tip } : {}), ...(adim ? { adim } : {}) });
  const adimGit = (n) => setParams({ bolum, adim: String(n + 1) }, { replace: true });
  const sira = paket.duraklar.findIndex((d) => d.id === bolum);
  const tamam = (d) => Object.keys(ilerleme[d.id] ?? {}).length >= olculenOgeSayisi(d);
  return <article className="kp-sayfa">
    <Link className="ph-back" to={`${BASE}/harita?ders=${paket.ders.toLocaleLowerCase('tr')}`}>← {paket.ders} konu haritası</Link>
    <header className="kp-ust">
      <p className="kp-etiket">{paket.ders} · {paket.sinav.join(' + ')} · {paket.sinif}</p>
      <h1>{paket.baslik}</h1><p className="kp-alt">{paket.altBaslik}</p>
      <div className="kp-giris"><Markdown text={paket.giris} /></div>
      <p className="kp-ust-not"><span className="kp-onay">Öğretmen kontrolü bekliyor</span><span>{paket.sure}</span></p>
    </header>
    <div className="kp-duzen">
    <nav className="kp-yol" aria-label="Konu bölümleri">
      <button type="button" aria-current={bolum === 'giris' ? 'step' : undefined} onClick={() => git('giris')}><span>★</span>Sınavda nasıl gelir?</button>
      {paket.duraklar.map((d, i) => <button type="button" key={d.id} aria-current={bolum === d.id ? 'step' : undefined} onClick={() => git(d.id)}><span>{tamam(d) ? '✓' : i + 1}</span>{d.baslik}</button>)}
      {SON_BOLUMLER.map(([id, ad]) => <button type="button" key={id} aria-current={bolum === id ? 'step' : undefined} onClick={() => git(id)}><span>{id === 'karma' && Object.keys(ilerleme.karma ?? {}).length === paket.karma.length ? '✓' : '→'}</span>{ad}</button>)}
    </nav>
    <div ref={ana} className="kp-ana">
      {bolum === 'karma' ? <Karma paket={paket} ilerleme={ilerleme} yaz={yaz} git={git} />
        : bolum === 'gercek' ? <Gercek paket={paket} sorular={sorular} tip={params.get('tip')} />
        : bolum === 'tekrar' ? <Tekrar paket={paket} />
        : sira >= 0 ? <Durak key={bolum} paket={paket} durak={paket.duraklar[sira]} sira={sira} sorular={sorular} motor={kayit.motor} ilerleme={ilerleme} yaz={yaz} git={git} adim={adimNo} adimGit={adimGit} />
        : <Sinavda paket={paket} sorular={sorular} git={git} />}
    </div>
    </div>
  </article>;
}

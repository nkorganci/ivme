import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../auth.jsx';
import { Markdown } from '../math.jsx';
import { V2Blok, V2Soru, Gorsel } from './v2Bloklar.jsx';
import { dogrulaV2, kazanc, paketHazirla, testSonucu } from './v2Kurallari.js';
import { Gercek, Tekrar } from './KonuSayfasi.jsx';
import araclar from './paketler/arac-kutusu-fizik.js';

function Test({ form, id, durum, yaz, tohum }) {
  const saved = durum[id] || {};
  const answers = saved.cevaplar || {};
  const result = saved.sonuc;
  const complete = testSonucu(form, answers);
  return <section><h2>{id === 'on' ? 'Başlamadan önce' : 'Son kavram testi'}</h2><p>Bütün soruları yanıtla. Son test bitene kadar cevap açıklaması açılmaz.</p>
    {form.map(q => <V2Soru key={q.id} oge={q} tohum={`${tohum}:${q.id}`} gizli deger={answers[q.id]} onChange={v => { if (result) return; yaz(id, prev => ({ ...prev, cevaplar: { ...prev?.cevaplar, [q.id]: v } })); }} />)}
    {!result && <button className="btn btn-primary" disabled={!complete} onClick={() => yaz(id, { cevaplar: answers, sonuc: complete })}>Testi bitir</button>}
    {result && <p role="status">Test tamamlandı: {result.dogru}/{result.toplam}.</p>}
    {id === 'son' && result && <><p>Ön: %{durum.on.sonuc.puan}, son: %{result.puan}. Normalize kazanç: {kazanc(durum.on.sonuc.puan, result.puan)?.toFixed(2) ?? 'Ön puan 100 olduğundan hesaplanmaz'}. Bu bir öğretmen kabulü değildir.</p>{form.map(q => <details key={q.id}><summary>{q.soru}</summary><p>{q.secenekler.find(s => s.dogru)?.neden}</p></details>)}</>}
  </section>;
}
function Onkosul({ ders, tamam, onDone, tohum }) {
  const [mode, setMode] = useState('kontrol');
  const [sayfa, setSayfa] = useState(0);
  const [exit, setExit] = useState({});
  return <section><h3>{ders.baslik}</h3><p>{ders.neden}</p>{tamam ? <p>Ön koşul tamamlandı. Mikro dersi yeniden açabilirsin.</p> : null}
    {mode === 'kontrol' && <><V2Soru oge={ders.kontrol} tohum={tohum} onDone={ilk => ilk ? onDone(true) : setMode('ders')} /><button className="btn btn-secondary" onClick={() => setMode('ders')}>Mikro dersi aç</button></>}
    {mode === 'ders' && <><h4>{ders.ekranlar[sayfa].baslik}</h4><Markdown text={ders.ekranlar[sayfa].metin} /><Gorsel g={ders.ekranlar[sayfa].gorsel} />{ders.ekranlar[sayfa].dene && <V2Soru key={sayfa} oge={ders.ekranlar[sayfa].dene} tohum={`${tohum}:${sayfa}`} />}
      <div className="kp-gezin"><button className="btn btn-secondary" disabled={!sayfa} onClick={() => setSayfa(s => s - 1)}>Geri</button><button className="btn btn-primary" onClick={() => sayfa + 1 < ders.ekranlar.length ? setSayfa(s => s + 1) : setMode('cikis')}>Sonraki →</button></div></>}
    {mode === 'cikis' && ders.cikis.map((q, i) => <V2Soru key={i} oge={q} tohum={`${tohum}:cikis:${i}`} onDone={() => { const next = { ...exit, [i]: true }; setExit(next); if (ders.cikis.every((_, n) => next[n])) onDone(true); }} />)}
  </section>;
}
function DurakV2({ d, paket, sorular, motor, durum, yaz, tohum }) {
  const saved = durum[d.id] || {};
  const [step, setStep] = useState(() => Math.max(0, d.bloklar.findIndex((_, i) => saved[i] === undefined)));
  const [attempt, setAttempt] = useState(0);
  const [retry, setRetry] = useState(false);
  const b = d.bloklar[step];
  const done = saved[step] !== undefined;
  const finish = first => {
    if (b.tur === 'sina' && !first) { yaz(`${d.id}:denemeler`, prev => [...(prev || []), { adim: step, ilk: false, zaman: Date.now() }]); setRetry(true); return; }
    yaz(d.id, prev => ({ ...prev, [step]: { ilk: first, zaman: Date.now() } }));
  };
  return <section><h2>{d.baslik}</h2><p>Etkinlik {step + 1}/{d.bloklar.length}{b.basamak !== undefined ? ` · Basamak ${b.basamak}` : ''}</p>
    <V2Blok key={`${step}:${attempt}`} b={b} paket={paket} sorular={sorular} motor={motor} tohum={`${tohum}:${d.id}:${step}`} onDone={finish} />
    {b.tur === 'tipler' && !done && <button className="btn btn-primary" onClick={() => finish(true)}>Devam →</button>}
    {retry && !done && <p role="status">Bağımsız doğru ölçütü henüz tamamlanmadı. Gerekçeleri incele, sonra yeniden dene. <button className="btn btn-secondary" onClick={() => { setAttempt(a => a + 1); setRetry(false); }}>Yeni deneme</button></p>}
    {done && <p role="status">Etkinlik tamamlandı.</p>}
    <footer className="kp-gezin"><button className="btn btn-secondary" disabled={!step} onClick={() => setStep(s => s - 1)}>← Geri</button>{step < d.bloklar.length - 1 && <button className="btn btn-primary" disabled={!done} onClick={() => setStep(s => s + 1)}>Sonraki →</button>}</footer>
  </section>;
}
function Calisma({ sorular, id, durum, yaz, tohum, tani = false }) {
  const saved = durum[id] || {};
  return <section>{sorular.map((q, i) => <div key={q.id}><p className="kp-etiket">Soru {i + 1}</p><V2Soru oge={q} tohum={`${tohum}:${q.id}`} gerekce={!tani} onDone={ilk => { if (saved[q.id] === undefined) yaz(id, { ...saved, [q.id]: ilk }); }} /></div>)}<p>{Object.keys(saved).length}/{sorular.length} tamamlandı.</p></section>;
}

export default function KonuV2({ paket: raw, sorular, motor }) {
  const { user } = useAuth();
  const paket = paketHazirla(raw);
  const key = `ivme:konu-paketi:${paket.id}:${user?.id ?? 'anon'}:v2`;
  const [durum, setDurum] = useState(() => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } });
  const [params, setParams] = useSearchParams();
  const [ak, setAk] = useState(0);
  const [tur, setTur] = useState(0);
  const [uyari, setUyari] = useState('');
  const bolum = params.get('bolum') || 'on';
  const yaz = (id, value) => setDurum(s => { const next = { ...s, [id]: typeof value === 'function' ? value(s[id]) : value }; try { localStorage.setItem(key, JSON.stringify(next)); } catch { setUyari('İlerleme bu tarayıcıda kaydedilemiyor.'); } return next; });
  const seed = `${user?.id || 'anon'}:${paket.id}:v2`;
  useEffect(() => { document.querySelector('.kp-v2-ana')?.scrollIntoView({ block: 'start' }); }, [bolum]);
  const on = Boolean(durum.on?.sonuc);
  const akDone = araclar.every(a => durum.ak?.[a.id]);
  const tamam = d => d.bloklar.every((_, i) => durum[d.id]?.[i] !== undefined);
  const durakDone = paket.duraklar.every(tamam);
  const tipDone = paket.tipCalismalari.every(t => durum.tip?.[t.tani.id] !== undefined);
  const sets = paket.sinavSeti.duzeyler.flatMap(d => d.sorular);
  const setDone = sets.every(q => durum.set?.[q.id] !== undefined);
  const setPass = setDone && Object.values(durum.set).filter(Boolean).length / sets.length >= .8;
  const karmaDone = paket.karma.every(q => durum.karma?.[q.id] !== undefined) && ['Y2', 'Y11', 'Y13'].every(k => durum.gecikmeli?.[k]);
  const error = dogrulaV2(paket);
  if (error.length) return <p role="alert">İçerik yüklenemedi: {error.join(', ')}</p>;
  const izin = id => id === 'on' || on && (id === 'ak' || akDone && (paket.duraklar.some(d => d.id === id) || id === 'gercek' || id === 'tekrar' || durakDone && (['tip', 'karma'].includes(id) || tipDone && (id === 'set' || setPass && karmaDone && id === 'son'))));
  const nav = [['on', 'Ön test'], ['ak', 'Araç kutusu'], ...paket.duraklar.map((d, i) => [d.id, `${i + 1}. ${d.baslik}`]), ['tip', 'İlk hamle'], ['set', 'Düzeyli alıştırma'], ['karma', 'Karışık tur'], ['son', 'Son test'], ['gercek', 'Gerçek sorular'], ['tekrar', 'Tekrar ve kaynak']];
  const git = id => { if (izin(id)) setParams({ bolum: id }); };
  const d = paket.duraklar.find(d => d.id === bolum);
  const active = izin(bolum) ? bolum : !on ? 'on' : !akDone ? 'ak' : paket.duraklar.find(d => !tamam(d))?.id || 'tip';
  return <article className="kp-sayfa"><Link to="/konuyu-ogrenelim/harita">← Konu haritası</Link><header className="kp-ust"><h1>{paket.baslik}</h1><p className="kp-onay">Öğretmen kontrolü bekliyor</p><p>Önce tahmin et, dene, sonra ilişkileri kur. İlerlemen bu tarayıcıda sana özel saklanır.</p></header>{uyari && <p role="alert">{uyari}</p>}
    <div className="kp-duzen"><nav className="kp-yol" aria-label="Konu bölümleri">{nav.map(([id, ad]) => <button key={id} type="button" aria-current={active === id ? 'step' : undefined} disabled={!izin(id)} onClick={() => git(id)}>{ad}{paket.duraklar.some(d => d.id === id && tamam(d)) ? ' ✓' : ''}</button>)}</nav>
      <main className="card kp-kart kp-v2-ana" key={active}>
        {['on', 'son'].includes(active) ? <Test form={paket.kavramTesti[active]} id={active} durum={durum} yaz={yaz} tohum={seed} />
        : active === 'ak' ? <><h2>Ön koşullar</h2><div className="kp-v2-kontroller">{araclar.map((a, i) => <button key={a.id} className="btn btn-secondary" onClick={() => setAk(i)}>{a.id}{durum.ak?.[a.id] ? ' ✓' : ''}</button>)}</div><Onkosul key={ak} ders={araclar[ak]} tamam={durum.ak?.[araclar[ak].id]} onDone={() => yaz('ak', { ...durum.ak, [araclar[ak].id]: true })} tohum={`${seed}:${ak}`} /></>
        : active === 'tip' ? <><h2>İlk hamleyi seç</h2><Calisma sorular={paket.tipCalismalari.map(t => t.tani)} id="tip" durum={durum} yaz={yaz} tohum={seed} tani /></>
        : active === 'set' ? <><h2>Düzeyli alıştırma</h2><p>İlk denemede en az %80 ve her tipten doğru gerekir. Bu set, çalışılmış senaryolardan oluşur.</p><Calisma key={tur} sorular={sets} id="set" durum={durum} yaz={yaz} tohum={seed} />{setDone && !setPass && <button className="btn btn-secondary" onClick={() => { yaz('set', {}); setTur(t => t + 1); }}>Gerekçeleri inceleyip yeni tur başlat</button>}</>
        : active === 'karma' ? <><h2>Karışık tur</h2><Calisma sorular={paket.karma} id="karma" durum={durum} yaz={yaz} tohum={seed} />{paket.yanilgilar.filter(y => ['Y2', 'Y11', 'Y13'].includes(y.kod)).map(y => <V2Soru key={y.kod} oge={y.yenidenSina.soru} tohum={`${seed}:${y.kod}`} onDone={() => yaz('gecikmeli', prev => ({ ...prev, [y.kod]: true }))} />)}</>
        : active === 'gercek' ? <Gercek paket={paket} sorular={sorular} />
        : active === 'tekrar' ? <Tekrar paket={{ ...paket, tekrar: paket.tekrar.map(k => ({ soru: k.on, cevap: k.arka })) }} />
        : <DurakV2 key={active} d={d || paket.duraklar.find(d => d.id === active)} paket={paket} sorular={sorular} motor={motor} durum={durum} yaz={yaz} tohum={seed} />}
        <footer className="kp-gezin"><span /><button type="button" className="btn btn-primary" disabled={!nav[nav.findIndex(([id]) => id === active) + 1] || !izin(nav[nav.findIndex(([id]) => id === active) + 1]?.[0])} onClick={() => git(nav[nav.findIndex(([id]) => id === active) + 1][0])}>Sonraki bölüm →</button></footer>
      </main></div></article>;
}

import { useEffect, useMemo, useState } from 'react';
import { Markdown } from '../math.jsx';
import DataGrid from '../../components/DataGrid.jsx';
import { BLOKLAR, TipKarti } from './bloklar.jsx';
import { useSoruDurumu, useAnindaCevap } from './SoruDurumu.jsx';
import HareketV2Deneyi, { EsitYolDeneyi } from './HareketV2Deneyi.jsx';
import { secenekSirasi } from './v2Kurallari.js';

export function V2Soru({ oge, tohum, onDone, onAttempt, gizli = false, deger, onChange, gerekce = true }) {
  const aninda = useAnindaCevap();
  const opts = useMemo(() => secenekSirasi(oge.secenekler, tohum), [oge.secenekler, tohum]);
  const [secim, setSecim] = useSoruDurumu(`${tohum}:secim`, null);
  const [yanlis, setYanlis] = useSoruDurumu(`${tohum}:yanlis`, false);
  const secili = gizli ? deger : secim;
  const cevap = opts.find(s => s.dogru);
  const secilen = opts.find(s => s.id === secili);
  const bitti = !gizli && opts.find(s => s.id === secili)?.dogru;
  return <section className="kp-soru"><div className="kp-kok"><Markdown text={oge.soru} /></div>
    <div className="kp-secenekler" role="group" aria-label="Seçenekler">{opts.map((s, i) => <button type="button" key={s.id} className="kp-secenek" disabled={bitti} aria-pressed={secili === s.id} data-durum={aninda && secilen ? (s.dogru ? 'dogru' : secili === s.id ? 'yanlis' : undefined) : undefined} onClick={() => {
      if (gizli) onChange(s.id); else { setSecim(s.id); onAttempt?.(Boolean(s.dogru)); if (!s.dogru) setYanlis(true); else onDone?.(!yanlis); }
    }}><span className="kp-harf">{'ABCDE'[i]}</span><span>{s.metin}{s.g && <Gorsel g={s.g} baglam={oge.soru} />}</span></button>)}</div>
    {aninda && secilen ? <div role="status" className={`kp-geri ${secilen.dogru ? 'kp-dogru' : 'kp-yeniden'}`}>
      <p>{secilen.dogru ? 'Doğru.' : 'Yanlış.'} <strong>Doğru cevap: {'ABCDE'[opts.indexOf(cevap)]}.</strong> {cevap.metin}</p>
      {!secilen.dogru && <Markdown text={secilen.neden} />}<Markdown text={cevap.neden} />{cevap.g && <Gorsel g={cevap.g} baglam={oge.soru} />}
    </div> : !gizli && secim && <p role="status" className="kp-geri">{bitti ? 'Doğru. ' : 'Yeniden düşün. '}{gerekce && opts.find(s => s.id === secim)?.neden}</p>}
  </section>;
}

export function Gorsel({ g, baglam = '' }) {
  if (!g) return null;
  if (g.tur === 'sayi-dogrusu') {
    const points = g.noktalar || [];
    const lo = g.aralik?.[0] ?? Math.min(-1, ...points.map(p => p.x));
    const hi = g.aralik?.[1] ?? Math.max(1, ...points.map(p => p.x));
    const x = value => 45 + 420 * (value-lo) / (hi-lo || 1);
    const step = Math.max(1, Math.ceil((hi-lo)/12));
    const ticks = [...new Set([0, ...Array.from({length:Math.floor((hi-lo)/step)+1},(_,i)=>lo+i*step)])].filter(v=>v>=lo&&v<=hi);
    return <figure className="kp-v2-gorsel"><svg viewBox="0 0 510 155" role="img" aria-label={`Sayı doğrusu: ${points.map(p=>`${p.ad} ${p.x}`).join(', ')}`}>
      <path d="M25 80H485l-8 -5m8 5l-8 5" fill="none" stroke="var(--ink)" />
      {ticks.map(v=><g key={v}><path d={`M${x(v)} 75v10`} stroke="var(--ink)"/><text x={x(v)} y="105" textAnchor="middle">{v}</text></g>)}
      {points.map((p,i)=><g key={i}><circle cx={x(p.x)} cy="80" r="4" fill="var(--pen-blue)"/><text x={x(p.x)} y={35+i%2*18} textAnchor="middle">{p.ad}: {p.x}</text></g>)}
      <text x="330" y="140">Konum ({g.birimler?.x || 'm'}) · + yön →</text>
    </svg></figure>;
  }
  if (g.tur === 'harita') {
    const values = g.x || [];
    const lo = Math.min(0, ...values), hi = Math.max(1, ...values);
    const x = value => 40 + 430 * (value - lo) / (hi - lo);
    return <figure className="kp-v2-gorsel"><svg viewBox="0 0 510 170" role="img" aria-label={`Hareket haritası; eşit zaman aralıklarında konumlar: ${values.join(', ')}`}>
      <text x="20" y="22">Eşit zaman aralıklarındaki konumlar</text>
      <line x1="30" x2="485" y1="80" y2="80" stroke="var(--ink)" />
      {values.map((value, i) => <g key={i}><circle cx={x(value)} cy="80" r="5" fill="var(--pen-blue)" /><text x={x(value)} y={100 + i % 3 * 14} textAnchor="middle">t{i}</text><text x={x(value)} y="65" textAnchor="middle">{value}</text></g>)}
      <text x="285" y="155">Konum (soru birimi)</text>
    </svg></figure>;
  }
  if (g.tur === 'tablo') return <DataGrid rowData={g.satirlar.map((r, i) => Object.fromEntries([['id', i], ...r.map((v, j) => [`c${j}`, v])]))} columnDefs={g.basliklar.map((h, j) => ({ field: `c${j}`, headerName: h, flex: 1 }))} fitAllRows />;
  let lines = g.cizgiler ? g.cizgiler.map((c, i) => ({ ad: c.ad || `Çizgi ${i + 1}`, n: c.n || c })) : [{ ad: g.ad || g.tur, n: g.n || g.yol || g.noktalar?.map(p => [p.x, 0]) || g.x?.map((x, i) => [i, x]) || [] }];
  if (g.ok) lines.push({ ad: 'Yer değiştirme', n: g.ok });
  const pts = lines.flatMap(l => l.n); if (!pts.length) return <p>{g.metin || g.tur}</p>;
  const xmin = Math.min(0, ...pts.map(p => p[0])), xmax = Math.max(1, ...pts.map(p => p[0]));
  const ymin = Math.min(0, ...pts.map(p => p[1])), ymax = Math.max(1, ...pts.map(p => p[1]));
  const x = v => 45 + 420 * (v - xmin) / (xmax - xmin), y = v => 190 - 155 * (v - ymin) / (ymax - ymin);
  const timeUnit = g.birimler?.t || (/dakika/.test(baglam) ? 'dk' : 's');
  const distanceUnit = g.birimler?.x || 'm';
  const labels = { xt: [`Zaman (${timeUnit})`, `Konum (${distanceUnit})`], vt: [`Zaman (${timeUnit})`, `Hız (${distanceUnit}/${timeUnit})`], at: [`Zaman (${timeUnit})`, `İvme (${distanceUnit}/${timeUnit}²)`], kroki: ['Yatay konum', 'Düşey konum'] };
  const [xl, yl] = labels[g.tur] || ['', ''];
  return <figure className="kp-v2-gorsel"><svg viewBox="0 0 510 230" role="img" aria-label={`${g.tur} grafiği: ${lines.map(l => l.n.map(p => p.join(',')).join('; ')).join(' / ')}`}>
    <path d={`M45 20V${y(0)}H480`} fill="none" stroke="var(--ink)" />
    <text x="390" y="225">{xl}</text><text x="5" y="16">{yl}</text>
    {lines.map((l, i) => <g key={i} style={{ color: i ? 'var(--pen-blue)' : 'var(--pen-red)' }}><polyline points={l.n.map(p => `${x(p[0])},${y(p[1])}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={i ? '6 3' : undefined} />{lines.length > 1 && <text x={60 + i * 160} y="210">{l.ad}</text>}{l.n.map((p, j) => <g key={j}><circle cx={x(p[0])} cy={y(p[1])} r="3" fill="currentColor" /><text x={x(p[0])} y={y(p[1]) - 9} textAnchor="middle">{g.noktalar?.[j]?.ad || `${p[0]}; ${p[1]}`}</text></g>)}</g>)}
  </svg></figure>;
}

function Sinifla({ b, onDone }) {
  const aninda = useAnindaCevap();
  const [answers, setAnswers] = useSoruDurumu(`sinifla:${b.soru}:answers`, {});
  const [check, setCheck] = useSoruDurumu(`sinifla:${b.soru}:check`, false);
  const [ilk, setIlk] = useSoruDurumu(`sinifla:${b.soru}:ilk`, true);
  const correct = (v, o) => JSON.stringify([...(v || [])].sort()) === JSON.stringify([...o.kutular].sort());
  return <section><Markdown text={b.soru} />{b.ogeler.map((o, i) => <fieldset key={i}><legend>{o.metin}</legend>{b.kutular.map(k => <label key={k}><input type="checkbox" checked={answers[i]?.includes(k) || false} onChange={e => { setCheck(false); setAnswers(a => ({ ...a, [i]: e.target.checked ? [...(a[i] || []), k] : a[i].filter(v => v !== k) })); }} />{k} </label>)}{(check || aninda && answers[i] !== undefined) && <p role="status">{correct(answers[i], o) ? 'Doğru. ' : 'Yeniden düşün. '}{aninda && <strong>Doğru cevap: {o.kutular.join(', ')}. </strong>}{o.neden}</p>}</fieldset>)}<button className="btn btn-primary" onClick={() => { setCheck(true); if (b.ogeler.every((o, i) => correct(answers[i], o))) onDone(ilk); else setIlk(false); }}>Kontrol et</button></section>;
}
function TahminDeney({ soru, tohum, deney, aciklama, onDone, onYonerge }) {
  const [phase, setPhase] = useSoruDurumu(`${tohum}:tahmin-phase`, 0);
  const [prediction, setPrediction] = useSoruDurumu(`${tohum}:tahmin-secim`, null);
  useEffect(() => {
    onYonerge?.(phase === 0 ? prediction === null ? 'Tahmin sorusunda bir seçenek işaretle.' : 'Tahminini seçtin. “Tahminimi kaydet ve deneyi aç” düğmesine bas.' : phase === 1 ? 'Deneydeki kontrolleri değiştirip sonucu gözle. Sonra “Gözlemledim, açıklamayı aç” düğmesine bas.' : 'Açıklamayı oku ve alttaki gerekçe sorusunda doğru seçeneği bul.');
  }, [phase, prediction, onYonerge]);
  return <section><ol className="kp-tahmin-asamalari" aria-label="Bu etkinliğin adımları">{['Tahmin et', 'Deneyi yap', 'Gerekçeni seç'].map((ad, i) => <li key={ad} aria-current={phase === i ? 'step' : undefined}>{i < phase ? '✓' : i + 1}. {ad}{phase === i && <strong> · Buradasın</strong>}</li>)}</ol><h3>{phase === 0 ? 'Önce tahmin et' : phase === 1 ? 'Şimdi deneyi yap' : 'Gözlemini açıkla'}</h3>
    {phase === 0 && <><V2Soru oge={soru} tohum={`${tohum}:tahmin`} gizli deger={prediction} onChange={setPrediction} /><button className="btn btn-primary" disabled={prediction === null} onClick={() => setPhase(1)}>Tahminimi kaydet ve deneyi aç</button></>}
    {phase >= 1 && <><p>{phase === 1 ? 'Tahminin kaydedildi. Şimdi dene ve gözleminle karşılaştır.' : 'Deneyi inceledin. Şimdi gerekçe sorusunu yanıtla.'}</p><details className="kp-tamamlanan-deney" open={phase === 1}><summary>{phase === 1 ? 'Deney · şimdi bu adımı yap' : 'Tamamlanan deneyi yeniden incele'}</summary>{deney}</details></>}
    {phase === 1 && <button className="btn btn-primary" onClick={() => setPhase(2)}>Gözlemledim, açıklamayı aç</button>}
    {phase === 2 && <><Markdown text={aciklama || ''} /><V2Soru oge={soru.gerekce || { soru: 'Gözlemine göre doğru açıklama hangisi?', secenekler: soru.secenekler.map(s => ({ metin: s.neden, dogru: Boolean(s.dogru), neden: s.neden })) }} tohum={`${tohum}:gerekce`} onDone={onDone} /></>}
  </section>;
}

export function V2Blok({ b, paket, sorular, motor, tohum, onDone, onGercek, onYonerge }) {
  const aninda = useAnindaCevap();
  const [done, setDone] = useSoruDurumu(`${tohum}:done`, {});
  const [origin, setOrigin] = useState(0);
  const [concept, setConcept] = useSoruDurumu(`${tohum}:concept`, { index: 0, seri: 0 });
  if (b.tur === 'kavram-kontrol') return <section><h3>Kavram kontrolü</h3><p>Üst üste üç doğru: {concept.seri}/3</p>{concept.seri < 3 && <V2Soru key={concept.index} oge={b.sorular[concept.index % b.sorular.length]} tohum={`${tohum}:${concept.index}`} onDone={ilk => {
    if (aninda) { setConcept({ ...concept, ilk }); return; }
    const seri = ilk ? concept.seri + 1 : 0;
    setConcept({ index: concept.index + 1, seri }); if (seri >= 3) onDone(true);
  }} />}{aninda && concept.ilk !== undefined && <button type="button" className="btn btn-primary" onClick={() => {
    const seri = concept.ilk ? concept.seri + 1 : 0;
    setConcept({ index: concept.index + 1, seri }); if (seri >= 3) onDone(true);
  }}>Sonraki soru →</button>}</section>;
  const y = paket.yanilgilar.find(y => y.kod === b.kod);
  const LegacyModel = BLOKLAR.model;
  const model = b.kod === 'Y4' ? <HareketV2Deneyi tur="esit-surat" /> : b.kod === 'Y5' ? <EsitYolDeneyi /> : b.kod === 'Y10' ? <HareketV2Deneyi tur="sabit-buyuk" /> : b.kod === 'Y2' ? <><label>Sıfır noktasını taşı: {origin} m<input type="range" min="-5" max="5" value={origin} onChange={e => setOrigin(Number(e.target.value))} /></label><p>Cisim yerinde; yeni konumu {3-origin} m, aldığı yol 0 m.</p><Gorsel g={{tur:'sayi-dogrusu',noktalar:[{x:-origin,ad:'Eski sıfır'},{x:0,ad:'Yeni sıfır'},{x:3-origin,ad:'Cisim'}]}} /></>
    : ['Y1','Y3','Y4','Y5','Y6','Y8','Y9'].includes(b.kod) ? <LegacyModel blok={{deney:({Y1:'referans',Y3:'yol',Y4:'hiz',Y5:'hiz',Y6:'grafik',Y8:'ivme',Y9:'yol'})[b.kod],gorev:y?.yuzlestir.yonerge}} motor="hareket-lab" />
    : <HareketV2Deneyi tur={b.kod === 'Y7' ? 'karsilasma' : 'uc-grafik'} />;
  if (b.tur === 'yanilgi') return <TahminDeney onYonerge={onYonerge} soru={y.ortayaCikar} tohum={tohum} deney={<><Markdown text={y.yuzlestir.yonerge} />{model}</>} aciklama={y.aciklama} onDone={onDone} />;
  if (b.tur === 'neden' && b.tahmin) return <><Markdown text={b.metin} /><TahminDeney onYonerge={onYonerge} soru={b.tahmin} tohum={tohum} deney={b.deneyBlok && ['karsilasma', 'uc-grafik'].includes(b.deneyBlok.deney) ? <><p>{b.deneyBlok.gorev}</p><HareketV2Deneyi tur={b.deneyBlok.deney} /></> : <LegacyModel blok={b.deneyBlok} motor={motor} />} onDone={onDone} /></>;
  if (b.tur === 'nicel-kontrol') return <section><h3>İki bağımsız nicel soru</h3><p>Örnekleri inceledin. Burada iki farklı soruyu yardım almadan çöz; yanlışta gerekçeyi inceleyip açıkça yeni tur başlatabilirsin. Tekrar turu görülmemiş aktarım sayılmaz.</p>{b.ogeler.map((q,i) => <V2Soru key={q.id} oge={q} tohum={`${tohum}:${q.id}`} onDone={ilk => {const next={...done,[i]:ilk};setDone(next);if(b.ogeler.every((_,j)=>next[j]!==undefined))onDone(Object.values(next).every(Boolean));}} />)}</section>;
  if (b.tur === 'sinifla') return <Sinifla b={b} onDone={onDone} />;
  if (b.tur === 'ceviri') {
    if (b.bicim === 'hata') {
      const opts = b.cumleler.map(c => ({ metin: c.metin, dogru: !c.dogru, neden: c.neden }));
      return <><Gorsel g={b.verilen} baglam={b.soru} /><V2Soru oge={{ soru: b.soru, secenekler: opts }} tohum={tohum} onDone={onDone} /></>;
    }
    return <><Gorsel g={b.verilen} baglam={b.soru} /><V2Soru oge={b} tohum={tohum} onDone={onDone} /></>;
  }
  if (b.tur === 'turet') return <section><h3>{b.baslik}</h3>{b.adimlar.map((a, i) => <div key={i}><Markdown text={a.ne} /><p><strong>Neden?</strong> {a.neden}</p></div>)}<Markdown text={b.sonuc} /><p><strong>Koşul:</strong> {b.kosul}</p><p><strong>Birim:</strong> {b.birim}</p>{b.dene ? <V2Soru oge={b.dene} tohum={tohum} onDone={onDone} /> : <button className="btn btn-primary" onClick={() => onDone(true)}>İlişkiyi ve koşulunu inceledim →</button>}</section>;
  if (b.tur === 'model' && ['karsilasma', 'uc-grafik'].includes(b.deney)) return <><p>{b.gorev}</p><HareketV2Deneyi tur={b.deney} /><button className="btn btn-primary" onClick={() => onDone(true)}>Deneyi inceledim →</button></>;
  if (b.tur === 'tipler') return <div className="kp-tip-izgara">{paket.tipler.filter(t => b.tipler?.includes(t.id)).map(t => <TipKarti key={t.id} tip={t} sorular={sorular} onGercek={onGercek} />)}</div>;
  const C = BLOKLAR[b.tur];
  if (!C) return <p role="alert">Bu etkinlik yüklenemedi: {b.tur}</p>;
  const assessed = b.tur === 'neden' && b.tahmin || b.tur === 'tani' || b.tur === 'sina' || b.tur === 'ornek';
  const result = (...args) => {
    if (b.tur !== 'sina') { onDone(args[0]); return; }
    const next = { ...done, [args[0]]: args[1] }; setDone(next);
    if (b.ogeler.every((_, i) => next[i] !== undefined)) onDone(Object.values(next).every(Boolean));
  };
  return <>{b.ciz && <p><strong>Çiz:</strong> {b.ciz}</p>}<C blok={b} sorular={sorular} motor={motor} onSonuc={result} />{!assessed && <button className="btn btn-secondary" onClick={() => onDone(true)}>İnceledim →</button>}</>;
}

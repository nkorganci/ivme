import { useMemo, useState } from 'react';
import { Markdown } from '../math.jsx';
import DataGrid from '../../components/DataGrid.jsx';
import { BLOKLAR } from './bloklar.jsx';
import HareketV2Deneyi from './HareketV2Deneyi.jsx';
import { secenekSirasi } from './v2Kurallari.js';

export function V2Soru({ oge, tohum, onDone, onAttempt, gizli = false, deger, onChange, gerekce = true }) {
  const opts = useMemo(() => secenekSirasi(oge.secenekler, tohum), [oge.secenekler, tohum]);
  const [secim, setSecim] = useState(null);
  const [yanlis, setYanlis] = useState(false);
  const secili = gizli ? deger : secim;
  const bitti = !gizli && opts.find(s => s.id === secili)?.dogru;
  return <section className="kp-soru"><div className="kp-kok"><Markdown text={oge.soru} /></div>
    <div className="kp-secenekler" role="group" aria-label="Seçenekler">{opts.map((s, i) => <button type="button" key={s.id} className="kp-secenek" disabled={bitti} aria-pressed={secili === s.id} onClick={() => {
      if (gizli) onChange(s.id); else { setSecim(s.id); onAttempt?.(Boolean(s.dogru)); if (!s.dogru) setYanlis(true); else onDone?.(!yanlis); }
    }}><span className="kp-harf">{'ABCDE'[i]}</span><span>{s.metin}{s.g && <Gorsel g={s.g} />}</span></button>)}</div>
    {!gizli && secim && <p role="status" className="kp-geri">{bitti ? 'Doğru. ' : 'Yeniden düşün. '}{gerekce && opts.find(s => s.id === secim)?.neden}</p>}
  </section>;
}

export function Gorsel({ g }) {
  if (!g) return null;
  if (g.tur === 'tablo') return <DataGrid rowData={g.satirlar.map((r, i) => Object.fromEntries([['id', i], ...r.map((v, j) => [`c${j}`, v])]))} columnDefs={g.basliklar.map((h, j) => ({ field: `c${j}`, headerName: h, flex: 1 }))} fitAllRows />;
  let lines = g.cizgiler ? g.cizgiler.map((c, i) => ({ ad: c.ad || `Çizgi ${i + 1}`, n: c.n || c })) : [{ ad: g.ad || g.tur, n: g.n || g.yol || g.noktalar?.map(p => [p.x, 0]) || g.x?.map((x, i) => [i, x]) || [] }];
  if (g.ok) lines.push({ ad: 'Yer değiştirme', n: g.ok });
  const pts = lines.flatMap(l => l.n); if (!pts.length) return <p>{g.metin || g.tur}</p>;
  const xmin = Math.min(0, ...pts.map(p => p[0])), xmax = Math.max(1, ...pts.map(p => p[0]));
  const ymin = Math.min(0, ...pts.map(p => p[1])), ymax = Math.max(1, ...pts.map(p => p[1]));
  const x = v => 45 + 420 * (v - xmin) / (xmax - xmin), y = v => 190 - 155 * (v - ymin) / (ymax - ymin);
  const labels = { xt: ['Zaman (soru birimi)', 'Konum'], vt: ['Zaman (soru birimi)', 'Hız'], at: ['Zaman (soru birimi)', 'İvme'], harita: ['Zaman adımı', 'Konum (m)'], kroki: ['Yatay konum', 'Düşey konum'], 'sayi-dogrusu': ['Konum (m)', ''] };
  const [xl, yl] = labels[g.tur] || ['', ''];
  return <figure className="kp-v2-gorsel"><svg viewBox="0 0 510 230" role="img" aria-label={`${g.tur} grafiği: ${lines.map(l => l.n.map(p => p.join(',')).join('; ')).join(' / ')}`}>
    <path d={`M45 20V${y(0)}H480`} fill="none" stroke="var(--ink)" />
    <text x="390" y="225">{xl}</text><text x="5" y="16">{yl}</text>
    {lines.map((l, i) => <g key={i} style={{ color: i ? 'var(--pen-blue)' : 'var(--pen-red)' }}><polyline points={l.n.map(p => `${x(p[0])},${y(p[1])}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" />{l.n.map((p, j) => <g key={j}><circle cx={x(p[0])} cy={y(p[1])} r="3" fill="currentColor" /><text x={x(p[0])} y={y(p[1]) - 9} textAnchor="middle">{g.noktalar?.[j]?.ad || `${p[0]}; ${p[1]}`}</text></g>)}</g>)}
  </svg></figure>;
}

function Sinifla({ b, onDone }) {
  const [answers, setAnswers] = useState({});
  const [check, setCheck] = useState(false);
  const [ilk, setIlk] = useState(true);
  const correct = (v, o) => JSON.stringify([...(v || [])].sort()) === JSON.stringify([...o.kutular].sort());
  return <section><Markdown text={b.soru} />{b.ogeler.map((o, i) => <fieldset key={i}><legend>{o.metin}</legend>{b.kutular.map(k => <label key={k}><input type="checkbox" checked={answers[i]?.includes(k) || false} onChange={e => { setCheck(false); setAnswers(a => ({ ...a, [i]: e.target.checked ? [...(a[i] || []), k] : a[i].filter(v => v !== k) })); }} />{k} </label>)}{check && <p>{correct(answers[i], o) ? 'Doğru. ' : 'Yeniden düşün. '}{o.neden}</p>}</fieldset>)}<button className="btn btn-primary" onClick={() => { setCheck(true); if (b.ogeler.every((o, i) => correct(answers[i], o))) onDone(ilk); else setIlk(false); }}>Kontrol et</button></section>;
}
export function V2Blok({ b, paket, sorular, motor, tohum, onDone }) {
  const [done, setDone] = useState({});
  const [phase, setPhase] = useState(0);
  const [origin, setOrigin] = useState(0);
  const [concept, setConcept] = useState({ index: 0, seri: 0 });
  if (b.tur === 'kavram-kontrol') return <section><h3>Kavram kontrolü</h3><p>Üst üste üç doğru: {concept.seri}/3</p>{concept.seri < 3 && <V2Soru key={concept.index} oge={b.sorular[concept.index % b.sorular.length]} tohum={`${tohum}:${concept.index}`} onAttempt={ok => { if (!ok) setConcept(c => ({ ...c, seri: 0 })); }} onDone={() => {
    const seri = concept.seri + 1;
    setConcept({ index: concept.index + 1, seri }); if (seri >= 3) onDone(true);
  }} />}</section>;
  const y = paket.yanilgilar.find(y => y.kod === b.kod);
  const LegacyModel = BLOKLAR.model;
  const model = b.kod === 'Y2' ? <><label>Sıfır noktasını taşı: {origin} m<input type="range" min="-5" max="5" value={origin} onChange={e => setOrigin(Number(e.target.value))} /></label><p>Cisim yerinde; yeni konumu {3-origin} m, aldığı yol 0 m.</p><Gorsel g={{tur:'sayi-dogrusu',noktalar:[{x:-origin,ad:'Eski sıfır'},{x:0,ad:'Yeni sıfır'},{x:3-origin,ad:'Cisim'}]}} /></>
    : ['Y1','Y3','Y4','Y5','Y6','Y8','Y9'].includes(b.kod) ? <LegacyModel blok={{deney:({Y1:'referans',Y3:'yol',Y4:'hiz',Y5:'hiz',Y6:'grafik',Y8:'ivme',Y9:'yol'})[b.kod],gorev:y?.yuzlestir.yonerge}} motor="hareket-lab" />
    : <HareketV2Deneyi tur={b.kod === 'Y7' ? 'karsilasma' : 'uc-grafik'} />;
  if (b.tur === 'yanilgi') return <section><h3>Önce karar ver</h3><V2Soru oge={y.ortayaCikar} tohum={tohum} onDone={() => setPhase(1)} />{phase > 0 && <><Markdown text={y.yuzlestir.yonerge} />{model}<Markdown text={y.aciklama} /><button className="btn btn-primary" onClick={() => onDone(true)}>Deneyle karşılaştırdım →</button></>}</section>;
  if (b.tur === 'sinifla') return <Sinifla b={b} onDone={onDone} />;
  if (b.tur === 'ceviri') {
    if (b.bicim === 'hata') {
      const opts = b.cumleler.map(c => ({ metin: c.metin, dogru: !c.dogru, neden: c.neden }));
      return <><Gorsel g={b.verilen} /><V2Soru oge={{ soru: b.soru, secenekler: opts }} tohum={tohum} onDone={onDone} /></>;
    }
    return <><Gorsel g={b.verilen} /><V2Soru oge={b} tohum={tohum} onDone={onDone} /></>;
  }
  if (b.tur === 'turet') return <section><h3>{b.baslik}</h3>{b.adimlar.map((a, i) => <div key={i}><Markdown text={a.ne} /><p><strong>Neden?</strong> {a.neden}</p></div>)}<Markdown text={b.sonuc} /><p><strong>Koşul:</strong> {b.kosul}</p><p><strong>Birim:</strong> {b.birim}</p>{b.dene ? <V2Soru oge={b.dene} tohum={tohum} onDone={onDone} /> : <button className="btn btn-primary" onClick={() => onDone(true)}>İlişkiyi ve koşulunu inceledim →</button>}</section>;
  if (b.tur === 'model' && ['karsilasma', 'uc-grafik'].includes(b.deney)) return <><p>{b.gorev}</p><HareketV2Deneyi tur={b.deney} /><button className="btn btn-primary" onClick={() => onDone(true)}>Deneyi inceledim →</button></>;
  if (b.tur === 'tipler') return <p>Tip çalışmalarına sekiz duraktan sonra geçeceksin.</p>;
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

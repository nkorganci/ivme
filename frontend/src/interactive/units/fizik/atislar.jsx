import { useEffect, useRef, useState } from 'react';
import Plot from '../../kit/Plot.jsx';
import { Choice, LabGrid, MathText, Note, Panel, Readouts, Slider, Steps, Toggle } from '../../kit/controls.jsx';
import { fmt } from '../../kit/num.js';
import { projectile, trig } from './projectile.js';

const termText = (coef, unit, first = false) => (Math.abs(coef) < 1e-9 ? '' : `${coef < 0 ? (first ? '−' : ' − ') : first ? '' : ' + '}${fmt(Math.abs(coef), 3)}${unit}`);

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const p1 = projectile({ mode: s.mode, v0: s.v0, angle: s.angle, vx: s.vx, vy: s.vy, h0: s.h0, g: s.g });
  const p2 = s.second ? projectile({ mode: s.mode, v0: s.v02, angle: s.angle2, vx: s.vx2, vy: s.vy2, h0: s.h02, g: s.g }) : null;
  const Tmax = Math.max(p1.T, p2?.T ?? 0);
  const timeRef = useRef(0);
  timeRef.current = t;
  useEffect(() => { setT(0); setPlaying(false); }, [s.mode, s.v0, s.angle, s.vx, s.vy, s.h0, s.g, s.second, s.v02, s.angle2, s.vx2, s.vy2, s.h02]);
  useEffect(() => {
    if (!playing) return undefined;
    let last = performance.now(); let frame;
    const speed = Math.max(0.5, Tmax / 6);
    const tick = (now) => {
      const next = Math.min(Tmax, timeRef.current + ((now - last) / 1000) * speed);
      last = now; setT(next);
      if (next >= Tmax) { setPlaying(false); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, Tmax]);

  const xMax = Math.max(10, p1.range, p2?.range ?? 0, 1) * 1.12;
  const yMax = Math.max(5, p1.hMax, p2?.hMax ?? 0) * 1.2;
  const items = [{ type: 'hline', y: 0, color: 'ok', dashed: false, width: 3 }];
  const drawProjectile = (p, color, label, h0) => {
    const tc = Math.min(t, p.T);
    const points = Array.from({ length: 121 }, (_, i) => { const st = p.at((p.T * i) / 120); return [st.x, st.y]; });
    items.push({ type: 'poly', points, color, width: 2.6, dashed: true });
    if (s.strobe) {
      const step = s.strobeStep;
      for (let k = 0; k * step <= tc + 1e-9; k += 1) { const st = p.at(k * step); items.push({ type: 'point', x: st.x, y: st.y, color, r: 3.5, label: k > 0 && points.length < 300 && k % Math.max(1, Math.round(p.T / step / 8)) === 0 ? `${fmt(k * step)} s` : '', dy: -8, dx: 4 }); }
    }
    const now = p.at(tc);
    if (p.vy > 0) { const top = p.at(p.tTop); items.push({ type: 'segment', from: [top.x, 0], to: [top.x, top.y], color: 'line', dashed: true }); items.push({ type: 'text', x: top.x, y: top.y, text: `tepe ${fmt(p.hMax, 2)} m`, dy: -10, anchor: 'middle', color }); }
    items.push({ type: 'text', x: p.range, y: 0, text: `menzil ${fmt(p.range, 2)} m`, dy: 18, anchor: 'end', color });
    if (h0 > 0) items.push({ type: 'segment', from: [0, 0], to: [0, h0], color: 'black', width: 5 });
    const k = (xMax / 7) / Math.max(1, Math.hypot(p.vx, p.vy));
    if (s.vectors) {
      items.push({ type: 'arrow', from: [now.x, now.y], to: [now.x + now.vxt * k, now.y + now.vyt * k], color, width: 2.6 });
      items.push({ type: 'arrow', from: [now.x, now.y], to: [now.x + now.vxt * k, now.y], color: 'warn', width: 2 });
      items.push({ type: 'arrow', from: [now.x, now.y], to: [now.x, now.y + now.vyt * k], color: 'warn', width: 2 });
    }
    items.push({ type: 'point', x: now.x, y: now.y, color, r: 8, label });
  };
  drawProjectile(p1, 'blue', 'K', s.h0);
  if (p2) drawProjectile(p2, 'red', 'L', s.h02);
  const now1 = p1.at(Math.min(t, p1.T));
  const vItems = [
    { type: 'fn', f: () => p1.vx, color: 'blue', width: 2.4, dashed: true, domain: [0, p1.T] },
    { type: 'fn', f: (x) => p1.vy - s.g * x, color: 'blue', width: 2.8, domain: [0, p1.T] },
    { type: 'vline', x: t, color: 'navy' },
  ];
  if (p2) vItems.push({ type: 'fn', f: () => p2.vx, color: 'red', width: 2.2, dashed: true, domain: [0, p2.T] }, { type: 'fn', f: (x) => p2.vy - s.g * x, color: 'red', width: 2.6, domain: [0, p2.T] });
  const vLim = Math.max(5, Math.abs(p1.vy), Math.abs(p1.vy - s.g * p1.T), p1.vx, p2 ? Math.max(Math.abs(p2.vy), Math.abs(p2.vy - s.g * p2.T), p2.vx) : 0) * 1.15;
  const velocityFields = (suffix, label) => s.mode === 'polar' ? <>
    <Slider label={`${label}: v₀`} value={s[`v0${suffix}`]} min={0} max={100} step={1} unit="m/s" onChange={(v) => set({ [`v0${suffix}`]: v })} />
    <Slider label={`${label}: atış açısı θ`} value={s[`angle${suffix}`]} min={-90} max={90} step={1} unit="°" onChange={(v) => set({ [`angle${suffix}`]: v })} />
    <div className="kit-chips">{[0, 30, 37, 45, 53, 60, 90].map((a) => <button key={a} type="button" className="ml-event-chip" onClick={() => set({ [`angle${suffix}`]: a })}>{a}°</button>)}</div>
  </> : <>
    <Slider label={`${label}: vx (yatay)`} value={s[`vx${suffix}`]} min={0} max={80} step={1} unit="m/s" onChange={(v) => set({ [`vx${suffix}`]: v })} />
    <Slider label={`${label}: vy (düşey, yukarı +)`} value={s[`vy${suffix}`]} min={-60} max={80} step={1} unit="m/s" onChange={(v) => set({ [`vy${suffix}`]: v })} />
  </>;
  const eq = (p, h0) => [
    `x(t) = ${fmt(p.vx, 3)}·t`,
    `y(t) = ${termText(h0, '', true)}${termText(p.vy, '·t', !h0)}${termText(-s.g / 2, '·t^2', !h0 && !p.vy)}`,
    `v_y(t) = ${termText(p.vy, '', true)}${termText(-s.g, '·t', !p.vy)}`,
  ];
  return <LabGrid top={<div className="kit-row">
    <button type="button" className="btn btn-primary btn-sm ml-play" onClick={() => { if (t >= Tmax - 1e-6) setT(0); setPlaying((v) => !v); }}>{playing ? '⏸ Durdur' : t >= Tmax - 1e-6 ? '↻ Yeniden at' : '▶ At'}</button>
    <label className="ml-time"><span>t = <strong>{fmt(t, 2)}</strong> s</span>
      <input type="range" min="0" max={Tmax} step={Tmax / 400} value={t} onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} aria-label="Zaman" /></label>
    <Toggle label="Hız vektörleri" checked={s.vectors} onChange={(vectors) => set({ vectors })} />
    <Toggle label="Eşit aralıklı iz" checked={s.strobe} onChange={(strobe) => set({ strobe })} />
  </div>} visual={<>
    <Plot x={[-xMax * 0.04, xMax]} y={[-yMax * 0.08, yMax]} height={400} equal={s.equal} items={items} xLabel="x (m)" yLabel="y (m)" ariaLabel="Atış yörüngesi" />
    <Plot x={[0, Tmax * 1.05]} y={[-vLim, vLim]} height={210} items={vItems} xLabel="t (s)" yLabel="v (m/s)" ariaLabel="Hız bileşenleri grafiği" />
    <div className="kit-legend"><span><i style={{ background: 'var(--pen-blue)' }} />K: vy (düz), vx (kesikli)</span>{p2 && <span><i style={{ background: 'var(--pen-red)' }} />L</span>}<span><i style={{ background: 'var(--warn)' }} />hız bileşenleri</span></div>
  </>} side={<>
    <Panel title="Hızı nasıl gireceksin?">
      <Choice options={[{ value: 'polar', label: 'v₀ ve açı' }, { value: 'components', label: 'vx ve vy' }]} value={s.mode} onChange={(mode) => set({ mode })} />
    </Panel>
    <Panel title="K cismi (mavi)">
      {velocityFields('', 'K')}
      <Slider label="K: atış yüksekliği h₀" value={s.h0} min={0} max={200} step={5} unit="m" onChange={(h0) => set({ h0 })} />
    </Panel>
    <Panel title="Karşılaştırma">
      <Toggle label="İkinci cisim (L, kırmızı)" checked={s.second} onChange={(second) => set({ second })} />
      {s.second && <>{velocityFields('2', 'L')}<Slider label="L: h₀" value={s.h02} min={0} max={200} step={5} unit="m" onChange={(h02) => set({ h02 })} /></>}
      <Slider label="g" value={s.g} min={1} max={20} step={0.5} unit="m/s²" onChange={(g) => set({ g })} />
      <Slider label="İz aralığı" value={s.strobeStep} min={0.25} max={5} step={0.25} unit="s" onChange={(strobeStep) => set({ strobeStep })} />
      <Toggle label="Eksenleri eşit ölçekle" checked={s.equal} onChange={(equal) => set({ equal })} />
    </Panel>
    <Readouts title="K: denklemler ve sonuçlar" items={[
      ['Bileşenler', `vx = ${fmt(p1.vx, 3)} m/s · vy₀ = ${fmt(p1.vy, 3)} m/s`],
      ...eq(p1, s.h0).map((line, i) => [['Yatay konum', 'Düşey konum', 'Düşey hız'][i], <MathText key={i} text={line} />]),
      ['Tepeye çıkış süresi', p1.vy > 0 ? `t = vy₀ / g = ${fmt(p1.tTop, 3)} s` : 'yukarı hız yok'],
      ['En büyük yükseklik', `h₀ + vy₀² / 2g = ${fmt(p1.hMax, 3)} m`],
      ['Uçuş süresi', `${fmt(p1.T, 3)} s (y = 0 denkleminden)`, 'ok'],
      ['Menzil', `vx · T = ${fmt(p1.vx, 3)} · ${fmt(p1.T, 3)} = ${fmt(p1.range, 3)} m`, 'ok'],
      ['Şu an (t)', `x = ${fmt(now1.x, 2)} m · y = ${fmt(now1.y, 2)} m · v = ${fmt(Math.hypot(now1.vxt, now1.vyt), 2)} m/s`],
    ]} />
    {p2 && <Readouts title="L: sonuçlar" items={[
      ['Bileşenler', `vx = ${fmt(p2.vx, 3)} · vy₀ = ${fmt(p2.vy, 3)} m/s`],
      ['En büyük yükseklik', `${fmt(p2.hMax, 3)} m`], ['Uçuş süresi', `${fmt(p2.T, 3)} s`], ['Menzil', `${fmt(p2.range, 3)} m`],
      ['Tepede hız (= vx)', `${fmt(p2.vx, 3)} m/s (K: ${fmt(p1.vx, 3)})`],
    ]} />}
    <Steps title="Kural" lines={['Yatayda sabit hız (ivme yok): x = vx·t.', 'Düşeyde serbest düşme: vy azalır, tepede 0 olur.', 'Uçuş süresini yalnız düşey hareket belirler; menzil = vx · süre.', 'Tepe noktasında hız sıfır değil, vx\'tir.']} />
    {s.mode === 'polar' && [37, 53].includes(Math.abs(s.angle)) && <Note>Sınav kuralı: sin 37° = 0,6, cos 37° = 0,8 (53° için tersi) alındı.</Note>}
  </>} />;
}

const initial = { mode: 'polar', v0: 50, angle: 53, vx: 30, vy: 40, h0: 0, g: 10, second: false, v02: 50, angle2: 37, vx2: 20, vy2: 30, h02: 0, vectors: true, strobe: true, strobeStep: 1, equal: true };

export default {
  Lab,
  initial,
  intro: 'Hızı v₀ ve açıyla ya da bileşenleriyle gir; atış yüksekliğini ayarla. "At" ile izle ya da zaman çubuğunu kaydır. Yörünge, hız vektörü ve bileşenleri, tepe ve menzil formülleriyle canlı hesaplanır; ikinci cisimle karşılaştırabilirsin.',
  questions: [
    { id: 'yatay', title: 'Yatay atışta menzil', exam: 'AYT', topic: 'İki boyutta hareket',
      stem: 'Yerden 45 m yükseklikten 20 m/s hızla yatay olarak atılan bir cisim, atıldığı noktanın yerdeki izdüşümünden kaç m uzağa düşer? (g = 10 m/s², sürtünmeler önemsiz)',
      choices: { A: '30', B: '45', C: '60', D: '75', E: '90' }, answer: 'C',
      setup: { mode: 'polar', v0: 20, angle: 0, h0: 45, second: false },
      build: 'v₀ = 20 m/s, θ = 0°, h₀ = 45 m.',
      look: 'Uçuş süresi (3 s) yalnız düşeyden gelir; menzil satırı vx·T.',
      explanation: 'Düşey: 45 = ½·10·t² → t = 3 s. Yatay: x = 20·3 = 60 m.',
      rule: 'Yatay atışta süre yükseklikten bulunur: h = ½gt²; menzil = v₀·t.' },
    { id: 'egik', title: 'Eğik atışta menzil', exam: 'AYT', topic: 'İki boyutta hareket',
      stem: 'Yerden 50 m/s hızla yatayla 53° açı yapacak biçimde atılan cismin menzili kaç m\'dir? (g = 10 m/s², sin 53° = 0,8, cos 53° = 0,6)',
      choices: { A: '120', B: '160', C: '200', D: '240', E: '300' }, answer: 'D',
      setup: { mode: 'polar', v0: 50, angle: 53, h0: 0, second: false },
      build: 'v₀ = 50 m/s, θ = 53°, h₀ = 0.',
      look: 'Bileşenler: vx = 30, vy₀ = 40. Tepeye çıkış 4 s, uçuş 8 s; menzil satırını oku.',
      explanation: 'vy₀ = 50·0,8 = 40 m/s → tepeye 4 s, uçuş 8 s. vx = 50·0,6 = 30 m/s → menzil 30·8 = 240 m.',
      rule: 'Önce hızı bileşenlerine ayır: süre vy\'den, menzil vx·süre.' },
    { id: 'karsilastir', title: 'Aynı yükseklik, farklı yatay hız', exam: 'AYT', topic: 'İki boyutta hareket',
      stem: 'Yerden eğik atılan K ve L cisimlerinin çıkabildikleri en büyük yükseklikler eşittir. K\'nin hızının yatay bileşeni L\'ninkinin iki katıdır. Buna göre;',
      statements: ['Uçuş süreleri eşittir.', 'Menzilleri eşittir.', 'Tepe noktasındaki hızları eşittir.'],
      ask: 'yargılarından hangileri doğrudur?',
      choices: { A: 'Yalnız I', B: 'Yalnız II', C: 'I ve II', D: 'I ve III', E: 'I, II ve III' }, answer: 'A',
      setup: { mode: 'components', vx: 40, vy: 30, h0: 0, second: true, vx2: 20, vy2: 30, h02: 0 },
      build: 'Hız girişi: vx ve vy. K: vx = 40, vy = 30; ikinci cisim L: vx = 20, vy = 30.',
      look: 'İki cisim aynı anda yere iniyor (aynı tepe → aynı vy₀ → aynı süre). Menziller ve tepedeki hızlar (vx) farklı.',
      explanation: 'En büyük yükseklik vy₀²/2g → vy₀ eşit → uçuş süreleri eşit (I doğru).\nMenzil = vx·T: K\'ninki iki kat (II yanlış). Tepede hız = vx: K\'ninki iki kat (III yanlış).',
      rule: 'Atışlarda düşey ve yatay bağımsızdır: süre ve yükseklik vy\'den, menzil ve tepedeki hız vx\'ten gelir.' },
    { id: 'dusey', title: 'Yüksekten yukarı atış', exam: 'AYT', topic: 'İki boyutta hareket',
      stem: 'Yerden 25 m yükseklikteki bir noktadan 20 m/s hızla düşey yukarı atılan cisim kaç saniyede yere düşer? (g = 10 m/s²)',
      choices: { A: '3', B: '4', C: '5', D: '6', E: '7' }, answer: 'C',
      setup: { mode: 'polar', v0: 20, angle: 90, h0: 25, second: false, equal: false },
      build: 'v₀ = 20 m/s, θ = 90°, h₀ = 25 m. (Eksen eşit ölçeğini kapatmak görüntüyü rahatlatır.)',
      look: 'Tepeye 2 s, en büyük yükseklik 45 m; sonra 45 m serbest düşme 3 s. Uçuş süresi satırını oku.',
      explanation: 'y(t) = 25 + 20t − 5t² = 0 → t² − 4t − 5 = 0 → (t − 5)(t + 1) = 0 → t = 5 s.\n(Ya da: 2 s çıkış, 45 m\'den 3 s düşüş.)',
      rule: 'Yukarı atışta: çıkış süresi v₀/g, en büyük yükseklik h₀ + v₀²/2g; iniş serbest düşmedir.' },
  ],
  tips: [
    { title: 'Bileşenlere ayır', see: 'v₀ ve açı verilmiş', look: 'Bileşenler satırı; hız vektörleri.', rule: 'vx = v₀cosθ (sabit), vy₀ = v₀sinθ (her saniye g kadar azalır).' },
    { title: 'Süreyi düşey belirler', see: '"kaç saniyede", "aynı anda yere düşer"', look: 'İkinci cisim + aynı vy₀.', rule: 'Aynı yükseklikten aynı vy ile atılanlar aynı sürede düşer; yatay hız süreyi değiştirmez.' },
    { title: 'Tepe noktası', see: '"en yüksek nokta", "tepede"', look: 'Tepe etiketi ve vy–t grafiğinin sıfırı.', rule: 'Tepede vy = 0, hız = vx. Çıkış süresi vy₀/g, yükseklik vy₀²/2g.', trap: 'Tepede hız sıfır değildir (yatay atış hariç hep vx).' },
    { title: 'Menzil', see: '"ne kadar uzağa düşer"', look: 'Menzil satırı.', rule: 'Menzil = vx · uçuş süresi. Yerden atışta 45° en büyük menzili verir; tamamlayıcı açılar (37°–53°) aynı menzili verir.' },
  ],
};

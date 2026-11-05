import { useEffect, useId, useState } from 'react';
import { journey, motion, dynamics, friction, reaction, physicsFormat as fmt } from './models.js';

const signed = value => (value > 0 ? '+' : '') + fmt(value);
const direction = value => value > 0 ? 'sağa →' : value < 0 ? '← sola' : 'yön yok';
function Slider({ label, value, onChange, min, max, step = 1, unit = '' }) {
  const id = useId();
  return <label className="ph-slider" htmlFor={id}><span>{label} <output>{fmt(value)} {unit}</output></span>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}
function Arrow({ x, y, value, scale = 5, label, tone = 'force' }) {
  if (Math.abs(value) < 1e-9) return <text x={x} y={y - 10} textAnchor="middle">{label}: 0</text>;
  const end = x + Math.sign(value) * Math.min(155, Math.max(22, Math.abs(value) * scale));
  return <g className={`ph-arrow ph-${tone}`}><line x1={x} y1={y} x2={end} y2={y} />
    <path d={`M${end - Math.sign(value) * 9},${y - 6} L${end},${y} L${end - Math.sign(value) * 9},${y + 6}`} />
    <text x={(x + end) / 2} y={y - 13} textAnchor="middle">{label}</text></g>;
}
function Road({ x, min = -10, max = 10, label = 'Cisim' }) {
  const low = Math.min(min, x), high = Math.max(max, x), span = high - low || 1;
  const project = n => 45 + (n - low) / span * 550;
  return <g><line x1="45" x2="595" y1="140" y2="140" className="ph-axis" />
    {[low, 0, high].filter((n, i, all) => all.indexOf(n) === i).map(n => <g key={n}>
      <line x1={project(n)} x2={project(n)} y1="135" y2="146" className="ph-axis" />
      <text x={project(n)} y="166" textAnchor="middle">{fmt(n)} m</text></g>)}
    <g transform={`translate(${project(x)},110)`}><rect x="-19" y="-25" width="38" height="38" rx="9" className="ph-body" /><circle cx="-12" cy="20" r="7" /><circle cx="12" cy="20" r="7" /></g>
    <text x="320" y="34" textAnchor="middle">{label} · konum {signed(x)} m</text></g>;
}
function Graphs({ m }) {
  const x = t => 50 + t / m.duration * 230;
  const low = Math.min(0, m.displacement) - 1, high = m.outward + 1;
  const y = v => 174 - (v - low) / (high - low) * 125;
  const vmax = Math.max(m.outward / m.firstTime, m.back / m.secondTime, 1);
  const vx = t => 365 + t / m.duration * 230, vy = v => 112 - v / vmax * 48;
  return <div className="ph-graphs"><svg viewBox="0 0 320 215" role="img" aria-label="Konum-zaman grafiği: eğim hızı verir">
    <text x="165" y="23" textAnchor="middle">Konum–zaman · eğim = hız</text>
    <path d="M50 45V185H285" className="ph-axis" />
    <line x1="50" x2="280" y1={y(0)} y2={y(0)} className="ph-grid" />
    <polyline points={m.points.map(([t, p]) => `${x(t)},${y(p)}`).join(' ')} className="ph-position" />
    {m.points.map(([t, p]) => <g key={t}><circle cx={x(t)} cy={y(p)} r="4" /><text x={x(t)} y="203" textAnchor="middle">{t} s</text><text x={x(t)} y={y(p) - 9} textAnchor="middle">{fmt(p)} m</text></g>)}
    <circle cx={x(m.time)} cy={y(m.x)} r="7" className="ph-now" />
    </svg><svg viewBox="320 0 320 215" role="img" aria-label="Hız-zaman grafiği: işaretli alan yer değiştirmeyi verir">
    <text x="480" y="23" textAnchor="middle">Hız–zaman · işaretli alan = Δx</text>
    <path d="M365 45V185 M365 112H605" className="ph-axis" />
    <path d={`M365 112V${vy(m.outward / m.firstTime)}H${vx(m.firstTime)}V112Z`} className="ph-area-positive" />
    <path d={`M${vx(m.firstTime)} 112V${vy(-m.back / m.secondTime)}H595V112Z`} className="ph-area-negative" />
    <path d={`M365 ${vy(m.outward / m.firstTime)}H${vx(m.firstTime)} M${vx(m.firstTime)} ${vy(-m.back / m.secondTime)}H595`} className="ph-position" />
    <line x1={vx(m.time)} x2={vx(m.time)} y1="43" y2="181" className="ph-time-marker" />
    <text x="420" y={vy(m.outward / m.firstTime) - 10} textAnchor="middle">+{fmt(m.outward / m.firstTime)} m/s</text>
    <text x="550" y={vy(-m.back / m.secondTime) + 22} textAnchor="middle">{signed(-m.back / m.secondTime)} m/s</text>
    <text x="365" y="203">0 s</text><text x={vx(m.firstTime)} y="203" textAnchor="middle">{m.firstTime} s</text><text x="595" y="203" textAnchor="end">{m.duration} s</text>
  </svg><p className="small muted">Aynı zaman · aynı cisim · iki farklı bakış</p></div>;
}
export default function PhysicsExperiment({ sectionId }) {
  const [time, setTime] = useState(0), [playing, setPlaying] = useState(false);
  const [back, setBack] = useState(4), [frame, setFrame] = useState('peron');
  const [initialVelocity, setInitialVelocity] = useState(-4), [acceleration, setAcceleration] = useState(2);
  const [mass, setMass] = useState(2), [right, setRight] = useState(6), [left, setLeft] = useState(2);
  const [applied, setApplied] = useState(5), [moving, setMoving] = useState(false), [massB, setMassB] = useState(80);
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => setTime(t => { if (t >= 5) { setPlaying(false); return 5; } return Math.min(5, Math.round((t + .05) * 100) / 100); }), 50);
    return () => clearInterval(timer);
  }, [playing]);
  const reset = () => { setPlaying(false); setTime(0); };
  const kind = ['yol', 'hiz', 'grafik'].includes(sectionId) ? 'journey' : sectionId;
  let drawing, controls, results, explanation;
  if (kind === 'referans') {
    const train = frame === 'peron' ? time * 4 : 0;
    drawing = <svg viewBox="0 0 640 200" role="img" aria-label="Peron ve tren gözlemcisine göre yolcu hareketi">
      {[0, 1, 2, 3, 4, 5].map(i => <g key={i} transform={`translate(${70 + i * 110 - (frame === 'tren' ? time * 20 : 0)},0)`}><path d="M0 145V55H28" className="ph-axis" /><text y="175">Peron</text></g>)}
      <g transform={`translate(${70 + train * 12},95)`}><rect width="210" height="45" rx="10" className="ph-body" /><circle cx="30" cy="48" r="12" /><circle cx="180" cy="48" r="12" />
        <circle cx="100" cy="-15" r="12" className="ph-person" /><path d="M100 0V30 M85 10H115" className="ph-axis" /></g>
      <text x="320" y="30" textAnchor="middle">Trende oturan yolcu · {frame === 'tren' ? 'tren gözlemcisi' : 'peron gözlemcisi'}</text></svg>;
    controls = <div className="ph-switch"><button type="button" className="btn btn-secondary" aria-pressed={frame === 'peron'} onClick={() => setFrame('peron')}>Perondan bak</button><button type="button" className="btn btn-secondary" aria-pressed={frame === 'tren'} onClick={() => setFrame('tren')}>Trenden bak</button></div>;
    results = [['Yolcunun hızı', `${frame === 'tren' ? '0' : '+4'} m/s`], ['Seçilen referans', frame === 'tren' ? 'Tren' : 'Peron']];
    explanation = 'Yolcu yer değiştirmeden oturuyor. Gözlemciyi değiştirdiğinde hızı değişiyor. Tren sabit hızlı; bu modelde iki referans da eylemsiz kabul ediliyor.';
  } else if (kind === 'journey') {
    const m = journey({ back, time });
    drawing = <><svg viewBox="0 0 640 190" role="img" aria-label="Önce sağa sonra sola giden cismin yol ve yer değiştirmesi"><Road x={m.x} min={Math.min(0, 6 - back)} max={6} /><Arrow x={70} y={75} value={6} scale={60} label="Gidiş: 6 m" tone="position" /><Arrow x={570} y={105} value={-back} scale={20} label={`Dönüş: ${back} m`} /></svg><Graphs m={m} /></>;
    controls = <Slider label="Geri dönüş yolu" value={back} onChange={v => { setBack(v); reset(); }} min={0} max={12} unit="m" />;
    results = [['Toplam yol', `${fmt(m.distance)} m`], ['Yer değiştirme', `${signed(m.displacement)} m`], ['Ortalama sürat', `${fmt(m.averageSpeed)} m/s`], ['Ortalama hız', `${signed(m.averageVelocity)} m/s`]];
    explanation = `Önce 3 saniyede sağa 6 m; sonra 2 saniyede sola ${back} m. Yol her iki parçayı toplar; yer değiştirme son konumdan ilk konumu çıkarır. İlk ve son konum aynı olsa bile yol silinmez. Grafikteki köşe, idealize edilmiş ani yön değişimidir; o anda sonlu ivme hesaplamıyoruz.`;
  } else if (kind === 'ivme') {
    const m = motion({ initialVelocity, acceleration, time });
    drawing = <svg viewBox="0 0 640 245" role="img" aria-label="Hız ve ivme yönlerinin birbirinden farklı olabildiği doğrusal hareket"><Road x={m.x} min={-25} max={25} /><Arrow x={250} y={200} value={m.velocity} scale={9} label={`v = ${signed(m.velocity)} m/s`} tone="position" /><Arrow x={490} y={200} value={acceleration} scale={20} label={`a = ${signed(acceleration)} m/s²`} /></svg>;
    controls = <><Slider label="İlk hız" value={initialVelocity} onChange={v => { setInitialVelocity(v); reset(); }} min={-4} max={4} unit="m/s" /><Slider label="Sabit ivme" value={acceleration} onChange={v => { setAcceleration(v); reset(); }} min={-2} max={2} step={.5} unit="m/s²" /></>;
    results = [['Hız', `${signed(m.velocity)} m/s · ${direction(m.velocity)}`], ['İvme', `${signed(acceleration)} m/s²`], ['Şu an', m.behaviour], ['Durma anı', m.turnTime && m.turnTime <= 5 ? `${fmt(m.turnTime)} s` : 'Bu aralıkta yok']];
    explanation = 'Hız ve ivme ters yönlüyse sürat azalır; aynı yönlüyse artar. Varsayılan deneyde cisim 2. saniyede bir an durur; sağa ivme sürdüğü için ardından sağa gider. Pozitif ivme her zaman süratlenme demek değildir.';
  } else if (kind === 'net-kuvvet' || kind === 'surtunme') {
    const frictional = kind === 'surtunme';
    const m = frictional ? friction({ mass, applied, initialVelocity: moving ? 3 : 0, time }) : dynamics({ mass, right, left, initialVelocity: 2, time });
    const r = frictional ? applied : right, l = frictional ? m.friction : left;
    drawing = <svg viewBox="0 0 640 280" role="img" aria-label="Yatay kuvvetler ile normal ve ağırlığın serbest cisim diyagramı">
      <rect x="280" y="100" width="80" height="60" rx="7" className="ph-body" />
      <path d="M70 170H570" className="ph-axis" /><text x="320" y="135" textAnchor="middle" className="ph-on-body">{mass} kg</text>
      <Arrow x={360} y={128} value={r} scale={9} label={`${fmt(r)} N`} /><Arrow x={280} y={128} value={-l} scale={9} label={`${fmt(l)} N`} tone="friction" />
      <path d="M320 100V49L314 58M320 49L326 58 M320 160V214L314 205M320 214L326 205" className="ph-axis" />
      <text x="340" y="62">N = {fmt(m.normal)} N</text><text x="340" y="214">mg = {fmt(mass * 10)} N</text>
      <text x="320" y="258" textAnchor="middle">Yatay net: {signed(m.net)} N → ivme: {signed(m.acceleration)} m/s²</text></svg>;
    controls = <><Slider label="Kütle" value={mass} onChange={v => { setMass(v); reset(); }} min={1} max={6} unit="kg" />
      {frictional ? <><Slider label="Sağa çekme kuvveti" value={applied} onChange={v => { setApplied(v); reset(); }} min={0} max={30} unit="N" /><label className="ph-checkbox"><input type="checkbox" checked={moving} onChange={e => { setMoving(e.target.checked); reset(); }} />Başlangıçta sağa 3 m/s ile kayıyor</label></> : <><Slider label="Sağa kuvvet" value={right} onChange={v => { setRight(v); reset(); }} min={0} max={12} unit="N" /><Slider label="Sola kuvvet" value={left} onChange={v => { setLeft(v); reset(); }} min={0} max={12} unit="N" /></>}
      <svg viewBox="0 0 640 190" role="img" aria-label="Kuvvetlerin etkisiyle hesaplanan cismin gerçek konumu"><Road x={m.x} min={-20} max={40} label="Aynı cisim" /></svg></>;
    results = [['Net kuvvet', `${signed(m.net)} N`], ['İvme', `${signed(m.acceleration)} m/s²`], ['Hız', `${signed(m.velocity)} m/s`], ...(frictional ? [['Sürtünme', `${fmt(m.friction)} N · ${m.regime === 'kinetic' ? 'kinetik' : 'statik'}`], ['Statik üst sınır', `${fmt(m.limit)} N`]] : [['Başlangıç hızı', '+2 m/s']])];
    explanation = frictional ? 'Yatay yüzey, g = 10 m/s², μs = 0,4 ve μk = 0,3. Durmakta olan kutuda sürtünme ihtiyaca göre artar; en çok μsN olur. Sınır eşitliğinde denge mümkün. Kayarken sürtünme μkN olur ve kaymaya zıt yönlüdür. Kutu durunca kinetik modelden statiğe geçer; sürtünme kutuyu kendiliğinden geriye götürmez.' : 'Yalnız kutuya etki eden kuvvetleri topluyoruz. Düşeyde normal ve ağırlık dengeli. Yatay net sıfır olduğunda kutunun başlangıçtaki +2 m/s hızı korunur. Net kuvvet hızı değil, hızın nasıl değişeceğini belirler. Ok uzunlukları ekran sınırında kısaltılabilir; sayısal etiketler geçerlidir.';
  } else {
    const m = reaction({ massB, time });
    drawing = <svg viewBox="0 0 640 210" role="img" aria-label="İki farklı patenciye etki eden eşit ve zıt kuvvetler">
      <rect x="60" y="45" width="235" height="135" rx="12" className="ph-area-positive" /><rect x="345" y="45" width="235" height="135" rx="12" className="ph-area-negative" />
      <text x="175" y="72" textAnchor="middle">A patencisi · 40 kg</text><text x="465" y="72" textAnchor="middle">B patencisi · {massB} kg</text>
      <circle cx="225" cy="120" r="20" className="ph-person" /><circle cx="415" cy="120" r="20" className="ph-person" />
      <Arrow x={220} y={120} value={-80} scale={1} label="B'nin A'ya: 80 N" /><Arrow x={420} y={120} value={80} scale={1} label="A'nın B'ye: 80 N" />
      <text x="175" y="166" textAnchor="middle">aA = −2 m/s²</text><text x="465" y="166" textAnchor="middle">aB = +{fmt(m.accelerationB)} m/s²</text>
      <text x="320" y="205" textAnchor="middle">İki ayrı cisim · iki ayrı serbest cisim diyagramı</text></svg>;
    controls = <Slider label="B patencisinin kütlesi" value={massB} onChange={v => { setMassB(v); reset(); }} min={40} max={120} step={20} unit="kg" />;
    results = [['A üzerindeki kuvvet', '← 80 N'], ['B üzerindeki kuvvet', '80 N →'], ['A ivmesi', '−2 m/s²'], ['B ivmesi', `+${fmt(m.accelerationB)} m/s²`]];
    explanation = 'Kütleyi artır: karşılıklı kuvvetler eşit kalır, ağır patencinin ivmesi küçülür. Kuvvetler farklı cisimlere etki eder; bir patencinin net kuvvetini bulurken diğer patencideki kuvveti ekleyemezsin. Yatay sürtünme yok, düşey kuvvetler dengeli; 80 N temas süresince sabit kabul edilir.';
  }
  return <section className="ph-experiment" aria-label="Etkileşimli fizik deneyi">
    <header><span className="ph-eyebrow">GÖR · DEĞİŞTİR · GEREKÇELENDİR</span><h3>Bir şeyi değiştir. Ne sabit kaldı?</h3></header>
    <div className="ph-drawing">{drawing}</div>
    {kind !== 'etki-tepki' && <div className="ph-playback"><button type="button" className="btn btn-primary" onClick={() => { if (time >= 5) setTime(0); setPlaying(p => !p); }}>{playing ? 'Duraklat' : 'Deneyi oynat'}</button><button type="button" className="btn btn-secondary" onClick={reset}>Başa al</button><Slider label="Zaman" value={time} onChange={v => { setTime(v); setPlaying(false); }} min={0} max={5} step={.05} unit="s" /></div>}
    <div className="ph-controls">{controls}</div>
    <dl className="ph-readings" aria-live={playing ? 'off' : 'polite'}>{results.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p className="ph-model-note">{explanation}</p>
  </section>;
}

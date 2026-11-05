import { useState } from 'react';
import { Link } from 'react-router-dom';
import MotionLab from '../../interactive/motion/MotionLab.jsx';
import { useLab } from '../../interactive/motion/useLab.js';
import { statsAt } from '../../interactive/motion/model.js';
import { DEFAULT_EXPERIMENT, experimentScenario, EXPERIMENT_GUIDES, EXPERIMENT_PRESETS } from './labScenarios.js';
import { friction, physicsFormat as fmt } from './models.js';
import '../../interactive/interactive.css';

function Parameter({ label, value, onChange, min, max, step = 1, unit }) {
  return <label className="ph-slider"><span>{label}<output>{fmt(value)} {unit}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}
function ForceArrow({ x, y, end, label, tone = 'var(--pen-blue)' }) {
  if (Math.abs(end - x) < .01) return null;
  const d = Math.sign(end - x);
  return <g><path d={`M${x} ${y}H${end}M${end - d * 7} ${y - 5}L${end} ${y}L${end - d * 7} ${y + 5}`} fill="none" stroke={tone} strokeWidth="2.5" /><text x={(x + end) / 2} y={y - 12} textAnchor="middle">{label}</text></g>;
}
function ForcePanel({ sectionId, p, time }) {
  if (!['net-kuvvet', 'surtunme', 'etki-tepki'].includes(sectionId)) return null;
  if (sectionId === 'etki-tepki') {
    const active = time < 1, F = active ? 80 : 0;
    return <section className="ph-force-panel"><h4>İki cisim, iki ayrı kuvvet toplamı</h4>
      <svg viewBox="0 0 340 190" role="img" aria-label="A ve B üzerinde eşit zıt etkileşim kuvvetleri">
        <rect x="8" y="22" width="151" height="125" rx="12" fill="var(--tint)" stroke="var(--line)" /><rect x="181" y="22" width="151" height="125" rx="12" fill="var(--tint)" stroke="var(--line)" />
        <text x="83" y="48" textAnchor="middle">A · 40 kg</text><text x="256" y="48" textAnchor="middle">B · {p.massB} kg</text>
        <circle cx="110" cy="90" r="17" fill="var(--pen-red)" /><circle cx="230" cy="90" r="17" fill="var(--pen-blue)" />
        <ForceArrow x={105} y={92} end={active ? 30 : 105} label="80 N" tone="var(--pen-red)" /><ForceArrow x={235} y={92} end={active ? 310 : 235} label="80 N" />
        <text x="83" y="130" textAnchor="middle">a = {active ? '−2' : '0'} m/s²</text><text x="256" y="130" textAnchor="middle">a = {fmt(F / p.massB)} m/s²</text>
        <text x="170" y="177" textAnchor="middle">{active ? 'İtme sürüyor · ilk 1 saniye' : 'Temas bitti · hızlar korunuyor'}</text>
      </svg><p>Oklar farklı cisimlerde. Bir patenciyi incelerken diğer patencideki kuvveti onun kuvvet toplamına ekleme.</p></section>;
  }
  const isFriction = sectionId === 'surtunme';
  const f = isFriction ? friction({ mass: p.mass, applied: p.applied, initialVelocity: p.moving ? 3 : 0, time }) : null;
  const right = isFriction ? p.applied : p.right, left = isFriction ? f.friction : p.left;
  const net = right - left, scale = 80 / Math.max(right, left, 1);
  return <section className="ph-force-panel"><h4>Yalnız kutuya etki eden yatay kuvvetler</h4>
    <svg viewBox="0 0 340 190" role="img" aria-label={`Sağa ${right} N, sola ${left} N; yatay net ${net} N`}>
      <path d="M22 135H318" stroke="var(--ink)" /><rect x="144" y="84" width="52" height="50" rx="4" fill="var(--navy)" /><text x="170" y="112" textAnchor="middle" fill="var(--surface)">{p.mass} kg</text>
      <ForceArrow x={196} y={106} end={196 + right * scale} label={`${fmt(right)} N`} /><ForceArrow x={144} y={106} end={144 - left * scale} label={`${fmt(left)} N`} tone="var(--warn)" />
      <text x="170" y="42" textAnchor="middle">Sağ (+) · sol (−)</text><text x="170" y="165" textAnchor="middle">Düşeyde denge: N = mg = {p.mass * 10} N</text>
    </svg>
    <div className="ph-force-result"><span>Yatay net kuvvet</span><strong>{net > 0 ? '+' : ''}{fmt(net)} N</strong><span>İvme</span><strong>{fmt(net / p.mass)} m/s²</strong></div>
    {isFriction && <><dl className="ph-friction-facts"><div><dt>Şimdiki rejim</dt><dd>{f.regime === 'kinetic' ? 'Kinetik · kutu kayıyor' : f.regime === 'stopped' ? 'Durdu · statik denge' : 'Statik · kutu duruyor'}</dd></div><div><dt>Statik üst sınır</dt><dd>{fmt(f.limit)} N</dd></div><div><dt>Gerçek sürtünme</dt><dd>{fmt(f.friction)} N</dd></div></dl><p>μs = 0,4 · μk = 0,3 · g = 10 m/s². Statik üst sınır, gerçek sürtünme ile aynı şey değildir.</p></>}
  </section>;
}

export default function PhysicsExperiment({ sectionId }) {
  const [p, setP] = useState(DEFAULT_EXPERIMENT);
  const [preset, setPreset] = useState('');
  const [editing, setEditing] = useState(false);
  const lab = useLab(experimentScenario(sectionId, DEFAULT_EXPERIMENT));
  const update = (patch, name = '') => { const next = { ...p, ...patch }; setP(next); setPreset(name); setEditing(false); lab.load(experimentScenario(sectionId, next), { keepLayers: true }); };
  const toggleEditor = () => {
    const next = !editing;
    setEditing(next); setPreset('');
    const scenario = experimentScenario(sectionId, p);
    if (next && sectionId === 'grafik') { scenario.graphs = ['x', 'v', 'a']; scenario.vRange = [-8, 8]; scenario.bodies[0].nodes = [[0, 0], [2.5, 4], [5, -2]]; }
    lab.load(scenario, { keepLayers: true });
  };
  const s = statsAt(lab.motions[0], lab.t);
  const [title, mission] = EXPERIMENT_GUIDES[sectionId];
  let insight;
  if (editing) insight = `Kendi hareketini kuruyorsun. Şu an v = ${fmt(s.v)} m/s, a = ${fmt(s.a)} m/s². İçi boş hız noktalarını sürükle veya odaklayıp ok tuşlarıyla değiştir: sahne, konum eğrisi ve alan aynı hareketten yeniden hesaplanır.`;
  else if (sectionId === 'referans') insight = p.frame === 'peron' ? 'Perona göre: tren ve yolcu +4 m/s, perondaki işaret durgun. İki çizgiyi aynı zaman anında karşılaştır.' : 'Trene göre: yolcu durgun, perondaki işaret −4 m/s. Gözlemci değişti, fiziksel yolcu değişmedi.';
  else if (['yol', 'hiz', 'grafik'].includes(sectionId)) insight = `Şu ana kadar yol ${fmt(s.path)} m, yer değiştirme ${fmt(s.disp)} m. ${lab.t < 3 ? 'Gidiş parçasındasın: konum artıyor.' : p.back === 0 ? 'Bu parçada duruyor: zaman geçiyor, yol artmıyor.' : 'Dönüş parçasındasın: alınan yol silinmez.'} Toplam yolculuk 5 s; keskin dönüş 3. saniyede idealize edilmiştir. O anda ivme yorumlamıyoruz.`;
  else if (sectionId === 'ivme') insight = Math.abs(s.v) < 1e-6 ? `Bu anda hız sıfır; ivme ${fmt(s.a)} m/s². İvme sıfır değilse bu kalıcı duruş değildir.` : `Şu an ${s.v < 0 ? 'sola' : 'sağa'} gidiyor. ${s.v * s.a < 0 ? 'Hız ve ivme ters yönlü: sürat azalıyor.' : s.v * s.a > 0 ? 'Hız ve ivme aynı yönlü: sürat artıyor.' : 'İvme sıfır: mevcut hız korunuyor.'}`;
  else if (sectionId === 'net-kuvvet') insight = p.right === p.left ? 'İki yatay kuvvet dengeli. İvme sıfır; kutu başlangıçtaki +2 m/s hızını korur. Düşey normal ile ağırlık da dengelidir.' : `Net kuvvet ${fmt(p.right - p.left)} N; ivme ${fmt((p.right - p.left) / p.mass)} m/s². Kuvvetin yönü hızın değil, hız değişiminin yönünü belirler.`;
  else if (sectionId === 'surtunme') insight = 'Sağdaki rejim kutunun şu an durmasına veya kaymasına göre hesaplanır. Zamanı ilerlet: kinetik sürtünme kutuyu durdurabilir; durduktan sonra kendiliğinden geriye götürmez.';
  else insight = lab.t < 1 ? 'İlk 1 saniyede sabit 80 N karşılıklı itme var. Kütleyi değiştirince kuvvetler eşit kalır; ivmeler değişir.' : '1. saniyede itme bitti. Yatay dış kuvvet yok: patenciler kazandıkları hızları koruyor.';
  const parameter = (key, label, min, max, unit, step = 1) => <Parameter key={key} label={label} min={min} max={max} step={step} unit={unit} value={p[key]} onChange={value => update({ [key]: value })} />;
  return <section className="ph-experiment ph-studio" aria-label="Etkileşimli fizik deneyi">
    <header className="ph-studio-head"><span className="ph-eyebrow">FİZİK LABORATUVARI</span><h3>{title}</h3><p>{mission}</p></header>
    <div className="ph-presets" role="group" aria-label="Deneyin hazır durumları">{EXPERIMENT_PRESETS[sectionId].map(([label, patch]) => <button className="btn btn-secondary btn-sm" type="button" key={label} aria-pressed={!editing && (preset === label || (!preset && Object.entries(patch).every(([k, v]) => p[k] === v)))} onClick={() => update(patch, label)}>{label}</button>)}</div>
    {['grafik', 'ivme'].includes(sectionId) && <button type="button" className="btn btn-secondary ph-edit-toggle" aria-pressed={editing} onClick={toggleEditor}>{editing ? 'Bölümün deneyine dön' : 'Grafiği kendin düzenle'}</button>}
    {!editing && <div className="ph-controls ph-lab-parameters">
      {['yol', 'hiz', 'grafik'].includes(sectionId) && parameter('back', 'Geri dönüş yolu', 0, 12, 'm')}
      {sectionId === 'ivme' && <>{parameter('initialVelocity', 'İlk hız v₀', -4, 4, 'm/s')}{parameter('acceleration', 'Sabit ivme a', -2, 2, 'm/s²', .5)}</>}
      {['net-kuvvet', 'surtunme'].includes(sectionId) && parameter('mass', 'Kutunun kütlesi', 1, 6, 'kg')}
      {sectionId === 'net-kuvvet' && <>{parameter('right', 'Sağa uygulanan kuvvet', 0, 12, 'N')}{parameter('left', 'Sola uygulanan kuvvet', 0, 12, 'N')}</>}
      {sectionId === 'surtunme' && <>{parameter('applied', 'Sağa çekme kuvveti', 0, 30, 'N')}<label className="ph-checkbox"><input type="checkbox" checked={p.moving} onChange={e => update({ moving: e.target.checked })} />Başlangıçta sağa 3 m/s ile kayıyor</label></>}
      {sectionId === 'etki-tepki' && parameter('massB', 'B patencisinin kütlesi', 40, 120, 'kg', 20)}
    </div>}
    <MotionLab lab={lab} editable={editing ? { lockT: true, allowInsert: false, x0: true, linear: sectionId === 'ivme' } : null} onReset={editing ? () => { toggleEditor(); } : undefined} panelTop={<ForcePanel sectionId={sectionId} p={p} time={lab.t} />} layerKeys={['strobe', 'arrows', 'area', 'slope', 'disp', 'events']} />
    {!editing && ['yol', 'hiz', 'grafik', 'etki-tepki'].includes(sectionId) && <div className="ph-milestones" role="group" aria-label="Önemli deney anları">{(sectionId === 'etki-tepki' ? [[.5, 'İtme sürüyor · 0,5 s'], [1, 'İtme bitti · 1 s'], [5, 'Serbest gidiş · 5 s']] : [[0, 'Başlangıç · 0 s'], [3, 'İkinci parça · 3 s'], [5, 'Yolculuk sonu · 5 s']]).map(([t, label]) => <button type="button" className="btn btn-secondary btn-sm" key={t} onClick={() => lab.seek(t)}>{label}</button>)}</div>}
    <p className="ph-live-explanation" role="status" aria-live={lab.playing ? 'off' : 'polite'}><strong>Şu an ne oluyor?</strong> {insight}</p>
    <details className="ph-lab-help"><summary>Grafikleri nasıl okuyacağım?</summary><p>Konum-zamanda eğim hızdır. Hız-zamanda işaretli alan yer değiştirme, eğim ivmedir. İvme-zamanda alan hız değişimini verir. Aynı kesikli zaman çizgisi bütün grafiklerde aynı anı gösterir. Olay düğmelerine tıklayabilir, grafiğe dokunabilir veya zaman sürgüsünü klavyeyle değiştirebilirsin.</p><Link to="/interaktif-ogrenme/fizik/hareket">Aynı laboratuvarda serbest hareket kur →</Link></details>
  </section>;
}

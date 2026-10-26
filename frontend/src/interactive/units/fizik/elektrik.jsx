import { useState } from 'react';
import { Choice, LabGrid, Note, Panel, Readouts, Slider, Steps, TextField, Toggle } from '../../kit/controls.jsx';
import { fmt } from '../../kit/num.js';
import { addInParallel, addInSeries, CELL, equivalentText, findNode, layout, leaves, measure, removeNode, solveCircuit, updateNode } from './circuitEngine.js';

const R = (id, name, r) => ({ id, type: 'R', name, r });
const L = (id, name, r = 6) => ({ id, type: 'L', name, r });
const K = (id, name, closed = true) => ({ id, type: 'K', name, closed, r: 0 });
const S = (id, ...children) => ({ id, type: 'S', children });
const P = (id, ...children) => ({ id, type: 'P', children });

export const PRESETS = [
  { id: 'seri', title: 'Seri: R1 + R2', emf: 12, root: S('g1', R('e1', 'R1', 4), R('e2', 'R2', 2)) },
  { id: 'paralel', title: 'Paralel: R1 ∥ R2 ∥ R3', emf: 12, root: P('g1', R('e1', 'R1', 6), R('e2', 'R2', 3), R('e3', 'R3', 2)) },
  { id: 'karisik', title: 'Karışık: R1 + (R2 ∥ R3)', emf: 24, root: S('g1', R('e1', 'R1', 6), P('g2', R('e2', 'R2', 6), R('e3', 'R3', 3))) },
  { id: 'ampuller', title: 'Özdeş ampuller: K + (L ∥ M)', emf: 12, root: S('g1', L('e1', 'K'), P('g2', L('e2', 'L'), S('g3', K('e4', 'A1'), L('e3', 'M')))) },
  { id: 'kisa', title: 'Kısa devre: K + (L ∥ anahtar)', emf: 12, root: S('g1', L('e1', 'K'), P('g2', L('e2', 'L'), K('e3', 'A1', false))) },
  { id: 'guc', title: 'Paralel ampuller: X (6 Ω) ∥ Y (12 Ω)', emf: 12, root: P('g1', L('e1', 'X', 6), L('e2', 'Y', 12)) },
];

const unit = (node) => (node.type === 'K' ? '' : ' Ω');
const nameOf = (node) => node.name || node.id;

function Element({ box, info, selected, onSelect, maxP, showValues, animate, onToggle }) {
  const { node, x, y, w, h } = box;
  const cx = x + w / 2; const cy = y + h / 2;
  const flow = animate && info.I > 1e-9 ? { animation: `kit-flow ${Math.min(6, Math.max(0.35, 2.4 / info.I))}s linear infinite` } : undefined;
  const lead = (x1, x2) => <>
    <line x1={x1} x2={x2} y1={cy} y2={cy} stroke="var(--ink)" strokeWidth="2.2" />
    {flow && <line x1={x1} x2={x2} y1={cy} y2={cy} stroke="var(--warn)" strokeWidth="2.6" strokeDasharray="5 11" className="kit-flow" style={flow} />}
  </>;
  let symbol;
  if (node.type === 'R') symbol = <rect x={cx - 24} y={cy - 10} width="48" height="20" rx="3" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.2" />;
  else if (node.type === 'L') {
    const glow = maxP > 0 ? info.P / maxP : 0;
    symbol = <g>
      {glow > 0.001 && <circle cx={cx} cy={cy} r={16 + 14 * glow} fill="var(--warn)" opacity={0.15 + 0.45 * glow} />}
      <circle cx={cx} cy={cy} r="14" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.2" />
      <path d={`M${cx - 9},${cy - 9}L${cx + 9},${cy + 9}M${cx + 9},${cy - 9}L${cx - 9},${cy + 9}`} stroke="var(--ink)" strokeWidth="1.8" />
    </g>;
  } else {
    symbol = <g onClick={(e) => { e.stopPropagation(); onToggle(node.id); }} style={{ cursor: 'pointer' }}>
      <circle cx={cx - 20} cy={cy} r="3.5" fill="var(--ink)" /><circle cx={cx + 20} cy={cy} r="3.5" fill="var(--ink)" />
      <line x1={cx - 20} y1={cy} x2={node.closed ? cx + 20 : cx + 14} y2={node.closed ? cy : cy - 18} stroke="var(--ink)" strokeWidth="2.6" />
    </g>;
  }
  const half = node.type === 'L' ? 16 : node.type === 'K' ? 20 : 24;
  return <g className={`circ-el${selected ? ' selected' : ''}`} onClick={() => onSelect(node.id)} role="button" tabIndex={0}
    aria-label={`${nameOf(node)} ${node.type === 'K' ? (node.closed ? 'kapalı anahtar' : 'açık anahtar') : `${fmt(node.r)} ohm`}`}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(node.id); } }}>
    <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx="8" fill={selected ? 'var(--tint)' : 'transparent'} stroke={selected ? 'var(--navy)' : 'none'} strokeWidth="2" />
    {lead(x, cx - half)}{lead(cx + half, x + w)}
    {symbol}
    <text x={cx} y={y + 16} textAnchor="middle" className="kit-label" fill="var(--ink)">{nameOf(node)}{node.type === 'K' ? (node.closed ? ' (kapalı)' : ' (açık)') : ` ${fmt(node.r)}${unit(node)}`}</text>
    {showValues && <text x={cx} y={y + h - 8} textAnchor="middle" className="kit-small">{fmt(info.I, 2)} A · {fmt(info.V, 2)} V</text>}
  </g>;
}

function Schematic({ root, solution, emf, internal, selected, onSelect, onToggle, showValues, animate }) {
  const size = measure(root);
  const X0 = 70; const Y0 = 16;
  const boxes = layout(root, X0, Y0);
  const W = X0 + size.w + 70; const yB = Y0 + size.h + 46; const H = yB + 40;
  const cyR = Y0 + size.h / 2;
  const bx = X0 + size.w / 2;
  const maxP = Math.max(0, ...leaves(root).filter((n) => n.type === 'L').map((n) => solution.values.get(n.id)?.P ?? 0));
  const flow = animate && solution.I > 1e-9 ? { animation: `kit-flow ${Math.min(6, Math.max(0.35, 2.4 / solution.I))}s linear infinite` } : undefined;
  const loop = `M${X0},${cyR}L${X0 - 40},${cyR}L${X0 - 40},${yB}L${bx - 14},${yB}M${bx + 14},${yB}L${X0 + size.w + 40},${yB}L${X0 + size.w + 40},${cyR}L${X0 + size.w},${cyR}`;
  const railLines = boxes.filter((b) => b.node.type === 'P').flatMap((b) => {
    const kids = boxes.filter((k) => b.node.children.includes(k.node));
    const ys = kids.map((k) => k.y + k.h / 2);
    return [
      <line key={`${b.node.id}l`} x1={b.x} x2={b.x} y1={Math.min(...ys)} y2={Math.max(...ys)} stroke="var(--ink)" strokeWidth="2.2" />,
      <line key={`${b.node.id}r`} x1={b.x + b.w} x2={b.x + b.w} y1={Math.min(...ys)} y2={Math.max(...ys)} stroke="var(--ink)" strokeWidth="2.2" />,
      ...kids.flatMap((k) => [
        <line key={`${k.node.id}a`} x1={b.x} x2={k.x} y1={k.y + k.h / 2} y2={k.y + k.h / 2} stroke="var(--ink)" strokeWidth="2.2" />,
        <line key={`${k.node.id}b`} x1={k.x + k.w} x2={b.x + b.w} y1={k.y + k.h / 2} y2={k.y + k.h / 2} stroke="var(--ink)" strokeWidth="2.2" />,
      ]),
    ];
  });
  return <svg viewBox={`0 0 ${W} ${H}`} className="kit-plot circ-svg" role="img" aria-label="Devre şeması" style={{ maxWidth: `${Math.max(420, W * 1.15)}px` }}>
    <rect x="0" y="0" width={W} height={H} fill="var(--surface)" />
    <path d={loop} fill="none" stroke="var(--ink)" strokeWidth="2.2" />
    {flow && <path d={loop} fill="none" stroke="var(--warn)" strokeWidth="2.6" strokeDasharray="5 11" className="kit-flow" style={flow} />}
    <line x1={bx - 8} x2={bx - 8} y1={yB - 18} y2={yB + 18} stroke="var(--ink)" strokeWidth="2.6" />
    <line x1={bx + 8} x2={bx + 8} y1={yB - 10} y2={yB + 10} stroke="var(--ink)" strokeWidth="5" />
    <text x={bx} y={yB + 34} textAnchor="middle" className="kit-label" fill="var(--ink)">ε = {fmt(emf)} V{internal ? ` · r = ${fmt(internal)} Ω` : ''}</text>
    <text x={bx - 20} y={yB - 22} textAnchor="end" className="kit-small">+</text><text x={bx + 20} y={yB - 22} className="kit-small">−</text>
    {railLines}
    {boxes.filter((b) => !b.node.children).map((b) => <Element key={b.node.id} box={b} info={solution.values.get(b.node.id)} selected={selected === b.node.id}
      onSelect={onSelect} onToggle={onToggle} maxP={maxP} showValues={showValues} animate={animate} />)}
    <text x={bx + 24} y={yB - 8} className="kit-small">I = {fmt(solution.I, 3)} A →</text>
  </svg>;
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const [selected, setSelected] = useState(null);
  const solution = solveCircuit(s.root, s.emf, s.internal);
  const sel = selected ? findNode(s.root, selected) : null;
  const elements = leaves(s.root);
  const bulbs = elements.filter((n) => n.type === 'L').map((n) => ({ n, P: solution.values.get(n.id).P })).sort((p, q) => q.P - p.P);
  const order = bulbs.map((b, i) => (i === 0 ? nameOf(b.n) : `${Math.abs(b.P - bulbs[i - 1].P) < 1e-9 ? ' = ' : ' > '}${nameOf(b.n)}`)).join('');
  const count = (type) => elements.filter((n) => n.type === type).length;
  const newElement = (type) => (type === 'K' ? { type: 'K', name: `A${count('K') + 1}`, closed: true, r: 0 } : { type, name: type === 'L' ? `L${count('L') + 1}` : `R${count('R') + 1}`, r: 6 });
  const toggle = (id) => { const node = findNode(s.root, id); set({ root: updateNode(s.root, id, { closed: !node.closed }) }); };
  return <LabGrid top={<div className="kit-row">
    <label className="field"><span className="field-label">Hazır devre</span>
      <select value="" onChange={(e) => { const p = PRESETS.find((x) => x.id === e.target.value); if (p) { setSelected(null); set({ root: p.root, emf: p.emf, internal: 0 }); } }}>
        <option value="">Seç…</option>{PRESETS.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
    <Toggle label="Akım ve gerilimleri yaz" checked={s.showValues} onChange={(showValues) => set({ showValues })} />
    <Toggle label="Akımı canlandır" checked={s.animate} onChange={(animate) => set({ animate })} />
  </div>} visual={<>
    <div className="circ-wrap"><Schematic root={s.root} solution={solution} emf={s.emf} internal={s.internal} selected={selected} onSelect={setSelected} onToggle={toggle} showValues={s.showValues} animate={s.animate} /></div>
    <p className="muted small">Bir elemana tıkla: sağdaki panelden değiştir, yanına seri/paralel eleman ekle ya da sil. Anahtara tıklamak onu açıp kapatır.</p>
    {solution.short && <Note tone="bad">Kısa devre: üretecin uçları dirençsiz bir yolla birleşti (ideal üreteçte akım sonsuz).</Note>}
    <Readouts title="Hesap (canlı)" items={[
      ['Eşdeğer direnç', `Reş = ${equivalentText(s.root)} = ${solution.Req === Infinity ? '∞ (devre açık)' : `${fmt(solution.Req, 3)} Ω`}`],
      ['Ana kol akımı', `I = ε / (Reş + r) = ${fmt(s.emf)} / (${fmt(solution.Req, 3)} + ${fmt(s.internal)}) = ${fmt(solution.I, 3)} A`, 'ok'],
      s.internal > 0 && ['Kutup gerilimi', `V = ε − I·r = ${fmt(s.emf - solution.I * s.internal, 3)} V`],
      ...elements.map((n) => { const v = solution.values.get(n.id); return [nameOf(n), `I = ${fmt(v.I, 3)} A · V = ${fmt(v.V, 3)} V${n.type !== 'K' ? ` · P = ${fmt(v.P, 3)} W` : ''}`]; }),
      bulbs.length > 1 && ['Parlaklık sırası', order, 'warn'],
    ]} />
  </>} side={<>
    <Panel title="Üreteç">
      <Slider label="ε (emk)" value={s.emf} min={1} max={48} step={1} unit="V" onChange={(emf) => set({ emf })} />
      <Slider label="İç direnç r" value={s.internal} min={0} max={5} step={0.5} unit="Ω" onChange={(internal) => set({ internal })} />
    </Panel>
    <Panel title={sel ? `Seçili: ${nameOf(sel)}` : 'Eleman seçilmedi'}>
      {!sel && <p className="muted small">Şemada bir elemana tıkla.</p>}
      {sel && <>
        <TextField label="Ad" value={sel.name ?? ''} onChange={(name) => set({ root: updateNode(s.root, sel.id, { name }) })} />
        <Choice label="Tür" options={[{ value: 'R', label: 'Direnç' }, { value: 'L', label: 'Ampul' }, { value: 'K', label: 'Anahtar' }]} value={sel.type}
          onChange={(type) => set({ root: updateNode(s.root, sel.id, type === 'K' ? { type, closed: true, r: 0 } : { type, r: sel.r || 6 }) })} />
        {sel.type !== 'K' ? <Slider label="Direnç" value={sel.r} min={0.5} max={30} step={0.5} unit="Ω" onChange={(r) => set({ root: updateNode(s.root, sel.id, { r }) })} />
          : <Toggle label="Anahtar kapalı" checked={sel.closed} onChange={(closed) => set({ root: updateNode(s.root, sel.id, { closed }) })} />}
        <div className="kit-chips">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ root: addInSeries(s.root, sel.id, newElement('R')) })}>+ Seri direnç</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ root: addInParallel(s.root, sel.id, newElement('R')) })}>+ Paralel direnç</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ root: addInSeries(s.root, sel.id, newElement('L')) })}>+ Seri ampul</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ root: addInParallel(s.root, sel.id, newElement('L')) })}>+ Paralel ampul</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ root: addInSeries(s.root, sel.id, newElement('K')) })}>+ Seri anahtar</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { set({ root: removeNode(s.root, sel.id) }); setSelected(null); }}>Sil</button>
        </div>
      </>}
    </Panel>
    <Steps title="Kurallar" lines={[
      'Seri: akım her elemanda aynı; Reş = R₁ + R₂ + …; gerilimler toplanır.',
      'Paralel: gerilim her kolda aynı; 1/Reş = 1/R₁ + 1/R₂ + …; akımlar toplanır.',
      'Güç P = I²R = V²/R. Ampulün parlaklığı gücüyle orantılıdır.',
      'Kapalı anahtar tel gibidir (0 Ω); ona paralel elemandan akım geçmez (kısa devre).',
    ]} />
  </>} />;
}

const initial = { root: PRESETS[2].root, emf: 24, internal: 0, showValues: true, animate: true };

export default {
  Lab,
  initial,
  intro: 'Hazır bir devre seç ya da elemanlara tıklayıp kendi devreni kur. Eşdeğer direnç formülü değerleriyle, her elemanın akımı, gerilimi ve gücü, ampullerin parlaklığı canlı hesaplanır.',
  questions: [
    { id: 'karisik', title: 'Paralel koldaki akım', exam: 'TYT', topic: 'Elektrik devreleri',
      stem: 'İç direnci önemsiz 24 V\'luk üretece R1 = 6 Ω direnci ile, birbirine paralel bağlı R2 = 6 Ω ve R3 = 3 Ω dirençleri seri bağlanıyor. R3 direncinden geçen akım kaç A\'dir?',
      choices: { A: '1', B: '1,5', C: '2', D: '3', E: '4' }, answer: 'C',
      setup: { root: PRESETS[2].root, emf: 24, internal: 0 },
      build: 'Hazır devre: "Karışık: R1 + (R2 ∥ R3)". ε = 24 V; R1 = 6, R2 = 6, R3 = 3 Ω.',
      look: 'Önce eşdeğer direnç (6 + 2 = 8 Ω) ve ana akım (3 A); sonra paralel kolun gerilimini (6 V) ve R3 satırını oku.',
      explanation: 'R2 ∥ R3 = 6·3/(6 + 3) = 2 Ω → Reş = 6 + 2 = 8 Ω → I = 24/8 = 3 A.\nParalel kolun gerilimi 3·2 = 6 V → I₃ = 6/3 = 2 A (R2\'den 1 A).',
      rule: 'Önce Reş ve ana akım; sonra paralel grubun gerilimi; en son kollara V/R ile dağıt.' },
    { id: 'anahtar', title: 'Anahtar açılınca parlaklık', exam: 'TYT', topic: 'Elektrik devreleri',
      stem: 'Özdeş K, L, M ampulleri ve A1 anahtarı ile kurulan devrede K ampulü ana kolda; L ile M birbirine paralel ve A1 anahtarı M ile seridir. Başlangıçta A1 kapalıdır. A1 açılırsa K ve L ampullerinin parlaklıkları nasıl değişir?',
      choices: { A: 'K artar, L artar', B: 'K azalır, L artar', C: 'K azalır, L azalır', D: 'K artar, L azalır', E: 'İkisi de değişmez' }, answer: 'B',
      setup: { root: PRESETS[3].root, emf: 12, internal: 0 },
      build: 'Hazır devre: "Özdeş ampuller: K + (L ∥ M)". Anahtar A1 kapalı.',
      look: 'K ve L\'nin güçlerini (P) not et; sonra A1\'e tıklayıp aç ve yeniden oku. Parlaklık halkalarını karşılaştır.',
      explanation: 'Kapalıyken Reş = R + R/2 = 1,5R; K\'nin gerilimi 2/3·ε, L\'ninki 1/3·ε.\nAçılınca M kolu kopar: Reş = 2R; K ve L seri, her biri ε/2 alır.\nK\'nin gerilimi 2ε/3 → ε/2 (azalır); L\'ninki ε/3 → ε/2 (artar).',
      rule: 'Bir kol koparsa Reş artar, ana akım azalır: ana koldakiler söner/azalır, kalan paralel kolun payı artar.' },
    { id: 'guc', title: 'Paralel kollarda güç', exam: 'TYT', topic: 'Elektrik devreleri',
      stem: 'Dirençleri R ve 2R olan X ve Y ampulleri aynı üretece paralel bağlanıyor. X\'in gücünün Y\'nin gücüne oranı P_X / P_Y kaçtır?',
      choices: { A: '1/4', B: '1/2', C: '1', D: '2', E: '4' }, answer: 'D',
      setup: { root: PRESETS[5].root, emf: 12, internal: 0 },
      build: 'Hazır devre: "Paralel ampuller: X (6 Ω) ∥ Y (12 Ω)".',
      look: 'İki ampulün gerilimi aynı (12 V). Güçleri ve parlaklık sırasını oku; dirençleri değiştirip oranı yeniden dene.',
      explanation: 'Paralelde gerilim ortaktır → P = V²/R. P_X / P_Y = (V²/R) / (V²/2R) = 2.',
      rule: 'Paralelde P = V²/R: küçük dirençli olan daha parlak. Seride P = I²R: büyük dirençli olan daha parlak.' },
    { id: 'kisa-devre', title: 'Ampule paralel anahtar', exam: 'TYT', topic: 'Elektrik devreleri',
      stem: 'Özdeş K ve L ampulleri seri bağlıdır ve L ampulüne paralel bir A1 anahtarı vardır (başlangıçta açık). A1 kapatılırsa K ve L ampullerinin durumu ne olur?',
      choices: { A: 'K söner, L parlar', B: 'L söner, K\'nin parlaklığı artar', C: 'İkisi de söner', D: 'İkisinin de parlaklığı artar', E: 'Değişmez' }, answer: 'B',
      setup: { root: PRESETS[4].root, emf: 12, internal: 0 },
      build: 'Hazır devre: "Kısa devre: K + (L ∥ anahtar)". A1 açık.',
      look: 'A1\'e tıklayıp kapat: L\'nin akımı 0 olur, K\'nin gerilimi ε/2\'den ε\'ye çıkar.',
      explanation: 'Kapalı anahtar 0 Ω\'dur; L ile paralel olduğundan akımın tamamı anahtardan geçer, L söner.\nReş = R olur; K\'nin üzerindeki gerilim ε/2\'den ε\'ye çıkar → K daha parlak.',
      rule: 'Bir elemana dirençsiz tel paralel bağlanırsa o eleman kısa devre olur ve devreden çıkmış sayılır.' },
  ],
  tips: [
    { title: 'Eşdeğer direnç', see: 'Karışık bağlı dirençler', look: 'Reş satırı, iç içe gruplar.', rule: 'En içteki paralel gruptan başla; iki direnç için R₁R₂/(R₁ + R₂).' },
    { title: 'Akım dağılımı', see: '"… dirençten geçen akım", ampermetre', look: 'Eleman satırları (I, V).', rule: 'Paralel kollarda akım dirençle ters orantılı paylaşılır; seri elemanlarda akım aynıdır.' },
    { title: 'Parlaklık', see: '"parlaklık sıralaması", "söner", "artar"', look: 'Parlaklık sırası satırı ve halkalar.', rule: 'Parlaklık ∝ güç. Paralelde V²/R, seride I²R ile karşılaştır.', trap: 'Seride büyük direnç parlaktır, paralelde küçük direnç.' },
    { title: 'Anahtar ve kısa devre', see: '"anahtar açılırsa/kapatılırsa"', look: 'Anahtara tıkla, önce/sonra oku.', rule: 'Açık anahtar = kopuk kol; kapalı anahtar = tel. Tel paralel bağlandığı elemanı kısa devre eder.' },
  ],
};

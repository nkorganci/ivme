import { useState } from 'react';
import { Choice, LabGrid, Note, NumberField, Panel, Readouts, Steps, TextField, Toggle } from '../../kit/controls.jsx';
import { dateLabel, decimalYear, ERAS, EVENTS, sortEvents } from './events.js';

const ERA_TONE = { ilk: 'var(--pen-green)', islam: 'var(--pen-blue)', osmanli: 'var(--navy)', milli: 'var(--pen-red)', inkilap: 'var(--warn)', ozel: 'var(--pen-black)' };
const shuffle = (list, seed = Date.now()) => { const out = [...list]; let x = seed % 2147483647 || 1; for (let i = out.length - 1; i > 0; i -= 1) { x = (x * 48271) % 2147483647; const j = x % (i + 1); [out[i], out[j]] = [out[j], out[i]]; } return out; };

function Timeline({ events, range, selected, highlight, onSelect, showCauses }) {
  const W = 1000; const axisY = 250; const laneH = 23;
  const [y0, y1] = range;
  const pad = (y1 - y0) * 0.03;
  const sx = (year) => 40 + ((year - (y0 - pad)) / (y1 - y0 + 2 * pad)) * (W - 80);
  const lanesEnd = [];
  const placed = sortEvents(events).map((ev) => {
    const x = sx(decimalYear(ev.date));
    const width = Math.min(270, Math.min(38, ev.label.length) * 6.9 + 18);
    let lane = lanesEnd.findIndex((end) => end < x - 6);
    if (lane < 0) { lane = lanesEnd.length < 9 ? lanesEnd.length : lanesEnd.indexOf(Math.min(...lanesEnd)); }
    lanesEnd[lane] = x + width;
    return { ev, x, lane, width };
  });
  const span = y1 - y0;
  const step = span > 1500 ? 200 : span > 600 ? 100 : span > 200 ? 50 : span > 40 ? 10 : span > 10 ? 2 : 0.5;
  const ticks = [];
  for (let t = Math.ceil(y0 / step) * step; t <= y1; t += step) ticks.push(Number(t.toFixed(2)));
  const pos = new Map(placed.map((p) => [p.ev.id, p]));
  return <svg viewBox={`0 0 ${W} 330`} className="kit-plot tl-svg" role="img" aria-label="Zaman çizelgesi">
    <rect width={W} height="330" fill="var(--surface)" />
    <line x1="30" x2={W - 30} y1={axisY} y2={axisY} stroke="var(--ink)" strokeWidth="2" />
    {ticks.map((t) => <g key={t}><line x1={sx(t)} x2={sx(t)} y1={axisY - 5} y2={axisY + 5} stroke="var(--ink)" />
      <text x={sx(t)} y={axisY + 20} textAnchor="middle" className="kit-small">{step < 1 ? (Number.isInteger(t) ? t : 'Tem') : t < 0 ? `MÖ ${-t}` : t}</text></g>)}
    {showCauses && placed.flatMap(({ ev, x }) => ev.causes.filter((c) => pos.has(c)).map((c) => {
      const from = pos.get(c).x;
      const mid = (from + x) / 2; const depth = Math.min(55, 14 + Math.abs(x - from) / 6);
      return <path key={`${c}-${ev.id}`} d={`M${from},${axisY + 6} Q${mid},${axisY + 6 + depth * 1.6} ${x},${axisY + 6}`} fill="none" stroke="var(--warn)" strokeWidth="1.6" markerEnd="none" opacity=".8" />;
    }))}
    {placed.map(({ ev, x, lane }) => {
      const y = axisY - 30 - lane * laneH;
      const strong = selected === ev.id || highlight.includes(ev.id);
      return <g key={`l-${ev.id}`} pointerEvents="none">
        <line x1={x} x2={x} y1={axisY} y2={y + 8} stroke={ERA_TONE[ev.era]} strokeWidth={strong ? 2 : 1} opacity=".55" />
        <circle cx={x} cy={axisY} r={strong ? 6 : 4} fill={ERA_TONE[ev.era]} />
      </g>;
    })}
    {placed.map(({ ev, x, lane, width }) => {
      const y = axisY - 30 - lane * laneH;
      const active = selected === ev.id; const hl = highlight.includes(ev.id);
      const left = Math.min(Math.max(4, x - 8), W - width - 4);
      return <g key={ev.id} className="tl-event" role="button" tabIndex={0} aria-label={`${dateLabel(ev.date)}: ${ev.label}`} onClick={() => onSelect(ev.id)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(ev.id); } }}>
        <rect x={left} y={y - 8} width={width} height="19" rx="9" fill={active ? ERA_TONE[ev.era] : hl ? 'var(--warn-soft)' : 'var(--surface)'} stroke={ERA_TONE[ev.era]} strokeWidth={hl ? 2 : 1} />
        <text x={left + 8} y={y + 5} className="tl-label" fill={active ? 'var(--surface)' : 'var(--ink)'}>{ev.label.length > 38 ? `${ev.label.slice(0, 36)}…` : ev.label}</text>
      </g>;
    })}
  </svg>;
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const [draft, setDraft] = useState({ label: '', year: 1920, month: 0, day: 0 });
  const all = [...EVENTS, ...s.custom];
  const era = ERAS.find((x) => x.id === s.era);
  const range = era ? era.range : [-260, 1940];
  const visible = all.filter((ev) => (era ? ev.era === era.id || (ev.era === 'ozel' && decimalYear(ev.date) >= range[0] && decimalYear(ev.date) <= range[1]) : true));
  const selected = all.find((ev) => ev.id === s.selected);
  const effects = selected ? all.filter((ev) => ev.causes.includes(selected.id)) : [];
  const quizEvents = s.quiz.order.map((id) => all.find((ev) => ev.id === id)).filter(Boolean);
  const correct = sortEvents(quizEvents).map((ev) => ev.id);
  const newQuiz = () => {
    const pool = visible.length >= 5 ? visible : EVENTS;
    const pick = shuffle(pool).slice(0, 5).map((ev) => ev.id);
    set({ quiz: { order: shuffle(pick), checked: false } });
  };
  const move = (i, dir) => {
    const order = [...s.quiz.order]; const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    set({ quiz: { ...s.quiz, order, checked: false } });
  };
  const addCustom = () => {
    if (!draft.label.trim()) return;
    const date = [Math.round(draft.year), draft.month || undefined, draft.month && draft.day ? draft.day : undefined].filter((v) => v !== undefined);
    set({ custom: [...s.custom, { id: `ozel-${s.custom.length + 1}`, date, era: 'ozel', label: draft.label.trim(), note: 'Senin eklediğin olay.', causes: [] }] });
    setDraft({ ...draft, label: '' });
  };
  return <div className="kit-lab">
    <div className="kit-top">
      <Choice options={[{ value: 'kesfet', label: 'Keşfet' }, { value: 'sirala', label: 'Sırala (alıştırma)' }, { value: 'ekle', label: 'Kendi olayını ekle' }]} value={s.mode} onChange={(mode) => set({ mode })} />
      <label className="field"><span className="field-label">Dönem</span>
        <select value={s.era} onChange={(e) => set({ era: e.target.value, selected: null })}><option value="all">Hepsi</option>{ERAS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <Toggle label="Neden → sonuç bağları" checked={s.showCauses} onChange={(showCauses) => set({ showCauses })} />
    </div>
    <div className="kit-card"><Timeline events={visible} range={range} selected={s.selected} highlight={s.highlight} onSelect={(id) => set({ selected: id })} showCauses={s.showCauses} /></div>
    <div className="kit-legend">{ERAS.map((x) => <span key={x.id}><i style={{ background: ERA_TONE[x.id] }} />{x.name}</span>)}<span><i style={{ background: 'var(--warn)' }} />neden → sonuç</span></div>
    <LabGrid visual={<>
      {s.mode === 'kesfet' && (selected ? <Readouts title={selected.label} items={[
        ['Tarih', dateLabel(selected.date)],
        ['Dönem', ERAS.find((x) => x.id === selected.era)?.name ?? 'Senin olayın'],
        selected.note && ['Önemi', selected.note],
        selected.causes.length > 0 && ['Öncesinde (neden)', selected.causes.map((c) => all.find((ev) => ev.id === c)?.label).join(' · ')],
        effects.length > 0 && ['Sonrasında (sonuç)', effects.map((ev) => ev.label).join(' · ')],
      ]} /> : <Note>Çizelgede bir olaya tıkla: tarihi, önemi, öncesi ve sonrası burada görünür.</Note>)}
      {s.mode === 'sirala' && <section className="kit-panel">
        <h4>Olayları eskiden yeniye sırala</h4>
        {quizEvents.length === 0 ? <p className="muted">"Yeni 5 olay" ile başla.</p> : <ol className="tl-quiz">{quizEvents.map((ev, i) => {
          const ok = s.quiz.checked && correct[i] === ev.id;
          return <li key={ev.id} className={s.quiz.checked ? (ok ? 'ok' : 'bad') : ''}>
            <span>{ev.label}{s.quiz.checked && <small> — {dateLabel(ev.date)}{!ok ? ` (doğru sıra: ${correct.indexOf(ev.id) + 1})` : ''}</small>}</span>
            <span className="tl-quiz-buttons"><button type="button" className="btn btn-secondary btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Yukarı taşı">▲</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => move(i, 1)} disabled={i === quizEvents.length - 1} aria-label="Aşağı taşı">▼</button></span>
          </li>;
        })}</ol>}
        <div className="kit-chips"><button type="button" className="btn btn-secondary btn-sm" onClick={newQuiz}>Yeni 5 olay (seçili dönemden)</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!quizEvents.length} onClick={() => set({ quiz: { ...s.quiz, checked: true } })}>Kontrol et</button></div>
        {s.quiz.checked && <p className={correct.every((id, i) => s.quiz.order[i] === id) ? 'st-ok' : 'st-bad'}>{correct.every((id, i) => s.quiz.order[i] === id) ? 'Sıralama doğru!' : 'Bazı olaylar yanlış sırada; tarihlerine bakıp yeniden dene.'}</p>}
      </section>}
      {s.mode === 'ekle' && <section className="kit-panel">
        <h4>Kendi olayını çizelgeye ekle</h4>
        <TextField label="Olay" value={draft.label} onChange={(label) => setDraft({ ...draft, label })} placeholder="ör. Kabotaj Kanunu" />
        <div className="kit-row"><NumberField label="Yıl (MÖ için −)" value={draft.year} onChange={(year) => setDraft({ ...draft, year })} width={130} />
          <NumberField label="Ay (0 = yok)" value={draft.month} onChange={(month) => setDraft({ ...draft, month: Math.max(0, Math.min(12, Math.round(month))) })} width={110} />
          <NumberField label="Gün (0 = yok)" value={draft.day} onChange={(day) => setDraft({ ...draft, day: Math.max(0, Math.min(31, Math.round(day))) })} width={110} /></div>
        <button type="button" className="btn btn-primary btn-sm" onClick={addCustom}>Ekle</button>
        {s.custom.length > 0 && <p className="muted small">Eklediklerin: {s.custom.map((ev) => `${ev.label} (${dateLabel(ev.date)})`).join(' · ')}</p>}
      </section>}
    </>} side={<>
      <Steps title="Kronoloji soruları için" lines={['Önce olayları dönemlere ayır (Osmanlı mı, Millî Mücadele mi, inkılap mı?).', 'Aynı dönemdekileri neden → sonuç zinciriyle sırala: kongreler genelgelerden, antlaşmalar savaşlardan sonra gelir.', 'Yıl aynıysa ay ve günü karşılaştır; çizelgede yakınlaştırmak için dönemi seç.']} />
    </>} />
  </div>;
}

const initial = { mode: 'kesfet', era: 'milli', selected: null, highlight: [], showCauses: true, quiz: { order: [], checked: false }, custom: [] };
const quiz = (ids, seed) => ({ order: shuffle(ids, seed), checked: false });

export default {
  Lab,
  initial,
  intro: 'Dönem seç, olaylara tıkla: tarih, önem ve neden–sonuç bağları açılır. "Sırala" modunda rastgele olaylarla kronoloji alıştırması yap; "Kendi olayını ekle" ile çizelgeyi genişlet.',
  questions: [
    { id: 'kongreler', title: 'Genelgeler ve kongreler', exam: 'TYT', topic: 'Millî Mücadele',
      stem: 'Havza Genelgesi, Amasya Genelgesi, Erzurum Kongresi, Sivas Kongresi ve Misak-ı Millî\'nin kabulü kronolojik olarak sıralandığında üçüncü sırada hangisi yer alır?',
      choices: { A: 'Havza Genelgesi', B: 'Amasya Genelgesi', C: 'Erzurum Kongresi', D: 'Sivas Kongresi', E: 'Misak-ı Millî' }, answer: 'C',
      setup: { mode: 'sirala', era: 'milli', highlight: ['havza', 'amasya', 'erzurum', 'sivas', 'misak'], quiz: quiz(['havza', 'amasya', 'erzurum', 'sivas', 'misak'], 7) },
      build: 'Sırala modu açılır; beş olay karışık gelir. Sırala ve "Kontrol et" de.',
      look: 'Keşfet\'e dönüp turuncu neden–sonuç bağlarını izle: Amasya → Erzurum → Sivas → Amasya Görüşmeleri → Misak-ı Millî.',
      explanation: 'Havza (28 Mayıs 1919) → Amasya (22 Haziran 1919) → Erzurum (23 Temmuz 1919) → Sivas (4 Eylül 1919) → Misak-ı Millî (28 Ocak 1920). Üçüncü: Erzurum Kongresi.',
      rule: 'Önce genelgeler, sonra kongreler; Misak-ı Millî kongre kararlarının Meclis-i Mebusan\'da kabulüdür.' },
    { id: 'sakarya-sonrasi', title: 'Sakarya\'dan sonra', exam: 'TYT', topic: 'Millî Mücadele',
      stem: 'Sakarya Meydan Muharebesi\'nden sonra imzalanan antlaşmalar aşağıdakilerden hangisinde birlikte verilmiştir?',
      choices: { A: 'Gümrü ve Moskova', B: 'Moskova ve Kars', C: 'Kars ve Ankara', D: 'Gümrü ve Ankara', E: 'Sevr ve Gümrü' }, answer: 'C',
      setup: { mode: 'kesfet', era: 'milli', selected: 'sakarya', highlight: ['gumru', 'moskova', 'kars', 'ankaraant', 'sevr'] },
      build: 'Keşfet, dönem Millî Mücadele; Sakarya\'ya tıkla.',
      look: '"Sonrasında (sonuç)" satırı ve çizelgede Sakarya\'nın sağındaki antlaşmalar.',
      explanation: 'Sakarya (23 Ağustos – 13 Eylül 1921) kazanılınca Kars Antlaşması (13 Ekim 1921) ve Ankara Antlaşması (20 Ekim 1921) imzalandı. Gümrü (1920) ve Moskova (Mart 1921) daha önce.',
      rule: 'Askerî başarılar siyasi sonuçları getirir: savaşın tarihini antlaşmalarınkiyle karşılaştır.' },
    { id: 'inkilaplar', title: 'İnkılapların sırası', exam: 'TYT', topic: 'Atatürkçülük ve Türk İnkılabı',
      stem: 'Harf İnkılabı, Şapka Kanunu, Soyadı Kanunu ve halifeliğin kaldırılması kronolojik olarak nasıl sıralanır?',
      choices: { A: 'Şapka – Halifelik – Harf – Soyadı', B: 'Halifelik – Şapka – Harf – Soyadı', C: 'Halifelik – Harf – Şapka – Soyadı', D: 'Harf – Halifelik – Soyadı – Şapka', E: 'Halifelik – Soyadı – Şapka – Harf' }, answer: 'B',
      setup: { mode: 'sirala', era: 'inkilap', highlight: ['harf', 'sapka', 'soyadi', 'halifelik'], quiz: quiz(['harf', 'sapka', 'soyadi', 'halifelik'], 11) },
      build: 'Sırala modu: dört inkılap karışık gelir; sırala ve kontrol et.',
      look: 'Yıllar: 1924, 1925, 1928, 1934.',
      explanation: 'Halifeliğin kaldırılması (3 Mart 1924) → Şapka Kanunu (25 Kasım 1925) → Harf İnkılabı (1 Kasım 1928) → Soyadı Kanunu (21 Haziran 1934).',
      rule: 'İnkılapları yıl gruplarıyla hatırla: 1924 (halifelik, eğitim), 1925 (şapka, tekke), 1926 (Medeni Kanun), 1928 (harf), 1934 (soyadı, kadın hakları).' },
    { id: 'ilk-turk', title: 'İlk Türk devletleri', exam: 'TYT', topic: 'İlk ve Orta Çağlarda Türk dünyası',
      stem: 'Asya Hun, Göktürk, Uygur ve Karahanlı devletleri kuruluş/öne çıkış sırasına göre nasıl sıralanır?',
      choices: { A: 'Göktürk – Asya Hun – Uygur – Karahanlı', B: 'Asya Hun – Uygur – Göktürk – Karahanlı', C: 'Asya Hun – Göktürk – Uygur – Karahanlı', D: 'Uygur – Göktürk – Asya Hun – Karahanlı', E: 'Asya Hun – Göktürk – Karahanlı – Uygur' }, answer: 'C',
      setup: { mode: 'kesfet', era: 'all', highlight: ['mete', 'gokturk', 'uygur', 'karahanli'] },
      build: 'Keşfet, dönem: Hepsi (ya da önce İlk Türk devletleri, sonra Türk-İslam).',
      look: 'Vurgulanan dört olayın yerine bak: MÖ 209, 552, 744, 840.',
      explanation: 'Asya Hun (Mete Han, MÖ 209) → I. Göktürk (552) → Uygur (744) → Karahanlı (yaklaşık 840).',
      rule: 'Önce İslamiyet öncesi (Hun, Göktürk, Uygur), sonra Türk-İslam devletleri (Karahanlı, Gazneli, Selçuklu).' },
  ],
  tips: [
    { title: 'Dönemlere ayır', see: 'Farklı dönemlerden karışık olaylar', look: 'Dönem seçimi ve renkler.', rule: 'İlk Türk → Türk-İslam → Osmanlı → Millî Mücadele → Cumhuriyet sırası; dönem içinde ay/gün.' },
    { title: 'Neden → sonuç zinciri', see: '"… sonucunda", "… üzerine"', look: 'Turuncu bağlar; olay kartındaki öncesi/sonrası.', rule: 'Sonuç her zaman nedenden sonra gelir: işgal → direniş → kongre → meclis → savaş → antlaşma.' },
    { title: 'Aynı yıl', see: '1919, 1921 gibi yoğun yıllar', look: 'Millî Mücadele dönemi (aylık ölçek).', rule: '1921: Ocak I. İnönü, Mart Moskova ve II. İnönü, Temmuz Kütahya–Eskişehir, Ağustos–Eylül Sakarya, Ekim Kars ve Ankara.' },
  ],
};

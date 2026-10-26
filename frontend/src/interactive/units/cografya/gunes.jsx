import Plot from '../../kit/Plot.jsx';
import { LabGrid, Panel, Readouts, Slider, Steps, Toggle } from '../../kit/controls.jsx';
import { fmt } from '../../kit/num.js';
import { dateText, dayLength, declination, dms, latText, noonAltitude, shadow, TILT } from './sunEngine.js';

const KEY = [[80, '21 Mart'], [172, '21 Haziran'], [266, '23 Eylül'], [355, '21 Aralık']];
const PLACES = [[0, 'Ekvator'], [TILT, 'Yengeç D.'], [-TILT, 'Oğlak D.'], [90 - TILT, 'K. Kutup Dairesi'], [-(90 - TILT), 'G. Kutup Dairesi'], [42, 'Sinop 42°K'], [40, 'Ankara 40°K'], [36, 'Anamur 36°K']];
const MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const clock = (hours) => { let h = Math.floor(hours); let m = Math.round((hours - h) * 60); if (m === 60) { h += 1; m = 0; } return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
const hm = (hours) => { const h = Math.floor(hours + 1e-9); const m = Math.round((hours - h) * 60); return m === 60 ? `${h + 1} sa 0 dk` : `${h} sa ${m} dk`; };

function season(day, lat) {
  const north = day >= 80 && day < 172 ? 'ilkbahar' : day >= 172 && day < 266 ? 'yaz' : day >= 266 && day < 355 ? 'sonbahar' : 'kış';
  if (lat >= 0) return north;
  return { ilkbahar: 'sonbahar', yaz: 'kış', sonbahar: 'ilkbahar', kış: 'yaz' }[north];
}

function Earth({ dec, lats }) {
  const cx = 230; const cy = 175; const R = 130;
  const P = (phi, side = 1) => {
    const a = ((side > 0 ? phi - dec : phi + dec) * Math.PI) / 180;
    return [cx + side * R * Math.cos(a), cy - R * Math.sin(a)];
  };
  const axisTop = [cx + 1.25 * R * Math.sin((dec * Math.PI) / 180), cy - 1.25 * R * Math.cos((dec * Math.PI) / 180)];
  const axisBottom = [2 * cx - axisTop[0], 2 * cy - axisTop[1]];
  return <svg viewBox="0 0 540 350" className="kit-plot" role="img" aria-label={`Dünya: ışınlar ${latText(dec)} enlemine dik geliyor`}>
    <rect width="540" height="350" fill="var(--surface)" />
    <circle cx={cx} cy={cy} r={R} fill="var(--tint)" stroke="var(--ink)" strokeWidth="2" />
    <path d={`M${cx},${cy - R} A${R},${R} 0 0 0 ${cx},${cy + R} Z`} fill="var(--ink)" opacity=".28" />
    <text x={cx - R + 12} y={cy + R - 10} className="kit-small">gece</text><text x={cx + R - 44} y={cy + R - 10} className="kit-small">gündüz</text>
    {[-90 + TILT, -TILT, 0, TILT, 90 - TILT].map((phi) => { const [x1, y1] = P(phi, 1); const [x2, y2] = P(phi, -1);
      return <g key={phi}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={phi === 0 ? 'var(--navy)' : 'var(--line)'} strokeWidth={phi === 0 ? 2 : 1.4} strokeDasharray={phi === 0 ? undefined : '5 4'} />
        <text x={x2 - 6} y={y2 + 4} textAnchor="end" className="kit-small">{phi === 0 ? 'Ekvator' : Math.abs(phi) < 30 ? (phi > 0 ? 'Yengeç' : 'Oğlak') : (phi > 0 ? 'K. Kutup D.' : 'G. Kutup D.')}</text></g>; })}
    <line x1={axisTop[0]} y1={axisTop[1]} x2={axisBottom[0]} y2={axisBottom[1]} stroke="var(--ink)" strokeWidth="2" strokeDasharray="7 4" />
    <text x={axisTop[0] + 6} y={axisTop[1]} className="kit-label" fill="var(--ink)">K</text>
    {[-80, -55, -30, 30, 55, 80].map((y) => <line key={y} x1="525" x2={cx + Math.sqrt(Math.max(0, R * R - y * y)) + 4} y1={cy + y} y2={cy + y} stroke="var(--warn)" strokeWidth="1.4" opacity=".55" />)}
    <path d={`M525,${cy} L${cx + R + 10},${cy}`} stroke="var(--warn)" strokeWidth="3" />
    <text x={cx + R + 16} y={cy - 8} className="kit-small" fill="var(--warn)">dik ışın: {latText(dec)}</text>
    {lats.map(({ lat, tone, name }) => {
      if (Math.abs(lat - dec) >= 90) return null;
      const [px, py] = P(lat, 1);
      const a = ((lat - dec) * Math.PI) / 180;
      const tx = Math.sin(a) * 50; const ty = Math.cos(a) * 50;
      return <g key={name}>
        <line x1="525" x2={px} y1={py} y2={py} stroke={tone} strokeWidth="2.6" />
        <line x1={px - tx} y1={py - ty} x2={px + tx} y2={py + ty} stroke={tone} strokeWidth="2" />
        <circle cx={px} cy={py} r="5.5" fill={tone} />
        <text x={px + 10} y={py + (lat > dec ? -10 : 18)} className="kit-label" fill={tone}>{name}: {dms(noonAltitude(lat, dec))}</text>
      </g>;
    })}
  </svg>;
}

function Sticks({ items }) {
  const W = 300 * items.length;
  return <svg viewBox={`0 0 ${W} 190`} className="kit-plot" style={{ maxWidth: `${W * 1.35}px`, margin: '0 auto' }} role="img" aria-label="Öğle vakti çubuk ve gölge">
    <rect width={W} height="190" fill="var(--surface)" />
    {items.map(({ lat, dec, tone, name }, i) => {
      const x0 = i * 300 + 150; const base = 150; const stick = 70;
      const h = noonAltitude(lat, dec); const sh = shadow(lat, dec);
      const len = Number.isFinite(sh.length) ? Math.min(130, sh.length * stick) : 0;
      const dir = lat > dec ? -1 : 1; // kuzey solda
      return <g key={name}>
        <line x1={i * 300 + 10} x2={i * 300 + 290} y1={base} y2={base} stroke="var(--ok)" strokeWidth="3" />
        <text x={i * 300 + 12} y={base + 18} className="kit-small">K</text><text x={i * 300 + 280} y={base + 18} className="kit-small">G</text>
        <line x1={x0} x2={x0} y1={base} y2={base - stick} stroke="var(--ink)" strokeWidth="4" />
        {h > 0 && <line x1={x0} x2={x0 + dir * len} y1={base} y2={base} stroke="var(--ink)" strokeWidth="7" opacity=".35" />}
        {h > 0 && <line x1={x0 + dir * len} y1={base} x2={x0 + dir * len - dir * Math.cos((h * Math.PI) / 180) * 160} y2={base - Math.sin((h * Math.PI) / 180) * 160} stroke="var(--warn)" strokeWidth="2" strokeDasharray="6 4" />}
        <text x={x0} y="22" textAnchor="middle" className="kit-label" fill={tone}>{name}</text>
        <text x={x0} y="182" textAnchor="middle" className="kit-small">{h <= 0 ? 'Güneş doğmuyor' : len === 0 ? 'gölge yok' : `1 m çubuk → gölge ${fmt(sh.length, 2)} m`}</text>
      </g>;
    })}
  </svg>;
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const dec = declination(s.day);
  const cities = [{ lat: s.lat, tone: 'var(--pen-blue)', name: s.name1 || latText(s.lat) }];
  if (s.compare) cities.push({ lat: s.lat2, tone: 'var(--pen-red)', name: s.name2 || latText(s.lat2) });
  const rows = (c) => {
    const h = noonAltitude(c.lat, dec); const L = dayLength(c.lat, dec); const sh = shadow(c.lat, dec);
    return [
      [`${c.name}: öğle güneş açısı`, h <= 0 ? 'Güneş doğmuyor (kutup gecesi)' : `90° − |φ − δ| = 90° − |${dms(c.lat)} − ${dms(dec)}| = ${dms(h)}`, 'ok'],
      [`${c.name}: gündüz / gece`, `${hm(L)} / ${hm(24 - L)}${L >= 24 ? ' (kutup gündüzü)' : L <= 0 ? ' (kutup gecesi)' : ''}`],
      [`${c.name}: gölge`, Number.isFinite(sh.length) ? `${fmt(sh.length, 2)} m (1 m çubuk), ${sh.direction}` : sh.direction],
      [`${c.name}: Güneş doğuş / batış`, L > 0 && L < 24 ? `${clock(12 - L / 2)} / ${clock(12 + L / 2)} (yerel güneş saati)` : '—'],
      [`${c.name}: mevsim`, season(s.day, c.lat)],
    ];
  };
  const curveItems = cities.map((c) => ({ type: 'fn', f: (d) => dayLength(c.lat, declination(Math.round(Math.min(365, Math.max(1, d))))), color: c.tone, width: 2.6 }));
  curveItems.push({ type: 'vline', x: s.day, color: 'navy' }, { type: 'hline', y: 12, color: 'line' });
  MONTH_STARTS.forEach((d, i) => curveItems.push({ type: 'text', x: d + 14, y: 1.2, text: 'OŞMNMHTAEEKA'[i], anchor: 'middle', small: true, color: 'ink' }));
  return <LabGrid visual={<>
    <Earth dec={dec} lats={cities} />
    <Sticks items={cities.map((c) => ({ ...c, dec }))} />
    <Plot x={[1, 365]} y={[0, 24]} height={230} items={curveItems} xTickStep={30} yTickStep={4} xLabel="gün" yLabel="gündüz (sa)" ariaLabel="Yıl boyunca gündüz süresi" axisLabelsAtEdge />
    <Readouts title={`${dateText(s.day)} · ışınlar ${latText(dec)} enlemine dik`} items={[
      ['Deklinasyon δ', `${dms(dec)} (dik ışın ${dec > 0 ? 'Kuzey' : dec < 0 ? 'Güney' : 'Ekvator'}${dec ? ' Yarım Küre\'de' : '\'da'})`],
      ...cities.flatMap(rows),
      s.compare && ['Karşılaştırma', `Öğle açısı farkı ${dms(Math.abs(noonAltitude(s.lat, dec) - noonAltitude(s.lat2, dec)))} = enlem farkı (Güneş aynı yarım kürede ise)`],
    ]} />
  </>} side={<>
    <Panel title="Tarih">
      <Slider label={`Gün: ${dateText(s.day)}`} value={s.day} min={1} max={365} step={1} onChange={(day) => set({ day })} />
      <div className="kit-chips">{KEY.map(([d, label]) => <button key={d} type="button" className="ml-event-chip" onClick={() => set({ day: d })}>{label}</button>)}</div>
    </Panel>
    <Panel title="1. yer (mavi)">
      <Slider label="Enlem φ (K +, G −)" value={s.lat} min={-90} max={90} step={0.05} digits={2} unit="°" onChange={(lat) => set({ lat, name1: '' })} />
      <div className="kit-chips">{PLACES.map(([v, label]) => <button key={label} type="button" className="ml-event-chip" onClick={() => set({ lat: v, name1: label })}>{label}</button>)}</div>
    </Panel>
    <Panel title="Karşılaştır">
      <Toggle label="2. yer (kırmızı)" checked={s.compare} onChange={(compare) => set({ compare })} />
      {s.compare && <><Slider label="Enlem φ₂" value={s.lat2} min={-90} max={90} step={0.05} digits={2} unit="°" onChange={(lat2) => set({ lat2, name2: '' })} />
        <div className="kit-chips">{PLACES.map(([v, label]) => <button key={label} type="button" className="ml-event-chip" onClick={() => set({ lat2: v, name2: label })}>{label}</button>)}</div></>}
    </Panel>
    <Steps title="Kurallar" lines={['Öğle güneş açısı: h = 90° − |φ − δ| (φ enlem, δ ışınların dik geldiği enlem).', 'Işınların dik geldiği yarım kürede gündüzler uzundur; Ekvator\'da gündüz her zaman 12 saat.', 'Açı büyüdükçe gölge kısalır; dik ışında gölge oluşmaz.', '21 Haziran: dik ışın Yengeç\'te, K. Kutup Dairesi\'nde 24 saat gündüz.']} />
  </>} />;
}

const initial = { day: 172, lat: 40, name1: 'Ankara 40°K', compare: false, lat2: 36, name2: 'Anamur 36°K' };

export default {
  Lab,
  initial,
  intro: 'Tarihi ve enlemi seç: ışınların dik geldiği enlem, öğle güneş açısı, gölge boyu, gündüz süresi ve mevsim anında hesaplanır. İki yeri karşılaştır; alttaki eğri yıl boyunca gündüz süresinin nasıl değiştiğini gösterir.',
  questions: [
    { id: 'aci', title: '21 Haziran\'da öğle açısı', exam: 'TYT', topic: 'Dünya\'nın şekli ve hareketleri',
      stem: '21 Haziran\'da 40° Kuzey enleminde öğle vakti Güneş ışınlarının yere düşme açısı kaç derecedir? (Eksen eğikliği 23°27′ alınacaktır.)',
      choices: { A: '26°33′', B: '50°', C: '66°33′', D: '73°27′', E: '90°' }, answer: 'D',
      setup: { day: 172, lat: 40, name1: '40°K', compare: false },
      build: 'Tarih 21 Haziran, enlem 40°.',
      look: 'Öğle güneş açısı satırı formülü değerlerle gösterir; Dünya çiziminde mavi ışının yatay ile açısına bak.',
      explanation: '21 Haziran\'da ışınlar 23°27′K\'ye diktir. h = 90° − (40° − 23°27′) = 90° − 16°33′ = 73°27′.',
      rule: 'h = 90° − |φ − δ|: yer ile dik ışın arasındaki enlem farkını 90°\'den çıkar.' },
    { id: 'karsilastir', title: 'Sinop ve Anamur, 21 Aralık', exam: 'TYT', topic: 'Dünya\'nın şekli ve hareketleri',
      stem: '21 Aralık tarihinde Sinop (42° K) ile Anamur (36° K) karşılaştırıldığında;',
      statements: ['Öğle güneş açısı Anamur\'da daha büyüktür.', 'Öğle vakti gölge boyu Sinop\'ta daha uzundur.', 'Gündüz süresi Sinop\'ta daha uzundur.'],
      ask: 'yargılarından hangileri doğrudur?',
      choices: { A: 'Yalnız I', B: 'Yalnız II', C: 'I ve II', D: 'II ve III', E: 'I, II ve III' }, answer: 'C',
      setup: { day: 355, lat: 42, name1: 'Sinop 42°K', compare: true, lat2: 36, name2: 'Anamur 36°K' },
      build: 'Tarih 21 Aralık; 1. yer Sinop (42°K), 2. yer Anamur (36°K).',
      look: 'Çubukların gölgelerini ve gündüz süresi satırlarını karşılaştır; tarihi 21 Haziran yapınca III\'ün tersine döndüğünü gör.',
      explanation: 'Dik ışın 23°27′G\'de: Anamur ona daha yakın → açı büyük (I doğru), gölge Sinop\'ta uzun (II doğru).\nKuzey Yarım Küre\'de kış: kutba yaklaştıkça gündüz kısalır → Sinop\'ta daha kısa (III yanlış).',
      rule: 'Dik ışına yakın olan yerde açı büyük, gölge kısa. Gündüz süresi: dik ışının olduğu yarım kürede kutba doğru uzar, diğerinde kısalır.' },
    { id: 'on-derece', title: 'Işınlar 10°K\'ye dik', exam: 'TYT', topic: 'Dünya\'nın şekli ve hareketleri',
      stem: 'Güneş ışınlarının öğle vakti 10° Kuzey enlemine dik geldiği bir tarihte;',
      statements: ['Kuzey Yarım Küre\'de gündüzler gecelerden uzundur.', 'Ekvator\'da gece ve gündüz eşittir.', 'Güney Kutup Noktası\'nda Güneş görülmez.'],
      ask: 'yargılarından hangileri doğrudur?',
      choices: { A: 'Yalnız I', B: 'I ve II', C: 'I ve III', D: 'II ve III', E: 'I, II ve III' }, answer: 'E',
      setup: { day: 106, lat: 40, name1: '40°K', compare: true, lat2: -90, name2: 'Güney Kutbu' },
      build: 'Tarihi dik ışın ≈ 10°K olacak biçimde ayarla (≈ 16 Nisan ya da ≈ 28 Ağustos). 1. yer bir kuzey enlemi, 2. yer −90° (Güney Kutbu).',
      look: 'Kuzeyde gündüz 12 saatten uzun; Ekvator\'u seçince tam 12 saat; Güney Kutbu\'nda gündüz 0 saat.',
      explanation: 'Dik ışın Kuzey Yarım Küre\'de → orada gündüzler uzun (I). Ekvator\'da gündüz her zaman 12 saat (II).\nAydınlanma çemberi Güney Kutbu\'nun 10° ötesinden geçer → kutup gecesi (III).',
      rule: 'Dik ışın hangi yarım küredeyse orada gündüzler uzun, öteki kutupta kutup gecesi. Ekvator hep 12/12.' },
    { id: 'golge-yok', title: 'Gölgenin oluşmadığı yer', exam: 'TYT', topic: 'Dünya\'nın şekli ve hareketleri',
      stem: '21 Mart tarihinde öğle vakti dik duran cisimlerin gölgesinin oluşmadığı yer aşağıdakilerden hangisidir?',
      choices: { A: 'Ekvator', B: 'Yengeç Dönencesi', C: 'Oğlak Dönencesi', D: 'Kuzey Kutup Dairesi', E: '40° Kuzey enlemi' }, answer: 'A',
      setup: { day: 80, lat: 0, name1: 'Ekvator', compare: true, lat2: 23.45, name2: 'Yengeç D.' },
      build: 'Tarih 21 Mart; 1. yer Ekvator, 2. yer Yengeç Dönencesi.',
      look: 'Ekvator\'da çubuğun gölgesi yok (açı 90°); dönencede gölge var.',
      explanation: '21 Mart\'ta ışınlar Ekvator\'a dik gelir (δ = 0): orada öğle açısı 90°, gölge oluşmaz.',
      rule: 'Gölge yalnız ışınların dik geldiği enlemde, öğle vakti sıfırdır; bu da dönenceler arasında olur.' },
  ],
  tips: [
    { title: 'Öğle güneş açısı', see: 'Tarih + enlem, "açı kaç derece"', look: 'Öğle güneş açısı satırı.', rule: 'h = 90° − |φ − δ|. 21 Mart/23 Eylül δ = 0, 21 Haziran δ = 23°27′K, 21 Aralık δ = 23°27′G.' },
    { title: 'Gölge', see: '"gölge boyu", "gölge yönü"', look: 'Çubuk çizimi.', rule: 'Açı büyüdükçe gölge kısalır. Dik ışının kuzeyinde gölge kuzeye, güneyinde güneye düşer.' },
    { title: 'Gündüz süresi', see: '"gece–gündüz", "kutup gecesi"', look: 'Gündüz satırı ve yıllık eğri.', rule: 'Dik ışının olduğu yarım kürede gündüzler uzun; Ekvator hep 12 saat; kutup daireleri ötesinde 24 saat gündüz/gece.', trap: 'Yaz yarım küresinde kutba yaklaştıkça gündüz uzar; kış yarım küresinde kısalır.' },
    { title: 'Mevsimler', see: '"mevsimler", "Güney Yarım Küre"', look: 'Mevsim satırı (iki yarım küre).', rule: 'Mevsimler iki yarım kürede terstir: Kuzey\'de yaz iken Güney\'de kış.' },
  ],
};

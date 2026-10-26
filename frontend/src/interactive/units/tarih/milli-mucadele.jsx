import { useEffect, useState } from 'react';
import { Choice, LabGrid, Note, Panel, Readouts, Steps, Toggle } from '../../kit/controls.jsx';
import { fmt } from '../../kit/num.js';

// Şematik harita (eşdikdörtgen izdüşüm, yaklaşık kıyı çizgisi).
const LON = [25.6, 45.2]; const LAT = [35.6, 42.3];
const W = 860; const kx = W / (LON[1] - LON[0]); const ky = kx / Math.cos((39 * Math.PI) / 180);
const H = Math.round((LAT[1] - LAT[0]) * ky);
const px = ([lon, lat]) => [(lon - LON[0]) * kx, (LAT[1] - lat) * ky];

const ANATOLIA = [[29.05, 41.2], [29.9, 41.15], [30.6, 41.17], [31.4, 41.3], [32.3, 41.75], [33.3, 42.0], [34.2, 41.97], [35.15, 42.02], [35.5, 41.7], [36.3, 41.35], [36.8, 41.35], [37.5, 41.05], [38.4, 40.92], [39.7, 41.0], [40.6, 41.05], [41.55, 41.52], [42.5, 41.45], [43.2, 41.25], [43.5, 41.0], [43.7, 40.7], [43.6, 40.2], [44.3, 40.0], [44.8, 39.7], [44.4, 39.4], [44.1, 39.0], [44.3, 38.4], [44.4, 37.9], [44.8, 37.3], [44.3, 37.05], [43.4, 37.25], [42.4, 37.1], [41.2, 37.07], [40.1, 36.85], [39.2, 36.66], [38.2, 36.9], [37.1, 36.65], [36.7, 36.83], [36.6, 36.2], [36.2, 35.85], [35.9, 35.95], [35.95, 36.55], [36.2, 36.75], [35.6, 36.6], [34.6, 36.8], [34.0, 36.3], [33.0, 36.1], [32.0, 36.5], [31.0, 36.85], [30.6, 36.85], [30.4, 36.25], [29.6, 36.15], [29.0, 36.6], [28.2, 36.7], [27.4, 37.05], [27.25, 37.85], [26.9, 38.15], [26.3, 38.3], [26.9, 38.55], [26.95, 39.0], [26.7, 39.3], [26.95, 39.55], [26.08, 39.48], [26.15, 39.9], [26.4, 40.15], [26.7, 40.35], [27.3, 40.42], [27.97, 40.35], [28.88, 40.38], [29.15, 40.43], [29.92, 40.77], [29.4, 40.8], [29.03, 40.99]];
const THRACE = [[26.04, 40.73], [26.32, 41.05], [26.6, 41.35], [26.55, 41.68], [26.35, 41.75], [26.6, 41.98], [27.0, 42.08], [27.6, 41.95], [28.0, 41.97], [28.6, 41.35], [29.05, 41.22], [29.0, 41.02], [28.6, 40.97], [28.0, 40.97], [27.5, 40.97], [27.2, 40.7], [26.9, 40.5], [26.67, 40.42], [26.4, 40.25], [26.18, 40.05], [26.35, 40.35], [26.75, 40.6], [26.3, 40.62]];

export const PLACES = {
  istanbul: [28.97, 41.01], ankara: [32.86, 39.93], izmir: [27.14, 38.42], samsun: [36.33, 41.29], havza: [35.66, 40.97], amasya: [35.83, 40.65],
  erzurum: [41.27, 39.9], sivas: [37.02, 39.75], eskisehir: [30.52, 39.78], kutahya: [29.98, 39.42], inonu: [30.14, 39.81], polatli: [32.15, 39.58],
  afyon: [30.54, 38.76], dumlupinar: [29.98, 38.85], bursa: [29.06, 40.19], mudanya: [28.88, 40.38], kars: [43.1, 40.6], gumru: [43.85, 40.79],
  antep: [37.38, 37.07], maras: [36.94, 37.58], urfa: [38.79, 37.16], adana: [35.33, 37.0], antalya: [30.71, 36.89], canakkale: [26.41, 40.15],
  balikesir: [27.88, 39.65], aydin: [27.84, 37.85], manisa: [27.43, 38.61], usak: [29.41, 38.68], trabzon: [39.72, 41.0], edirne: [26.56, 41.68],
};
const LABELLED = ['istanbul', 'ankara', 'izmir', 'samsun', 'erzurum', 'sivas', 'trabzon', 'adana', 'antalya', 'edirne'];
const CITY_NAMES = { istanbul: 'İstanbul', ankara: 'Ankara', izmir: 'İzmir', samsun: 'Samsun', erzurum: 'Erzurum', sivas: 'Sivas', trabzon: 'Trabzon', adana: 'Adana', antalya: 'Antalya', edirne: 'Edirne' };

const dy = (y, m, d = 1) => y + (m - 1) / 12 + (d - 1) / 365;
const POWERS = { ingiliz: ['İngiliz', 'var(--pen-red)'], fransiz: ['Fransız', 'var(--pen-blue)'], italyan: ['İtalyan', 'var(--pen-green)'], yunan: ['Yunan', 'var(--warn)'], ermeni: ['Ermeni', 'var(--pen-black)'] };
// İşgaller şematiktir; başlangıç–bitiş tarihleri yaklaşıktır.
export const OCCUPATIONS = [
  ['ingiliz', 'istanbul', dy(1918, 11, 13), dy(1923, 10, 6)], ['ingiliz', 'canakkale', dy(1918, 11, 1), dy(1923, 9, 1)],
  ['ingiliz', 'antep', dy(1919, 1, 15), dy(1919, 11, 1)], ['ingiliz', 'maras', dy(1919, 2, 22), dy(1919, 10, 30)], ['ingiliz', 'urfa', dy(1919, 3, 7), dy(1919, 10, 30)],
  ['fransiz', 'adana', dy(1918, 12, 17), dy(1922, 1, 5)], ['fransiz', 'antep', dy(1919, 11, 5), dy(1921, 12, 25)], ['fransiz', 'maras', dy(1919, 10, 30), dy(1920, 2, 12)], ['fransiz', 'urfa', dy(1919, 10, 30), dy(1920, 4, 11)],
  ['italyan', 'antalya', dy(1919, 3, 28), dy(1921, 6, 15)],
  ['yunan', 'izmir', dy(1919, 5, 15), dy(1922, 9, 9)], ['yunan', 'manisa', dy(1919, 5, 25), dy(1922, 9, 8)], ['yunan', 'aydin', dy(1919, 5, 27), dy(1922, 9, 7)],
  ['yunan', 'balikesir', dy(1920, 6, 30), dy(1922, 9, 6)], ['yunan', 'bursa', dy(1920, 7, 8), dy(1922, 9, 11)], ['yunan', 'usak', dy(1920, 8, 29), dy(1922, 9, 1)],
  ['yunan', 'afyon', dy(1921, 7, 13), dy(1922, 8, 27)], ['yunan', 'kutahya', dy(1921, 7, 17), dy(1922, 8, 30)], ['yunan', 'eskisehir', dy(1921, 7, 19), dy(1922, 9, 2)],
  ['ermeni', 'kars', dy(1919, 1, 1), dy(1920, 10, 30)],
];

const ev = (id, date, front, place, label, note) => ({ id, date, front, place, label, note });
export const MAP_EVENTS = [
  ev('samsun', dy(1919, 5, 19), 'siyasi', 'samsun', 'Mustafa Kemal Samsun\'a çıktı (19 Mayıs 1919)', 'Millî Mücadele\'nin başlangıcı.'),
  ev('havza', dy(1919, 5, 28), 'siyasi', 'havza', 'Havza Genelgesi (28 Mayıs 1919)', 'İşgaller mitinglerle protesto edilecek.'),
  ev('amasya', dy(1919, 6, 22), 'siyasi', 'amasya', 'Amasya Genelgesi (22 Haziran 1919)', 'Millî Mücadele\'nin gerekçesi, amacı ve yöntemi ilk kez belirtildi.'),
  ev('erzurum', dy(1919, 7, 23), 'siyasi', 'erzurum', 'Erzurum Kongresi (23 Temmuz – 7 Ağustos 1919)', 'Toplanış bakımından bölgesel, kararları bakımından ulusal; Temsil Heyeti seçildi.'),
  ev('sivas', dy(1919, 9, 4), 'siyasi', 'sivas', 'Sivas Kongresi (4–11 Eylül 1919)', 'Cemiyetler birleşti; manda ve himaye reddedildi.'),
  ev('heyet', dy(1919, 12, 27), 'siyasi', 'ankara', 'Temsil Heyeti Ankara\'ya geldi (27 Aralık 1919)', 'Ankara Millî Mücadele\'nin merkezi oldu.'),
  ev('istanbulisgal', dy(1920, 3, 16), 'siyasi', 'istanbul', 'İstanbul resmen işgal edildi (16 Mart 1920)', 'Mebusan Meclisi dağıtıldı; Ankara\'da yeni meclis kararı.'),
  ev('tbmm', dy(1920, 4, 23), 'siyasi', 'ankara', 'TBMM açıldı (23 Nisan 1920)', 'Millî egemenliğe dayalı meclis.'),
  ev('maras', dy(1920, 2, 12), 'guney', 'maras', 'Maraş kurtuldu (12 Şubat 1920)', 'Halk direnişi; Fransızlar çekildi.'),
  ev('urfa', dy(1920, 4, 11), 'guney', 'urfa', 'Urfa kurtuldu (11 Nisan 1920)', 'Halk direnişi.'),
  ev('sevr', dy(1920, 8, 10), 'antlasma', null, 'Sevr Antlaşması (10 Ağustos 1920, Paris yakınları)', 'Osmanlı imzaladı; TBMM tanımadı, yürürlüğe girmedi.'),
  ev('kars', dy(1920, 10, 30), 'dogu', 'kars', 'Kars geri alındı (30 Ekim 1920)', 'Kâzım Karabekir komutasında Doğu Cephesi harekâtı.'),
  ev('gumru', dy(1920, 12, 3), 'antlasma', 'gumru', 'Gümrü Antlaşması (3 Aralık 1920)', 'TBMM\'nin ilk askerî ve siyasi başarısı; Doğu Cephesi kapandı.'),
  ev('inonu1', dy(1921, 1, 6), 'bati', 'inonu', 'I. İnönü Muharebesi (6–10 Ocak 1921)', 'Düzenli ordunun ilk zaferi; Teşkilât-ı Esasiye kabul edildi, Londra Konferansı toplandı.'),
  ev('antep', dy(1921, 2, 9), 'guney', 'antep', 'Antep savunması sona erdi (9 Şubat 1921)', 'Uzun direnişin ardından şehir teslim oldu; Ankara Antlaşması sonrası Fransızlar çekildi.'),
  ev('moskova', dy(1921, 3, 16), 'antlasma', null, 'Moskova Antlaşması (16 Mart 1921)', 'Sovyet Rusya Misak-ı Millî\'yi tanıdı; Batum Gürcistan\'a bırakıldı.'),
  ev('inonu2', dy(1921, 3, 23), 'bati', 'inonu', 'II. İnönü Muharebesi (23 Mart – 1 Nisan 1921)', 'İtalyanlar Anadolu\'dan çekilme kararı aldı.'),
  ev('kutahya', dy(1921, 7, 10), 'bati', 'kutahya', 'Kütahya–Eskişehir Muharebeleri (10–24 Temmuz 1921)', 'Ordu Sakarya\'nın doğusuna çekildi; Başkomutanlık Kanunu çıkarıldı.'),
  ev('sakarya', dy(1921, 8, 23), 'bati', 'polatli', 'Sakarya Meydan Muharebesi (23 Ağustos – 13 Eylül 1921)', 'Savunma dönemi bitti; Mustafa Kemal\'e mareşallik ve gazilik verildi.'),
  ev('karsant', dy(1921, 10, 13), 'antlasma', 'kars', 'Kars Antlaşması (13 Ekim 1921)', 'Doğu sınırı kesinleşti.'),
  ev('ankaraant', dy(1921, 10, 20), 'antlasma', 'ankara', 'Ankara Antlaşması (20 Ekim 1921)', 'Fransa ile savaş bitti; TBMM\'yi tanıyan ilk İtilaf devleti.'),
  ev('adana', dy(1922, 1, 5), 'guney', 'adana', 'Adana Fransızlardan kurtuldu (5 Ocak 1922)', 'Ankara Antlaşması\'nın sonucu.'),
  ev('taarruz', dy(1922, 8, 26), 'bati', 'afyon', 'Büyük Taarruz başladı (26 Ağustos 1922, Kocatepe)', 'Yunan ordusunun cephesi yarıldı.'),
  ev('baskomutan', dy(1922, 8, 30), 'bati', 'dumlupinar', 'Başkomutanlık Meydan Muharebesi (30 Ağustos 1922)', '"Ordular! İlk hedefiniz Akdeniz\'dir. İleri!"'),
  ev('izmirkurtulus', dy(1922, 9, 9), 'bati', 'izmir', 'İzmir kurtuldu (9 Eylül 1922)', 'Batı Anadolu düşmandan temizlendi.'),
  ev('mudanya', dy(1922, 10, 11), 'antlasma', 'mudanya', 'Mudanya Ateşkes Antlaşması (11 Ekim 1922)', 'Silahlı mücadele bitti; Doğu Trakya savaşsız kurtarıldı.'),
  ev('saltanat', dy(1922, 11, 1), 'siyasi', 'ankara', 'Saltanat kaldırıldı (1 Kasım 1922)', 'Lozan\'a iki hükümet çağrılması gerekçe oldu.'),
  ev('lozan', dy(1923, 7, 24), 'antlasma', null, 'Lozan Barış Antlaşması (24 Temmuz 1923, İsviçre)', 'Yeni Türk devletinin bağımsızlığı tanındı.'),
  ev('istanbulkurtulus', dy(1923, 10, 6), 'siyasi', 'istanbul', 'İstanbul\'un kurtuluşu (6 Ekim 1923)', 'İtilaf askerleri İstanbul\'u boşalttı.'),
  ev('cumhuriyet', dy(1923, 10, 29), 'siyasi', 'ankara', 'Cumhuriyet ilan edildi (29 Ekim 1923)', ''),
];
const FRONTS = { siyasi: ['Kongre ve siyasi', 'var(--navy)'], dogu: ['Doğu Cephesi', 'var(--pen-black)'], guney: ['Güney Cephesi', 'var(--pen-blue)'], bati: ['Batı Cephesi', 'var(--pen-red)'], antlasma: ['Antlaşma', 'var(--pen-green)'] };
const START = dy(1918, 10, 30); const END = dy(1923, 10, 30);
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const monthText = (t) => { const y = Math.floor(t + 1e-9); const m = Math.min(11, Math.floor((t - y) * 12 + 1e-6)); return `${MONTHS[m]} ${y}`; };
const path = (points) => points.map((p, i) => { const [x, y] = px(p); return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; }).join('') + 'Z';

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return undefined;
    if (s.t >= END - 1e-6) { setPlaying(false); return undefined; }
    const timer = setTimeout(() => set({ t: Math.min(END, s.t + 1 / 12) }), 420);
    return () => clearTimeout(timer);
  }, [playing, s.t]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = OCCUPATIONS.filter(([, , a, b]) => s.t >= a && s.t < b);
  const shown = MAP_EVENTS.filter((e) => e.date <= s.t + 1e-6 && s.fronts.includes(e.front));
  const selected = MAP_EVENTS.find((e) => e.id === s.selected);
  const byPower = Object.keys(POWERS).map((k) => [k, active.filter((o) => o[0] === k).map((o) => o[1])]).filter(([, list]) => list.length);
  return <LabGrid top={<div className="kit-row">
    <button type="button" className="btn btn-primary btn-sm ml-play" onClick={() => { if (s.t >= END - 1e-6) set({ t: START }); setPlaying((v) => !v); }}>{playing ? '⏸ Durdur' : '▶ Oynat'}</button>
    <label className="ml-time"><span><strong>{monthText(s.t)}</strong></span>
      <input type="range" min={START} max={END} step={1 / 12} value={s.t} onChange={(e) => { setPlaying(false); set({ t: Number(e.target.value) }); }} aria-label="Tarih" /></label>
  </div>} visual={<>
    <svg viewBox={`-10 -10 ${W + 20} ${H + 20}`} className="kit-plot mm-map" role="img" aria-label={`Millî Mücadele haritası, ${monthText(s.t)}`}>
      <rect x="-10" y="-10" width={W + 20} height={H + 20} fill="var(--tint)" />
      <path d={path(ANATOLIA)} fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.5" />
      <path d={path(THRACE)} fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.5" />
      {active.map(([power, place], i) => { const [x, y] = px(PLACES[place]); return <circle key={`o${i}`} cx={x} cy={y} r={place === 'istanbul' ? 26 : 22} fill={POWERS[power][1]} opacity=".28" />; })}
      {LABELLED.map((k) => { const [x, y] = px(PLACES[k]); return <g key={k}><circle cx={x} cy={y} r="2.5" fill="var(--ink)" /><text x={x + 5} y={y - 4} className="kit-small">{CITY_NAMES[k]}</text></g>; })}
      {shown.filter((e) => e.place).map((e) => {
        const [x, y] = px(PLACES[e.place]);
        const recent = s.t - e.date < 2 / 12;
        const isSel = s.selected === e.id;
        return <g key={e.id} className="mm-event" role="button" tabIndex={0} aria-label={e.label} onClick={() => set({ selected: e.id })}
          onKeyDown={(k) => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); set({ selected: e.id }); } }}>
          <circle cx={x} cy={y} r={isSel ? 11 : recent ? 9 : 6.5} fill={FRONTS[e.front][1]} stroke="var(--surface)" strokeWidth="2" opacity={recent || isSel ? 1 : 0.65} />
          {(recent || isSel) && <text x={x + 12} y={y + 4} className="kit-label" fill={FRONTS[e.front][1]}>{e.label.split(' (')[0]}</text>}
        </g>;
      })}
    </svg>
    <div className="kit-legend">{Object.entries(POWERS).map(([k, [name, tone]]) => <span key={k}><i style={{ background: tone, opacity: 0.5 }} />{name} işgali</span>)}
      {Object.entries(FRONTS).map(([k, [name, tone]]) => <span key={k}><i style={{ background: tone }} />{name}</span>)}</div>
    {selected ? <Readouts title={selected.label} items={[['Cephe / tür', FRONTS[selected.front][0]], ['Tarih', monthText(selected.date)], selected.note && ['Sonuç / önemi', selected.note]]} />
      : <Note>Haritadaki bir işarete ya da listedeki bir olaya tıkla.</Note>}
    <Note tone="warn">Harita şematiktir; işgal bölgeleri şehir merkezleriyle, başlangıç–bitiş tarihleri yaklaşık olarak gösterilmiştir.</Note>
  </>} side={<>
    <Panel title="Göster">
      <div className="kit-chips">{Object.entries(FRONTS).map(([k, [name]]) => <Toggle key={k} label={name} checked={s.fronts.includes(k)} onChange={(on) => set({ fronts: on ? [...s.fronts, k] : s.fronts.filter((f) => f !== k) })} />)}</div>
    </Panel>
    <Readouts title={`${monthText(s.t)} itibarıyla işgaller`} items={byPower.length ? byPower.map(([k, list]) => [POWERS[k][0], list.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')]) : [['Durum', 'İşgal kalmadı']]} />
    <Panel title={`Olaylar (${shown.length})`}>
      <ol className="mm-list">{[...shown].reverse().map((e) => <li key={e.id}><button type="button" className={`ml-event-chip${s.selected === e.id ? ' tone-up' : ''}`} onClick={() => set({ selected: e.id, t: Math.max(s.t, e.date) })}>
        <span style={{ color: FRONTS[e.front][1] }}>●</span> {e.label}</button></li>)}</ol>
    </Panel>
    <Steps title="Cepheler" lines={['Doğu: Ermenilere karşı; ilk askerî başarı (Gümrü).', 'Güney: Fransızlara karşı halk direnişi (Maraş, Antep, Urfa); Ankara Antlaşması ile kapandı.', 'Batı: Yunanlılara karşı; düzenli ordu (İnönü, Sakarya, Büyük Taarruz) → Mudanya.']} />
  </>} />;
}

const initial = { t: dy(1919, 5, 19), selected: 'samsun', fronts: ['siyasi', 'dogu', 'guney', 'bati', 'antlasma'] };

export default {
  Lab,
  initial,
  intro: 'Tarih çubuğunu kaydır ya da oynat: işgaller, kongreler, cephelerdeki muharebeler ve antlaşmalar haritada tarihine göre belirir. Bir işarete tıklayınca sonucu ve önemi açılır.',
  questions: [
    { id: 'ilk-basari', title: 'İlk askerî başarı', exam: 'TYT', topic: 'Millî Mücadele',
      stem: 'TBMM\'nin ilk askerî başarısı hangi cephede kazanılmıştır?',
      choices: { A: 'Doğu Cephesi', B: 'Güney Cephesi', C: 'Batı Cephesi', D: 'Irak Cephesi', E: 'Suriye Cephesi' }, answer: 'A',
      setup: { t: dy(1921, 1, 1), selected: 'gumru' },
      build: 'Tarihi Ocak 1921\'e getir; Gümrü Antlaşması\'na tıkla.',
      look: 'Ocak 1921\'den önce kazanılan askerî sonuç: Kars (Ekim 1920) ve Gümrü (Aralık 1920). İnönü daha sonra.',
      explanation: 'Doğu Cephesi\'nde Ermenilere karşı Kars alındı (30 Ekim 1920), Gümrü Antlaşması (3 Aralık 1920) imzalandı: TBMM\'nin ilk askerî ve siyasi başarısı.',
      rule: '"İlk askerî başarı" Doğu (Gümrü); "düzenli ordunun ilk zaferi" Batı (I. İnönü).' },
    { id: 'duzenli', title: 'Düzenli ordunun ilk zaferi', exam: 'TYT', topic: 'Millî Mücadele',
      stem: 'Düzenli ordunun kazandığı ilk zafer aşağıdakilerden hangisidir?',
      choices: { A: 'I. İnönü Muharebesi', B: 'Sakarya Meydan Muharebesi', C: 'Kütahya–Eskişehir Muharebeleri', D: 'II. İnönü Muharebesi', E: 'Büyük Taarruz' }, answer: 'A',
      setup: { t: dy(1921, 4, 15), selected: 'inonu1', fronts: ['bati'] },
      build: 'Yalnız "Batı Cephesi"ni göster; tarihi Nisan 1921\'e getir.',
      look: 'Batı Cephesi\'nde sıralama: I. İnönü (Ocak 1921), II. İnönü (Mart 1921), Kütahya–Eskişehir (Temmuz 1921), Sakarya (Ağustos 1921).',
      explanation: 'Kuva-yi Milliye\'den düzenli orduya geçildikten sonraki ilk zafer I. İnönü\'dür (6–10 Ocak 1921).',
      rule: 'Batı Cephesi\'nin sırası: I. İnönü → II. İnönü → Kütahya–Eskişehir (yenilgi) → Sakarya → Büyük Taarruz.' },
    { id: 'sakarya', title: 'Sakarya\'nın sonucu değil', exam: 'TYT', topic: 'Millî Mücadele',
      stem: 'Aşağıdakilerden hangisi Sakarya Meydan Muharebesi\'nin sonuçlarından biri değildir?',
      choices: { A: 'Kars Antlaşması\'nın imzalanması', B: 'Fransa ile Ankara Antlaşması\'nın imzalanması', C: 'Mustafa Kemal\'e mareşallik ve gazilik unvanı verilmesi', D: 'Mudanya Ateşkes Antlaşması\'nın imzalanması', E: 'Türk ordusu için savunma döneminin sona ermesi' }, answer: 'D',
      setup: { t: dy(1922, 10, 15), selected: 'sakarya' },
      build: 'Tarihi Ekim 1922\'ye getir; Sakarya\'ya tıkla ve sonraki olayları listede izle.',
      look: 'Kars ve Ankara antlaşmaları Sakarya\'dan hemen sonra (Ekim 1921); Mudanya ise Büyük Taarruz\'dan sonra (Ekim 1922).',
      explanation: 'Mudanya Ateşkesi Büyük Taarruz ve İzmir\'in kurtuluşunun sonucudur (11 Ekim 1922), Sakarya\'nın değil.',
      rule: 'Sonucu soran sorularda tarihe bak: hemen ardından gelen ve doğrudan bağlı gelişmeler sonuçtur.' },
    { id: 'guney', title: 'Güney Cephesi', exam: 'TYT', topic: 'Millî Mücadele',
      stem: 'Güney Cephesi\'nde düzenli ordu yerine halkın direnişiyle mücadele edilen şehirler aşağıdakilerden hangisinde birlikte verilmiştir?',
      choices: { A: 'İzmir, Aydın, Manisa', B: 'Maraş, Antep, Urfa', C: 'Kars, Ardahan, Artvin', D: 'Bursa, Bilecik, Eskişehir', E: 'Trabzon, Rize, Artvin' }, answer: 'B',
      setup: { t: dy(1921, 3, 1), fronts: ['guney'], selected: 'maras' },
      build: 'Yalnız "Güney Cephesi"ni göster; tarihi Mart 1921\'e getir.',
      look: 'Mavi (Fransız) işgal alanları ve Güney Cephesi olayları: Maraş, Urfa, Antep; Adana Ocak 1922.',
      explanation: 'Güney Cephesi\'nde Fransızlara ve Ermeni birliklerine karşı Maraş, Antep ve Urfa halkı direndi; cephe Ankara Antlaşması ile kapandı.',
      rule: 'Güney Cephesi = Fransız işgali + halk direnişi (Kuva-yi Milliye) → Ankara Antlaşması (1921).' },
  ],
  tips: [
    { title: 'Cephe tanı', see: 'Şehir adları ve düşman', look: 'Cephe filtreleri ve işgal renkleri.', rule: 'Doğu: Ermeniler (Kars, Gümrü). Güney: Fransızlar (Maraş, Antep, Urfa, Adana). Batı: Yunanlılar (İzmir → Sakarya).' },
    { title: 'İlkler', see: '"ilk askerî başarı", "ilk zafer", "ilk antlaşma"', look: 'Tarihi kaydırıp hangi olayın önce belirdiğine bak.', rule: 'İlk askerî ve siyasi başarı: Gümrü. Düzenli ordunun ilk zaferi: I. İnönü.' },
    { title: 'Askerî sonuç → siyasi sonuç', see: '"… sonucunda imzalanan"', look: 'Olay listesi.', rule: 'Sakarya → Kars ve Ankara antlaşmaları; Büyük Taarruz → Mudanya; Mudanya → saltanatın kaldırılması ve Lozan.' },
  ],
};

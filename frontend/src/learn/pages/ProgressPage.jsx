import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { usePageTitle } from '../../hooks.js';
import DataGrid from '../../components/DataGrid.jsx';
import { useLearn } from '../LearnContext.jsx';
import { formatDay } from '../engine/dates.js';
import { calibration, exportRows, forecast, historyRows } from '../engine/stats.js';
import { minutesText } from '../ui.jsx';

const TABS = [['gecmis', 'Geçmiş'], ['kalibrasyon', 'Kalibrasyon'], ['tahmin', 'Tahmin'], ['disa-aktar', 'Dışa aktar']];

/** İlerleme (spec §12): oturum geçmişi, güven–doğruluk kalibrasyonu, bitiş tahmini ve günlük toplamların dışa aktarımı. */
export default function ProgressPage() {
  usePageTitle('İlerleme · Konuyu Öğrenelim');
  const { state, index } = useLearn();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get('sekme')) ? params.get('sekme') : 'gecmis';
  const history = useMemo(() => historyRows(state, index), [state, index]);
  const calib = useMemo(() => calibration(state), [state]);
  const plan = useMemo(() => forecast(state, index), [state, index]);
  const exported = useMemo(() => exportRows(state), [state]);

  const historyColumns = useMemo(() => [
    { headerName: 'Gün', field: 'day', width: 130, valueFormatter: ({ value }) => formatDay(value) },
    { headerName: 'Dakika', field: 'minutes', width: 95, cellDataType: 'number' },
    { headerName: 'Soru', field: 'questions', width: 85, cellDataType: 'number' },
    { headerName: 'Doğru', field: 'correct', width: 85, cellDataType: 'number' },
    { headerName: 'Doğruluk %', field: 'accuracy', width: 115, cellDataType: 'number' },
    { headerName: 'Kart', field: 'cards', width: 80, cellDataType: 'number' },
    { headerName: 'Bölüm', field: 'sections', width: 90, cellDataType: 'number' },
    { headerName: 'Tekrar', field: 'reviews', width: 90, cellDataType: 'number' },
    { headerName: 'Düzeltilen hata', field: 'fixed', width: 135, cellDataType: 'number' },
    { headerName: 'Kavramlar', field: 'concepts', flex: 1, minWidth: 220 },
  ], []);
  const exportColumns = useMemo(() => [
    { headerName: 'Tarih', field: 'day', width: 120 },
    { headerName: 'Ders', field: 'subject', width: 150 },
    { headerName: 'Çözülen', field: 'solved', width: 100, cellDataType: 'number' },
    { headerName: 'Doğru', field: 'correct', width: 90, cellDataType: 'number' },
    { headerName: 'Yanlış', field: 'wrong', width: 90, cellDataType: 'number' },
    { headerName: 'Dakika', field: 'minutes', width: 95, cellDataType: 'number' },
  ], []);

  return <div className="lr-page lr-progress-page">
    <div className="page-head"><h1>İlerleme</h1><span className="muted">{history.length} çalışma günü · seri {state.streak.count} gün</span></div>
    <nav className="tabs study-tabs" aria-label="İlerleme görünümü">
      {TABS.map(([id, label]) => <a key={id} href={`?sekme=${id}`} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined}
        onClick={(e) => { e.preventDefault(); setParams({ sekme: id }, { replace: true }); }}>{label}</a>)}
    </nav>
    {tab === 'gecmis' && <section className="card"><h2>Oturum geçmişi</h2>
      <DataGrid rowData={history} columnDefs={historyColumns} rowKey={(row) => row.key} exportFileName="konuyu-ogrenelim-gecmis" /></section>}
    {tab === 'kalibrasyon' && <section className="card">
      <h2>Güven ve doğruluk</h2>
      <p>{calib.note}</p>
      <div className="lr-chart" role="img" aria-label={`Güven düzeyine göre doğruluk: ${calib.rows.map((r) => `${r.label} %${r.accuracy ?? 0}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={calib.rows.map((r) => ({ ...r, accuracy: r.accuracy ?? 0 }))} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="label" stroke="var(--ink)" />
            <YAxis domain={[0, 100]} unit="%" stroke="var(--ink)" />
            <Tooltip formatter={(value, name, entry) => [`%${value} (${entry.payload.correct}/${entry.payload.n})`, 'Doğruluk']} />
            <ReferenceLine y={80} stroke="var(--warn)" strokeDasharray="4 4" />
            <Bar dataKey="accuracy" fill="var(--navy)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="small muted">İdeal: “Tahmin” düşük, “Emin değilim” orta, “Eminim” %80'in üstünde. Kesik çizgi %80.</p>
    </section>}
    {tab === 'tahmin' && <section className="lr-forecast">
      {plan.map((row) => <article key={row.track} className="card">
        <h2>{row.track} Matematik</h2>
        <p className="lr-big">{row.mastered}/{row.total} kavram</p>
        <p>Kalan {row.left} kavram ≈ {minutesText(row.minutesLeft)} çalışma. Günlük bütçenin yeni öğrenme payıyla beklenen bitiş: <strong>{formatDay(row.finish)}</strong> ({row.days} gün).</p>
        {row.examDate && <p className={row.onTime ? 'lr-good' : 'lr-bad'}>{row.onTime ? `Sınavdan (${formatDay(row.examDate)}) en az 2 hafta önce bitiyor; son haftalar karma setlere kalır.` : `Sınav tarihine (${formatDay(row.examDate)}) yetişmesi zor görünüyor: günlük süreyi artırmayı ya da seviye testiyle bildiğin konuları geçmeyi düşün.`}</p>}
        {row.ratio !== 1 && <p className="small muted">Tahmin senin hızına göre düzeltildi (×{row.ratio}).</p>}
      </article>)}
    </section>}
    {tab === 'disa-aktar' && <section className="card">
      <h2>Günlük toplamlar</h2>
      <p className="small muted">Mevcut takip tablona (ör. haftalık program) aktarmak için Excel olarak indir.</p>
      <DataGrid rowData={exported} columnDefs={exportColumns} rowKey={(row) => row.key} exportFileName="konuyu-ogrenelim-gunluk" />
    </section>}
  </div>;
}

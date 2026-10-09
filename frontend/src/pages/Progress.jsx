import { useState } from 'react';
import { api, qs } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import { ErrorBox, Loading } from '../components/States.jsx';

const PERIODS = [
  ['DAY', 'Bugün'], ['WEEK', 'Bu hafta'], ['MONTH', 'Bu ay'],
];
const ROWS = [
  ['correct', 'Doğru', 'ok'], ['wrong', 'Yanlış', 'bad'], ['blank', 'Boş', 'warn'],
];

export default function Progress() {
  usePageTitle('İlerlemem');
  const [period, setPeriod] = useState('DAY');
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
  const { data, loading, error, retry } = useAsync(
    () => api.get('/api/progress/first-attempts' + qs({ period, zone })), [period, zone]);
  const date = (value) => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeZone: zone }).format(new Date(value));
  return <>
    <h1>İlerlemem</h1>
    <p className="muted">Her soru yalnız ilk karşılaşmasında sayılır. Sonradan tekrar çalışmak bu sayıları değiştirmez.</p>
    <div className="rate-row" role="group" aria-label="İstatistik dönemi">
      {PERIODS.map(([value, label]) => <button key={value} type="button"
        className="btn btn-secondary" aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}
    </div>
    {loading && <Loading text="İlerleme yükleniyor…" />}
    {error && <ErrorBox error={error} onRetry={retry} />}
    {data && <section className="card" aria-label="İlk deneme istatistiği">
      <h2>{PERIODS.find(([value]) => value === period)?.[1]}</h2>
      <p className="muted small">{date(data.startsAt)} – {date(new Date(data.endsAt).getTime() - 1)} · {zone}</p>
      {data.total === 0 ? <p role="status">Bu dönemde henüz ilk deneme yok.</p> : <>
        <div className="stats">
          {ROWS.map(([key, label, tone]) => <div className={`card stat stat-${tone}`} key={key}>
            <p className="stat-value">{data[key]}</p><p className="stat-label">{label}</p>
          </div>)}
        </div>
        <div className="votebar" role="img" aria-label={`Doğru ${data.correct}, yanlış ${data.wrong}, boş ${data.blank}`}>
          {ROWS.map(([key, , tone]) => <span key={key} className={`vote-${tone}`}
            style={{ width: `${data[key] * 100 / data.total}%` }} />)}
        </div>
        <p>Toplam {data.total} soru · İlk deneme başarısı %{data.successPercent}</p>
        <p className="muted small">Başarı oranı = doğru / doğru + yanlış + boş.</p>
      </>}
    </section>}
  </>;
}

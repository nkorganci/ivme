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
const BREAKDOWNS = [
  ['SUBJECT', 'Dersler'], ['TOPIC', 'Konular'], ['QUESTION_TYPE', 'Soru tipleri'],
];
const duration = (seconds) => `${Math.floor(seconds / 3600)} sa ${Math.floor(seconds % 3600 / 60)} dk`;

export default function Progress() {
  usePageTitle('İlerlemem');
  const [period, setPeriod] = useState('DAY');
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
  const { data, loading, error, retry } = useAsync(
    () => api.get('/api/progress/first-attempts' + qs({ period, zone })), [period, zone]);
  const timeline = useAsync(() => api.get('/api/progress/timeline' + qs({ period, zone })), [period, zone]);
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
    {data?.total > 0 && BREAKDOWNS.map(([kind, title]) => <section className="card table-card" key={kind}
      aria-label={`${title} kırılımı`}>
      <h2>{title}</h2>
      <div className="progress-breakdown-scroll"><table className="table progress-breakdown">
        <thead><tr><th scope="col">{kind === 'SUBJECT' ? 'Ders' : 'Ders / ' + (kind === 'TOPIC' ? 'konu' : 'soru tipi')}</th>
          <th scope="col">Doğru</th><th scope="col">Yanlış</th><th scope="col">Boş</th><th scope="col">Toplam</th></tr></thead>
        <tbody>{data.breakdown?.filter((row) => row.kind === kind).map((row) => <tr key={`${row.subject}/${row.label}`}>
          <th scope="row">{kind === 'SUBJECT' ? row.label : `${row.subject} / ${row.label}`}</th>
          <td>{row.correct}</td><td>{row.wrong}</td><td>{row.blank}</td><td>{row.total}</td>
        </tr>)}</tbody>
      </table></div>
    </section>)}
    <section className="card table-card" aria-label="Çalışma zaman çizelgesi">
      <h2>Çalışma zaman çizelgesi</h2>
      <p className="muted small" style={{ padding: '0 14px' }}>Aktif süre gönderilmiş soru olaylarından gelir. Oturum süresi yalnız açıkça çıkış yapılan girişlerde ölçülür ve giriş gününe yazılır.</p>
      {timeline.loading && <Loading text="Zaman çizelgesi yükleniyor…" />}
      {timeline.error && <ErrorBox error={timeline.error} onRetry={timeline.retry} />}
      {timeline.data && <div className="progress-breakdown-scroll"><table className="table progress-breakdown">
        <thead><tr><th scope="col">Gün</th><th scope="col">Aktif süre</th><th scope="col">Giriş</th>
          <th scope="col">Kapanan oturum</th><th scope="col">Oturum süresi</th></tr></thead>
        <tbody>{timeline.data.days.map((day) => <tr key={day.date}>
          <th scope="row">{new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${day.date}T12:00:00Z`))}</th>
          <td>{duration(day.activeSeconds)}</td><td>{day.logins}</td><td>{day.closedSessions}</td><td>{duration(day.sessionSeconds)}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </>;
}

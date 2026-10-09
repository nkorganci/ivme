import { useState } from 'react';
import { api } from '../api.js';
import { useAsync, useFilterRows, usePageTitle } from '../hooks.js';
import { Alert, ErrorBox, Loading } from '../components/States.jsx';

const PERIODS = [['DAY', 'Günlük'], ['WEEK', 'Haftalık'], ['MONTH', 'Aylık']];
const METRICS = [
  ['UNIQUE_QUESTIONS', 'Tekil soru'], ['ATTEMPTS', 'Cevap denemesi'],
  ['TESTS', 'Süreli pratik'], ['EXAMS', 'Sınav'],
];
const label = (rows, value) => rows.find(([key]) => key === value)?.[1] || value;
const localToday = (zone) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
};

export default function Goals() {
  usePageTitle('Hedeflerim');
  const rows = useFilterRows();
  const subjects = [...new Set(rows.map((row) => row.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
  const goals = useAsync(() => api.get('/api/goals'), []);
  const [form, setForm] = useState({ period: 'DAY', metric: 'UNIQUE_QUESTIONS', subject: '', targetCount: 10 });
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({ targetCount: 1, subject: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const create = async (event) => {
    event.preventDefault(); setMessage(null); setBusy(true);
    try {
      await api.post('/api/goals', { ...form, targetCount: Number(form.targetCount), zone });
      setMessage({ type: 'success', text: 'Hedef oluşturuldu.' }); goals.retry();
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };
  const save = async (event) => {
    event.preventDefault(); setMessage(null); setBusy(true);
    try {
      await api.patch(`/api/goals/${editId}`, { ...edit, targetCount: Number(edit.targetCount) });
      setEditId(null); setMessage({ type: 'success', text: 'Hedef güncellendi.' }); goals.retry();
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };
  const stop = async (id) => {
    setMessage(null); setBusy(true);
    try {
      await api.post(`/api/goals/${id}/stop`);
      setEditId(null); setMessage({ type: 'success', text: 'Hedef durduruldu.' }); goals.retry();
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };

  return <>
    <h1>Hedeflerim</h1>
    <p className="muted">Hedefin dönemi, oluşturulduğu saat diliminde sabit kalır. Geçmiş hedeflerin saklanır.</p>
    <form className="card" onSubmit={create}>
      <h2>Yeni hedef</h2>
      <div className="filters">
        <label className="field"><span className="field-label">Dönem</span><select value={form.period}
          onChange={(event) => setForm({ ...form, period: event.target.value })}>
          {PERIODS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select></label>
        <label className="field"><span className="field-label">Ölçüt</span><select value={form.metric}
          onChange={(event) => setForm({ ...form, metric: event.target.value })}>
          {METRICS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select></label>
        <label className="field"><span className="field-label">Ders</span><select value={form.subject}
          onChange={(event) => setForm({ ...form, subject: event.target.value })}>
          <option value="">Tüm dersler</option>{subjects.map((subject) => <option key={subject}>{subject}</option>)}
        </select></label>
        <label className="field"><span className="field-label">Hedef sayı</span><input type="number" min="1" max="10000"
          required value={form.targetCount} onChange={(event) => setForm({ ...form, targetCount: event.target.value })} /></label>
      </div>
      <p className="muted small">Saat dilimi: {zone}</p>
      <button className="btn btn-primary" disabled={busy}>Hedef oluştur</button>
    </form>
    {message && <Alert type={message.type}>{message.text}</Alert>}
    <section className="card" aria-label="Hedef geçmişi">
      <h2>Hedeflerim ve geçmiş</h2>
      {goals.loading && <Loading text="Hedefler yükleniyor…" />}
      {goals.error && <ErrorBox error={goals.error} onRetry={goals.retry} />}
      {goals.data?.length === 0 && <p>Henüz hedef oluşturmadın.</p>}
      {goals.data?.map((goal) => {
        const open = goal.status === 'ACTIVE' && goal.endsOn >= localToday(goal.zone);
        return <article className="goal-row" key={goal.id}>
          <div><strong>{label(PERIODS, goal.period)} · {label(METRICS, goal.metric)}</strong>
            <p className="muted small">{goal.subject || 'Tüm dersler'} · {goal.startsOn} – {goal.endsOn} · {goal.zone}</p>
            <p>Hedef: {goal.targetCount} · {goal.status === 'ENDED' ? 'Durduruldu' : open ? 'Aktif' : 'Dönem bitti'}</p>
          </div>
          {open && <div className="goal-actions">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => {
              setEditId(goal.id); setEdit({ targetCount: goal.targetCount, subject: goal.subject || '' });
            }}>Düzenle</button>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => stop(goal.id)}>Durdur</button>
          </div>}
          {open && editId === goal.id && <form className="goal-edit" onSubmit={save}>
            <label>Hedef sayı <input type="number" min="1" max="10000" required value={edit.targetCount}
              onChange={(event) => setEdit({ ...edit, targetCount: event.target.value })} /></label>
            <label>Ders <select value={edit.subject} onChange={(event) => setEdit({ ...edit, subject: event.target.value })}>
              <option value="">Tüm dersler</option>{subjects.map((subject) => <option key={subject}>{subject}</option>)}
            </select></label>
            <button className="btn btn-primary" disabled={busy}>Kaydet</button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditId(null)}>Vazgeç</button>
          </form>}
        </article>;
      })}
    </section>
  </>;
}

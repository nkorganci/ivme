import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api, qs } from '../api.js';
import { Alert, ErrorBox, Loading } from '../components/States.jsx';
import { DEFAULT_BOUNDARIES, normalize24Hour, shiftTimeBoundary } from '../programTime.js';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const addDays = (day, count) => {
  const value = new Date(`${day}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
};
const monday = (day) => addDays(day, -(new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7);
const formatDate = (day) => new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
}).format(new Date(`${day}T12:00:00Z`));
const blank = () => Array(DEFAULT_BOUNDARIES.length - 1).fill('');
const weekLabel = (start, first) => {
  const anchor = first && first < start ? first : start;
  const number = Math.round((new Date(`${start}T12:00:00Z`) - new Date(`${anchor}T12:00:00Z`)) / 604800000) + 1;
  return `${number}. Hafta · ${formatDate(start)} – ${formatDate(addDays(start, 6))}`;
};

function TimeField({ value, label, readOnly, onCommit, onInvalid }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (readOnly || draft === value) return;
    const normalized = normalize24Hour(draft);
    if (!normalized) { onInvalid(); setDraft(value); return; }
    if (!onCommit(normalized)) setDraft(value);
  };
  return <input type="text" inputMode="numeric" maxLength={5} placeholder="SS:dd"
    aria-label={label} title="24 saat biçiminde yaz (ör. 14:30)"
    value={draft} readOnly={readOnly}
    onChange={(event) => setDraft(event.target.value)} onBlur={commit}
    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />;
}

function fullWeek(start, record, source) {
  const cells = {};
  for (let index = 0; index < 7; index++) {
    const day = addDays(start, index);
    const sourceDay = source && addDays(source.weekStart, index);
    cells[day] = [...(record?.cells?.[day] || (sourceDay && source.cells?.[sourceDay]) || blank())];
  }
  return {
    weekStart: start, selectedStart: start, selectedEnd: addDays(start, 6),
    zone: record?.zone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul',
    cells, timeBoundaries: [...(record?.timeBoundaries || source?.timeBoundaries || DEFAULT_BOUNDARIES)],
    editable: record?.editable ?? addDays(start, 6) >= localDate(),
  };
}

export default function DailyProgram() {
  const tablesRef = useRef(null);
  const [view, setView] = useState('current');
  const [activeWeek, setActiveWeek] = useState(() => monday(localDate()));
  const [index, setIndex] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [historySelection, setHistorySelection] = useState([]);
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const todayWeek = monday(localDate());
  const pastWeeks = index.filter((start) => addDays(start, 6) < localDate());
  const nextWeek = addDays(todayWeek, 7);
  const availableWeeks = [...new Set([...index, todayWeek, nextWeek])].sort();

  const sizeCells = useCallback(() => {
    tablesRef.current?.querySelectorAll('.program-table').forEach((table) => {
      const fields = [...table.querySelectorAll('textarea')];
      if (!fields.length) return;
      fields.forEach((field) => { field.style.height = 'auto'; });
      const height = Math.max(58, ...fields.map((field) => field.scrollHeight + 2));
      fields.forEach((field) => { field.style.height = `${height}px`; });
    });
  }, []);

  useLayoutEffect(sizeCells, [sizeCells, weeks, loading, pending]);
  useEffect(() => {
    window.addEventListener('resize', sizeCells);
    return () => window.removeEventListener('resize', sizeCells);
  }, [sizeCells]);

  const loadTarget = useCallback(async (target, knownIndex) => {
    const previous = addDays(target, -7);
    const [saved, prior] = await Promise.all([
      api.get('/api/study-program' + qs({ start: target, end: addDays(target, 6) })),
      api.get('/api/study-program' + qs({ start: previous, end: addDays(previous, 6) })),
    ]);
    const record = saved.find((row) => row.weekStart === target);
    const source = prior.find((row) => row.weekStart === previous);
    setWeeks(record ? [fullWeek(target, record)] : []);
    setPending(record ? null : { target, source });
    setIndex(knownIndex);
    setDirty(false);
  }, []);

  useEffect(() => {
    api.get('/api/study-program/index')
      .then((savedIndex) => loadTarget(monday(localDate()), savedIndex))
      .catch(setError).finally(() => setLoading(false));
  }, [loadTarget]);

  const openView = async (target) => {
    const next = target === monday(localDate()) ? 'current' : 'next';
    if (next === view && activeWeek === target) return;
    if (dirty && !window.confirm('Kaydedilmemiş değişiklikler var. Görünümü değiştirmek istiyor musun?')) return;
    setView(next); setActiveWeek(target); setError(null); setMessage(''); setPending(null); setLoading(true); setDirty(false);
    try {
      await loadTarget(target, index);
    } catch (cause) { setError(cause); }
    finally { setLoading(false); }
  };

  const showHistory = async (selected = historySelection) => {
    if (dirty && !window.confirm('Kaydedilmemiş değişiklikler var. Görünümü değiştirmek istiyor musun?')) return;
    setView('history'); setHistorySelection(selected); setPending(null);
    setError(null); setMessage(''); setLoading(true); setDirty(false);
    try {
      setWeeks(await Promise.all([...selected].sort().map(async (start) => {
        const rows = await api.get('/api/study-program' + qs({ start, end: addDays(start, 6) }));
        return fullWeek(start, rows.find((row) => row.weekStart === start));
      })));
    } catch (cause) { setError(cause); }
    finally { setLoading(false); }
  };

  const toggleHistory = (start) => showHistory(historySelection.includes(start)
    ? historySelection.filter((item) => item !== start) : [...historySelection, start]);

  const decide = (mode) => {
    setWeeks([fullWeek(pending.target, null, mode === 'copy' ? pending.source : null)]);
    setPending(null); setDirty(true);
  };

  const editCell = (weekStart, day, slot, value) => {
    setWeeks((rows) => rows.map((row) => {
      if (row.weekStart !== weekStart || !row.editable) return row;
      const next = [...row.cells[day]];
      next[slot] = value;
      return { ...row, cells: { ...row.cells, [day]: next } };
    }));
    setDirty(true); setMessage('');
  };

  const editTime = (weekStart, boundary, value) => {
    const row = weeks.find((item) => item.weekStart === weekStart);
    if (!row?.editable) return false;
    const shifted = shiftTimeBoundary(row.timeBoundaries, boundary, value);
    if (!shifted) { setError(new Error('Saatler 00:00–23:59 arasında ve aralıklar en az 5 dakika olmalı.')); return false; }
    setWeeks((rows) => rows.map((item) => item.weekStart === weekStart
      ? { ...item, timeBoundaries: shifted } : item));
    setDirty(true); setMessage(''); setError(null);
    return true;
  };

  const save = async () => {
    const week = weeks[0];
    if (!week?.editable || view === 'history') return;
    setError(null); setMessage(''); setSaving(true);
    try {
      const { weekStart, selectedStart, selectedEnd, zone, cells, timeBoundaries } = week;
      const result = await api.put('/api/study-program', {
        weeks: [{ weekStart, selectedStart, selectedEnd, zone, cells, timeBoundaries }],
      });
      setWeeks([fullWeek(week.weekStart, result[0])]);
      setIndex((saved) => [...new Set([...saved, week.weekStart])].sort());
      setDirty(false); setMessage('Program kaydedildi.');
    } catch (cause) { setError(cause); }
    finally { setSaving(false); }
  };

  return <section className="daily-program" ref={tablesRef}>
    <h2>Günlük Program</h2>
    <section className="card program-week-picker" aria-label="Hafta seçimi">
      <h3>Haftalar</h3>
      <div className="program-week-options">{availableWeeks.map((start) => {
        const past = start < todayWeek;
        const current = start === todayWeek;
        const selected = past ? view === 'history' && historySelection.includes(start)
          : view !== 'history' && activeWeek === start;
        return <button type="button" key={start} disabled={loading}
          className={`program-week-option ${past ? 'is-past' : current ? 'is-current' : 'is-next'} ${selected ? 'is-selected' : ''}`}
          aria-pressed={selected} onClick={() => past ? toggleHistory(start) : openView(start)}>
          <span className="program-week-option-label">{weekLabel(start, index[0])}</span>
          <span className="program-week-option-status">{past ? 'Bitti' : current ? 'Bu hafta' : start === nextWeek ? 'Gelecek hafta' : 'Yaklaşan'}</span>
        </button>;
      })}</div>
      {view === 'history' && <p className="muted small">{historySelection.length
        ? `${historySelection.length} geçmiş hafta seçildi. Birden fazla haftayı birlikte görebilirsin.`
        : 'Görmek için geçmiş bir hafta seç.'}</p>}
    </section>
    {pending && !loading && <div className="card program-choice" role="group" aria-label="Yeni program seçeneği">
      <p><strong>{weekLabel(pending.target, index[0])}</strong> için program nasıl başlasın?</p>
      <div className="program-actions">
        {pending.source && <button type="button" className="btn btn-primary" onClick={() => decide('copy')}>
          Önceki haftayı kopyala</button>}
        <button type="button" className="btn btn-secondary" onClick={() => decide('blank')}>Boş program oluştur</button>
      </div>
    </div>}
    {loading && <Loading text="Program yükleniyor…" />}
    {error && <ErrorBox error={error} onRetry={() => {
      setError(null);
      if (view === 'history') showHistory();
      else { setLoading(true); loadTarget(activeWeek, index)
        .catch(setError).finally(() => setLoading(false)); }
    }} />}
    {message && <Alert type="success">{message}</Alert>}
    {!loading && !pending && weeks.map((week) => <section className="card program-week" key={week.weekStart}>
      <div className="program-week-head"><h3>{weekLabel(week.weekStart, index[0])}</h3>
        {!week.editable && <span className="chip">Geçmiş hafta · salt okunur</span>}</div>
      <p className="muted small">Bir saati değiştirince sonraki saatler aynı farkla kayar; bitiş saati sonraki satırın başlangıcıdır.</p>
      <div className="table-wrap"><table className="table program-table"><thead><tr><th scope="col">Saat</th>
        {DAYS.map((name, dayIndex) => {
          const day = addDays(week.weekStart, dayIndex);
          return <th scope="col" key={day}>{name}<span>{formatDate(day)}</span></th>;
        })}</tr></thead><tbody>{week.timeBoundaries.slice(0, -1).map((startTime, slot) => {
          const endTime = week.timeBoundaries[slot + 1];
          return <tr key={slot}><th scope="row"><div className="program-time-range">
            <TimeField label={`${weekLabel(week.weekStart, index[0])} ${slot + 1}. aralık başlangıcı`}
              value={startTime} readOnly={!week.editable || view === 'history'}
              onInvalid={() => setError(new Error('Saati 24 saat biçiminde yaz (ör. 14:30).'))}
              onCommit={(value) => editTime(week.weekStart, slot, value)} />
            <span aria-hidden="true">–</span>
            <TimeField label={`${weekLabel(week.weekStart, index[0])} ${slot + 1}. aralık bitişi`}
              value={endTime} readOnly={!week.editable || view === 'history'}
              onInvalid={() => setError(new Error('Saati 24 saat biçiminde yaz (ör. 14:30).'))}
              onCommit={(value) => editTime(week.weekStart, slot + 1, value)} />
          </div></th>
          {DAYS.map((_, dayIndex) => {
            const day = addDays(week.weekStart, dayIndex);
            return <td key={day}><textarea aria-label={`${formatDate(day)} ${startTime}–${endTime}`}
              maxLength={250} rows={2} value={week.cells[day]?.[slot] || ''}
              readOnly={!week.editable || view === 'history'}
              onChange={(event) => editCell(week.weekStart, day, slot, event.target.value)} /></td>;
          })}</tr>;
        })}</tbody></table></div>
    </section>)}
    {!loading && !pending && view !== 'history' && weeks.some((row) => row.editable) && <div className="program-save">
      <span className="muted small">{dirty ? 'Kaydedilmemiş değişiklik var.' : 'Programı değiştirdiğinde kaydet.'}</span>
      <button type="button" className="btn btn-primary" disabled={saving || !dirty} onClick={save}>
        {saving ? 'Kaydediliyor…' : 'Programı kaydet'}</button>
    </div>}
    <p className="muted small">Her program pazartesiden pazara yedi gündür. Geçmiş haftalar sabittir; bu hafta ve gelecek hafta düzenlenebilir.</p>
  </section>;
}

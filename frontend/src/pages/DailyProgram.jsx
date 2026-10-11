import { useCallback, useEffect, useState } from 'react';
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
const monday = (day) => {
  const index = new Date(`${day}T12:00:00Z`).getUTCDay();
  return addDays(day, -(index + 6) % 7);
};
const minDate = (a, b) => a < b ? a : b;
const maxDate = (a, b) => a > b ? a : b;
const shortDate = (day) => new Intl.DateTimeFormat('tr-TR', {
  month: 'long', day: 'numeric', timeZone: 'UTC',
}).format(new Date(`${day}T12:00:00Z`));
const blank = () => Array(DEFAULT_BOUNDARIES.length - 1).fill('');
const currentWeek = () => {
  const start = monday(localDate());
  return { start, end: addDays(start, 6) };
};

function TimeField({ value, label, readOnly, onCommit, onInvalid }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    if (readOnly || draft === value) return;
    const normalized = normalize24Hour(draft);
    if (!normalized) {
      onInvalid(); setDraft(value); return;
    }
    if (!onCommit(normalized)) setDraft(value);
  };

  return <input type="text" inputMode="numeric" maxLength={5} placeholder="SS:dd"
    aria-label={label} title="24 saat biçiminde yaz (ör. 14:30)"
    value={draft} readOnly={readOnly}
    onChange={(event) => setDraft(event.target.value)} onBlur={commit}
    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />;
}

function makeWeeks(start, end, saved, source, mode) {
  const byStart = new Map(saved.map((row) => [row.weekStart, row]));
  const result = [];
  const today = localDate();
  const sourceWeek = source.find((row) => row.cells && Object.keys(row.cells).length) || source[0];
  for (let weekStart = monday(start); weekStart <= end; weekStart = addDays(weekStart, 7)) {
    const weekEnd = addDays(weekStart, 6);
    const visibleStart = maxDate(start, weekStart);
    const visibleEnd = minDate(end, weekEnd);
    const record = byStart.get(weekStart);
    const covered = record && record.selectedStart <= visibleStart && visibleEnd <= record.selectedEnd;
    const editable = weekEnd >= today && (record?.editable ?? true);
    const cells = covered || !editable ? { ...(record?.cells || {}) } : {};
    if (!covered && editable && mode === 'copy' && sourceWeek) {
      for (let index = 0; index < 7; index++) {
        const day = addDays(weekStart, index);
        if (visibleStart <= day && day <= visibleEnd) {
          const from = addDays(sourceWeek.weekStart, index);
          cells[day] = [...(sourceWeek.cells?.[from] || blank())];
        }
      }
    }
    const timeBoundaries = covered || !editable
      ? record?.timeBoundaries || DEFAULT_BOUNDARIES
      : mode === 'copy' && sourceWeek ? sourceWeek.timeBoundaries || DEFAULT_BOUNDARIES : DEFAULT_BOUNDARIES;
    result.push({ weekStart, visibleStart, visibleEnd,
      selectedStart: covered || !editable ? record?.selectedStart || visibleStart : visibleStart,
      selectedEnd: covered || !editable ? record?.selectedEnd || visibleEnd : visibleEnd,
      zone: record?.zone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul',
      cells, timeBoundaries: [...timeBoundaries], editable });
  }
  return result;
}

export default function DailyProgram() {
  const [initial] = useState(currentWeek);
  const [draft, setDraft] = useState(initial);
  const [range, setRange] = useState(initial);
  const [weeks, setWeeks] = useState([]);
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async (start, end, preferSavedRange = false) => {
    const saved = await api.get('/api/study-program' + qs({ start, end }));
    const shown = preferSavedRange && saved.length === 1
      ? { start: saved[0].selectedStart, end: saved[0].selectedEnd } : { start, end };
    setWeeks(makeWeeks(shown.start, shown.end, saved, [], 'saved'));
    setRange(shown);
    if (preferSavedRange) setDraft(shown);
    setDirty(false);
  }, []);

  useEffect(() => {
    load(initial.start, initial.end, true).catch(setError).finally(() => setLoading(false));
  }, [initial, load]);

  const chooseRange = async (event) => {
    event.preventDefault();
    setError(null); setMessage('');
    if (!draft.start || !draft.end || draft.start > draft.end) {
      setError(new Error('Başlangıç tarihi bitiş tarihinden sonra olamaz.')); return;
    }
    const days = Math.round((new Date(`${draft.end}T12:00:00Z`) - new Date(`${draft.start}T12:00:00Z`)) / 86400000);
    if (days > 366) { setError(new Error('En fazla 367 günlük aralık seç.')); return; }
    if (dirty && !window.confirm('Kaydedilmemiş değişiklikler var. Tarih aralığını değiştirmek istiyor musun?')) return;
    setLoading(true);
    try {
      const saved = await api.get('/api/study-program' + qs(draft));
      const preview = makeWeeks(draft.start, draft.end, saved, [], 'saved');
      const needsChoice = preview.some((row) => row.editable && !saved.some((item) =>
        item.weekStart === row.weekStart && item.selectedStart <= row.visibleStart && row.visibleEnd <= item.selectedEnd));
      if (needsChoice) setPending({ ...draft, saved, source: weeks });
      else {
        setWeeks(preview); setRange({ ...draft }); setDirty(false); setPending(null);
      }
    } catch (cause) { setError(cause); }
    finally { setLoading(false); }
  };

  const decide = (mode) => {
    setWeeks(makeWeeks(pending.start, pending.end, pending.saved, pending.source, mode));
    setRange({ start: pending.start, end: pending.end });
    setDirty(false); setPending(null);
  };

  const editCell = (weekStart, day, slot, value) => {
    setWeeks((rows) => rows.map((row) => {
      if (row.weekStart !== weekStart) return row;
      const next = [...(row.cells[day] || blank())];
      next[slot] = value;
      return { ...row, cells: { ...row.cells, [day]: next } };
    }));
    setDirty(true); setMessage('');
  };

  const editTime = (weekStart, boundary, value) => {
    const row = weeks.find((item) => item.weekStart === weekStart);
    if (!row?.editable) return false;
    const shifted = shiftTimeBoundary(row.timeBoundaries, boundary, value);
    if (!shifted) {
      setError(new Error('Saatler 00:00–23:59 arasında ve aralıklar en az 5 dakika olmalı.'));
      return false;
    }
    setWeeks((rows) => rows.map((item) => item.weekStart === weekStart
      ? { ...item, timeBoundaries: shifted } : item));
    setDirty(true); setMessage(''); setError(null);
    return true;
  };

  const save = async () => {
    setError(null); setMessage(''); setSaving(true);
    try {
      const editable = weeks.filter((row) => row.editable);
      if (!editable.length) return;
      const result = await api.put('/api/study-program', { weeks: editable.map((row) => {
        const cells = {};
        for (let day = row.selectedStart; day <= row.selectedEnd; day = addDays(day, 1)) {
          cells[day] = row.cells[day] || blank();
        }
        return { weekStart: row.weekStart, selectedStart: row.selectedStart,
          selectedEnd: row.selectedEnd, zone: row.zone, cells, timeBoundaries: row.timeBoundaries };
      }) });
      const byStart = new Map(result.map((row) => [row.weekStart, row]));
      setWeeks((rows) => rows.map((row) => ({ ...row, ...byStart.get(row.weekStart),
        visibleStart: row.visibleStart, visibleEnd: row.visibleEnd })));
      setDirty(false); setMessage('Program kaydedildi.');
    } catch (cause) { setError(cause); }
    finally { setSaving(false); }
  };

  return <section className="daily-program">
    <h2>Günlük Program</h2>
    <form className="program-range card" onSubmit={chooseRange}>
      <label className="field"><span className="field-label">Başlangıç</span><input type="date" required
        value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} /></label>
      <label className="field"><span className="field-label">Bitiş</span><input type="date" required
        value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} /></label>
      <button className="btn btn-secondary" disabled={loading}>Tarih aralığını göster</button>
    </form>
    {pending && <div className="card program-choice" role="group" aria-label="Yeni program seçeneği">
      <p><strong>{shortDate(pending.start)} – {shortDate(pending.end)}</strong> için program nasıl başlasın?</p>
      <div className="program-actions">
        <button type="button" className="btn btn-primary" onClick={() => decide('copy')}>Görünen programı kopyala</button>
        <button type="button" className="btn btn-secondary" onClick={() => decide('blank')}>Yeni boş program</button>
        <button type="button" className="btn btn-secondary" onClick={() => setPending(null)}>Vazgeç</button>
      </div>
    </div>}
    {loading && <Loading text="Program yükleniyor…" />}
    {error && <ErrorBox error={error} onRetry={() => { setError(null); setLoading(true);
      load(range.start, range.end).catch(setError).finally(() => setLoading(false)); }} />}
    {message && <Alert type="success">{message}</Alert>}
    {!loading && !pending && weeks.map((week, position) => <section className="card program-week" key={week.weekStart}>
      <div className="program-week-head"><h3>{position + 1}. hafta · {shortDate(week.weekStart)} – {shortDate(addDays(week.weekStart, 6))}</h3>
        {!week.editable && <span className="chip">Geçmiş hafta · salt okunur</span>}</div>
      <p className="muted small">Bir saati değiştirince sonraki saatler aynı farkla kayar; bitiş saati sonraki satırın başlangıcıdır.</p>
      <div className="table-wrap"><table className="table program-table"><thead><tr><th scope="col">Saat</th>
        {DAYS.map((name, index) => {
          const day = addDays(week.weekStart, index);
          const selected = week.visibleStart <= day && day <= week.visibleEnd;
          return <th scope="col" key={day}>{name}{selected && <span>{shortDate(day)}</span>}</th>;
        })}</tr></thead><tbody>{week.timeBoundaries.slice(0, -1).map((startTime, slot) => {
          const endTime = week.timeBoundaries[slot + 1];
          return <tr key={slot}><th scope="row"><div className="program-time-range">
            <TimeField label={`${position + 1}. hafta ${slot + 1}. aralık başlangıcı`}
              value={startTime} readOnly={!week.editable}
              onInvalid={() => setError(new Error('Saati 24 saat biçiminde yaz (ör. 14:30).'))}
              onCommit={(value) => editTime(week.weekStart, slot, value)} />
            <span aria-hidden="true">–</span>
            <TimeField label={`${position + 1}. hafta ${slot + 1}. aralık bitişi`}
              value={endTime} readOnly={!week.editable}
              onInvalid={() => setError(new Error('Saati 24 saat biçiminde yaz (ör. 14:30).'))}
              onCommit={(value) => editTime(week.weekStart, slot + 1, value)} />
          </div></th>
          {DAYS.map((_, index) => {
            const day = addDays(week.weekStart, index);
            const selected = week.visibleStart <= day && day <= week.visibleEnd;
            return <td key={day} className={selected ? '' : 'program-empty'}>{selected && <textarea
              aria-label={`${shortDate(day)} ${startTime}–${endTime}`} maxLength={250} rows={2}
              value={week.cells[day]?.[slot] || ''} readOnly={!week.editable}
              onChange={(event) => editCell(week.weekStart, day, slot, event.target.value)} />}</td>;
          })}</tr>;
        })}</tbody></table></div>
    </section>)}
    {!loading && !pending && weeks.some((row) => row.editable) && <div className="program-save">
      <span className="muted small">{dirty ? 'Kaydedilmemiş değişiklik var.' : 'Programı değiştirdiğinde kaydet.'}</span>
      <button type="button" className="btn btn-primary" disabled={saving || pending} onClick={save}>
        {saving ? 'Kaydediliyor…' : 'Programı kaydet'}</button>
    </div>}
    <p className="muted small">Seçilen günler kaydedilir. İçinde bulunulan hafta ve gelecek haftalar düzenlenebilir; tamamlanan haftalar yalnız görüntülenir.</p>
  </section>;
}

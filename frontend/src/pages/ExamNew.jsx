import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useFilterRows, usePageTitle } from '../hooks.js';
import FilterSelects, { countMatching } from '../components/FilterSelects.jsx';
import Segmented from '../components/Segmented.jsx';
import { Field } from '../components/Field.jsx';
import { Alert } from '../components/States.jsx';
import { BANKS, displayName, formatNumber } from '../format.js';

const QUICK_COUNTS = [10, 20, 30, 40].map((n) => ({ value: String(n), label: String(n) }));
const TIME_MODES = [
  { value: true, label: 'Süreli' },
  { value: false, label: 'Süresiz' },
];
const suggest = (n) => String(Math.round(n * 1.5));

export default function ExamNew() {
  const { user } = useAuth();
  usePageTitle('Sınav Başlat');
  const [bank, setBank] = useState(''); // boş = tüm koleksiyonlar
  const rows = useFilterRows(bank);
  const navigate = useNavigate();
  const [filter, setFilter] = useState({ examType: '', subject: '', topic: '' });
  const [count, setCount] = useState('20');
  const [selectionMode, setSelectionMode] = useState('MIXED');
  const [progress, setProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [timed, setTimed] = useState(true);
  const [minutes, setMinutes] = useState(suggest(20));
  const [minutesTouched, setMinutesTouched] = useState(false);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ busy: false, error: '' });

  const n = Number(count);
  const countValid = Number.isInteger(n) && n >= 1 && n <= 120;
  useEffect(() => {
    let current = true;
    setProgress(null);
    setProgressLoading(true);
    api.get('/api/questions/availability' + qs({ bank, ...filter }))
      .then((data) => { if (current) setProgress(data); })
      .catch((e) => { if (current && e.status === 404) setSelectionMode('MIXED'); })
      .finally(() => { if (current) setProgressLoading(false); });
    return () => { current = false; };
  }, [bank, filter.examType, filter.subject, filter.topic]);

  const available = progress ? ({ NEW: progress.remaining, REPEAT: progress.solved,
    WRONG: progress.everWrong, MIXED: progress.total })[selectionMode] : countMatching(rows, filter);

  // Soru sayısı değişince süre önerisi güncellenir (süre elle değiştirilmediyse).
  const changeCount = (value) => {
    setCount(value);
    const k = Number(value);
    if (!minutesTouched && Number.isInteger(k) && k >= 1) setMinutes(suggest(k));
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!countValid) next.questionCount = 'Soru sayısı 1 ile 120 arasında bir tam sayı olmalı.';
    else if (!progressLoading && rows.length && available < n) next.questionCount = `Bu seçimde yalnızca ${formatNumber(available)} soru var.`;
    const m = Number(minutes);
    if (timed && !(Number.isInteger(m) && m >= 1 && m <= 600)) next.timeLimitMinutes = 'Süre 1 ile 600 dakika arasında olmalı.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setState({ busy: true, error: '' });
    try {
      const exam = await api.post('/api/exams', {
        bank: bank || undefined,
        examType: filter.examType || undefined,
        subject: filter.subject || undefined,
        topic: filter.topic || undefined,
        questionCount: n,
        selectionMode: progress ? selectionMode : 'MIXED',
        timeLimitMinutes: timed ? m : undefined,
      });
      navigate(`/sinav/${exam.id}`);
    } catch (err) {
      setErrors(err.fields);
      setState({ busy: false, error: err.message });
    }
  };

  return (
    <>
      <h1>{displayName(user)}, yeni sınav oluştur</h1>
      <form className="card form-card" onSubmit={submit} noValidate>
        <h2>Soru seçimi</h2>
        <Field
          as="select"
          label="Kaynak"
          value={bank}
          onChange={(e) => {
            setBank(e.target.value);
            setFilter({ examType: '', subject: '', topic: '' });
          }}
        >
          <option value="">Hepsi</option>
          {Object.entries(BANKS).map(([key, b]) => (
            <option key={key} value={key}>
              {b.label}
            </option>
          ))}
        </Field>
        <FilterSelects rows={rows} value={filter} onChange={setFilter} />
        {progress && <Field as="select" label="Soru geçmişi" value={selectionMode} onChange={(e) => setSelectionMode(e.target.value)}>
          <option value="MIXED">Karışık · {formatNumber(progress.total)} soru</option>
          <option value="NEW">Yalnız yeni · {formatNumber(progress.remaining)} soru</option>
          <option value="REPEAT">Daha önce çözdüğüm · {formatNumber(progress.solved)} soru</option>
          <option value="WRONG">En az bir kez yanlış yaptığım · {formatNumber(progress.everWrong)} soru</option>
        </Field>}
        {rows.length > 0 && (
          <p className="muted">
            Bu seçimde <strong>{formatNumber(available)}</strong> soru var.
          </p>
        )}
        {rows.length > 0 && available === 0 && <Alert type="warn">Bu seçimde soru yok. Filtreyi veya soru geçmişini değiştir.</Alert>}
        {countValid && available > 0 && available < n && (
          <Alert type="warn">
            Bu seçimde yalnızca {formatNumber(available)} soru var. Soru sayısını azalt veya seçimi değiştir.
          </Alert>
        )}

        <h2>Soru sayısı</h2>
        <Segmented label="Hızlı soru sayısı" options={QUICK_COUNTS} value={count} onChange={changeCount} />
        <Field
          label="Soru sayısı (1–120)"
          type="number"
          inputMode="numeric"
          min="1"
          max="120"
          value={count}
          onChange={(e) => changeCount(e.target.value)}
          error={errors.questionCount}
        />

        <h2>Süre</h2>
        <Segmented label="Süre türü" options={TIME_MODES} value={timed} onChange={setTimed} />
        {timed && (
          <Field
            label="Süre (dakika)"
            type="number"
            inputMode="numeric"
            min="1"
            max="600"
            value={minutes}
            onChange={(e) => {
              setMinutes(e.target.value);
              setMinutesTouched(true);
            }}
            hint={countValid ? `Öneri: ${suggest(n)} dk (soru sayısı × 1,5)` : undefined}
            error={errors.timeLimitMinutes}
          />
        )}

        {state.error && <Alert type="error">{state.error}</Alert>}
        <button type="submit" className="btn btn-primary btn-lg" disabled={state.busy || progressLoading || (rows.length > 0 && available < n)}>
          {state.busy ? 'Hazırlanıyor…' : 'Sınavı Başlat'}
        </button>
      </form>
    </>
  );
}

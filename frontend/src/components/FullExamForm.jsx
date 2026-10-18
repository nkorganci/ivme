import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAsync } from '../hooks.js';
import Segmented from './Segmented.jsx';
import { Alert, ErrorBox, Loading } from './States.jsx';
import { BANKS } from '../format.js';

const TRACKS = [
  { value: 'SAYISAL', label: 'Sayısal' },
  { value: 'ESIT_AGIRLIK', label: 'Eşit ağırlık' },
  { value: 'SOZEL', label: 'Sözel' },
];

export default function FullExamForm() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const examType = params.get('examType') === 'AYT' ? 'AYT' : 'TYT';
  const track = examType === 'AYT' && TRACKS.some(item => item.value === params.get('track'))
    ? params.get('track') : 'SAYISAL';
  const bank = Object.hasOwn(BANKS, params.get('bank')) ? params.get('bank') : '';
  const noBank = params.get('bank') === 'NONE';
  const includeSolved = params.get('includeSolved') !== 'false';
  const selectionMode = includeSolved ? 'MIXED' : 'NEW';
  const query = qs({ bank, examType, track, includeSolved });
  const { data: plan, loading, error: planError, retry } = useAsync(
    () => noBank ? Promise.resolve(null) : api.get('/api/exams/plan' + query), [query, noBank]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const currentPlan = !noBank && plan?.examType === examType && plan?.track === track
    && (plan.bank || '') === bank && plan.selectionMode === selectionMode ? plan : null;
  const ready = !busy && !loading && !planError && currentPlan?.ready;

  const change = (key, value) => {
    setError('');
    setParams(current => {
      const next = new URLSearchParams(current);
      if (key === 'bank' || key === 'examType') next.delete('source');
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
  };
  const changeBank = (key, checked) => {
    const selected = noBank ? [] : bank ? [bank] : Object.keys(BANKS);
    const next = checked ? [...selected, key] : selected.filter(item => item !== key);
    change('bank', next.length === 2 ? '' : next[0] || 'NONE');
  };
  const submit = async event => {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError('');
    try {
      // Only these choices cross into the full exam. Old practice/topic URLs
      // cannot silently restrict the bank, branch quotas or question count.
      const exam = await api.post('/api/exams/full', { bank: bank || undefined, examType, track, includeSolved });
      navigate(`/sinav/${exam.id}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
      retry();
    }
  };

  return <form className="card form-card" onSubmit={submit} aria-labelledby="full-exam-title">
    <h2 id="full-exam-title">Deneme oluştur</h2>
    <div className="study-choices" role="group" aria-label="Sınav türü">
      {['TYT', 'AYT'].map(value => <button key={value} type="button" disabled={busy}
        className={`study-choice${examType === value ? ' selected' : ''}`}
        aria-pressed={examType === value} onClick={() => change('examType', value)}>
        <strong>{value}</strong><span>{value === 'TYT' ? '120 soru · 165 dakika' : 'Alanına göre 80 soru · 180 dakika'}</span>
      </button>)}
    </div>
    {examType === 'AYT' && <>
      <div className="field-label">Alan</div>
      <Segmented label="Puan türü" options={TRACKS} value={track} disabled={busy}
        onChange={value => change('track', value)} />
    </>}
    <fieldset className="full-exam-sources" disabled={busy}>
      <legend>Kaynak</legend>
      {Object.entries(BANKS).map(([key, item]) => <label key={key}>
        <input type="checkbox" checked={!noBank && (!bank || bank === key)}
          onChange={event => changeBank(key, event.target.checked)} />
        {examType} {key === 'CIKMIS' ? 'Çıkmış Sorular' : item.label}
      </label>)}
      <p className="muted small">Bir kaynağı veya ikisini birlikte seçebilirsin.</p>
    </fieldset>
    <label className="full-exam-history">
      <input type="checkbox" checked={includeSolved} disabled={busy}
        onChange={event => change('includeSolved', event.target.checked ? '' : 'false')} />
      Daha önce deneme veya pratikte çözdüğüm sorular da çıksın
    </label>
    {!includeSolved && <p className="muted small">Yalnızca henüz yanıtlamadığın sorular seçilir.</p>}
    {noBank ? <Alert type="warn">En az bir soru kaynağı seç.</Alert>
      : loading ? <Loading text="Deneme hazırlanıyor…" />
      : planError ? <ErrorBox error={planError} onRetry={retry} />
      : currentPlan && <>
        <p className="muted">{currentPlan.questionCount} soru · {currentPlan.timeLimitMinutes} dakika.
          Sorular yalnızca {examType} havuzundan, seçtiğin kaynaklardan branş dağılımına göre rastgele seçilir.</p>
        {!currentPlan.ready && <Alert type="warn">
          Bu kaynaklarla deneme oluşturmak için yeterli soru yok.
          {currentPlan.subjects.filter(row => row.available < row.target).map(row =>
            <div key={row.subject}>{row.subject}: {row.target} soru gerekli, {row.available} uygun soru var.</div>)}
          {!includeSolved ? 'Diğer kaynağı da seçebilir veya çözülmüş soruları dahil edebilirsin.' : 'Diğer kaynağı da seçebilirsin.'}
        </Alert>}
      </>}
    {error && <Alert type="error">{error}</Alert>}
    <button type="submit" className="btn btn-primary btn-lg" disabled={!ready}>
      {busy ? 'Hazırlanıyor…' : 'Denemeyi başlat'}
    </button>
  </form>;
}

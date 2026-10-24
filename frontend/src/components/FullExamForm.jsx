import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAsync } from '../hooks.js';
import Segmented from './Segmented.jsx';
import { Alert, ErrorBox, Loading } from './States.jsx';
import { BANKS } from '../format.js';
import { Field } from './Field.jsx';
import { useExamTrack } from '../examTrack.jsx';

const TRACKS = [
  { value: 'SAYISAL', label: 'Sayısal' },
  { value: 'ESIT_AGIRLIK', label: 'Eşit ağırlık' },
  { value: 'SOZEL', label: 'Sözel' },
];

export default function FullExamForm() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { exams, examLabel, kpss } = useExamTrack();
  // Testler seçili sınavdan gelir (TYT/AYT veya KPSS Genel Yetenek/Genel Kültür).
  const examType = exams.some(e => e.id === params.get('examType')) ? params.get('examType') : exams[0].id;
  const examName = examLabel(examType);
  const track = examType === 'AYT' && TRACKS.some(item => item.value === params.get('track'))
    ? params.get('track') : 'SAYISAL';
  // KPSS'de yalnız ÖSYM çıkmış soruları vardır; soru bankası seçeneği gösterilmez.
  const banks = kpss ? { CIKMIS: BANKS.CIKMIS } : BANKS;
  const bank = kpss ? 'CIKMIS' : Object.hasOwn(BANKS, params.get('bank')) ? params.get('bank') : '';
  const noBank = !kpss && params.get('bank') === 'NONE';
  const includeSolved = params.get('includeSolved') !== 'false';
  const selectionMode = includeSolved ? 'MIXED' : 'NEW';
  const byYear = params.get('examSource') === 'year';
  const query = qs({ bank, examType, track, includeSolved });
  const normal = useAsync(
    () => noBank || byYear ? Promise.resolve(null) : api.get('/api/exams/plan' + query), [query, noBank, byYear]);
  const archiveQuery = qs({ examType, track });
  const archive = useAsync(() => byYear
    ? api.get('/api/exams/archive' + archiveQuery).then(plans => ({ key: archiveQuery, plans }))
    : Promise.resolve(null), [byYear, archiveQuery]);
  const archivePlans = archive.data?.key === archiveQuery ? archive.data.plans : [];
  const year = params.get('year') || String(archivePlans.find(plan => plan.ready)?.year || archivePlans[0]?.year || '');
  const loading = byYear ? archive.loading : normal.loading;
  const planError = byYear ? archive.error : normal.error;
  const retry = byYear ? archive.retry : normal.retry;
  const plan = normal.data;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const currentPlan = byYear ? archivePlans.find(plan => String(plan.year) === year)
    : !noBank && plan?.examType === examType && plan?.track === track
      && (plan.bank || '') === bank && plan.selectionMode === selectionMode ? plan : null;
  const ready = !busy && !loading && !planError && currentPlan?.ready;

  const change = (key, value) => {
    setError('');
    setParams(current => {
      const next = new URLSearchParams(current);
      if (key === 'bank' || key === 'examType') next.delete('source');
      if (key === 'examType' || key === 'track') next.delete('year');
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
  };
  const changeBank = (key, checked) => {
    const selected = noBank ? [] : bank ? [bank] : Object.keys(banks);
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
      const exam = await api.post('/api/exams/full', byYear
        ? { bank: 'CIKMIS', examType, track, includeSolved: true, year: Number(year) }
        : { bank: bank || undefined, examType, track, includeSolved });
      navigate(`/sinav/${exam.id}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
      retry();
    }
  };

  return <form className="card form-card" onSubmit={submit} aria-labelledby="full-exam-title">
    <h2 id="full-exam-title">Deneme oluştur</h2>
    <div className="field-label">Deneme seçimi</div>
    <Segmented label="Deneme seçimi" value={byYear ? 'year' : 'mixed'} disabled={busy}
      options={[{ value: 'mixed', label: 'Genel deneme' }, { value: 'year', label: 'Yıla ait tam sınav' }]}
      onChange={value => change('examSource', value === 'year' ? 'year' : '')} />
    <div className="study-choices" role="group" aria-label="Sınav türü">
      {exams.map(exam => <button key={exam.id} type="button" disabled={busy}
        className={`study-choice${examType === exam.id ? ' selected' : ''}`}
        aria-pressed={examType === exam.id} onClick={() => change('examType', exam.id)}>
        <strong>{exam.name}</strong><span>{exam.detail}</span>
      </button>)}
    </div>
    {examType === 'AYT' && <>
      <div className="field-label">Alan</div>
      <Segmented label="Puan türü" options={TRACKS} value={track} disabled={busy}
        onChange={value => change('track', value)} />
    </>}
    {byYear ? <>
      <Field label="Sınav yılı" as="select" value={year} disabled={busy || loading || !archivePlans.length}
          onChange={event => change('year', event.target.value)}>
          {!archivePlans.length && <option value="">Kayıtlı yıl yok</option>}
          {archivePlans.map(plan => <option key={plan.year} value={plan.year}>
            {plan.year} {examName}{!plan.ready ? ' — yeterli soru yok'
              : plan.estimatedQuestionCount ? ' — tahmini sorularla tamamlanır' : ''}
          </option>)}
      </Field>
      <p className="muted small">Seçtiğin yılın çıkmış soruları kitapçık sırasıyla gelir.
        Eksikler aynı sınav türü ve dersten uygun sorularla tamamlanır; eklenen sorular tahmini olarak gösterilir.
        Daha önce çözdüğün sorular da sınavın içinde yer alır.</p>
    </> : <>
    <fieldset className="full-exam-sources" disabled={busy}>
      <legend>Kaynak</legend>
      {Object.entries(banks).map(([key, item]) => <label key={key}>
        <input type="checkbox" checked={!noBank && (!bank || bank === key)} disabled={kpss}
          onChange={event => changeBank(key, event.target.checked)} />
        {examName} {key === 'CIKMIS' ? 'Çıkmış Sorular' : item.label}
      </label>)}
      <p className="muted small">{kpss ? 'Sorular ÖSYM çıkmış sorularından seçilir.' : 'Bir kaynağı veya ikisini birlikte seçebilirsin.'}</p>
    </fieldset>
    <label className="full-exam-history">
      <input type="checkbox" checked={includeSolved} disabled={busy}
        onChange={event => change('includeSolved', event.target.checked ? '' : 'false')} />
      Daha önce deneme veya pratikte çözdüğüm sorular da çıksın
    </label>
    {!includeSolved && <p className="muted small">Yalnızca henüz yanıtlamadığın sorular seçilir.</p>}
    </>}
    {!byYear && noBank ? <Alert type="warn">En az bir soru kaynağı seç.</Alert>
      : loading ? <Loading text="Deneme hazırlanıyor…" />
      : planError ? <ErrorBox error={planError} onRetry={retry} />
      : byYear && !currentPlan ? <Alert type="warn">Bu seçim için kayıtlı sınav yılı bulunamadı.</Alert>
      : currentPlan && <>
        <p className="muted">{currentPlan.questionCount} soru · {currentPlan.timeLimitMinutes} dakika.
          {byYear ? ` ${year} ${examName} sınavı, özgün ders dağılımıyla hazırlanır.`
            : ` Sorular yalnızca ${examName} havuzundan, seçtiğin kaynaklardan branş dağılımına göre seçilir.`}</p>
        {!byYear && <p className="muted small">Her derste ünite ve konulara dengeli yer verilir.
          Sonraki denemelerde daha önce sorulmayan veya az sorulan konulara öncelik verilir.</p>}
        {byYear && currentPlan.ready && currentPlan.estimatedQuestionCount > 0 && <Alert type="warn">
          Arşivde eksik veya inceleme bekleyen sorular var. Sınav {currentPlan.estimatedQuestionCount} tahmini soruyla tamamlanarak başlatılabilir.
          {currentPlan.subjects.filter(row => row.available < row.target).map(row =>
            <div key={row.subject}>{row.subject}: {row.available} çıkmış + {row.target - row.available} tahmini = {row.target} soru.</div>)}
          Tahmini sorular her dersin sonunda yer alır.
        </Alert>}
        {!currentPlan.ready && <Alert type="warn">
          {byYear ? 'Eksik soruları tahmini sorularla tamamlamak için uygun havuzda yeterli soru yok.'
            : 'Bu kaynaklarla deneme oluşturmak için yeterli soru yok.'}
          {currentPlan.subjects.filter(row => byYear ? row.available !== row.target : row.available < row.target).map(row =>
            <div key={row.subject}>{row.subject}: {row.target} soru gerekli, {row.available} uygun soru var.</div>)}
          {byYear ? 'Başka bir yıl veya genel deneme seçebilirsin.'
            : !includeSolved ? 'Diğer kaynağı da seçebilir veya çözülmüş soruları dahil edebilirsin.' : 'Diğer kaynağı da seçebilirsin.'}
        </Alert>}
      </>}
    {error && <Alert type="error">{error}</Alert>}
    <button type="submit" className="btn btn-primary btn-lg" disabled={!ready}>
      {busy ? 'Hazırlanıyor…' : 'Denemeyi başlat'}
    </button>
  </form>;
}

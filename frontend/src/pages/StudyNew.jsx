import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { usePageTitle } from '../hooks.js';
import SharedCategorySelect from '../components/SharedCategorySelect.jsx';
import Segmented from '../components/Segmented.jsx';
import StudyNavigation from '../components/StudyNavigation.jsx';
import FullExamForm from '../components/FullExamForm.jsx';
import QuestionSourceSelect from '../components/QuestionSourceSelect.jsx';
import { Field } from '../components/Field.jsx';
import { Alert, ErrorBox, Loading } from '../components/States.jsx';
import { formatNumber } from '../format.js';
import { readQuestionSources, questionSourceScope, writeQuestionSources, readQuestionHistory, writeQuestionHistory } from '../questionSources.js';
import { STUDY_TITLE } from '../config.js';
import { useExamTrack } from '../examTrack.jsx';

const COUNT_OPTIONS = [10, 20, 30, 40].map((n) => ({ value: String(n), label: String(n) }));
const TIME_OPTIONS = [{ value: true, label: 'Süreli' }, { value: false, label: 'Süresiz' }];

export default function StudyNew() {
  usePageTitle(STUDY_TITLE);
  const { exams } = useExamTrack();
  const [params, setParams] = useSearchParams();
  const examMode = params.get('mode') === 'sinav';
  const changeMode = nextExamMode => setParams(current => {
    const next = new URLSearchParams(current);
    if (nextExamMode) next.set('mode', 'sinav'); else next.delete('mode');
    return next;
  }, { replace: true });
  return <>
    <StudyNavigation bank={params.get('bank') || ''} />
    <section className="card form-card" aria-labelledby="study-mode-title">
      <h2 id="study-mode-title">Nasıl çözmek istersin?</h2>
      <div className="study-choices">
        <button type="button" className={`study-choice${!examMode ? ' selected' : ''}`}
          aria-pressed={!examMode} onClick={() => changeMode(false)}>
          <strong>Pratik</strong>
          <span>Soruları tek tek çöz, yanıtını hemen gör. İstediğinde devam et.</span>
        </button>
        <button type="button" className={`study-choice${examMode ? ' selected' : ''}`}
          aria-pressed={examMode} onClick={() => changeMode(true)}>
          <strong>Deneme</strong>
          <span>{exams.map(e => e.name).join(' veya ')} denemesi çöz, sonucunu sınav sonunda gör.</span>
        </button>
      </div>
    </section>
    {examMode ? <FullExamForm /> : <PracticeForm />}
  </>;
}

function PracticeForm() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const topicPdfId = searchParams.get('topicPdfId');
  const scoped = topicPdfId !== null;
  const commonSelection={categoryId:searchParams.getAll('categoryId'),categoryMatch:searchParams.get('categoryMatch') || 'ANY',includeCandidates:!searchParams.has('categoryId') || searchParams.get('includeCandidates')!=='false',questionTypeId:searchParams.get('questionTypeId') || '',teacherDifficulty:searchParams.get('teacherDifficulty') || ''};
  const hasCategories=commonSelection.categoryId.length>0;
  const branchIds = searchParams.getAll('branchId');
  const requestId = useRef(crypto.randomUUID());
  const { questionSources } = useExamTrack();

  const source = readQuestionSources(searchParams, questionSources);
  const history = scoped ? [] : readQuestionHistory(searchParams);
  const hasHistory = history.length > 0;
  const hasSource = scoped || source.length > 0 || hasHistory;
  const includeSolved = searchParams.get('includeSolved') !== 'false';
  const selectionMode = hasHistory ? 'REPEAT' : includeSolved ? 'MIXED' : 'NEW';
  const { bank, examType } = questionSourceScope(source, questionSources);
  const filter = { examType, subject: branchIds[0] || searchParams.get('subject') || '', topic: searchParams.get('topic') || '' };
  const [count, setCount] = useState('10');
  const [timed, setTimed] = useState(false);
  const [minutes, setMinutes] = useState('20');
  const [availabilityState, setAvailabilityState] = useState(null);
  const [unfinished, setUnfinished] = useState(null);
  const [unfinishedError, setUnfinishedError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const availabilityQuery = !hasSource ? null : qs(scoped ? { topicPdfId } : { bank, source, history, ...filter, ...commonSelection });
  const availability = availabilityState?.key === availabilityQuery ? availabilityState.data : null;
  const availabilityError = availabilityState?.key === availabilityQuery ? availabilityState.error : '';
  const loading = availabilityState?.key !== availabilityQuery || availabilityState.loading;
  const changeCommon=next=>{
    setSearchParams(current=>{const p=new URLSearchParams(current);p.delete('categoryId');next.categoryId.forEach(id=>p.append('categoryId',id));
      p.delete('scope');
      if(next.branchId){p.delete('branchId');next.branchId.forEach(id=>p.append('branchId',id));p.delete('subject');p.delete('topic');}
      if(next.categoryId.length)p.delete('topic');
      for(const key of ['questionTypeId','teacherDifficulty']){if(next[key])p.set(key,next[key]);else p.delete(key);} p.set('categoryMatch',next.categoryMatch);if(next.includeCandidates)p.delete('includeCandidates');else p.set('includeCandidates','false');return p;},{replace:true});
  };

  useEffect(() => {
    let current = true;
    api.get('/api/study-sessions/unfinished-summary')
      .then((data) => { if (current) setUnfinished(data); })
      .catch((e) => { if (current) setUnfinishedError(e.message); });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (availabilityQuery === null) {
      setAvailabilityState({ key: null, data: { total: 0, remaining: 0, solved: 0, everWrong: 0 }, loading: false });
      return;
    }
    let current = true;
    setAvailabilityState({ key: availabilityQuery, loading: true });
    api.get('/api/questions/availability' + availabilityQuery)
      .then(data => { if (current) setAvailabilityState({ key: availabilityQuery, data, loading: false }); })
      .catch(e => { if (current) setAvailabilityState({ key: availabilityQuery, error: e.message, loading: false }); });
    return () => { current = false; };
  }, [availabilityQuery]);

  const n = Number(count);
  const validCount = count.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= 120;

  const maxMinutes = 240;
  const duration = Number(minutes);
  const validDuration = !timed || (minutes.trim() !== '' && Number.isInteger(duration) && duration >= 1 && duration <= maxMinutes);
  const available = availability ? ({ MIXED: availability.total, NEW: availability.remaining,
    REPEAT: availability.solved, WRONG: availability.everWrong })[selectionMode] : 0;
  const ready = hasSource && !busy && !loading && !availabilityError && validCount && validDuration && available >= n;

  const changeHistory = next => setSearchParams(current => writeQuestionHistory(new URLSearchParams(current), next), { replace: true });
  const changeIncludeSolved = checked => setSearchParams(current => {
    const next = new URLSearchParams(current);
    if (checked) next.delete('includeSolved'); else next.set('includeSolved', 'false');
    return next;
  }, { replace: true });

  const changeSources = next => setSearchParams(current => {
    const p = writeQuestionSources(new URLSearchParams(current), next, questionSources);
    for (const key of ['scope', 'subject', 'topic', 'branchId', 'categoryId', 'categoryMatch', 'includeCandidates', 'questionTypeId']) p.delete(key);
    return p;
  }, { replace: true });

  const changeCount = (value) => {
    setCount(value);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    if (!ready) return;
    setBusy(true);
    const common = {
      bank: bank || undefined,
      ...(!scoped ? { source, history } : {}),
      examType: filter.examType || undefined,
      subject: filter.subject || undefined,
      topic: filter.topic || undefined,
      selectionMode,
      questionCount: n,
      topicPdfId: scoped ? Number(topicPdfId) : undefined,
      ...(!scoped?commonSelection:{}),
    };
    try {
      const session = await api.post('/api/study-sessions', {
        ...common,
        durationMinutes: timed ? duration : undefined,
        clientRequestId: requestId.current,
      });
      const first = session.questions?.[0];
      navigate(first ? `/soru/${encodeURIComponent(first.code)}${qs({ sessionId: session.id, bank: first.bank })}`
        : `/pratik/${session.id}`);
    } catch (e) {
      setError(e.message);
      setFieldErrors(e.fields || {});
      setBusy(false);
    }
  };

  return <>
    {unfinished?.count > 0 && <section className="card form-card practice-reminder" role="status" aria-labelledby="practice-reminder-title">
      <span className="practice-reminder-icon" aria-hidden="true">⚠</span>
      <div className="practice-reminder-content">
        <h2 id="practice-reminder-title">Tamamlanmamış pratiklerin var</h2>
        <p>Başladığın ama henüz bitirmediğin <strong>{formatNumber(unfinished.count)} pratik</strong> var.</p>
        <Link to="/calisma/yarim-kalan" className="btn btn-secondary">Yarım kalan çalışmaları göster</Link>
      </div>
    </section>}
    {unfinishedError && <Alert type="warn">Tamamlanmamış pratik bilgisi alınamadı: {unfinishedError}</Alert>}

    <form className="card form-card" onSubmit={submit} noValidate>
      <h2>Yeni pratik oluştur</h2>
      {scoped ? <>
        <p className="muted">Bu konu anlatımına bağlı doğrulanmış sorular seçiliyor. <Link to={'/calisma/yeni'}>Tüm sorulardan seç</Link></p>
        <Alert type="info">Konu ve kaynak sabit; soru geçmişi ve soru sayısını seçebilirsin.</Alert>
      </> : <>
        <SharedCategorySelect questionFilters showMatch={false} showQuestionTypes={false} showDropdown={false} branchFirst branchIds={branchIds}
          leading={<QuestionSourceSelect value={source} onChange={changeSources} history={history} onHistoryChange={changeHistory} />}
          value={commonSelection} onChange={changeCommon} examType={filter.examType} subject={filter.subject}
          questionScope={{bank,source,examType:filter.examType,includeCandidates:commonSelection.includeCandidates,questionTypeId:commonSelection.questionTypeId,teacherDifficulty:commonSelection.teacherDifficulty}}
          disabled={!hasSource}/>
        {!hasSource && <p className="field-hint" role="status">Devam etmek için en az bir kaynak seç.</p>}
      </>}

      {!hasHistory && <label className="checkbox practice-include-solved">
        <input type="checkbox" checked={includeSolved} disabled={busy} onChange={event => changeIncludeSolved(event.target.checked)} />
        Daha önce pratik veya denemede çözdüğüm sorular da eklensin
      </label>}
      {hasHistory ? <p className="muted small">{source.length ? 'Seçili kaynaklardaki' : 'Tüm kaynaklardaki'} {history.length === 2
        ? 'daha önce doğru veya yanlış yanıtladığın' : history[0] === 'CORRECT' ? 'en az bir kez doğru yanıtladığın' : 'en az bir kez yanlış yanıtladığın'} sorular seçilir.</p>
        : !includeSolved && <p className="muted small">Pratik veya denemede henüz yanıtlamadığın sorular seçilir.</p>}
      {loading ? <Loading text="Soru sayısı yükleniyor…" /> : availabilityError ? <ErrorBox error={{ message: availabilityError }} /> :
        <p className="muted">Bu seçimde <strong>{formatNumber(available)}</strong> uygun soru var.</p>}
      {!loading && availability && available === 0 && hasSource && <Alert type="warn">
        {hasHistory ? 'Seçtiğin kaynak ve filtrelerde bu çözüm geçmişine uyan soru yok. Kaynak veya geçmiş seçimini değiştirebilirsin.'
          : availability.total > 0 ? 'Bu seçimde henüz yanıtlamadığın soru kalmadı. Çözdüğün soruları dahil edebilir veya filtreleri değiştirebilirsin.'
          : hasCategories && !commonSelection.includeCandidates ? <>Seçilen konuda doğrulanmış eşlemeye sahip soru yok. Geçici eşlemelerle çalışmak için <button type="button" className="btn btn-secondary btn-sm" onClick={()=>changeCommon({...commonSelection,includeCandidates:true})}>Geçici eşlemeleri dahil et</button></>
          : commonSelection.teacherDifficulty ? 'Seçilen zorlukta öğretmen tarafından doğrulanmış soru yok. Bütün zorlukları seçebilirsin.'
          : 'Bu kaynak ve konu seçimine uyan soru yok. Kaynağı veya konuyu değiştirebilirsin.'}
      </Alert>}
      {validCount && availability && available > 0 && available < n && <Alert type="warn">Bu seçimde yalnızca {formatNumber(available)} soru var. Sayıyı azalt veya seçimi değiştir.</Alert>}

      <h2>Soru sayısı</h2>
      <Segmented label="Hızlı soru sayısı" options={COUNT_OPTIONS} value={count} onChange={changeCount} />
      <Field label="Soru sayısı (1–120)" type="number" inputMode="numeric" min="1" max="120"
        value={count} onChange={(e) => changeCount(e.target.value)}
        error={!validCount ? 'Soru sayısı 1 ile 120 arasında tam sayı olmalı.' : fieldErrors.questionCount} />

      <h2>Süre</h2>
      <Segmented label="Süre türü" options={TIME_OPTIONS} value={timed} onChange={setTimed} />
      {timed && <Field label={`Süre (dakika, 1–${maxMinutes})`} type="number" inputMode="numeric" min="1" max={maxMinutes}
        value={minutes} onChange={(e) => { setMinutes(e.target.value); }}
        error={!validDuration ? `Süre 1 ile ${maxMinutes} arasında tam sayı olmalı.` : fieldErrors.timeLimitMinutes || fieldErrors.durationMinutes} />}
      {timed && <p className="muted">Süre dolunca oturum kapanır; yanıtlanmayan sorular boş sayılır.</p>}

      {error && <Alert type="error">{error}</Alert>}
      <button type="submit" className="btn btn-primary btn-lg" disabled={!ready}>
        {busy ? 'Hazırlanıyor…' : 'Pratiği başlat'}
      </button>
    </form>
  </>;
}

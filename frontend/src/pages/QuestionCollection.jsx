import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { PAGE_SIZE } from '../config.js';
import { useAsync, usePageParam, usePageTitle } from '../hooks.js';
import Pager from '../components/Pager.jsx';
import DataGrid from '../components/DataGrid.jsx';
import StudyNavigation from '../components/StudyNavigation.jsx';
import SharedCategorySelect from '../components/SharedCategorySelect.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';
import { bankLabel, formatNumber } from '../format.js';
import { countQuestionRows } from '../questionFilters.js';

const contextFor = rows => Object.fromEntries(['examType','subject','topic']
  .filter(key => rows.length && rows.every(row => row[key] === rows[0][key]))
  .map(key => [key,rows[0][key]]));
const sum = rows => countQuestionRows(rows, contextFor(rows));
const groups = (rows, key) => {
  const counts = new Map();
  rows.forEach((row) => {
    if (row[key]) counts.set(row[key], (counts.get(row[key]) || 0) + row.count);
  });
  return [...counts].map(([value]) => ({ value, count: countQuestionRows(rows, { ...contextFor(rows), [key]: value }) }))
    .sort((a, b) => a.value.localeCompare(b.value, 'tr'));
};

/** TYT/AYT çıkmış sorular ile OGM soru bankasının ortak kategori ve sonuç ekranı. */
export default function QuestionCollection({ bank }) {
  const label = bankLabel(bank);
  usePageTitle(label);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = usePageParam();
  const [topicSearch, setTopicSearch] = useState('');
  const filter = {
    examType: params.get('examType') || '',
    subject: params.get('subject') || '',
    topic: params.get('topic') || '',
  };
  const commonSelection={categoryId:params.getAll('categoryId'),categoryMatch:params.get('categoryMatch') || 'ANY',includeCandidates:params.get('includeCandidates')!=='false',questionTypeId:params.get('questionTypeId') || '',teacherDifficulty:params.get('teacherDifficulty') || ''};
  const commonKey=JSON.stringify(commonSelection);
  const hasFilter = Object.values(filter).some(Boolean) || (commonSelection.categoryId.length>0 || !!commonSelection.questionTypeId || !!commonSelection.teacherDifficulty);
  const detailQuery = qs({ bank, ...filter,...commonSelection, page: page || undefined });
  const filterRows = useAsync(() => api.get('/api/questions/filters' + qs({ bank })), [bank]);
  const rows = filterRows.data ?? [];
  const examRows = rows.filter((row) => !filter.examType || row.examType === filter.examType);
  const subjectRows = examRows.filter((row) => !filter.subject || row.subject === filter.subject);
  const subjects = groups(examRows, 'subject');
  const topics = filter.subject ? groups(subjectRows, 'topic') : [];
  const visibleTopics = topics.filter(({ value }) =>
    value.toLocaleLowerCase('tr').includes(topicSearch.trim().toLocaleLowerCase('tr')));
  const context = [filter.examType || 'Tüm sınavlar', filter.subject || 'Tüm dersler',
    filter.topic || 'Tüm konular'].join(' · ');
  const [progress, setProgress] = useState(null);
  const [progressError, setProgressError] = useState('');
  const [sessionMode, setSessionMode] = useState('practice');
  const [questionCount, setQuestionCount] = useState('20');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const startRequest = useRef(null);

  useEffect(() => setTopicSearch(''), [filter.examType, filter.subject]);
  useEffect(() => {
    let current = true;
    setProgress(null);
    setProgressError('');
    api.get('/api/questions/availability' + qs({ bank, ...filter,...commonSelection }))
      .then((counts) => {
        if (current) {
          setProgress(counts);
          setQuestionCount(String(Math.min(20, Math.max(1, counts.total))));
        }
      })
      .catch((error) => { if (current) setProgressError(error.message); });
    return () => { current = false; };
  }, [bank, filter.examType, filter.subject, filter.topic,commonKey]);

  const setFilter = (next) => setParams(new URLSearchParams(qs(next).slice(1)));
  const { data, loading, error, retry } = useAsync(
    () => api.get('/api/questions' + qs({ bank, ...filter,...commonSelection, page, size: PAGE_SIZE })),
    [bank, filter.examType, filter.subject, filter.topic, page,commonKey],
  );
  const last = bank === 'OGM' ? 'Kaynak' : 'Yıl';
  const availableCount = Number(progress?.total ?? data?.totalElements ?? 0);
  const requestedCount = Number(questionCount);
  const validCount = Number.isInteger(requestedCount) && requestedCount >= 1
    && requestedCount <= 120 && requestedCount <= availableCount;
  const start = async (event) => {
    event.preventDefault();
    if (sessionMode === 'exam') {
      navigate('/calisma/yeni' + qs({ mode: 'sinav', bank, examType: filter.examType || undefined }));
      return;
    }
    if (starting || loading || !progress || !validCount) return;
    setStarting(true);
    setStartError('');
    try {
      // Boş seçimler sorgu dizesinde atlanıyor; JSON gövdesinde de atılmalı.
      // Özellikle examType: '' sunucuda TYT/AYT enum değerine çevrilemiyor.
      const selectedFilter = Object.fromEntries(Object.entries(filter).filter(([, value]) => value));
      const payload = { bank, ...selectedFilter,...commonSelection, questionCount: requestedCount, selectionMode: 'MIXED' };
        const key = JSON.stringify(payload);
        if (startRequest.current?.key !== key) startRequest.current = { key, id: crypto.randomUUID() };
        const session = await api.post('/api/study-sessions', {
          ...payload, clientRequestId: startRequest.current.id,
        });
        const first = session.questions?.[0];
        navigate(first ? `/soru/${encodeURIComponent(first.code)}${qs({ sessionId: session.id, bank: first.bank })}`
          : `/pratik/${session.id}`);
    } catch (error) {
      setStartError(error.message);
      setStarting(false);
    }
  };
  const columns = useMemo(() => [
    { field: 'code', headerName: 'Soru kodu', width: 120, minWidth: 120, flex: 0,
      cellRenderer: ({ data: question }) => question && <Link
        to={`/soru/${encodeURIComponent(question.code)}${detailQuery}`}
        onClick={(event) => event.stopPropagation()}>{question.code}</Link> },
    { field: 'examType', headerName: 'Sınav', width: 70, minWidth: 70, flex: 0 },
    { field: 'subject', headerName: 'Ders', minWidth: 120, flex: 1,valueGetter:({data:q})=>q.resource?.subject || q.subject },
    { field: 'topic', headerName: 'Konu', minWidth: 180, flex: 1.7,
      cellRenderer: ({ data: question }) => question && <span
        title={question.resource?.originalTitle || question.topic || 'Konu belirtilmemiş'}>{question.resource?.displayTitle || question.topic || 'Konu belirtilmemiş'}</span> },
    {colId:'review',headerName:'Etiket durumu',minWidth:160,valueGetter:({data:q})=>q.resource?.reviewStatus==='APPROVE'?'Öğretmen doğruladı':q.resource?.manualReview?.label || 'Otomatik eşleme'},
    { field: bank === 'OGM' ? 'source' : 'year', headerName: last,
      width: bank === 'OGM' ? undefined : 75, minWidth: bank === 'OGM' ? 140 : 75,
      flex: bank === 'OGM' ? 1 : 0,
      valueFormatter: ({ value }) => value ?? '—' },
    { colId: 'open', headerName: 'Soru', width: 110, minWidth: 110, flex: 0,
      cellRenderer: ({ data: question }) => question && <Link className="btn btn-secondary btn-sm"
        to={`/soru/${encodeURIComponent(question.code)}${detailQuery}`}
        onClick={(event) => event.stopPropagation()}>Soruyu aç</Link> },
  ], [bank, detailQuery, last]);

  return <div className="question-collection-page">
    <StudyNavigation bank={bank} filter={filter} />
    <div className="page-head">
      <div><h2>{label}</h2><p className="muted">{bank === 'OGM' ? 'OGM kaynaklarındaki alıştırma soruları.' : 'Geçmiş TYT ve AYT sınavlarında sorulmuş sorular.'} Sınav, ders ve konuya göre göz at.</p></div>
    </div>
      <section className="card"><SharedCategorySelect questionFilters value={commonSelection} examType={filter.examType} onChange={next=>{
        const p=new URLSearchParams(params);p.delete('categoryId');next.categoryId.forEach(id=>p.append('categoryId',id));
        p.delete('subject');p.delete('topic');p.delete('page');p.set('categoryMatch',next.categoryMatch);for(const key of ['questionTypeId','teacherDifficulty']){if(next[key])p.set(key,next[key]);else p.delete(key);}
        if(next.examType)p.set('examType',next.examType);if(next.includeCandidates)p.delete('includeCandidates');else p.set('includeCandidates','false');setParams(p);
      }}/></section>
    <div className="question-collection-layout">
      <aside className="card question-collection-sidebar" aria-label={`${label} kategorileri`}>
        <div className="question-collection-sidebar-head">
          <h2>Kategoriler</h2>
          <button type="button" className="question-collection-clear" disabled={!hasFilter && !topicSearch}
            onClick={() => { setTopicSearch(''); setFilter({}); }}>Temizle</button>
        </div>
        <section className="question-collection-filter-group" aria-label="Sınav filtresi">
          <h3>Sınav</h3>
          <div className="question-collection-exams">
            {['', 'TYT', 'AYT'].map((examType) => <button key={examType} type="button"
              className={`question-collection-choice${filter.examType === examType ? ' selected' : ''}`}
              aria-pressed={filter.examType === examType}
              onClick={() => setFilter({ examType, subject: '', topic: '' })}>
              <span>{examType || 'Tümü'}</span>
              <small>{formatNumber(examType ? sum(rows.filter((row) => row.examType === examType)) : sum(rows))}</small>
            </button>)}
          </div>
        </section>
        <section className="question-collection-filter-group" aria-label="Ders filtresi">
          <h3>Dersler</h3>
          {filterRows.loading && <p className="muted small">Dersler yükleniyor…</p>}
          <div className="question-collection-options">
            <button type="button" className={`question-collection-option${!filter.subject ? ' selected' : ''}`}
              aria-pressed={!filter.subject} onClick={() => setFilter({ ...filter, subject: '', topic: '' })}>
              <span>Tüm dersler</span><small>{formatNumber(sum(examRows))}</small>
            </button>
            {subjects.map(({ value, count }) => <button key={value} type="button"
              className={`question-collection-option${filter.subject === value ? ' selected' : ''}`}
              aria-pressed={filter.subject === value}
              onClick={() => setFilter({ ...filter, subject: value, topic: '' })}>
              <span>{value}</span><small>{formatNumber(count)}</small>
            </button>)}
          </div>
        </section>
        <section className="question-collection-filter-group" aria-label="Konu filtresi">
          <h3>Konular</h3>
          {!filter.subject ? <p className="muted small">Konuları görmek için önce ders seç.</p> : <>
            <label className="sr-only" htmlFor={`question-topic-search-${bank}`}>Konu bul</label>
            <input id={`question-topic-search-${bank}`} className="question-collection-topic-search"
              type="search" placeholder="Konu bul" value={topicSearch}
              onChange={(event) => setTopicSearch(event.target.value)} />
            <div className="question-collection-topics">
              <button type="button" className={`question-collection-option${!filter.topic ? ' selected' : ''}`}
                aria-pressed={!filter.topic} onClick={() => setFilter({ ...filter, topic: '' })}>
                <span>Tüm konular</span><small>{formatNumber(sum(subjectRows))}</small>
              </button>
              {visibleTopics.map(({ value, count }) => <button key={value} type="button"
                className={`question-collection-option${filter.topic === value ? ' selected' : ''}`}
                aria-pressed={filter.topic === value}
                onClick={() => setFilter({ ...filter, topic: value })}>
                <span>{value}</span><small>{formatNumber(count)}</small>
              </button>)}
              {visibleTopics.length === 0 && <p className="muted small">Bu adla konu bulunamadı.</p>}
            </div>
          </>}
        </section>
        {filterRows.error && <div className="question-collection-filter-error" role="status">
          <p>Kategoriler yüklenemedi.</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={filterRows.retry}>Yeniden dene</button>
        </div>}
      </aside>

      <section className="question-collection-results" aria-label={`${label} soruları`}>
        <div className="card question-collection-results-head">
          <div><h2>Sorular</h2><p className="muted small">{context}</p></div>
          {data && <strong>{formatNumber(data.totalElements)} soru</strong>}
        </div>
        {progress && <section className="card progress-strip" aria-label="Soru ilerlemen">
          <div><span>Toplam</span><strong>{formatNumber(progress.total)}</strong></div>
          <div><span>Çözdüğün</span><strong>{formatNumber(progress.solved)}</strong></div>
          <div><span>Kalan</span><strong>{formatNumber(progress.remaining)}</strong></div>
          <div><span>En az bir kez yanlış</span><strong>{formatNumber(progress.everWrong)}</strong></div>
        </section>}
        {progressError && <p className="muted small" role="status">{progressError}</p>}
        {!loading && progress && data && data.totalElements > 0 && <form className="card question-collection-start" onSubmit={start}>
          <div><h2>Seçili soruları başlat</h2><p className="muted small">Bu filtredeki {formatNumber(availableCount)} sorudan istediğin sayıda seçilir. Sonucun geçmişine kaydedilir.</p></div>
          <label>Çözüm türü<select value={sessionMode} onChange={(event) => setSessionMode(event.target.value)}>
            <option value="practice">Pratik · cevabı hemen gör</option>
            <option value="exam">Deneme · TYT veya AYT</option>
          </select></label>
          {sessionMode !== 'exam' && <label>Soru sayısı<input type="number" min="1" max={Math.min(availableCount, 120)} value={questionCount}
            onChange={(event) => setQuestionCount(event.target.value)} /></label>}
          <button type="submit" className="btn btn-primary" disabled={sessionMode !== 'exam' && (!validCount || starting)}>
            {sessionMode === 'exam' ? 'Deneme oluştur' : starting ? 'Başlatılıyor…' : 'Başlat'}
          </button>
          {sessionMode !== 'exam' && !validCount && <p className="muted small" role="status">1 ile {Math.min(availableCount, 120)} arasında soru seç.</p>}
          {startError && <p className="text-danger" role="alert">{startError}</p>}
        </form>}
        {loading && <Loading text="Sorular yükleniyor…" />}
        {error && <ErrorBox error={error} onRetry={retry} />}
        {data && data.content.length === 0 && <Empty title="Bu filtreye uyan soru yok.">
          <p>Başka bir sınav, ders veya konu seç.</p>
        </Empty>}
        {data && data.content.length > 0 && <div className="card table-card question-collection-list">
          <ul className="qcards">
            {data.content.map((question) => <li key={question.id}>
              <Link to={`/soru/${encodeURIComponent(question.code)}${detailQuery}`} className="qcard">
                <span className="qcard-top"><strong className="qcard-code">{question.code}</strong>
                  <span className="muted small">{bank === 'OGM' ? question.examType : question.year || question.examType}</span></span>
                <span className="qcard-mid"><span className="badge badge-muted">{question.resource?.subject || question.subject}</span>{' '}
                  {question.resource?.displayTitle || question.topic || 'Konu belirtilmemiş'}</span>
                {question.resource && <span className="muted small">{question.resource.reviewStatus==='APPROVE'?'Öğretmen doğruladı':question.resource.manualReview?.label || 'Otomatik eşleme'}</span>}
                {bank === 'OGM' && question.source && <span className="qcard-src">{question.source}</span>}
                <span className="qcard-open">Soruyu aç →</span>
              </Link>
            </li>)}
          </ul>
          <div className="qtable-view">
            <DataGrid mode="worksheet" rowData={data.content} columnDefs={columns}
              gridOptions={{ getRowId: ({ data: question }) => String(question.id),
                onRowClicked: ({ data: question }) => question &&
                  navigate(`/soru/${encodeURIComponent(question.code)}${detailQuery}`) }} />
          </div>
        </div>}
        {data && <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />}
      </section>
    </div>
  </div>;
}

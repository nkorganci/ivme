import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, imageUrl, solutionImageUrl, qs } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import { useAuth } from '../auth.jsx';
import DataGrid from '../components/DataGrid.jsx';
import { Field } from '../components/Field.jsx';
import { Alert, Empty, ErrorBox, Loading } from '../components/States.jsx';
import Pager from '../components/Pager.jsx';
import ReviewLabels, { LabelChoices } from '../components/ReviewLabels.jsx';
import { autoSelectLabels, blankDecision, checksFor } from '../reviewSelection.js';
import vocabulary from '../../../backend/src/main/resources/review-vocabulary.json' with { type: 'json' };
import './TeacherReview.css';

const API = '/api/operator/content-review';
const DEFAULTS = { kind: 'PDF', exam: '', topic: '', status: '', q: '', bank: '', difficulty: '', contentFormat: '', skill: '', labelState: '', page: 0 };
const CHECKS = { branch: 'Branş', topic: 'Konu / sınav', structure: 'Alt kategori', content: 'Anlatım', coverage: 'Kapsam', answer: 'Soru / cevap', image: 'Metin / görsel' };
const CHECK_OPTIONS = { OK: 'Uygun', WRONG: 'Yanlış / eksik', UNSURE: 'Emin değilim' };
const VERDICTS = Object.fromEntries(['APPROVE', 'FIX', 'WRONG_BRANCH', 'REMOVE', 'UNSURE'].map(key => [key, vocabulary.states[key]]));
const detailId = key => `review-detail-${encodeURIComponent(key)}`;

function SourcePreview({ item, fingerprint }) {
  return <div className="review-source">
    <div className="review-source-line"><strong>{item.title}</strong><span>{[item.exam, item.subject, item.subtopic || item.topic].filter(Boolean).join(' · ')}</span>
      {['PDF', 'VIDEO'].includes(item.kind) && <a className="btn btn-secondary btn-sm" href={item.url} target="_blank" rel="noreferrer">{item.kind === 'PDF' ? 'PDF’yi aç ↗' : 'Videoyu aç ↗'}</a>}
    </div>
    {item.kind === 'TOPIC' && <p className="review-source-caption">{item.source}</p>}
    {item.automaticLabels && <><p className="review-source-caption">Kaynak dayanaklarıyla otomatik etiketlendi. İçerik doğruluğu kararı ayrıca kaydedilir.
      {item.availability === 'missing_file' && ' Kaynak PDF bulunamadı; katalog başlığı kullanıldı.'}
      {item.availability === 'video_only' && ' Bu katalog kaydında PDF dosyası yok.'}</p>
      {item.automaticLabels.evidence?.length > 0 && <details className="review-source-details"><summary>Etiket dayanakları</summary>
        {item.automaticLabels.evidence.map((h, i) => <p key={i}>{item.kind === 'PDF' && h.page ? <a href={`${item.url}#page=${h.page}`} target="_blank" rel="noreferrer">s. {h.page}</a> : h.page ? `s. ${h.page} · ` : ''} {h.text}{h.method === 'heading_ocr' ? ' · başlık OCR' : ''}</p>)}
      </details>}</>}
    {item.kind === 'QUESTION' && <div className="review-question-preview">
      {item.questionId ? <a href={imageUrl(item.questionId, fingerprint)} target="_blank" rel="noreferrer" title="Soru görselini büyüt">
        <img src={imageUrl(item.questionId, fingerprint)} alt={`${item.title} soru görseli`} /><small>Görseli büyüt ↗</small>
      </a> : <div className="review-written-question"><p>{item.text}</p><div>{item.choices?.map((choice, index) => <span key={index}><strong>{'ABCDE'[index]}.</strong> {choice}</span>)}</div></div>}
      <div className="review-answer"><span>Kayıtlı cevap</span><strong>{item.correctAnswer}</strong>
        {item.solutionImage && <a href={solutionImageUrl(item.questionId)} target="_blank" rel="noreferrer">Çözüm görseli ↗</a>}
        {item.solutionUrl?.startsWith('https://') && <a href={item.solutionUrl} target="_blank" rel="noreferrer">Çözüm bağlantısı ↗</a>}
        {item.explanation && <details><summary>Açıklama</summary><p>{item.explanation}</p></details>}
      </div>
    </div>}
    {item.kind === 'NOTE' && <details className="review-source-details"><summary>Anlatımı ve örnekleri göster</summary><div>
      {item.lesson.learn.map((p, i) => <p key={i}>{p}</p>)}<ol>{item.lesson.steps.map((step, i) => <li key={i}>{step}</li>)}</ol><p>{item.lesson.pitfall}</p>
      {item.lesson.patterns.map(p => <section key={p.id}><h4>{p.title}</h4><p>{p.recognize}</p><p>{p.logic}</p><p>{p.tip}</p><p>{p.trap}</p></section>)}
      {item.lesson.examples.map(e => <p key={e.code}><strong>{e.code} · {e.answer}</strong> · {e.explanation}</p>)}
    </div></details>}
    {item.refs?.length > 0 && <details className="review-source-details"><summary>Kaynak dayanakları ({item.refs.length})</summary><div>{item.refs.map(ref => <p key={`${ref.catalogId}:${ref.page}`}>
      <a href={ref.url} target="_blank" rel="noreferrer">{ref.title} · PDF s. {ref.page} ↗</a></p>)}</div></details>}
  </div>;
}

function Editor({ data, topics, catalog, onSaved, onNext, onReload, onClose }) {
  const { user } = useAuth();
  const item = data.item;
  const baseline = useMemo(() => ({ ...blankDecision(item, catalog), ...data.review?.decision,
    ...(item.automaticLabels ? data.labels : {}) }), [item, catalog, data.review, data.labels]);
  const draftKey = `ivme.teacher-review.${user.id}.${item.key}`;
  const lastKey = `ivme.teacher-review.last-labels.${user.id}`;
  const [decision, setDecision] = useState(() => {
    try { const draft = JSON.parse(localStorage.getItem(draftKey));
      if (draft?.fingerprint === data.fingerprint && draft.revision === (data.review?.revision || 0)) return { ...baseline, ...draft.decision };
    } catch { /* Server saves remain available. */ }
    return baseline;
  });
  const [lastLabels, setLastLabels] = useState(() => { try { return JSON.parse(localStorage.getItem(lastKey)); } catch { return null; } });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [storageFailed, setStorageFailed] = useState(false);
  const dirty = JSON.stringify(decision) !== JSON.stringify(baseline);
  const patch = values => { setDecision(d => ({ ...d, ...values })); setNotice(''); };

  useEffect(() => {
    try { if (dirty) localStorage.setItem(draftKey, JSON.stringify({ fingerprint: data.fingerprint, revision: data.review?.revision || 0, decision }));
      else localStorage.removeItem(draftKey);
    } catch { setStorageFailed(true); }
  }, [decision, dirty, draftKey, data]);
  useEffect(() => {
    const warn = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const chooseVerdict = verdict => {
    const checks = Object.fromEntries(checksFor(item.kind).map(key => [key, verdict === 'APPROVE' ? 'OK' : decision.checks[key] || 'UNSURE']));
    patch({ verdict, checks, note: decision.note || (verdict === 'APPROVE' ? 'Kaynağı ve seçili etiketleri kontrol ettim; kontroller uygun.'
      : verdict === 'UNSURE' ? 'İçerik ve eşleşme yeniden incelenmeli.' : '') });
  };
  const automatic = () => {
    const suggestion = autoSelectLabels(decision, item, catalog);
    patch(suggestion);
    setNotice(suggestion.assignments.length ? 'Kaynak eşleşmeleri seçildi. Doğruluk onayını siz verin.' : 'Doğrudan eşleşme yok. Konu seçeneklerinden seçin.');
  };
  const complete = decision.verdict && decision.note.trim() && checksFor(item.kind).every(key => decision.checks[key])
    && (decision.verdict !== 'APPROVE' || decision.assignments.some(a => a.relation === 'PRIMARY'));
  const submit = async (event, next = false) => {
    event.preventDefault(); if (!complete || busy) return;
    setBusy(true); setError(null);
    try {
      const saved = await api.put(API, { ...decision, key: item.key, fingerprint: data.fingerprint, revision: data.review?.revision || 0 });
      try {
        localStorage.removeItem(draftKey);
        const labels = { assignments: decision.assignments, difficulty: decision.difficulty, contentFormat: decision.contentFormat, skills: decision.skills, grades: decision.grades };
        localStorage.setItem(lastKey, JSON.stringify(labels)); setLastLabels(labels);
      } catch { /* Optional browser convenience. */ }
      onSaved(saved); if (next) onNext();
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  const saveTopics = async () => {
    setBusy(true);setError(null);
    try {
      const ids=new Set(catalog.categories.filter(c=>c.canonicalTopic).map(c=>c.id));
      const saved=await api.put(API+'/topics',{key:item.key,fingerprint:data.fingerprint,
        revision:data.review?.revision || 0,assignments:decision.assignments.filter(a=>ids.has(a.categoryId)),note:decision.note});
      localStorage.removeItem(draftKey);onSaved(saved);onNext();
    } catch(err) {setError(err);} finally {setBusy(false);}
  };

  return <section id={detailId(item.key)} className="teacher-inline-detail" aria-label={`${item.title} hızlı inceleme`} onKeyDown={event => event.stopPropagation()}>
    <SourcePreview item={item} fingerprint={data.fingerprint} />
    {(item.automaticLabels?.unitReview || item.automaticLabels?.physicsTopicReview) && <Alert type="warn">
      {(item.automaticLabels.unitReview || item.automaticLabels.physicsTopicReview).reason}
      <div>Eski başlıklar: {(item.automaticLabels.unitReview || item.automaticLabels.physicsTopicReview).legacyLabels.map((c,i)=><span key={c.categoryId || i}>{i>0?' · ':''}{c.subtopic || c.topic}</span>)}</div>
      <p>Konuyu seçip “Konuları kaydet ve sonraki” düğmesine basın. Bu işlem cevap veya PDF içeriği onayı vermez.</p>
    </Alert>}
    {data.status === 'STALE' && <Alert type="warn">Kaynak veya etiket değişmiş; tekrar kontrol edin.</Alert>}
    <form onSubmit={submit} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submit(event, true); }}>
      <div className="review-quickbar">
        {<button type="button" className="btn btn-primary btn-sm" onClick={saveTopics}
          disabled={busy || !decision.assignments.some(a=>a.relation==='PRIMARY' && catalog.categories.some(c=>c.id===a.categoryId && c.canonicalTopic))}>
          Konuları kaydet ve sonraki</button>}
        <button type="button" className="btn btn-primary btn-sm review-auto" onClick={automatic}>⚡ Otomatik seç</button>
        {lastLabels && <button type="button" className="btn btn-secondary btn-sm" onClick={() => patch(lastLabels)}>Önceki etiketler</button>}
        <span role="status">{notice || 'Seçili etiketler yeşil gösterilir.'}</span>
        <button type="button" className="review-text-button" onClick={onClose} disabled={busy}>Kapat ↑</button>
      </div>
      <div className="review-panels">
        <ReviewLabels decision={decision} patch={patch} catalog={catalog} item={item} />
        <section className="review-panel review-verification" aria-label="Kontrol ve karar">
          <h3><span className="review-step">3</span>Kontrol / karar</h3>
          <div className="review-check-list">{checksFor(item.kind).map(key => <div key={key} className="review-check-row"><span>{CHECKS[key]}</span>
            <div className="review-choices" role="group" aria-label={`${CHECKS[key]} kontrolü`}>{Object.entries(CHECK_OPTIONS).map(([value, title]) => <button key={value} type="button"
              className={`review-check-option ${value.toLowerCase()}${decision.checks[key] === value ? ' selected' : ''}`}
              aria-pressed={decision.checks[key] === value} aria-label={`${CHECKS[key]}: ${title}`} title={title}
              onClick={() => patch({ checks: { ...decision.checks, [key]: value } })}>{value === 'OK' ? '✓' : value === 'WRONG' ? '✕' : '?'}</button>)}</div>
          </div>)}</div>
          <LabelChoices title="Karar" options={VERDICTS} selected={[decision.verdict]} onSelect={chooseVerdict}
            short={{ FIX: 'Düzelt', WRONG_BRANCH: 'Yanlış branş', REMOVE: 'Kaldır', UNSURE: 'Emin değilim' }} />
          <Field as="textarea" rows={2} label="Not / düzeltme" maxLength={4000} value={decision.note} onChange={e => patch({ note: e.target.value })} placeholder="Gerekçe veya yapılması gereken…" />
          <details className="review-proposals"><summary>Başlık, cevap veya bağlantı düzelt</summary><div className="review-proposal-fields">
            <Field as="select" label="Önerilen sınav" value={decision.proposedExam} onChange={e => patch({ proposedExam: e.target.value })}><option value="">Değişmesin</option><option>TYT</option><option>AYT</option><option>TYT-AYT</option></Field>
            <Field label="Önerilen branş" maxLength={150} value={decision.proposedSubject} onChange={e => patch({ proposedSubject: e.target.value })} />
            <Field label="Önerilen ana konu" list="review-topic-proposals" maxLength={300} value={decision.proposedTopic} onChange={e => patch({ proposedTopic: e.target.value })} />
            <datalist id="review-topic-proposals">{[...new Set(topics.map(t => t.topic))].map(topic => <option key={topic} value={topic} />)}</datalist>
            <Field label="Önerilen alt konu / başlık" maxLength={300} value={decision.proposedSubtopic} onChange={e => patch({ proposedSubtopic: e.target.value })} />
            {item.kind === 'QUESTION' && item.choiceCount > 0 && <Field as="select" label="Doğru cevap önerisi" value={decision.proposedAnswer} onChange={e => patch({ proposedAnswer: e.target.value })}>
              <option value="">Değişmesin</option>{'ABCDE'.slice(0, item.choiceCount).split('').map(answer => <option key={answer}>{answer}</option>)}</Field>}
            <Field type="url" label="Kaynak bağlantısı önerisi" maxLength={2000} value={decision.proposedUrl} onChange={e => patch({ proposedUrl: e.target.value })} />
          </div></details>
        </section>
      </div>
      {error && <ErrorBox error={error} />}
      {error?.status === 409 && <button type="button" className="btn btn-secondary btn-sm" onClick={onReload}>Son kaydı yeniden aç</button>}
      {storageFailed && <Alert type="warn">Tarayıcı taslağı saklanamadı; ayrılmadan kaydedin.</Alert>}
      <div className="teacher-savebar"><span role="status">{dirty ? 'Kaydedilmemiş seçimler' : data.review ? `✓ Kaydedildi · ${data.review.reviewer} · ${new Date(data.review.savedAt).toLocaleString('tr-TR')}` : 'Henüz karar verilmedi'}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onNext} disabled={busy}>Geç →</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={!complete || busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" className="btn btn-primary btn-sm" title="Ctrl + Enter" onClick={event => submit(event, true)} disabled={!complete || busy}>Kaydet ve sonraki →</button>
      </div>
    </form>
    {data.history.length > 0 && <details className="review-history"><summary>Karar geçmişi ({data.history.length})</summary><ol>{data.history.map(r => <li key={r.revision}>
      <strong>{vocabulary.states[r.decision.verdict]}</strong> · {r.reviewer} · {new Date(r.savedAt).toLocaleString('tr-TR')}<p>{r.decision.note}</p>
    </li>)}</ol></details>}
  </section>;
}

function InlineReview({ item, catalog, topics, onSaved, onNext, onClose }) {
  const { data, loading, error, retry } = useAsync(() => api.get(API + '/item' + qs({ key: item.key })), [item.key]);
  const [override, setOverride] = useState(null);
  useEffect(() => setOverride(null), [item.key]);
  if (loading || !catalog) return <Loading text="İnceleme açılıyor…" />;
  if (error) return <ErrorBox error={error} onRetry={retry} />;
  const current = override || data;
  return current && <Editor key={`${item.key}:${current.review?.revision || 0}:${current.fingerprint}`} data={current} catalog={catalog} topics={topics}
    onSaved={saved => { setOverride(saved); onSaved(); }} onNext={onNext} onClose={onClose} onReload={() => { setOverride(null); retry(); }} />;
}

export default function TeacherReview() {
  usePageTitle('Öğretmen Doğrulaması');
  const { subjectId = 'fizik' } = useParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(DEFAULTS);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const visibleOrder = useRef([]);
  const metadata = useAsync(() => api.get(API + '/catalog'), []);
  useEffect(() => { setFilters(DEFAULTS); setSelected(''); setSearch(''); }, [subjectId]);
  const url = API + qs({ ...filters, subject: subjectId });
  const { data, loading, error, retry, reload } = useAsync(() => api.get(url), [url]);
  const change = patch => { setFilters(f => ({ ...f, ...patch, page: 0 })); setSelected(''); };
  const rows = data?.content || [];
  const next = () => {
    const keys = new Set(rows.map(row => row.key));
    const ordered = visibleOrder.current.filter(key => keys.has(key));
    const sequence = ordered.length ? ordered : rows.map(row => row.key);
    const index = sequence.indexOf(selected);
    if (index + 1 < sequence.length) setSelected(sequence[index + 1]);
    else { setSelected(''); if (filters.page + 1 < data.totalPages) setFilters(f => ({ ...f, page: f.page + 1 })); }
  };
  const categoriesById = useMemo(() => new Map((metadata.data?.categories || []).map(c => [c.id, c])), [metadata.data]);
  const columns = useMemo(() => [
    { colId: 'expand', headerName: '', width: 52, minWidth: 52, maxWidth: 52, pinned: 'left', sortable: false, filter: false, resizable: false,
      cellRenderer: ({ data: row }) => <button type="button" className={`review-expand${selected === row.key ? ' open' : ''}`} aria-expanded={selected === row.key}
        aria-controls={selected === row.key ? detailId(row.key) : undefined} aria-label={`${row.title} etiketlerini ${selected === row.key ? 'kapat' : 'aç'}`}
        disabled={!metadata.data} onClick={() => setSelected(value => value === row.key ? '' : row.key)}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="m5 7 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button> },
    { field: 'title', headerName: 'Başlık / konu', minWidth: 210, flex: 3,
      cellRenderer: ({ data: row }) => <div className="review-row-title" title={[row.title, row.topic, row.subtopic].filter(Boolean).join(' · ')}><strong>{row.title}</strong>
        {row.displayTitle && <small>{row.displayTitle}</small>}
        {!row.displayTitle && row.title !== (row.subtopic || row.topic) && <small>{row.subtopic || row.topic || row.source}</small>}</div> },
    { field: 'exam', headerName: 'Sınav', width: 90, minWidth: 80, maxWidth: 100 },
    { colId: 'labels', headerName: 'Seçili etiketler', minWidth: 190, flex: 2, sortable: false,
      cellRenderer: ({ data: row }) => <div className="review-row-labels">{row.labels?.assignments?.length > 0 ? <span className="review-mini-label">{row.labels.assignments.length} konu</span> : <span className="muted">Seçim bekliyor</span>}
        {row.labelOrigin === 'PDF_HEADINGS' && <span className="review-mini-label">Otomatik</span>}
        {row.labels?.assignments?.slice(0, 2).map(a => { const c = categoriesById.get(a.categoryId); return c && <span key={a.categoryId} className="review-mini-label" title={`${c.exam} → ${c.subject} → ${c.topic}${c.subtopic ? ` → ${c.subtopic}` : ''}`}>{c.subtopic || c.topic}</span>; })}
        {row.labels?.difficulty && !['UYGULANMAZ', 'BELIRLENMEDI'].includes(row.labels.difficulty) && <span className="review-mini-label">{vocabulary.difficulty[row.labels.difficulty]}</span>}
        {row.labels?.skills?.length > 0 && <span className="review-mini-label">{row.labels.skills.length} beceri</span>}</div> },
    { field: 'reviewStatus', headerName: 'Karar', minWidth: 130, maxWidth: 170, valueFormatter: ({ value }) => vocabulary.states[value],
      cellClass: ({ value }) => value === 'APPROVE' ? 'review-approved-cell' : '' },
  ], [selected, metadata.data, categoriesById]);
  const detailContext = { catalog: metadata.data, topics: data?.topics || [], onSaved: reload, onNext: next, onClose: () => setSelected('') };
  const download = async () => {
    setExportError(null); setExporting(true);
    try {
      const result = await api.get(API + '/export');
      const link = document.createElement('a'); const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
      link.href = objectUrl; link.download = `ogretmen-kararlari-${new Date().toLocaleDateString('sv-SE')}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) { setExportError(err); } finally { setExporting(false); }
  };

  return <div className="teacher-review">
    <div className="teacher-heading"><h1>{metadata.data?.branches.find(b => b.id === subjectId)?.name || 'Bütün branşlar'} · Öğretmen Doğrulaması</h1>
      <button type="button" className="btn btn-secondary btn-sm" onClick={download} disabled={exporting}>{exporting ? 'Hazırlanıyor…' : 'Kararları indir'}</button></div>
    <p className="review-page-hint">Ortak TYT/AYT üniteleri kullanılır. Tahmini etiketleri kaynağı açarak kontrol edin; ünite seçimi ile içerik onayı ayrı kaydedilir.</p>
    <div className="review-quickbar"><span>Ortak üniteler · TYT/AYT</span>
      <button type="button" className="btn btn-secondary btn-sm" aria-pressed={filters.labelState==='ESTIMATED'}
        onClick={()=>change({labelState:filters.labelState==='ESTIMATED'?'':'ESTIMATED'})}>
        {filters.labelState==='ESTIMATED'?'Bütün kayıtları göster':'Tahmini etiketleri göster'}</button></div>
    <div className="tabs" role="group" aria-label="Denetim türü">{Object.entries(vocabulary.kinds).map(([key, title]) => <button key={key} className={filters.kind === key ? 'active' : ''}
      aria-pressed={filters.kind === key} onClick={() => change({ kind: key, bank: key === 'QUESTION' ? 'CIKMIS' : '' })}>{title}</button>)}</div>
    <section className="card review-filter-card"><form onSubmit={event => { event.preventDefault(); change({ q: search.trim() }); }}>
      <div className="teacher-filters">
        <Field as="select" label="Sınav" value={filters.exam} onChange={e => change({ exam: e.target.value, topic: '' })}><option value="">TYT ve AYT</option><option>TYT</option><option>AYT</option></Field>
        <Field as="select" label="Konu" value={filters.topic} onChange={e => change({ topic: e.target.value })}><option value="">Bütün konular</option>{[...new Set((data?.topics || []).filter(t => !filters.exam || t.exam === filters.exam).map(t => t.topic))].map(topic => <option key={topic}>{topic}</option>)}</Field>
        <Field as="select" label="Durum" value={filters.status} onChange={e => change({ status: e.target.value })}><option value="">Bütün durumlar</option>{Object.entries(vocabulary.states).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</Field>
        {filters.kind === 'PDF' && <Field as="select" label="Etiket" value={filters.labelState} onChange={e => change({ labelState: e.target.value })}><option value="">Bütün PDF’ler</option><option value="LABELLED">Etiketli</option><option value="UNLABELLED">Etiketsiz</option>{subjectId==='fizik' && <option value="PHYSICS_REVIEW">Konu seçimi bekliyor</option>}</Field>}
        {filters.kind === 'QUESTION' && <Field as="select" label="Kaynak" value={filters.bank} onChange={e => change({ bank: e.target.value })}><option value="CIKMIS">Çıkmış sorular</option><option value="OGM">OGM</option><option value="NOTE">Ders notu örnekleri</option><option value="">Bütün kaynaklar</option></Field>}
        <Field label="Ara" value={search} maxLength={100} onChange={e => setSearch(e.target.value)} placeholder="Başlık, kod, hoca…" />
        <button className="btn btn-secondary btn-sm" type="submit">Ara</button>
      </div>
      <details className="review-extra-filters"><summary>Diğer filtreler{[filters.difficulty, filters.contentFormat, filters.skill].some(Boolean) ? ' · etkin' : ''}</summary><div className="teacher-filters">
        <Field as="select" label="Branş" value={subjectId} onChange={e => navigate(`/ogretmen-dogrulamasi/${e.target.value}`)}><option value="all">Bütün branşlar</option>{metadata.data?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</Field>
        {[['difficulty', 'Zorluk'], ['contentFormat', 'İçerik türü'], ['skill', 'Beceri']].map(([key, label]) => <Field key={key} as="select" label={label} value={filters[key]} onChange={e => change({ [key]: e.target.value })}>
          <option value="">Hepsi</option>{Object.entries(vocabulary[key === 'skill' ? 'skills' : key]).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Field>)}
      </div></details>
    </form>
    {data && <div className="teacher-counts"><strong>{data.totalElements.toLocaleString('tr-TR')} kayıt</strong>{Object.entries(data.counts).map(([key, count]) => <span key={key}>{vocabulary.states[key]}: {count.toLocaleString('tr-TR')}</span>)}</div>}
    {data && filters.kind === 'PDF' && <p className="small muted">Etiketli: {data.labelCounts?.labelled.toLocaleString('tr-TR')} · Etiketsiz: {data.labelCounts?.unlabelled.toLocaleString('tr-TR')} · Otomatik etiketler öğretmen kararı gerektirmeden kullanılabilir.</p>}
    </section>
    {exportError && <ErrorBox error={exportError} />}{loading && <Loading />}{error && <ErrorBox error={error} onRetry={retry} />}
    {metadata.error && <ErrorBox error={metadata.error} onRetry={metadata.retry} />}
    {data && rows.length === 0 && <Empty title="Bu filtrede kayıt yok." />}
    {data && rows.length > 0 && <><div className="card table-card teacher-review-grid"><DataGrid rowData={rows} columnDefs={columns} mode="sheet" columnSorting
      expandedRowKey={selected} detailComponent={InlineReview} detailContext={detailContext} gridOptions={{ pagination: false, rowHeight: 44, headerHeight: 36, animateRows: false,
        onModelUpdated: ({ api: gridApi }) => { const order = []; gridApi.forEachNodeAfterFilterAndSort(node => { if (node.data && !node.data.__inlineDetail) order.push(node.data.key); }); visibleOrder.current = order; },
      }} /></div>
      <Pager page={data.page} totalPages={data.totalPages} onChange={page => { setFilters(f => ({ ...f, page })); setSelected(''); }} /></>}
  </div>;
}

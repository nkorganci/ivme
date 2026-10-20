import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import DataGrid from '../components/DataGrid.jsx';
import Icon from '../components/Icons.jsx';
import MathLearningPanel from '../components/MathLearningPanel.jsx';
import { blankLearning, learningSummary } from '../mathLearning.js';
import { usePageTitle } from '../hooks.js';
import { formatLessonDate, formatLessonDuration, formatLessonRange, formatSummaryDateRange, lessonDateBounds, lessonChanges, lessonFields, parseLessonRange, parseSummaryDateRange, sortLessons, summarizeLessons } from '../mathTutoring.js';

const STATUS = [['PLANNED', 'Planlandı'], ['COMPLETED', 'Bitti'], ['CANCELLED', 'İptal']];
const dateToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const blank = () => ({ date: dateToday(), timeRange: '00:00-01:00', topic: '', homework: '', status: 'PLANNED', note: '', files: [], learning: blankLearning() });

function AutoTextarea({ value, ...props }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resize = () => {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight}px`;
    };
    let width = element.clientWidth;
    resize();
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      resize();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);
  return <textarea ref={ref} value={value} rows="1" {...props} />;
}

function LessonDatePicker({ value, onChange, label }) {
  const inputRef = useRef(null);
  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    try {
      if (input.showPicker) input.showPicker();
      else { input.focus(); input.click(); }
    } catch { input.focus(); }
  };
  return <div className="math-date-picker">
    <button type="button" className="math-date-button" onClick={openPicker} title={formatLessonDate(value)} aria-label={`${label}: ${formatLessonDate(value)}. Tarih seç`}>
      <span className="math-date-long">{formatLessonDate(value)}</span>
      <span className="math-date-short">{value ? value.split('-').reverse().join('.') : 'Tarih seçin'}</span><Icon name="calendar" />
    </button>
    <input ref={inputRef} type="date" className="math-date-native" aria-label={`${label} tarihi`} tabIndex={-1}
      value={value} onChange={onChange} />
  </div>;
}

function MathDateCell({ data, context }) {
  const label = data.isNew ? 'Yeni ders' : `Ders ${data.id}`;
  return <LessonDatePicker value={data.date} label={label}
    onChange={(event) => context.actions.current.setField(data, 'date', event.target.value)} />;
}

function MathTimeCell({ data, context }) {
  const value = data.timeRange ?? formatLessonRange(data);
  return <input className="math-time-range" type="text" inputMode="text"
    aria-label={`${data.isNew ? 'Yeni ders' : `Ders ${data.id}`} saat aralığı`}
    aria-invalid={!parseLessonRange(value)} value={value}
    onChange={(event) => context.actions.current.setField(data, 'timeRange', event.target.value)} />;
}

function MathTextCell({ data, context, field, maxLength }) {
  return <AutoTextarea aria-label={`${data.isNew ? 'Yeni ders' : `Ders ${data.id}`} ${field === 'topic' ? 'konusu' : field === 'homework' ? 'ödevi' : 'notu'}`}
    value={data[field] ?? ''} maxLength={maxLength}
    onChange={(event) => context.actions.current.setField(data, field, event.target.value)} />;
}

function MathFileCell({ data, context }) {
  const files = data.files ?? [];
  return data.isNew ? <button type="button" className="btn btn-secondary math-upload" disabled title="Önce dersi ekleyin">Dosya seç</button> : <>
    {files.length > 0 && <span className="math-file-count">{files.length} dosya yüklü</span>}
    <label className={`btn btn-secondary math-upload${data.busy ? ' is-disabled' : ''}`}>
      {files.length > 0 ? '+ Dosya ekle' : '+ Dosya seç'}
      <input type="file" className="sr-only" aria-label={`Ders ${data.id} ödev dosyası yükle`} disabled={data.busy}
        onChange={(event) => { context.actions.current.upload(data, event.target.files?.[0]); event.target.value = ''; }} />
    </label>
    {files.length > 0 && <ul className="math-files">{files.map((file) => <li key={file.id}>
      <a title={file.name} href={`/api/math-tutoring/${data.id}/files/${file.id}`} download>{file.name}</a>
      <button type="button" className="math-file-remove" aria-label={`${file.name} dosyasını sil`} disabled={data.busy}
        onClick={() => context.actions.current.removeFile(data, file)}>Sil</button>
    </li>)}</ul>}
  </>;
}

function MathStatusCell({ data, context }) {
  return <select className={`math-status-select math-status-${data.status.toLowerCase()}`}
    aria-label={`${data.isNew ? 'Yeni ders' : `Ders ${data.id}`} durumu`} value={data.status}
    onChange={(event) => context.actions.current.setField(data, 'status', event.target.value)}>
    {STATUS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
  </select>;
}

function MathActionsCell({ data, context }) {
  return data.isNew
    ? <div className="math-actions math-actions-new"><button type="button" className="btn btn-primary" disabled={data.busy}
        onClick={() => context.actions.current.create()}>+ Ders ekle</button></div>
    : <div className="math-actions"><button type="button" className="btn btn-primary" disabled={data.busy}
        onClick={() => context.actions.current.save(data)}>Kaydet</button>
      <button type="button" className="btn btn-secondary" disabled={data.busy}
        onClick={() => context.actions.current.remove(data)}>Sil</button></div>;
}

function MathSummaryRangeCell({ data, context }) {
  return <div className="math-summary-range">
    <input type="text" aria-label="İstatistik tarih aralığı" aria-invalid={!data.validRange}
      placeholder="GG.AA.YYYY – GG.AA.YYYY" value={data.dateRangeText}
      onChange={(event) => context.actions.current.setRange(event.target.value)} />
    {!data.validRange && <span className="math-range-error" role="alert">GG.AA.YYYY – GG.AA.YYYY biçiminde geçerli bir aralık girin.</span>}
    {data.customRange && <button type="button" className="math-range-reset"
      onClick={() => context.actions.current.resetRange()}>Tüm kayıtlar</button>}
  </div>;
}

function MathDetailsCell({ data, context }) {
  return <button type="button" className="btn btn-secondary math-details-button" aria-expanded={data.isExpanded}
    aria-label={`${data.isNew ? 'Yeni ders' : `Ders ${data.id}`} öğrenme takibi`}
    onClick={() => context.actions.current.toggleDetails(data)}>{data.isExpanded ? 'Kapat' : 'Ayrıntı'}</button>;
}

function MathEvaluationCell({ data, context }) {
  return <AutoTextarea aria-label={`${data.isNew ? 'Yeni ders' : `Ders ${data.id}`} öğretmen değerlendirmesi`}
    value={data.learning?.teacherEvaluation ?? ''} maxLength={5000}
    onChange={(event) => context.actions.current.setLearningField(data, 'teacherEvaluation', event.target.value)} />;
}

const mathColumns = [
  { headerName: 'No', field: 'number', cellDataType: 'text', width: 38, minWidth: 38, maxWidth: 38, flex: 0, pinned: 'left', cellClass: 'math-row-number' },
  { headerName: 'Tarih', field: 'date', minWidth: 110, maxWidth: 150, cellRenderer: MathDateCell, autoHeight: true },
  { headerName: 'Saat', field: 'timeRange', minWidth: 104, maxWidth: 118, cellRenderer: MathTimeCell },
  { headerName: 'Konu', field: 'topic', minWidth: 102, cellRenderer: MathTextCell, cellRendererParams: { field: 'topic', maxLength: 1000 }, autoHeight: true },
  { headerName: 'Ödev', field: 'homework', minWidth: 80, cellRenderer: MathTextCell, cellRendererParams: { field: 'homework', maxLength: 2000 }, autoHeight: true },
  { headerName: 'Dosya', field: 'files', minWidth: 88, maxWidth: 112, cellRenderer: MathFileCell, autoHeight: true },
  { headerName: 'Durum', field: 'status', minWidth: 96, maxWidth: 112, cellRenderer: MathStatusCell },
  { headerName: 'Not', field: 'note', minWidth: 70, cellRenderer: MathTextCell, cellRendererParams: { field: 'note', maxLength: 2000 }, autoHeight: true },
  { headerName: 'Takip', colId: 'learning', minWidth: 66, maxWidth: 76, cellRenderer: MathDetailsCell },
  { headerName: 'Öğretmen\nDeğerlendirmesi', colId: 'teacherEvaluation', minWidth: 136, maxWidth: 142,
    headerClass: 'math-evaluation-header', wrapHeaderText: true, autoHeaderHeight: true,
    valueGetter: ({ data }) => data.learning?.teacherEvaluation ?? '', cellRenderer: MathEvaluationCell, autoHeight: true },
  { headerName: 'İşlem', field: 'id', width: 78, minWidth: 78, maxWidth: 78, flex: 0, cellRenderer: MathActionsCell, autoHeight: true },
];

function MathLessonCard({ data, actions }) {
  const context = { actions };
  const fields = [
    ['Tarih', <MathDateCell data={data} context={context} />],
    ['Saat', <MathTimeCell data={data} context={context} />],
    ['Konu', <MathTextCell data={data} context={context} field="topic" maxLength={1000} />],
    ['Ödev', <MathTextCell data={data} context={context} field="homework" maxLength={2000} />],
    ['Dosya', <MathFileCell data={data} context={context} />],
    ['Durum', <MathStatusCell data={data} context={context} />],
    ['Not', <MathTextCell data={data} context={context} field="note" maxLength={2000} />],
    ['Takip', <MathDetailsCell data={data} context={context} />],
    ['Öğretmen Değerlendirmesi', <MathEvaluationCell data={data} context={context} />],
  ];
  return <article className={`card math-lesson-card${data.isNew ? ' math-new-card' : ''}`} aria-label={data.isNew ? 'Yeni ders kaydı' : `${data.number}. ders kaydı`}>
    <h3>{data.isNew ? 'Yeni ders' : `${data.number}. ders`}</h3>
    <fieldset disabled={data.busy} className="math-card-fields">{fields.map(([label, editor]) =>
      <div key={label} className={`math-card-field${label === 'Öğretmen Değerlendirmesi' ? ' math-card-evaluation' : ''}`}>
        <span>{label}</span>{editor}</div>)}</fieldset>
    {data.isExpanded && <MathLearningPanel item={data} actions={actions} />}
    <div className="math-card-actions"><MathActionsCell data={data} context={context} /></div>
  </article>;
}

const summaryColumns = [
  { headerName: 'Tarih aralığı', field: 'dateRangeText', width: 230, minWidth: 230, cellRenderer: MathSummaryRangeCell, autoHeight: true },
  { headerName: 'Planlanan saat', field: 'planned', width: 132 },
  { headerName: 'Biten saat', field: 'completed', width: 110 },
  { headerName: 'İptal edilen', field: 'cancelled', width: 125 },
  { headerName: 'Girilen toplam', field: 'total', width: 135 },
].map((column) => ({ ...column, flex: 0, minWidth: column.minWidth ?? column.width, wrapHeaderText: true, autoHeaderHeight: true }));

export default function MathTutoring() {
  usePageTitle('Matematik Özel Ders');
  const [lessons, setLessons] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [newRow, setNewRow] = useState(blank);
  const [newRowDirty, setNewRowDirty] = useState(false);
  const [compactLayout, setCompactLayout] = useState(() => window.matchMedia('(max-width: 1279px)').matches);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedRangeText, setSelectedRangeText] = useState(null);
  const [expandedLesson, setExpandedLesson] = useState(null);
  const actions = useRef({});
  const inFlight = useRef(false);
  const pendingCount = Object.keys(drafts).length + (newRowDirty ? 1 : 0);
  const allDates = lessonDateBounds(lessons, dateToday());
  const dateRangeText = selectedRangeText ?? formatSummaryDateRange(allDates);
  const dateRange = parseSummaryDateRange(dateRangeText);
  const totals = dateRange ? summarizeLessons(lessons, dateRange) : null;
  const progress = dateRange ? learningSummary(lessons.filter((row) => row.date >= dateRange.start && row.date <= dateRange.end), dateToday()) : null;

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/api/auth/me'), api.get('/api/math-tutoring')]).then(([user, data]) => {
      if (!active) return;
      const key = `math-tutoring-drafts:${user.id}`;
      let stored;
      try { stored = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { /* Keep in-memory edits if storage is unavailable. */ }
      actions.current.draftStorageKey = key;
      setLessons(sortLessons(data));
      const owned = new Set(data.map((row) => String(row.id)));
      const restored = Object.fromEntries(Object.entries(stored?.drafts ?? {}).filter(([id]) => owned.has(id)));
      setDrafts((current) => ({ ...restored, ...current }));
      if (stored?.newRowDirty && stored.newRow && !newRowDirty) {
        setNewRow(stored.newRow); setNewRowDirty(true);
      }
    })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1279px)');
    const change = () => setCompactLayout(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    const persist = () => {
      const key = actions.current.draftStorageKey;
      if (!key) return;
      try {
        if (pendingCount) sessionStorage.setItem(key, JSON.stringify({ drafts, newRow, newRowDirty }));
        else sessionStorage.removeItem(key);
      } catch { /* The unload prompt still protects in-memory edits. */ }
    };
    persist();
    if (!pendingCount) return;
    const warn = (event) => { persist(); event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pendingCount, drafts, newRow, newRowDirty]);

  const run = async (key, action) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(key); setError(''); setNotice('');
    try { await action(); } catch (e) { setError(e.message); } finally { inFlight.current = false; setBusy(''); }
  };
  const update = (id, field, value) => setDrafts((current) => ({
    ...current, [id]: { ...(current[id] || {}), [field]: value },
  }));
  const refresh = async () => setLessons(sortLessons(await api.get('/api/math-tutoring')));
  const saveAll = ({ includeNew = false } = {}) => run('save-all', async () => {
    const changes = lessonChanges(lessons, drafts, newRow, includeNew || newRowDirty);
    if (!changes.length) { setNotice('Kaydedilecek değişiklik yok.'); return; }
    const saved = await api.post('/api/math-tutoring/bulk', changes.map((change) => ({
      id: change.id === 'new' ? null : change.id,
      lesson: change.id === 'new' ? change.fields
        : { ...change.fields, revision: lessons.find((row) => row.id === change.id)?.revision },
    })));
    if (!Array.isArray(saved) || saved.length !== changes.length)
      throw new Error('Kayıt sonucu doğrulanamadı. Değişiklikler sayfada korunuyor.');
    const verified = saved.every((row, index) => Number.isInteger(row.id) && row.id > 0
      && (changes[index].id === 'new' || changes[index].id === row.id)
      && JSON.stringify(lessonFields(row)) === JSON.stringify(changes[index].fields));
    if (!verified) throw new Error('Öğretmen değerlendirmesi dahil tüm alanların kaydı doğrulanamadı. Değişiklikler sayfada korunuyor.');
    setLessons((rows) => sortLessons([...rows.filter((row) => !saved.some((result) => result.id === row.id)), ...saved]));
    setDrafts((current) => {
      const next = { ...current };
      changes.forEach((change) => {
        delete next[change.id];
      });
      return next;
    });
    const createdIndex = changes.findIndex((change) => change.id === 'new');
    if (createdIndex >= 0) {
      setNewRow(blank()); setNewRowDirty(false);
      setExpandedLesson((current) => current === 'new' ? saved[createdIndex].id : current);
    }
    setNotice(`Tüm değişiklikler kaydedildi. ${saved.length} ders güncellendi.`);
  });

  const remove = (lesson) => {
    if (!window.confirm('Bu dersi ve ödev dosyalarını silmek istiyor musunuz?')) return;
    run(`delete-${lesson.id}`, async () => {
      await api.delete(`/api/math-tutoring/${lesson.id}`);
      setLessons((rows) => rows.filter((row) => row.id !== lesson.id));
      setExpandedLesson((current) => current === lesson.id ? null : current);
      setDrafts((current) => { const next = { ...current }; delete next[lesson.id]; return next; });
      setNotice('Ders silindi.');
    });
  };
  const upload = (lesson, file) => {
    if (!file) return;
    run(`upload-${lesson.id}`, async () => {
      const body = new FormData(); body.append('file', file);
      const saved = await api.upload(`/api/math-tutoring/${lesson.id}/files`, body);
      setLessons((rows) => rows.map((row) => row.id === saved.id ? { ...row, files: saved.files } : row));
      setDrafts((current) => ({ ...current, [lesson.id]: current[lesson.id] ?? {} }));
      setNotice('Dosya yüklendi.');
    });
  };
  const removeFile = (lesson, file) => {
    if (!window.confirm(`${file.name} dosyası silinsin mi?`)) return;
    run(`file-${file.id}`, async () => {
      await api.delete(`/api/math-tutoring/${lesson.id}/files/${file.id}`);
      await refresh();
      setDrafts((current) => ({ ...current, [lesson.id]: current[lesson.id] ?? {} }));
      setNotice('Dosya silindi.');
    });
  };

  actions.current = {
    draftStorageKey: actions.current.draftStorageKey,
    setField: (row, field, value) => {
      if (inFlight.current) return;
      if (row.isNew) { setNewRowDirty(true); setNewRow((current) => ({ ...current, [field]: value })); }
      else update(row.id, field, value);
    },
    setLearningField: (row, field, value) => {
      if (inFlight.current) return;
      if (row.isNew) {
        setNewRowDirty(true);
        setNewRow((current) => ({ ...current, learning: { ...blankLearning(), ...current.learning, ...(['examType','branch'].includes(field)?{categoryId:null}:{}),[field]: value } }));
      } else setDrafts((current) => {
        const draft = current[row.id] || {};
        const saved = lessons.find((lesson) => lesson.id === row.id);
        return { ...current, [row.id]: { ...draft, learning: { ...blankLearning(), ...(draft.learning ?? saved?.learning), ...(['examType','branch'].includes(field)?{categoryId:null}:{}),[field]: value } } };
      });
    },
    create: () => saveAll({ includeNew: true }), save: () => saveAll(),
    remove, upload, removeFile,
    toggleDetails: (row) => setExpandedLesson((current) => current === row.id ? null : row.id),
    setRange: setSelectedRangeText,
    resetRange: () => setSelectedRangeText(null),
  };
  const gridRows = [...lessons.map((lesson, index) => ({ ...lesson, ...(drafts[lesson.id] || {}),
    number: index + 1, busy: !!busy, isExpanded: expandedLesson === lesson.id })),
  { ...newRow, id: 'new', number: '+', isNew: true, busy: !!busy, isExpanded: expandedLesson === 'new' }];
  const summaryRows = [{ id: 'summary', dateRangeText, validRange: !!dateRange,
    customRange: selectedRangeText !== null,
    planned: totals ? formatLessonDuration(totals.planned) : '—',
    completed: totals ? formatLessonDuration(totals.completed) : '—',
    cancelled: totals ? formatLessonDuration(totals.cancelled) : '—',
    total: totals ? formatLessonDuration(totals.total) : '—' }];

  return <div className="math-tutoring-page">
    <h2>Matematik Özel Ders</h2>
    {compactLayout ? <div className="card math-summary-cards">
      <div><span>Tarih aralığı</span><MathSummaryRangeCell data={summaryRows[0]} context={{ actions }} /></div>
      <dl>{summaryColumns.slice(1).map(({ headerName, field }) => <div key={field}><dt>{headerName}</dt><dd>{summaryRows[0][field]}</dd></div>)}</dl>
    </div> : <div className="card math-summary worksheet-frame">
      <DataGrid mode="summary" className="math-summary-grid" rowData={summaryRows} columnDefs={summaryColumns}
        gridOptions={{ getRowId: ({ data }) => data.id, context: { actions }, rowHeight: 62 }} />
    </div>}
    {progress && <>
      <div className="math-progress" aria-label="Öğrenme özeti">
        {[['Tamamlanan ders', `${progress.completed} / ${progress.total}`],
          ['Ödev tamamlama', progress.homeworkCompletion === null ? '—' : `%${progress.homeworkCompletion}`],
          ['Son test başarısı', progress.testSuccess === null ? '—' : `%${progress.testSuccess}`],
          ['Tekrar bekleyen ders', progress.reviews.length]].map(([label, value]) =>
          <div className="card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      {(progress.reviews.length > 0 || progress.overdue.length > 0) && <div className="card math-learning-alerts">
        <h3>Takip gerektiren dersler</h3><ul>
          {progress.reviews.map((row) => <li key={`review-${row.id}`}><button type="button" onClick={() => setExpandedLesson(row.id)}>
            Tekrar zamanı: {row.topic || 'Konusuz ders'} · {formatLessonDate(row.learning.reviewDate)}</button></li>)}
          {progress.overdue.map((row) => <li key={`homework-${row.id}`}><button type="button" onClick={() => setExpandedLesson(row.id)}>
            Ödev gecikmiş: {row.topic || 'Konusuz ders'} · {formatLessonDate(row.learning.assignment.dueDate)}</button></li>)}
        </ul></div>}
    </>}
    <p className="muted">Geçmiş tarihlere de ders ekleyebilirsiniz. Konu, test, ödev ve tekrar bilgileri için satırdaki Ayrıntı düğmesini kullanın. Kaydet düğmeleri tüm satırlardaki değişiklikleri birlikte kaydeder.</p>
    {error && <p className="field-error" role="alert">{error}</p>}
    {notice && <p className="alert alert-success" role="status">{notice}</p>}
    {compactLayout ? <div className="math-lesson-cards math-grid">{gridRows.map((data) =>
      <MathLessonCard key={data.id} data={data} actions={actions} />)}</div>
      : <div className="card math-scroll worksheet-frame">
        <DataGrid mode="worksheet" scrollable className="math-grid" rowData={gridRows} columnDefs={mathColumns}
          expandedRowKey={expandedLesson} detailComponent={MathLearningPanel} detailContext={{ actions }}
          gridOptions={{ getRowId: ({ data }) => String(data.id), context: { actions }, rowHeight: 82, domLayout: 'autoHeight',
            getRowClass: ({ data }) => data?.isNew ? 'math-new-row' : `math-status-${data?.status?.toLowerCase() ?? 'planned'}` }} />
      </div>}
    <div className="math-save-bar" aria-label="Sayfa değişiklikleri">
      <span role="status">{pendingCount ? `${pendingCount} derste kaydedilmemiş değişiklik var.` : 'Kaydedilmemiş değişiklik yok.'}</span>
      <button type="button" className="btn btn-primary" disabled={!!busy || !pendingCount} onClick={() => saveAll()}>
        {busy === 'save-all' ? 'Kaydediliyor…' : 'Tüm değişiklikleri kaydet'}</button>
    </div>
  </div>;
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth.jsx';
import DataGrid from '../components/DataGrid.jsx';
import Modal from '../components/Modal.jsx';
import SharedCategorySelect from '../components/SharedCategorySelect.jsx';
import SharedResourceSelect from '../components/SharedResourceSelect.jsx';
import {Link} from 'react-router-dom';
import {qs} from '../api.js';
import { usePageTitle } from '../hooks.js';
import { addRow, changeInterval, cloneRows, formatTime, makeRows, nextWeekRows, parseTimeRange, removeRow, rowHasContent, rowStart, validRows } from '../studentSchedule.js';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DATE_FORMAT = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });

function mondayOf(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function dateAt(monday, offset) {
  const date = new Date(monday);
  date.setDate(date.getDate() + offset);
  return date;
}

function weekKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function loadWeek(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    if (validRows(stored)) return { rows: stored, saved: JSON.stringify(stored) };
  } catch { /* Bozuk veya erişilemeyen kayıt yerine boş çizelge açılır. */ }
  return { rows: makeRows(), saved: null };
}

function AutoTextarea({ value, ...props }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} value={value} rows="1" {...props} />;
}

function ScheduleTimeCell({ data, context }) {
  return <input className="tracking-time" type="text" inputMode="text" aria-label={`${data.index + 1}. saat aralığı`}
    value={data.draft ?? data.interval} readOnly={data.past}
    onChange={(event) => context.actions.current.setDraft(data.index, event.target.value)}
    onBlur={() => context.actions.current.commitTime(data.index)}
    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />;
}

function ScheduleNoteCell({ data, value, day, context }) {
  const binding=data.bindings?.[day];
  return <div><AutoTextarea aria-label={`${DAYS[day]} ${data.interval} çalışma notu`} value={value ?? ''} readOnly={data.past}
    onChange={(event) => context.actions.current.updateCell(data.index, day, event.target.value)} />
    <button type="button" className="btn btn-secondary btn-sm" onClick={()=>context.actions.current.bind(data.index,day)}>
      {binding?.categoryId?.length?`${binding.categoryId.length} konu · ${binding.state || 'Planlandı'}`:'Konu / durum seç'}</button></div>;
}

export default function StudentTracking() {
  usePageTitle('Haftalık Program');
  const { user } = useAuth();
  const [monday, setMonday] = useState(() => mondayOf(new Date()));
  const key = `student-tracking:${user.id}:${weekKey(monday)}`;
  const [initial] = useState(() => loadWeek(key));
  const [rows, setRows] = useState(initial.rows);
  const [saved, setSaved] = useState(initial.saved);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [nextWeek, setNextWeek] = useState(null);
  const [bindingCell,setBindingCell]=useState(null);
  const actions = useRef({});
  const past = monday < mondayOf(new Date());
  const dirty = JSON.stringify(rows) !== (saved ?? JSON.stringify(makeRows()));

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const updateRows = (next) => {
    setRows(next);
    setError('');
    setNotice('');
  };

  const save = () => {
    if (past) return;
    const serialized = JSON.stringify(rows);
    try {
      localStorage.setItem(key, serialized);
      setSaved(serialized);
      setError('');
      setNotice('Hafta kaydedildi.');
    } catch {
      setError('Değişiklik tarayıcıya kaydedilemedi. Depolama alanını kontrol edin.');
    }
  };

  const commitTime = (index) => {
    if (past) return;
    const draft = drafts[index];
    if (draft === undefined) return;
    const range = parseTimeRange(draft);
    setDrafts((current) => { const next = { ...current }; delete next[index]; return next; });
    if (range === null) {
      setError('Saat aralığı geçersiz. Bitiş, başlangıçtan sonra ve en geç 24:00 olmalı.');
      return;
    }
    const next = changeInterval(rows, index, range);
    if (!next) {
      setError('Saatler çakışıyor veya günün sonunu 24:00 ötesine taşıyor. Önceki ve sonraki aralıkları kontrol edin.');
      return;
    }
    if (rows.slice(next.length).some(rowHasContent)) {
      setError('Bu değişiklik gün sonundaki not veya konu/kaynak kayıtlarını kaldırır. Önce bu kayıtları taşıyın veya daha kısa bir aralık seçin.');
      return;
    }
    updateRows(next);
  };

  const openWeek = (target, replacement = null) => {
    const stored = loadWeek(`student-tracking:${user.id}:${weekKey(target)}`);
    setMonday(target);
    setRows(replacement ?? stored.rows);
    setSaved(stored.saved);
    setDrafts({});
    setError('');
    setNotice('');
    setNextWeek(null);
  };

  const canLeave = () => !dirty || window.confirm('Kaydedilmemiş değişiklikler var. Kaydetmeden devam edilsin mi?');

  const goPrevious = () => { if (canLeave()) openWeek(dateAt(monday, -7)); };
  const goToday = () => { if (canLeave()) openWeek(mondayOf(new Date())); };
  const goNext = () => {
    if (!canLeave()) return;
    const target = dateAt(monday, 7);
    if (target < mondayOf(new Date())) openWeek(target);
    else setNextWeek(target);
  };

  const chooseNext = (mode) => {
    if (mode === 'existing') { openWeek(nextWeek); return; }
    const next=nextWeekRows(rows,mode==='copy');
    openWeek(nextWeek,next);
  };

  const insertRow = () => {
    const next = addRow(rows, rows.length - 1);
    if (!next) { setError('Yeni satır için 24:00 öncesinde en az bir saat yer olmalı.'); return; }
    updateRows(next);
    setDrafts({});
  };

  const deleteRow = () => {
    const last = rows.length - 1;
    if (rowHasContent(rows[last]) && !window.confirm('Son satırdaki çalışma notları ve konu/kaynak kayıtları silinecek. Devam edilsin mi?')) return;
    const next = removeRow(rows, last);
    if (!next) { setError('Çizelgede en az bir satır kalmalı.'); return; }
    updateRows(next);
    setDrafts({});
  };

  actions.current = {
    bind:(index,day)=>setBindingCell({index,day}),
    setDraft: (index, value) => setDrafts((current) => ({ ...current, [index]: value })),
    commitTime,
    updateCell: (index, day, value) => {
      const next = cloneRows(rows);
      next[index].cells[day] = value;
      updateRows(next);
    },
  };
  const gridRows = rows.map((row, index) => {
    const start = rowStart(rows, index);
    return { index, interval: `${formatTime(start)}-${formatTime(start + row.minutes)}`,
      draft: drafts[index], past,bindings:row.bindings, ...Object.fromEntries(row.cells.map((cell, day) => [`day${day}`, cell])) };
  });
  const columns = useMemo(() => [
    { headerName: 'Saat aralığı', field: 'interval', width: 170, minWidth: 170, pinned: 'left',
      cellRenderer: ScheduleTimeCell, cellClass: 'tracking-grid-time' },
    ...DAYS.map((day, index) => ({ headerName: `${day} · ${DATE_FORMAT.format(dateAt(monday, index))}`,
      field: `day${index}`, minWidth: 170, flex: 1, cellRenderer: ScheduleNoteCell,
      cellRendererParams: { day: index }, autoHeight: true })),
  ], [monday]);

  return <>
    <h2>Haftalık Program</h2>
    <p className="muted">Haftalık çalışma çizelgesi. Saat aralığını düzenlediğinizde sonraki satırlar otomatik güncellenir.</p>
    <p className="muted small">Konu durumu sizin çalışma kaydınızdır. Bağlı kaynakları açmak PDF sayfalarını veya video süresini tamamlamaz. Çizelge bu tarayıcıda, hesabınıza göre saklanır.</p>
    <div className="tracking-toolbar">
      <button type="button" className="btn btn-secondary" onClick={goPrevious}>Önceki hafta</button>
      <strong>{DATE_FORMAT.format(monday)} – {DATE_FORMAT.format(dateAt(monday, 6))} {dateAt(monday, 6).getFullYear()}</strong>
      <button type="button" className="btn btn-secondary" onClick={goNext}>Sonraki hafta</button>
      <button type="button" className="btn btn-secondary" onClick={goToday}>Bu hafta</button>
      <button type="button" className="btn btn-primary" onClick={save} disabled={past}
        title={past ? 'Geçmiş haftalar düzenlenemez' : 'Bu haftayı kaydet'}>Kaydet</button>
    </div>
    {past && <p className="muted small">Geçmiş haftalar görüntülenebilir, düzenlenemez.</p>}
    {!past && dirty && <p className="muted small">Kaydedilmemiş değişiklikler var.</p>}
    {error && <p className="field-error" role="alert">{error}</p>}
    {notice && <p className="alert alert-success" role="status">{notice}</p>}
    <div className="card tracking-scroll worksheet-frame">
      <DataGrid mode="worksheet" scrollable className="tracking-grid" rowData={gridRows} columnDefs={columns}
        gridOptions={{ getRowId: ({ data }) => String(data.index), context: { actions }, rowHeight: 64 }} />
    </div>
    {!past && <div className="tracking-bottom-actions">
      <button type="button" className="btn btn-secondary" onClick={insertRow}>+ Satır ekle</button>
      <button type="button" className="btn btn-secondary" onClick={deleteRow} disabled={rows.length <= 1}>− Son satırı kaldır</button>
    </div>}
    {bindingCell && <Modal title={`${DAYS[bindingCell.day]} · Konu ve çalışma durumu`} onClose={()=>setBindingCell(null)}>
      <fieldset className="tracking-binding-fields" disabled={past}><SharedCategorySelect value={rows[bindingCell.index].bindings?.[bindingCell.day] || {}} onChange={value=>{
        const next=cloneRows(rows);next[bindingCell.index].bindings ||= Array(7).fill(null);
        next[bindingCell.index].bindings[bindingCell.day]={...next[bindingCell.index].bindings[bindingCell.day],...value};updateRows(next);
      }}/><SharedResourceSelect categoryId={rows[bindingCell.index].bindings?.[bindingCell.day]?.categoryId || []} value={rows[bindingCell.index].bindings?.[bindingCell.day]?.resourceKeys || []} onChange={value=>{
        const next=cloneRows(rows);next[bindingCell.index].bindings ||= Array(7).fill(null);
        next[bindingCell.index].bindings[bindingCell.day]={...next[bindingCell.index].bindings[bindingCell.day],resourceKeys:value};updateRows(next);
      }}/><label>Çalışma durumu <select value={rows[bindingCell.index].bindings?.[bindingCell.day]?.state || 'Planlandı'} onChange={e=>{
        const next=cloneRows(rows);next[bindingCell.index].bindings ||= Array(7).fill(null);
        next[bindingCell.index].bindings[bindingCell.day]={...next[bindingCell.index].bindings[bindingCell.day],state:e.target.value};updateRows(next);
      }}>{['Planlandı','Başlandı','Tamamlandı','Tekrar gerekli'].map(s=><option key={s}>{s}</option>)}</select></label>
      <label>Tekrar tarihi <input type="date" value={rows[bindingCell.index].bindings?.[bindingCell.day]?.reviewDate || ''} onChange={e=>{
        const next=cloneRows(rows);next[bindingCell.index].bindings ||= Array(7).fill(null);
        next[bindingCell.index].bindings[bindingCell.day]={...next[bindingCell.index].bindings[bindingCell.day],reviewDate:e.target.value};updateRows(next);
      }}/></label></fieldset>
      <div className="tracking-binding-actions"><Link to={'/konular-ve-kaynaklar'+qs({categoryId:rows[bindingCell.index].bindings?.[bindingCell.day]?.categoryId || []})}>Bu konunun kaynakları</Link>
      {!past && <button type="button" className="btn btn-primary" onClick={()=>{save();setBindingCell(null);}}>Haftayı kaydet</button>}
      </div>
    </Modal>}
    {nextWeek && <Modal title="Sonraki hafta" onClose={() => setNextWeek(null)} footer={<>
      <button type="button" className="btn btn-primary" onClick={() => chooseNext('copy')}>Aynısını kopyala</button>
      <button type="button" className="btn btn-secondary" onClick={() => chooseNext('blank')}>Boş hafta aç</button>
      {loadWeek(`student-tracking:${user.id}:${weekKey(nextWeek)}`).saved && <button type="button" className="btn btn-secondary" onClick={() => chooseNext('existing')}>Kaydedilmiş haftayı aç</button>}
    </>}>
      <p>{DATE_FORMAT.format(nextWeek)} haftası nasıl açılsın?</p>
      <p className="muted small">Her iki seçenekte saat satırları korunur; tarihler yeni haftaya göre güncellenir. “Boş hafta aç” çalışma notlarını temizler.</p>
    </Modal>}
  </>;
}

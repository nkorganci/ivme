import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth.jsx';
import DataGrid from '../components/DataGrid.jsx';
import Modal from '../components/Modal.jsx';
import SharedCategorySelect from '../components/SharedCategorySelect.jsx';
import SharedResourceSelect from '../components/SharedResourceSelect.jsx';
import {Link} from 'react-router-dom';
import {api, qs} from '../api.js';
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
  const [value, setValue] = useState(data.interval);
  useEffect(() => { setValue(data.interval); }, [data.interval]);
  return <input className="tracking-time" type="text" inputMode="text" aria-label={`${data.index + 1}. saat aralığı`}
    value={value} readOnly={data.past}
    onFocus={(event) => event.target.select()}
    onChange={(event) => setValue(event.target.value)}
    onBlur={() => { setValue(context.actions.current.commitTime(data.index, value) ?? data.interval); }}
    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />;
}

function ScheduleRowActions({ data, context }) {
  if (data.past) return null;
  return <div className="tracking-row-actions">
    <button type="button" className="btn btn-secondary btn-sm" aria-label={`${data.index + 1}. satırdan sonra ekle`}
      title="Bu satırdan sonra ekle" onClick={() => context.actions.current.insertRow(data.index)}>+</button>
    <button type="button" className="btn btn-secondary btn-sm" aria-label={`${data.index + 1}. satırı sil`}
      title="Bu satırı sil" disabled={data.onlyRow} onClick={() => context.actions.current.deleteRow(data.index)}>−</button>
  </div>;
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
  const [rows, setRows] = useState(makeRows);
  const [saved, setSaved] = useState(JSON.stringify(makeRows()));
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const pendingReplacement = useRef(null);
  const failedAutoSave = useRef(null);
  const loadedScope = useRef(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [nextWeek, setNextWeek] = useState(null);
  const [bindingCell,setBindingCell]=useState(null);
  const actions = useRef({});
  const past = monday < mondayOf(new Date());
  const dirty = JSON.stringify(rows) !== (saved ?? JSON.stringify(makeRows()));

  useEffect(() => {
    let active = true;
    const mondayKey = weekKey(monday);
    const path = `/api/student-program/weeks/${mondayKey}`;
    const chosen = pendingReplacement.current;
    pendingReplacement.current = null;
    failedAutoSave.current = null;
    loadedScope.current = null;
    setReady(false);
    setError('');
    (async () => {
      const remote = await api.get(path);
      if (!active) return;
      const serverRows = remote && validRows(remote.rows) ? remote.rows : makeRows();
      setRows(chosen ?? serverRows);
      setSaved(JSON.stringify(serverRows));
      setRevision(remote?.revision ?? 0);
      loadedScope.current = `${user.id}:${mondayKey}`;
      setReady(true);
    })().catch((error) => {
      if (active) setError(`Program veritabanından yüklenemedi: ${error.message}`);
    });
    return () => { active = false; };
  }, [monday, user.id, loadAttempt]);

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

  const save = async (automatic = false) => {
    if (past || !ready || saving || loadedScope.current !== `${user.id}:${weekKey(monday)}`) return false;
    const serialized = JSON.stringify(rows);
    setSaving(true);
    try {
      const result = await api.put(`/api/student-program/weeks/${weekKey(monday)}`,
        { rows, revision });
      setRevision(result.revision);
      setSaved(serialized);
      failedAutoSave.current = null;
      setError('');
      setNotice(automatic ? 'Değişiklikler veritabanına kaydedildi.' : 'Hafta veritabanına kaydedildi.');
      return true;
    } catch (error) {
      if (automatic) failedAutoSave.current = serialized;
      setError(error.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!ready || past || saving || !dirty || loadedScope.current !== `${user.id}:${weekKey(monday)}`) return undefined;
    const serialized = JSON.stringify(rows);
    if (failedAutoSave.current === serialized) return undefined;
    const timer = window.setTimeout(() => { void save(true); }, 400);
    return () => window.clearTimeout(timer);
  }, [rows, saved, revision, ready, past, saving, monday, user.id]);

  const commitTime = (index, draft) => {
    if (past) return null;
    const range = parseTimeRange(draft);
    if (range === null) {
      setError('Saat aralığı geçersiz. Bitiş, başlangıçtan sonra ve en geç 24:00 olmalı.');
      return null;
    }
    const next = changeInterval(rows, index, range);
    if (!next) {
      setError('Saatler çakışıyor veya günün sonunu 24:00 ötesine taşıyor. Önceki ve sonraki aralıkları kontrol edin.');
      return null;
    }
    updateRows(next);
    return `${formatTime(range.start)}-${formatTime(range.end)}`;
  };

  const openWeek = (target, replacement = null) => {
    pendingReplacement.current = replacement;
    setMonday(target);
    setReady(false);
    setError('');
    setNotice('');
    setNextWeek(null);
  };

  const canLeave = () => !dirty || window.confirm('Kaydedilmemiş değişiklikler var. Kaydetmeden devam edilsin mi?');

  const goPrevious = () => { if (ready && !saving && canLeave()) openWeek(dateAt(monday, -7)); };
  const goToday = () => { if (ready && !saving && canLeave()) openWeek(mondayOf(new Date())); };
  const goNext = () => {
    if (!ready || saving || !canLeave()) return;
    const target = dateAt(monday, 7);
    if (target < mondayOf(new Date())) openWeek(target);
    else setNextWeek(target);
  };

  const chooseNext = (mode) => {
    if (mode === 'existing') { openWeek(nextWeek); return; }
    const next=nextWeekRows(rows,mode==='copy');
    openWeek(nextWeek,next);
  };

  const insertRow = (index = rows.length - 1) => {
    const next = addRow(rows, index);
    if (!next) { setError('Yeni satır için 24:00 öncesinde en az bir saat yer olmalı.'); return; }
    updateRows(next);
    setBindingCell(null);
  };

  const deleteRow = (index = rows.length - 1) => {
    if (rowHasContent(rows[index]) && !window.confirm(`${index + 1}. satırdaki çalışma notları ve konu/kaynak kayıtları silinecek. Devam edilsin mi?`)) return;
    const next = removeRow(rows, index);
    if (!next) { setError('Çizelgede en az bir satır kalmalı.'); return; }
    updateRows(next);
    setBindingCell(null);
  };

  const deleteAll = async () => {
    if (!ready || saving || !window.confirm('Tüm haftalık program kayıtlarınız silinecek. Devam edilsin mi?')) return;
    setSaving(true);
    try {
      await api.delete('/api/student-program/weeks');
      const blank = makeRows();
      setRows(blank);
      setSaved(JSON.stringify(blank));
      setRevision(0);
      setBindingCell(null);
      setError('');
      setNotice('Tüm haftalık program kayıtları silindi.');
      try {
        const prefix = `student-tracking:${user.id}:`;
        for (const key of Object.keys(localStorage)) if (key.startsWith(prefix)) localStorage.removeItem(key);
      } catch { /* Eski tarayıcı kayıtları artık içe aktarılmıyor. */ }
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  actions.current = {
    bind:(index,day)=>setBindingCell({index,day}),
    insertRow,
    deleteRow,
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
      past, onlyRow: rows.length === 1, bindings:row.bindings, ...Object.fromEntries(row.cells.map((cell, day) => [`day${day}`, cell])) };
  });
  const columns = useMemo(() => [
    { headerName: 'Saat aralığı', field: 'interval', width: 170, minWidth: 170, pinned: 'left',
      cellRenderer: ScheduleTimeCell, cellClass: 'tracking-grid-time' },
    { headerName: 'İşlem', colId: 'rowActions', width: 110, minWidth: 110, pinned: 'left',
      cellRenderer: ScheduleRowActions, sortable: false, filter: false },
    ...DAYS.map((day, index) => ({ headerName: `${day} · ${DATE_FORMAT.format(dateAt(monday, index))}`,
      field: `day${index}`, minWidth: 170, flex: 1, cellRenderer: ScheduleNoteCell,
      cellRendererParams: { day: index }, autoHeight: true })),
  ], [monday]);

  return <>
    <h2>Haftalık Program</h2>
    <p className="muted">Haftalık çalışma çizelgesi. Saat aralığına tıklayıp düzenleyebilirsiniz; sonraki satırların saatleri otomatik güncellenir. Satır yanındaki + ve − düğmeleriyle satır ekleyip silebilirsiniz.</p>
    <p className="muted small">Konu durumu sizin çalışma kaydınızdır. Bağlı kaynakları açmak PDF sayfalarını veya video süresini tamamlamaz. Çizelge hesabınızda saklanır ve diğer oturumlarda sayfa yenilenince görünür.</p>
    <div className="tracking-toolbar">
      <button type="button" className="btn btn-secondary" onClick={goPrevious} disabled={!ready || saving}>Önceki hafta</button>
      <strong>{DATE_FORMAT.format(monday)} – {DATE_FORMAT.format(dateAt(monday, 6))} {dateAt(monday, 6).getFullYear()}</strong>
      <button type="button" className="btn btn-secondary" onClick={goNext} disabled={!ready || saving}>Sonraki hafta</button>
      <button type="button" className="btn btn-secondary" onClick={goToday} disabled={!ready || saving}>Bu hafta</button>
      <button type="button" className="btn btn-primary" onClick={() => save()} disabled={past || !ready || saving}
        title={past ? 'Geçmiş haftalar düzenlenemez' : 'Bu haftayı kaydet'}>Kaydet</button>
      <button type="button" className="btn btn-secondary" onClick={deleteAll} disabled={!ready || saving}>Tüm program kayıtlarını sil</button>
    </div>
    {past && <p className="muted small">Geçmiş haftalar görüntülenebilir, düzenlenemez.</p>}
    {!past && dirty && <p className="muted small">{saving ? 'Değişiklikler kaydediliyor…' : 'Değişiklikler otomatik kaydedilecek.'}</p>}
    {error && <p className="field-error" role="alert">{error}</p>}
    {!ready && <p role="status">Program veritabanından yükleniyor… <button type="button" className="btn btn-secondary" onClick={() => setLoadAttempt(n => n + 1)}>Tekrar dene</button></p>}
    {notice && <p className="alert alert-success" role="status">{notice}</p>}
    {ready && <>
    <div className="card tracking-scroll worksheet-frame">
      <DataGrid mode="worksheet" scrollable rowNumbers className="tracking-grid" rowData={gridRows} columnDefs={columns}
        gridOptions={{ getRowId: ({ data }) => String(data.index), context: { actions }, rowHeight: 64 }} />
    </div>
    {!past && <div className="tracking-bottom-actions">
      <button type="button" className="btn btn-secondary" onClick={() => insertRow()}>+ Satır ekle</button>
      <button type="button" className="btn btn-secondary" onClick={() => deleteRow()} disabled={rows.length <= 1}>− Son satırı kaldır</button>
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
      {!past && <button type="button" className="btn btn-primary" onClick={async ()=>{if(await save())setBindingCell(null);}} disabled={saving}>Haftayı kaydet</button>}
      </div>
    </Modal>}
    {nextWeek && <Modal title="Sonraki hafta" onClose={() => setNextWeek(null)} footer={<>
      <button type="button" className="btn btn-primary" onClick={() => chooseNext('copy')}>Aynısını kopyala</button>
      <button type="button" className="btn btn-secondary" onClick={() => chooseNext('blank')}>Boş hafta aç</button>
      <button type="button" className="btn btn-secondary" onClick={() => chooseNext('existing')}>Haftayı aç</button>
    </>}>
      <p>{DATE_FORMAT.format(nextWeek)} haftası nasıl açılsın?</p>
      <p className="muted small">Her iki seçenekte saat satırları korunur; tarihler yeni haftaya göre güncellenir. “Boş hafta aç” çalışma notlarını temizler.</p>
    </Modal>}
    </>}
  </>;
}

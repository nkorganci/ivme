import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '../auth.jsx';
import Modal from '../components/Modal.jsx';
import { usePageTitle } from '../hooks.js';
import { addRow, changeInterval, cloneRows, formatTime, makeRows, parseTimeRange, removeRow, rowStart, validRows } from '../studentSchedule.js';

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

export default function StudentTracking() {
  usePageTitle('Öğrenci Takip Portalı');
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
    if (rows.slice(next.length).some((row) => row.cells.some((cell) => cell.trim()))) {
      setError('Bu değişiklik gün sonundaki dolu hücreleri kaldırır. Önce bu notları taşıyın veya daha kısa bir aralık seçin.');
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
    openWeek(nextWeek, cloneRows(rows, mode === 'copy'));
  };

  const insertRow = (index) => {
    const next = addRow(rows, index);
    if (!next) { setError('Yeni satır için 24:00 öncesinde en az bir saat yer olmalı.'); return; }
    updateRows(next);
    setDrafts({});
  };

  const deleteRow = (index) => {
    if (rows[index].cells.some((cell) => cell.trim()) && !window.confirm('Bu satırdaki çalışma notları silinecek. Devam edilsin mi?')) return;
    const next = removeRow(rows, index);
    if (!next) { setError('Çizelgede en az bir satır kalmalı.'); return; }
    updateRows(next);
    setDrafts({});
  };

  return <>
    <div className="page-head"><h1>Öğrenci Takip Portalı</h1></div>
    <p className="muted">Haftalık çalışma çizelgesi. Saat aralığını düzenlediğinizde sonraki satırlar otomatik güncellenir.</p>
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
    <div className="card tracking-scroll">
      <table className="tracking-table">
        <thead><tr><th scope="col">Saat aralığı</th>{DAYS.map((day, index) => <th scope="col" key={day}>{day}<span className="tracking-date">{DATE_FORMAT.format(dateAt(monday, index))}</span></th>)}</tr></thead>
        <tbody>{rows.map((row, index) => {
          const start = rowStart(rows, index);
          const interval = `${formatTime(start)}-${formatTime(start + row.minutes)}`;
          return <tr key={index}>
            <th scope="row"><input className="tracking-time" type="text" inputMode="text" aria-label={`${index + 1}. saat aralığı`} value={drafts[index] ?? interval} readOnly={past}
              onChange={(event) => setDrafts((current) => ({ ...current, [index]: event.target.value }))}
              onBlur={() => commitTime(index)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
              {!past && <span className="tracking-row-actions">
                <button type="button" aria-label={`${index + 1}. satırdan sonra satır ekle`} title="Satır ekle" onClick={() => insertRow(index)}>+ Ekle</button>
                <button type="button" aria-label={`${index + 1}. satırı kaldır`} title="Satırı kaldır" onClick={() => deleteRow(index)}>− Kaldır</button>
              </span>}
            </th>
            {row.cells.map((cell, day) => <td key={day}><AutoTextarea aria-label={`${DAYS[day]} ${interval} çalışma notu`} value={cell} readOnly={past}
              onChange={(event) => {
                const next = cloneRows(rows);
                next[index].cells[day] = event.target.value;
                updateRows(next);
              }} /></td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>
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

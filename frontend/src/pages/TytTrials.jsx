import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import DataGrid from '../components/DataGrid.jsx';
import TytTrialCharts from '../components/TytTrialCharts.jsx';
import { usePageTitle } from '../hooks.js';
import { TESTS, calculateTrial, createTrial, sortTrialsByDate, validTrial } from '../tytTrials.js';

const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const integer = new Intl.NumberFormat('tr-TR');
const AREA_OPTIONS = [
  ['TYT', 'Yalnız TYT'], ['SAY', 'Sayısal'], ['SOZ', 'Sözel'],
  ['EA', 'Eşit Ağırlık'], ['DIL', 'Dil'],
];

function load(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    if (value && Array.isArray(value.rows) && value.rows.every(validTrial)
      && typeof value.obp === 'string' && (value.obp === '' || (Number.isFinite(Number(value.obp)) && Number(value.obp) >= 0 && Number(value.obp) <= 500))
      && AREA_OPTIONS.some(([area]) => area === value.area)) return value;
  } catch { /* Bozuk kayıt yerine boş çizelge açılır. */ }
  return { rows: [], obp: '', area: 'TYT' };
}

function TrialInput({ data, field, type = 'text', context, label, width }) {
  return <input className="tyt-cell-input" type={type} aria-label={`${data.name || data.date || 'Deneme'} ${label}`}
    value={data[field] ?? ''} style={width ? { width } : undefined}
    onChange={(event) => context.actions.current.update(data.id, field, event.target.value)} />;
}

function TestNetCell({ data, test, context }) {
  const hasPreviousResult = data.nets && Object.keys(data.nets).length > 0
    || data.answers && Object.keys(data.answers).length > 0;
  const value = data.testNets?.[test.key] ?? (hasPreviousResult ? String(data.totals[test.key]).replace('.', ',') : '');
  return <input className="tyt-cell-input tyt-number-input" type="text" inputMode="decimal"
    value={value} aria-label={`${data.name || data.date || 'Deneme'} ${test.label} net`}
    onChange={(event) => context.actions.current.net(data.id, test.key, event.target.value)} />;
}

function RemoveButton({ data, context }) {
  return <button type="button" className="btn btn-secondary tyt-remove" aria-label={`${data.name || data.date} denemesini sil`}
    onClick={() => context.actions.current.remove(data.id)}>Sil</button>;
}

const columns = [
  { field: 'date', headerName: 'Tarih', pinned: 'left', width: 155, minWidth: 155, sort: 'asc',
    cellRenderer: TrialInput, cellRendererParams: { field: 'date', type: 'date', label: 'tarih' } },
  ...TESTS.map((test) => ({ colId: `${test.key}.net`, headerName: `${test.label}\n${test.questions} soru`,
    width: 170, minWidth: 170, valueGetter: ({ data }) => data?.totals?.[test.key] ?? 0,
    cellRenderer: TestNetCell, cellRendererParams: { test } })),
  { field: 'net', headerName: 'TYT\nToplam Net', width: 155,
    valueFormatter: ({ value }) => number.format(value ?? 0) },
  { field: 'score', headerName: 'TYT puanı ≈', width: 126, valueFormatter: ({ value }) => value == null ? '—' : number.format(value) },
  { field: 'placement', headerName: 'Yerleştirme ≈', width: 142, valueFormatter: ({ value }) => value == null ? '—' : number.format(value) },
  { field: 'rank', headerName: 'TYT sıra ≈', width: 130, valueFormatter: ({ value }) => value == null ? '—' : integer.format(value) },
  { colId: 'remove', headerName: 'İşlem', width: 88, filter: false, sortable: false, cellRenderer: RemoveButton },
];

export default function TytTrials() {
  const { user } = useAuth();
  return <TytTrialsForUser key={user.id} userId={user.id} />;
}

function TytTrialsForUser({ userId }) {
  usePageTitle('TYT Deneme Takibi');
  const key = `tyt-trials:${userId}`;
  const [state, setState] = useState(null);
  const [saveStatus, setSaveStatus] = useState('loading');
  const [saveError, setSaveError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [legacyMissing, setLegacyMissing] = useState([]);
  const actions = useRef({});
  const revision = useRef(0);
  const savedSnapshot = useRef(null);
  const latestState = useRef(state);
  const saving = useRef(false);
  const migrating = useRef(false);
  const flush = useRef(null);
  latestState.current = state;
  const obpInvalid = state?.obp !== '' && state != null && Number(state.obp) < 250;
  const obp = !state || state.obp === '' || obpInvalid ? null : Number(state.obp);

  useEffect(() => {
    let active = true;
    setSaveStatus('loading');
    api.get('/api/tyt-trials').then((remote) => {
      if (!active) return;
      const serverState = { rows: remote.rows, obp: remote.obp, area: remote.area };
      const legacy = load(key);
      const importLegacy = remote.revision === 0
        && (legacy.rows.length > 0 || legacy.obp !== '' || legacy.area !== 'TYT');
      const serverIds = new Set(serverState.rows.map(row => row.id));
      setLegacyMissing(remote.revision > 0 ? legacy.rows.filter(row => !serverIds.has(row.id)) : []);
      revision.current = remote.revision;
      savedSnapshot.current = JSON.stringify(serverState);
      migrating.current = importLegacy;
      setState(importLegacy ? legacy : serverState);
      setSaveStatus(importLegacy ? 'pending' : 'idle');
      setSaveError('');
    }).catch((error) => {
      if (!active) return;
      setSaveStatus('load-error');
      setSaveError(error.message);
    });
    return () => { active = false; };
  }, [key, loadAttempt]);

  flush.current = async (force = false) => {
    if (saving.current || !latestState.current) return;
    const snapshot = JSON.stringify(latestState.current);
    if (!force && snapshot === savedSnapshot.current) return;
    saving.current = true;
    setSaveStatus('pending');
    try {
      const saved = await api.put('/api/tyt-trials', { ...JSON.parse(snapshot), revision: revision.current });
      revision.current = saved.revision;
      savedSnapshot.current = snapshot;
      if (JSON.stringify(latestState.current) === snapshot) {
        if (migrating.current) {
          try { localStorage.removeItem(key); } catch { /* Veritabanı kaydı başarılı; eski kopya kalabilir. */ }
          migrating.current = false;
        }
        setSaveStatus('saved');
      }
      setSaveError('');
    } catch (error) {
      setSaveStatus('error');
      setSaveError(error.message);
      return;
    } finally {
      saving.current = false;
    }
    if (JSON.stringify(latestState.current) !== savedSnapshot.current) flush.current();
  };

  useEffect(() => { if (state) flush.current(); }, [state]);

  useEffect(() => {
    if (saveStatus !== 'saved') return undefined;
    const timeout = window.setTimeout(() => setSaveStatus('idle'), 3000);
    return () => window.clearTimeout(timeout);
  }, [saveStatus]);

  useEffect(() => {
    if (saveStatus !== 'pending' && saveStatus !== 'error') return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveStatus]);

  const rows = useMemo(() => sortTrialsByDate((state?.rows ?? []).map((trial) => {
    const result = calculateTrial(trial, obp);
    return { ...trial, ...result, placement: obpInvalid ? null : result.placement };
  })), [state?.rows, obp, obpInvalid]);
  const setField = (id, field, value) => setState((current) => ({ ...current,
    rows: current.rows.map((row) => row.id === id ? { ...row, [field]: value } : row),
  }));

  actions.current = {
    update: setField,
    net: (id, testKey, raw) => {
      if (!/^-?\d*(?:[.,]\d{0,2})?$/.test(raw)) return;
      const test = TESTS.find((item) => item.key === testKey);
      const value = Number(raw.replace(',', '.'));
      if (Number.isFinite(value) && (value < -test.questions / 4 || value > test.questions)) return;
      setState((current) => ({ ...current, rows: current.rows.map((row) => {
        if (row.id !== id) return row;
        return { ...row, testNets: { ...row.testNets, [testKey]: raw } };
      }) }));
    },
    remove: (id) => {
      if (!window.confirm('Bu deneme silinsin mi?')) return;
      setState((current) => ({ ...current, rows: current.rows.filter((row) => row.id !== id) }));
    },
  };

  const changeObp = (value) => {
    if (value !== '' && (!/^\d*(?:[.,]\d{0,5})?$/.test(value)
      || Number(value.replace(',', '.')) > 500)) return;
    setState((current) => ({ ...current, obp: value.replace(',', '.') }));
  };
  const importMissingTrials = () => {
    migrating.current = true;
    setState(current => ({ ...current, rows: [...current.rows, ...legacyMissing] }));
    setLegacyMissing([]);
  };
  if (!state) return <>
    <h2>TYT Deneme Takibi</h2>
    {saveStatus === 'load-error'
      ? <p className="tyt-save-status tyt-save-status--error" role="alert">Denemeler veritabanından yüklenemedi: {saveError} <button className="btn btn-secondary" type="button" onClick={() => setLoadAttempt((n) => n + 1)}>Tekrar dene</button></p>
      : <p role="status">Denemeler veritabanından yükleniyor…</p>}
  </>;
  return <>
    <h2>TYT Deneme Takibi</h2>
    {legacyMissing.length > 0 && <p className="field-error" role="alert">Bu tarayıcıda veritabanında bulunmayan {legacyMissing.length} eski deneme var. <button type="button" className="btn btn-secondary" onClick={importMissingTrials}>Eksik denemeleri veritabanına ekle</button></p>}
    <p className="muted">120 soru · 165 dakika. Matematik, Türkçe, Fen ve Sosyal netlerini girin; TYT toplam neti, puanı ve tahmini sıra anında hesaplanır.</p>
    <div className="tyt-controls card">
      <label className="field"><span className="field-label">Hedef alan</span>
        <select value={state.area} onChange={(event) => setState((current) => ({ ...current, area: event.target.value }))}>
          {AREA_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="field"><span className="field-label">OBP (250–500, isteğe bağlı)</span>
        <input type="text" inputMode="decimal" value={state.obp} onChange={(event) => changeObp(event.target.value)}
          aria-invalid={obpInvalid} placeholder="Örn. 454,47200" />
      </label>
      <button type="button" className="btn btn-primary" onClick={() => setState((current) => ({ ...current, rows: [...current.rows, createTrial()] }))}>
        + Deneme ekle
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => flush.current(true)}
        disabled={saveStatus === 'pending'}>Kaydet</button>
    </div>
    {obpInvalid && <p className="field-error" role="alert">OBP 250 ile 500 arasında olmalı. Geçerli değer girilene kadar yerleştirme puanı gösterilmez.</p>}
    {saveStatus === 'error'
      ? <p className="tyt-save-status tyt-save-status--error" role="alert">Kaydedilemedi: {saveError} <button className="btn btn-secondary" type="button" onClick={() => flush.current()}>Tekrar dene</button></p>
      : saveStatus === 'saved'
        ? <p className="tyt-save-status tyt-save-status--saved" role="status">✓ Kayıt edildi. Denemeleriniz veritabanında saklanıyor.</p>
        : <p className="tyt-save-status" role="status">{saveStatus === 'idle' ? 'Kaydet düğmesiyle denemelerinizi veritabanında saklayabilirsiniz.' : 'Veritabanına kaydediliyor…'}</p>}
    <p className="muted small">Alan seçimi TYT puanını değiştirmez. SAY, SÖZ, EA ve DİL puanı ile sırası için AYT/YDT sonuçları gerekir; burada gösterilen sıra yalnız TYT sırasıdır. Net = doğru − yanlış / 4.</p>
    <div className="card tracking-scroll worksheet-frame tyt-grid-frame">
      <DataGrid mode="worksheet" scrollable columnSorting className="tyt-grid" rowData={rows} columnDefs={columns}
        gridOptions={{ getRowId: ({ data }) => data.id, context: { actions }, rowHeight: 56, headerHeight: 58 }} />
    </div>
    {rows.length === 0 && <p className="muted">Henüz deneme yok. “Deneme ekle” ile başlayın.</p>}
    <TytTrialCharts rows={rows} />
    <p className="muted small">OBP girilirse yaklaşık yerleştirme puanına OBP × 0,12 eklenir. Sıra, ÖSYM’nin 2026 TYT sınav puanı yığınsal dağılımındaki aralıklar arasında doğrusal tahmindir; OBP sıralaması değildir. Gerçek ÖSYM puanı ve sırası sınavın ortalaması, standart sapması ve yılına göre farklı olabilir.</p>
    <p className="muted small">Kaynak: <a href="https://dokuman.osym.gov.tr/pdfdokuman/2026/YKS/SB/sayisal_ykdd21072026.pdf" target="_blank" rel="noopener noreferrer">ÖSYM 2026-YKS sayısal bilgiler</a> · <a href="https://www.osym.gov.tr/2026yuksekogretim-kurumlari-sinavi-yks-kilavuzu" target="_blank" rel="noopener noreferrer">2026-YKS kılavuzu</a></p>
  </>;
}

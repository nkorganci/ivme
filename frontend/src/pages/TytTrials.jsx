import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import DataGrid from '../components/DataGrid.jsx';
import TytTrialCharts from '../components/TytTrialCharts.jsx';
import { usePageTitle } from '../hooks.js';
import { TESTS, TYT_COLUMNS, calculateTrial, createTrial, sortTrialsByDate, tytNetInput, updateTytNet, validTrial } from '../tytTrials.js';

const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
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
  return <input className="tyt-cell-input tyt-number-input" type="text" inputMode="decimal"
    value={tytNetInput(data, test)} aria-label={`${data.name || data.date || 'Deneme'} ${test.label} net`}
    onChange={(event) => context.actions.current.net(data.id, test.key, event.target.value)} />;
}

const columns = [
  { field: 'date', headerName: 'Tarih', pinned: 'left', width: 155, minWidth: 155, sort: 'asc', autoHeaderHeight: false,
    cellRenderer: TrialInput, cellRendererParams: { field: 'date', type: 'date', label: 'tarih' } },
  ...TYT_COLUMNS.map((test) => ({ colId: `${test.key}.net`, headerName: `${test.label}\n${test.questions} soru`,
    width: 140, minWidth: 125, autoHeaderHeight: false, cellDataType: 'number', valueGetter: ({ data }) => {
      const raw = data ? tytNetInput(data, test) : '';
      const value = Number(String(raw).replace(',', '.'));
      return raw === '' || !Number.isFinite(value) ? null : value;
    },
    cellRenderer: TestNetCell, cellRendererParams: { test } })),
  { field: 'net', headerName: 'TYT\nToplam Net', width: 155, minWidth: 140, autoHeaderHeight: false,
    valueFormatter: ({ value }) => number.format(value ?? 0) },
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
    return { ...trial, ...calculateTrial(trial) };
  })), [state?.rows]);
  const setField = (id, field, value) => setState((current) => ({ ...current,
    rows: current.rows.map((row) => row.id === id ? { ...row, [field]: value } : row),
  }));

  actions.current = {
    update: setField,
    net: (id, testKey, raw) => {
      setState((current) => ({ ...current, rows: current.rows.map((row) => {
        if (row.id !== id) return row;
        return updateTytNet(row, testKey, raw);
      }) }));
    },
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
    <p className="muted">120 soru · 165 dakika. Her dersin netini girin; TYT toplam neti anında hesaplanır.</p>
    <div className="tyt-controls card">
      <label className="field"><span className="field-label">Hedef alan</span>
        <select value={state.area} onChange={(event) => setState((current) => ({ ...current, area: event.target.value }))}>
          {AREA_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <button type="button" className="btn btn-primary" onClick={() => setState((current) => ({ ...current, rows: [...current.rows, createTrial()] }))}>
        + Deneme ekle
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => flush.current(true)}
        disabled={saveStatus === 'pending'}>Kaydet</button>
    </div>
    {saveStatus === 'error'
      ? <p className="tyt-save-status tyt-save-status--error" role="alert">Kaydedilemedi: {saveError} <button className="btn btn-secondary" type="button" onClick={() => flush.current()}>Tekrar dene</button></p>
      : saveStatus === 'saved'
        ? <p className="tyt-save-status tyt-save-status--saved" role="status">✓ Kayıt edildi. Denemeleriniz veritabanında saklanıyor.</p>
        : <p className="tyt-save-status" role="status">{saveStatus === 'idle' ? 'Kaydet düğmesiyle denemelerinizi veritabanında saklayabilirsiniz.' : 'Veritabanına kaydediliyor…'}</p>}
    <p className="muted small">TYT dersleri bütün alanlar için ortaktır. Matematik geometriyi de içerir. Net = doğru − yanlış / 4. Din Kültürü dersinden muafsanız aynı sütuna ek felsefe netini girin.</p>
    {rows.some((row) => ['science', 'social'].some((key) => row.testNets?.[key] !== undefined && row.testNets[key] !== '')) &&
      <div className="card" role="status">
        <p>Eski toplu netler korunuyor. İlgili grubun bütün ders netlerini doldurduğunuzda toplam, ders netlerinden hesaplanır; sonucu olmayan derse 0 girin.</p>
        <ul>{rows.flatMap((row) => TESTS.filter(({ key }) => key === 'science' || key === 'social')
          .filter(({ key }) => row.testNets?.[key] !== undefined && row.testNets[key] !== '')
          .map((test) => <li key={`${row.id}-${test.key}`}>{row.name || row.date || 'Tarihsiz deneme'} · {test.label}: {row.testNets[test.key]} net</li>))}</ul>
      </div>}
    <div className="card tracking-scroll worksheet-frame tyt-grid-frame">
      <DataGrid mode="worksheet" scrollable columnSorting className="tyt-grid" rowData={rows} columnDefs={columns}
        gridOptions={{ getRowId: ({ data }) => data.id, context: { actions }, rowHeight: 56, headerHeight: 80 }} />
    </div>
    {rows.length === 0 && <p className="muted">Henüz deneme yok. “Deneme ekle” ile başlayın.</p>}
    <TytTrialCharts rows={rows} />
    <p className="muted small">Dersler ve soru sayıları: <a href="https://www.osym.gov.tr/2026yuksekogretim-kurumlari-sinavi-yks-kilavuzu" target="_blank" rel="noopener noreferrer">ÖSYM 2026-YKS kılavuzu</a></p>
  </>;
}

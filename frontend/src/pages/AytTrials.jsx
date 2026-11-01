import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import DataGrid from '../components/DataGrid.jsx';
import AytTrialCharts from '../components/AytTrialCharts.jsx';
import { usePageTitle } from '../hooks.js';
import { AYT_AREAS, AYT_TESTS, calculateAytTrial, createAytTrial, validAytTrial } from '../aytTrials.js';
import { sortTrialsByDate } from '../tytTrials.js';

const number = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function DateInput({ data, context }) {
  return <input className="tyt-cell-input" type="date" aria-label="Deneme tarihi" value={data.date}
    onChange={(event) => context.actions.current.date(data.id, event.target.value)} />;
}

function NetInput({ data, test, context }) {
  return <input className="tyt-cell-input tyt-number-input" type="text" inputMode="decimal"
    aria-label={`${data.date || 'Deneme'} ${test.label} net`} value={data.testNets?.[test.key] ?? ''}
    onChange={(event) => context.actions.current.net(data.id, test.key, event.target.value)} />;
}

export default function AytTrials() {
  const { user } = useAuth();
  return <AytTrialsForUser key={user.id} />;
}

function AytTrialsForUser() {
  usePageTitle('AYT Deneme Takibi');
  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveError, setSaveError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const revision = useRef(0);
  const savedSnapshot = useRef(null);
  const latestState = useRef(state);
  const saving = useRef(false);
  const actions = useRef({});
  const flush = useRef(null);
  latestState.current = state;

  useEffect(() => {
    let active = true;
    setLoadError('');
    api.get('/api/ayt-trials').then((remote) => {
      if (!active) return;
      const loaded = { area: AYT_AREAS[remote.area] ? remote.area : 'SAY', rows: remote.rows.filter(validAytTrial) };
      revision.current = remote.revision;
      savedSnapshot.current = JSON.stringify(loaded);
      setState(loaded);
    }).catch((error) => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, [loadAttempt]);

  flush.current = async (force = false) => {
    if (saving.current || !latestState.current) return;
    const snapshot = JSON.stringify(latestState.current);
    if (!force && snapshot === savedSnapshot.current) return;
    saving.current = true;
    setSaveStatus('pending');
    try {
      const saved = await api.put('/api/ayt-trials', { ...JSON.parse(snapshot), revision: revision.current });
      revision.current = saved.revision;
      savedSnapshot.current = snapshot;
      if (JSON.stringify(latestState.current) === snapshot) setSaveStatus('saved');
      setSaveError('');
    } catch (error) {
      setSaveStatus('error');
      setSaveError(error.message);
      return;
    } finally { saving.current = false; }
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

  const area = state?.area ?? 'SAY';
  const tests = Object.keys(AYT_AREAS[area].weights).map((key) => AYT_TESTS[key]);
  const rows = useMemo(() => sortTrialsByDate((state?.rows ?? []).map((row) => ({
    ...row, ...calculateAytTrial(row, area, null),
  }))), [state?.rows, area]);
  const columns = useMemo(() => [
    { field: 'date', headerName: 'Tarih', pinned: 'left', width: 155, minWidth: 155, sort: 'asc', autoHeaderHeight: false, cellRenderer: DateInput },
    ...tests.map((test) => ({ colId: `${test.key}.net`, headerName: `${test.label}\n${test.questions} soru`,
      // 3 → 3, sayısal olarak aynı olsa da kontrollü girdinin metni yenilenmeli.
      equals: () => false,
      width: 155, minWidth: 140, autoHeaderHeight: false, cellDataType: 'number', valueGetter: ({ data }) =>
        data?.testNets?.[test.key] === undefined || data.testNets[test.key] === '' ? null : data.nets[test.key],
      cellRenderer: NetInput, cellRendererParams: { test } })),
    { field: 'net', headerName: 'Alan\nToplam Net', width: 140, minWidth: 140, autoHeaderHeight: false, valueFormatter: ({ value }) => number.format(value ?? 0) },
  ], [area]);

  actions.current = {
    date: (id, value) => setState((current) => ({ ...current, rows: current.rows.map((row) => row.id === id ? { ...row, date: value } : row) })),
    net: (id, key, raw) => {
      if (!/^-?\d*(?:[.,]\d{0,2})?$/.test(raw)) return;
      const value = Number(raw.replace(',', '.'));
      const test = AYT_TESTS[key];
      if (Number.isFinite(value) && (value < -test.questions / 4 || value > test.questions)) return;
      setState((current) => ({ ...current, rows: current.rows.map((row) => row.id === id
        ? { ...row, testNets: { ...row.testNets, [key]: raw } } : row) }));
    },
  };

  if (!state) return <>
    <h2>AYT Deneme Takibi</h2>
    {loadError
      ? <p className="tyt-save-status tyt-save-status--error" role="alert">Denemeler yüklenemedi: {loadError} <button className="btn btn-secondary" type="button" onClick={() => setLoadAttempt((n) => n + 1)}>Tekrar dene</button></p>
      : <p role="status">Denemeler yükleniyor…</p>}
  </>;
  return <>
    <h2>AYT Deneme Takibi</h2>
    <p className="muted">Hedef alanı seçin ve ders netlerini girin. Dil alanı için YDT neti kullanılır.</p>
    <div className="tyt-controls card">
      <label className="field"><span className="field-label">Hedef alan</span>
        <select value={area} onChange={(event) => setState((current) => ({ ...current, area: event.target.value }))}>
          {Object.entries(AYT_AREAS).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}
        </select>
      </label>
      <button type="button" className="btn btn-primary" onClick={() => setState((current) => ({ ...current, rows: [...current.rows, createAytTrial()] }))}>+ Deneme ekle</button>
      <button type="button" className="btn btn-secondary" onClick={() => flush.current(true)} disabled={saveStatus === 'pending'}>Kaydet</button>
    </div>
    <p className="muted small">{area === 'DIL' ? 'YDT 80 sorudan oluşur.' : 'Seçilen alanın dersleri toplam 80 sorudur. Matematik geometriyi de içerir.'} Net = doğru − yanlış / 4.</p>
    {area === 'SOZ' && <p className="muted small">Felsefe Grubu; felsefe, psikoloji, sosyoloji ve mantık derslerini kapsar. Din Kültürü dersinden muafsanız aynı sütuna ek felsefe grubu netini girin.</p>}
    {saveStatus === 'error'
      ? <p className="tyt-save-status tyt-save-status--error" role="alert">Kaydedilemedi: {saveError} <button className="btn btn-secondary" type="button" onClick={() => flush.current()}>Tekrar dene</button></p>
      : <p className="tyt-save-status" role="status">{saveStatus === 'saved' ? '✓ Kayıt edildi.' : saveStatus === 'pending' ? 'Veritabanına kaydediliyor…' : 'Denemeleriniz otomatik kaydedilir.'}</p>}
    <div className="card tracking-scroll worksheet-frame tyt-grid-frame">
      <DataGrid mode="worksheet" scrollable columnSorting className="tyt-grid" rowData={rows} columnDefs={columns}
        gridOptions={{ getRowId: ({ data }) => data.id, context: { actions }, rowHeight: 56, headerHeight: 80 }} />
    </div>
    {rows.length === 0 && <p className="muted">Henüz deneme yok. “Deneme ekle” ile başlayın.</p>}
    <AytTrialCharts rows={rows} tests={tests} />
    <p className="muted small">Dersler ve soru sayıları: <a href="https://www.osym.gov.tr/2026yuksekogretim-kurumlari-sinavi-yks-kilavuzu" target="_blank" rel="noopener noreferrer">ÖSYM 2026-YKS kılavuzu</a></p>
  </>;
}

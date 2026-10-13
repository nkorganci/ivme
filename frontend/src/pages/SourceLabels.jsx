import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../hooks.js';

const BASE = '/kaynakli-etiketler';
const PAGE_SIZE = 50;
const needsReview = (value) => ['true', 'yes', 'evet', '1'].includes(String(value).toLowerCase());
const confidenceLabel = (value) => ({ high: 'Yüksek', medium: 'Orta', low: 'Düşük' }[value]
  ?? `${Number(value).toLocaleString('tr-TR')} · eşleme puanı`);

export default function SourceLabels() {
  usePageTitle('Kaynaklı Soru Etiketleri');
  const [manifest, setManifest] = useState(null);
  const [params, setParams] = useSearchParams();
  const requestedId = params.get('ders') || 'tyt-turkce';
  const selectedId = manifest && !manifest.groups.some((group) => group.id === requestedId) ? 'tyt-turkce' : requestedId;
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [bank, setBank] = useState('');
  const [confidence, setConfidence] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setSearch(''); setBank(''); setConfidence(''); setReviewOnly(false); setPage(0);
  }, [selectedId]);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch(`${BASE}/manifest.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Etiket dizini yüklenemedi.');
        return response.json();
      })
      .then(setManifest)
      .catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (!manifest?.groups.some((group) => group.id === selectedId)) return undefined;
    const controller = new AbortController();
    setRows(null);
    setError('');
    fetch(`${BASE}/${selectedId}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Seçilen dersin etiketleri yüklenemedi.');
        return response.json();
      })
      .then(setRows)
      .catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message); });
    return () => controller.abort();
  }, [manifest, selectedId]);

  const selected = manifest?.groups.find((group) => group.id === selectedId);
  const confidenceOptions = useMemo(() => [...new Set((rows ?? []).map((row) => row.confidence))].sort(), [rows]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('tr-TR');
    return (rows ?? []).filter((row) => (!bank || row.bank === bank)
      && (!confidence || row.confidence === confidence)
      && (!reviewOnly || needsReview(row.review_required))
      && (!term || [row.code, row.label, row.source_topic, row.evidence_ref, row.source_title, row.source_heading, row.discipline]
        .some((value) => String(value ?? '').toLocaleLowerCase('tr-TR').includes(term))));
  }, [rows, search, bank, confidence, reviewOnly]);
  const maxPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const visible = filtered.slice(Math.min(page, maxPage) * PAGE_SIZE, (Math.min(page, maxPage) + 1) * PAGE_SIZE);
  const changeGroup = (value) => {
    setParams({ ders: value });
    setSearch(''); setBank(''); setConfidence(''); setReviewOnly(false); setPage(0);
  };

  return <div className="source-labels-page">
    <div className="page-head"><h1>Kaynaklı Soru Etiketleri</h1></div>
    <p className="muted lead">Çıkmış ve OGM soruları, kaynak başlığı ve soru metninden elde edilen kanıta göre etiketlendi. Bunlar kaynaklı taslak etiketlerdir; hiçbirinin branş öğretmeni onayı tamamlanmış sayılmaz. “Ek inceleme” işareti kaynak kanıtı zayıf veya çelişkili kayıtları öne çıkarır.</p>
    {error && <p className="alert alert-error" role="alert">{error}{' '}
      <button type="button" className="btn btn-secondary" onClick={() => setAttempt((value) => value + 1)}>Tekrar dene</button>
    </p>}
    {!manifest && !error && <p role="status">Etiket dizini yükleniyor…</p>}
    {manifest && <>
      <p className="muted small">{manifest.total.toLocaleString('tr-TR')} kaynak sorusu · {manifest.unlabelled} boş etiket · her kayıt için kanıt ve inceleme durumu</p>
      <p className="muted small">Güven ve sayısal eşleme puanları ölçülmüş doğruluk oranı değildir. “Ek inceleme” işareti bulunmasa da bütün etiketler öğretmen onayı bekler.</p>
      <div className="card source-labels-toolbar">
        <label>Ders
          <select value={selectedId} onChange={(event) => changeGroup(event.target.value)}>
            {manifest.groups.map((group) => <option key={group.id} value={group.id}>{group.exam} · {group.subject} ({group.count.toLocaleString('tr-TR')})</option>)}
          </select>
        </label>
        <label>Soru kodu veya etiket ara
          <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Örn. paragraf, TYT-0001" />
        </label>
        <label>Koleksiyon
          <select value={bank} onChange={(event) => { setBank(event.target.value); setPage(0); }}>
            <option value="">Tümü</option><option value="CIKMIS">Çıkmış</option><option value="OGM">OGM</option>
          </select>
        </label>
        <label>Güven
          <select value={confidence} onChange={(event) => { setConfidence(event.target.value); setPage(0); }}>
            <option value="">Tümü</option>
            {confidenceOptions.map((value) => <option key={value} value={value}>{confidenceLabel(value)}</option>)}
          </select>
        </label>
        <label className="source-labels-check"><input type="checkbox" checked={reviewOnly}
          onChange={(event) => { setReviewOnly(event.target.checked); setPage(0); }} /> Yalnız ek inceleme gerekenler</label>
      </div>
      {selected && <p className="muted small">{selected.exam} · {selected.subject}: {selected.count.toLocaleString('tr-TR')} kayıt, {selected.needsReview.toLocaleString('tr-TR')} ek inceleme gerekli. Gösterilen etiketler canlı soru verisini değiştirmez.</p>}
      {!rows && !error && <p role="status">Ders etiketleri yükleniyor…</p>}
      {rows && <>
        <p role="status"><strong>{filtered.length.toLocaleString('tr-TR')}</strong> soru bulundu.</p>
        <ul className="source-labels-list">
          {visible.map((row) => <li className="card" key={`${row.bank}:${row.code}`}>
            <div className="source-labels-row-head"><Link to={`/soru/${encodeURIComponent(row.code)}?bank=${row.bank}`}>{row.code}</Link>
              <span>{row.bank === 'CIKMIS' ? 'Çıkmış' : 'OGM'} · {confidenceLabel(row.confidence)}</span></div>
            <strong>{row.label}</strong>
            <p className="muted small">Kaynak konu: {row.source_topic} · Kanıt: {row.evidence_type}{row.evidence_ref ? ` · ${row.evidence_ref}` : ''}</p>
            {row.source_heading && row.source_heading !== row.source_topic && <p className="muted small">PDF bölümü: {row.source_heading}{row.source_page ? ` · s. ${row.source_page}` : ''}</p>}
            {row.source_title && <p className="muted small">Kaynak başlığı: {row.source_title}</p>}
            {row.discipline && <p className="muted small">Felsefe Grubu dalı: {row.discipline}</p>}
            {row.review_reason && <details><summary>İnceleme kaydı</summary><p className="muted small">{row.review_reason}</p></details>}
            {needsReview(row.source_subject_conflict) && <p className="source-labels-cancelled">
              Kaynaktaki ders ile soru içeriği uyuşmuyor.{row.suggested_subject && ` Olası ders: ${row.suggested_subject}.`} Branş öğretmeni incelemesi gerekli.
            </p>}
            {row.official_status === 'cancelled' && <p className="source-labels-cancelled">
              Bu soru ÖSYM tarafından iptal edildi.{row.official_notice_url && <> <a href={row.official_notice_url} target="_blank" rel="noreferrer">Resmî duyuru</a></>}
            </p>}
            {needsReview(row.review_required) && <span className="source-labels-review">Ek konu incelemesi gerekli</span>}
          </li>)}
        </ul>
        {filtered.length > PAGE_SIZE && <nav className="source-labels-pages" aria-label="Soru sayfaları">
          <button type="button" className="btn btn-secondary" disabled={page <= 0} onClick={() => setPage((value) => value - 1)}>Önceki</button>
          <span>{Math.min(page, maxPage) + 1} / {maxPage + 1}</span>
          <button type="button" className="btn btn-secondary" disabled={page >= maxPage} onClick={() => setPage((value) => value + 1)}>Sonraki</button>
        </nav>}
      </>}
    </>}
  </div>;
}

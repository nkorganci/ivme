import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAsync, usePageParam, usePageTitle } from '../hooks.js';
import DataGrid from '../components/DataGrid.jsx';
import Pager from '../components/Pager.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';
import { formatNumber } from '../format.js';

const KIND = {
  mebi_summary: 'MEBİ konu özeti',
  video_notes: 'Konu anlatımı',
  topic_summary: 'Konu özeti',
  presentation: 'Ders anlatım sunusu',
};
const SUBJECT = {
  biyoloji: 'Biyoloji', cografya: 'Coğrafya', din: 'Din Kültürü',
  edebiyat: 'Türk Dili ve Edebiyatı', felsefe: 'Felsefe', fizik: 'Fizik',
  kimya: 'Kimya', matematik: 'Matematik', tarih: 'Tarih', turkce: 'Türkçe',
};
const EXAMS = [
  { value: '', label: 'Tümü' },
  { value: 'TYT', label: 'TYT' },
  { value: 'AYT', label: 'AYT' },
  { value: 'TYT-AYT', label: 'Ortak' },
];
const matchesExam = (facetExam, selected) => !selected || facetExam === selected
  || (facetExam === 'TYT-AYT' && (selected === 'TYT' || selected === 'AYT'));
const countFacets = (facets, predicate) => facets.reduce((count, facet) =>
  count + (predicate(facet) ? facet.count : 0), 0);

export default function TopicPdfs() {
  usePageTitle('Konu anlatımları');
  const [params, setParams] = useSearchParams();
  const [page, setPage] = usePageParam();
  const filter = {
    exam: params.get('exam') || '',
    grade: params.get('grade') || '',
    subject: params.get('subject') || '',
    kind: params.get('kind') || '',
    q: params.get('q') || '',
  };
  const [draft, setDraft] = useState(filter.q);
  useEffect(() => setDraft(filter.q), [filter.q]);
  const filters = useAsync(() => api.get('/api/topic-pdfs/filters'), []);
  const { data, loading, error, retry } = useAsync(
    () => api.get('/api/topic-pdfs' + qs({ ...filter, page, size: 40 })),
    [filter.exam, filter.grade, filter.subject, filter.kind, filter.q, page],
  );
  const setFilter = (changes) => {
    const next = { ...filter, ...changes };
    setParams(new URLSearchParams(qs(next).slice(1)));
  };
  const facets = filters.data?.facets ?? [];
  const scoped = facets.filter((facet) => matchesExam(facet.exam, filter.exam)
    && (!filter.grade || String(facet.grade) === filter.grade));
  const subjects = (filters.data?.subjects ?? []).map((value) => ({
    value, label: SUBJECT[value] ?? value,
    count: countFacets(scoped, (facet) => facet.subject === value
      && (!filter.kind || facet.kind === filter.kind)),
  })).filter((item) => item.count > 0).sort((a, b) => a.label.localeCompare(b.label, 'tr'));
  const kinds = (filters.data?.kinds ?? []).map((value) => ({
    value, label: KIND[value] ?? value,
    count: countFacets(scoped, (facet) => (!filter.subject || facet.subject === filter.subject)
      && facet.kind === value),
  })).filter((item) => item.count > 0);
  const context = [filter.exam === 'TYT-AYT' ? 'Ortak TYT / AYT' : filter.exam || 'Tüm sınavlar',
    filter.grade ? `${filter.grade}. sınıf` : 'Tüm sınıflar',
    filter.subject ? SUBJECT[filter.subject] ?? filter.subject : 'Tüm dersler'].join(' · ');
  const returnQuery = params.toString();
  const columns = useMemo(() => [
    { field: 'title', headerName: 'Konu / PDF başlığı', minWidth: 210, flex: 2.5,
      cellRenderer: ({ data: item }) => item && <strong className="topic-pdf-title" title={item.title}>{item.title}</strong> },
    { field: 'subject', headerName: 'Ders', minWidth: 110, flex: 1,
      valueFormatter: ({ value }) => SUBJECT[value] ?? value ?? '' },
    { field: 'exam', headerName: 'Sınav', width: 75, minWidth: 75, flex: 0,
      valueFormatter: ({ value }) => value === 'TYT-AYT' ? 'Ortak' : value },
    { field: 'grade', headerName: 'Sınıf', width: 80, minWidth: 80, flex: 0,
      valueFormatter: ({ value }) => value ? `${value}. sınıf` : '—' },
    { field: 'kind', headerName: 'Kaynak türü', minWidth: 135, flex: 1.2,
      valueFormatter: ({ value }) => KIND[value] ?? value ?? '' },
    { field: 'pageCount', headerName: 'Sayfa', width: 70, minWidth: 70, flex: 0,
      valueFormatter: ({ value }) => value ?? '—' },
    { colId: 'open', headerName: 'PDF', width: 105, minWidth: 105, flex: 0,
      cellRenderer: ({ data: item }) => item?.status === 'available'
        ? <Link className="btn btn-secondary btn-sm" to={`/konu-anlatimlari/${item.id}${returnQuery ? `?${returnQuery}` : ''}`}>PDF'yi aç</Link>
        : <span className="muted small">Kullanılamıyor</span> },
  ], [returnQuery]);

  return <div className="topic-pdf-page">
    <div className="page-head">
      <div>
        <h1>Konu anlatımları</h1>
        <p className="muted">Sınav, sınıf ve derse göre kaynakları bul; PDF'yi doğrudan aç.</p>
      </div>
    </div>

    <div className="topic-pdf-layout">
      <aside className="card topic-pdf-sidebar" aria-label="Konu anlatımı filtreleri">
        <div className="topic-pdf-sidebar-head">
          <h2>Kategoriler</h2>
          <button type="button" className="topic-pdf-clear" onClick={() => { setDraft(''); setParams({}); }}>Temizle</button>
        </div>
        <section className="topic-pdf-filter-group" aria-label="Sınav filtresi">
          <h3>Sınav</h3>
          <div className="topic-pdf-exams">
            {EXAMS.map(({ value, label }) => <button key={value} type="button"
              className={`topic-pdf-choice${filter.exam === value ? ' selected' : ''}`}
              aria-pressed={filter.exam === value}
              onClick={() => setFilter({ exam: value, subject: '', kind: '' })}>{label}</button>)}
          </div>
        </section>
        <section className="topic-pdf-filter-group" aria-label="Sınıf filtresi">
          <h3>Sınıf</h3>
          <div className="topic-pdf-grades">
            <button type="button" className={`topic-pdf-choice${!filter.grade ? ' selected' : ''}`}
              aria-pressed={!filter.grade} onClick={() => setFilter({ grade: '', subject: '', kind: '' })}>Tümü</button>
            {(filters.data?.grades ?? [9, 10, 11, 12]).map((grade) => <button key={grade} type="button"
              className={`topic-pdf-choice${filter.grade === String(grade) ? ' selected' : ''}`}
              aria-pressed={filter.grade === String(grade)}
              onClick={() => setFilter({ grade: String(grade), subject: '', kind: '' })}>{grade}</button>)}
          </div>
        </section>
        <section className="topic-pdf-filter-group" aria-label="Ders filtresi">
          <h3>Dersler</h3>
          {filters.loading && <p className="muted small">Dersler yükleniyor…</p>}
          <div className="topic-pdf-subjects">
            <button type="button" className={`topic-pdf-subject${!filter.subject ? ' selected' : ''}`}
              aria-pressed={!filter.subject} onClick={() => setFilter({ subject: '' })}>
              <span>Tüm dersler</span><span>{formatNumber(countFacets(scoped, (facet) =>
                !filter.kind || facet.kind === filter.kind))}</span>
            </button>
            {subjects.map((item) => <button key={item.value} type="button"
              className={`topic-pdf-subject${filter.subject === item.value ? ' selected' : ''}`}
              aria-pressed={filter.subject === item.value}
              onClick={() => setFilter({ subject: item.value })}>
              <span>{item.label}</span><span>{formatNumber(item.count)}</span>
            </button>)}
          </div>
        </section>
        <section className="topic-pdf-filter-group" aria-label="Kaynak türü filtresi">
          <h3>Kaynak türü</h3>
          <div className="topic-pdf-subjects">
            <button type="button" className={`topic-pdf-subject${!filter.kind ? ' selected' : ''}`}
              aria-pressed={!filter.kind} onClick={() => setFilter({ kind: '' })}>
              <span>Tüm türler</span>
            </button>
            {kinds.map((item) => <button key={item.value} type="button"
              className={`topic-pdf-subject${filter.kind === item.value ? ' selected' : ''}`}
              aria-pressed={filter.kind === item.value} onClick={() => setFilter({ kind: item.value })}>
              <span>{item.label}</span><span>{formatNumber(item.count)}</span>
            </button>)}
          </div>
        </section>
        {filters.error && <p className="muted small" role="status">Kategori seçenekleri yüklenemedi.</p>}
      </aside>

      <section className="topic-pdf-results" aria-label="Konu anlatımı PDF listesi">
        <div className="card topic-pdf-results-head">
          <div className="topic-pdf-results-title">
            <div><h2>PDF kaynakları</h2><p className="muted small">{context}</p></div>
            {data && <strong>{formatNumber(data.totalElements)} kaynak</strong>}
          </div>
          <form className="topic-pdf-search" onSubmit={(event) => { event.preventDefault(); setFilter({ q: draft.trim() }); }}>
            <label className="sr-only" htmlFor="topic-pdf-search">Konu veya PDF başlığı ara</label>
            <input id="topic-pdf-search" type="search" value={draft} maxLength={100}
              placeholder="Konu veya PDF başlığı ara" onChange={(event) => setDraft(event.target.value)} />
            <button className="btn btn-primary" type="submit">Ara</button>
          </form>
        </div>
        {loading && <Loading text="Konu anlatımları yükleniyor…" />}
        {error && <ErrorBox error={error} onRetry={retry} />}
        {data && data.content.length === 0 && <Empty title="Bu filtreye uygun PDF bulunamadı.">
          <p>Başka bir sınıf, ders veya arama sözcüğü seç.</p>
        </Empty>}
        {data && data.content.length > 0 && <div className="card topic-pdf-grid">
          <DataGrid mode="worksheet" rowData={data.content} columnDefs={columns}
            gridOptions={{ getRowId: ({ data: item }) => String(item.id) }} />
        </div>}
        {data && <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />}
      </section>
    </div>
  </div>;
}

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAsync, usePageParam, usePageTitle } from '../hooks.js';
import { Field } from '../components/Field.jsx';
import Pager from '../components/Pager.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';
import { formatNumber } from '../format.js';

const KIND = {
  mebi_summary: 'MEBİ konu özeti',
  video_notes: 'Konu anlatımı',
  topic_summary: 'Konu özeti',
  presentation: 'Ders anlatım sunusu',
};

export default function TopicPdfs() {
  usePageTitle('Konu anlatımları');
  const [params, setParams] = useSearchParams();
  const [page, setPage] = usePageParam();
  const filter = {
    exam: params.get('exam') || '',
    subject: params.get('subject') || '',
    kind: params.get('kind') || '',
    q: params.get('q') || '',
  };
  const [draft, setDraft] = useState(filter.q);
  useEffect(() => setDraft(filter.q), [filter.q]);
  const filters = useAsync(() => api.get('/api/topic-pdfs/filters'), []);
  const { data, loading, error, retry } = useAsync(
    () => api.get('/api/topic-pdfs' + qs({ ...filter, page, size: 20 })),
    [filter.exam, filter.subject, filter.kind, filter.q, page],
  );
  const setFilter = (changes) => {
    const next = { ...filter, ...changes };
    setParams(new URLSearchParams(qs(next).slice(1)));
  };

  return <>
    <div className="page-head">
      <div>
        <h1>Konu anlatımları</h1>
        <p className="muted">Özgün OGM PDF'lerini sınav, ders ve kaynak türüne göre bul.</p>
      </div>
      {data && <span className="muted">{formatNumber(data.totalElements)} kaynak</span>}
    </div>
    <section className="card">
      <form className="topic-pdf-filters" onSubmit={(event) => { event.preventDefault(); setFilter({ q: draft.trim() }); }}>
        <Field as="select" label="Sınav" value={filter.exam} onChange={(event) => setFilter({ exam: event.target.value })}>
          <option value="">Tümü</option>
          {filters.data?.exams.map((value) => <option key={value} value={value}>{value}</option>)}
        </Field>
        <Field as="select" label="Ders" value={filter.subject} onChange={(event) => setFilter({ subject: event.target.value })}>
          <option value="">Tümü</option>
          {filters.data?.subjects.map((value) => <option key={value} value={value}>{value}</option>)}
        </Field>
        <Field as="select" label="Kaynak türü" value={filter.kind} onChange={(event) => setFilter({ kind: event.target.value })}>
          <option value="">Tümü</option>
          {filters.data?.kinds.map((value) => <option key={value} value={value}>{KIND[value] || value}</option>)}
        </Field>
        <Field label="Konu veya başlık ara" value={draft} maxLength={100} onChange={(event) => setDraft(event.target.value)} />
        <div className="topic-pdf-actions">
          <button className="btn btn-primary" type="submit">Ara</button>
          <button className="btn btn-secondary" type="button" onClick={() => { setDraft(''); setParams({}); }}>Temizle</button>
        </div>
      </form>
      {filters.error && <p className="muted" role="status">Filtre seçenekleri alınamadı; arama yine kullanılabilir.</p>}
    </section>

    {loading && <Loading text="Konu anlatımları yükleniyor…" />}
    {error && <ErrorBox error={error} onRetry={retry} />}
    {data && data.content.length === 0 && <Empty title="Bu filtreye uygun PDF bulunamadı."><p>Aramayı veya filtreleri değiştirmeyi dene.</p></Empty>}
    {data && data.content.length > 0 && <ul className="topic-pdf-list">
      {data.content.map((item) => <li className="card topic-pdf-item" key={item.id}>
        <div>
          <h2>{item.title}</h2>
          <p className="muted">{item.exam} · {item.subject} · {KIND[item.kind] || item.kind}{item.grade ? ` · ${item.grade}. sınıf` : ''}</p>
          {item.status !== 'available' && <p className="muted small" role="status">{item.status === 'video_only' ? 'Bu kaynak için PDF bulunmuyor.' : 'PDF şu anda kullanılamıyor.'}</p>}
        </div>
        {item.status === 'available' && <Link className="btn btn-secondary" to={`/konu-anlatimlari/${item.id}`}>PDF'yi aç</Link>}
      </li>)}
    </ul>}
    {data && <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />}
  </>;
}

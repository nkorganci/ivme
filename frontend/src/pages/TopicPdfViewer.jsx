import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';
import ResourceContext from '../components/ResourceContext.jsx';
import AnnotatedPdf from '../components/AnnotatedPdf.jsx';

export default function TopicPdfViewer() {
  const { id } = useParams();
  const { search,hash } = useLocation();
  usePageTitle('Konu anlatımı PDF');
  const [page, setPage] = useState(() => Number(/^#page=(\d+)$/.exec(hash)?.[1]) || 1);
  useEffect(() => { setPage(Number(/^#page=(\d+)$/.exec(hash)?.[1]) || 1); }, [hash, id]);
  const { data, loading, error, retry } = useAsync(() => api.get(`/api/topic-pdfs/${encodeURIComponent(id)}`), [id]);
  const shared=useAsync(()=>api.get('/api/learning-resources/item?key='+encodeURIComponent(`pdf:${id}`)),[id]);
  const fileUrl = `/api/learning-resources/pdf/${encodeURIComponent(id)}`;
  const changePage = (next) => { setPage(next); window.history.replaceState(null, '', `${window.location.pathname}${search}#page=${next}`); };
  return <>
    <div className="page-head">
      <div>
        <Link to={`/konu-anlatimlari${search}`}>← Konu anlatımlarına dön</Link>
        <h1>{shared.data?.displayTitle || data?.title || 'Konu anlatımı'}</h1>
        {data && <ResourceContext itemKey={`pdf:${id}`}/>}
        {data && <p className="muted">{data.exam} · {data.subject}{data.pageCount ? ` · ${data.pageCount} sayfa` : ''}</p>}
      </div>
    </div>
    {loading && <Loading text="PDF bilgisi yükleniyor…" />}
    {error && <ErrorBox error={error} onRetry={retry} />}
    {data?.status !== 'available' && data && <Empty title="Bu PDF şu anda açılamıyor."><p>Başka bir konu anlatımı seçebilirsin.</p></Empty>}
    {data?.status === 'available' && <section className="card topic-pdf-viewer">
      {data.verifiedTopic && <div className="topic-pdf-actions">
        <p>Doğrulanmış konu: <strong>{data.verifiedTopic}</strong>. Bu bağlantıda yalnız kaynakları incelenmiş sorular kullanılır.</p>
        <Link className="btn btn-primary" to={`/calisma/yeni?topicPdfId=${data.id}`}>Bu konudan soru çöz</Link>{' '}
        <Link className="btn btn-secondary" to={`/calisma/yeni?mode=sinav&topicPdfId=${data.id}`}>Test oluştur</Link>
      </div>}
      <p className="muted small">Yaz modunda PDF'nin üstüne veya kenarına çizebilirsin. Tıkla modunda sayfayı gezebilirsin; çizimler her sayfa için ayrı kaydedilir.</p>
      <AnnotatedPdf id={id} fileUrl={fileUrl} page={Math.min(Math.max(page, 1), data.pageCount || page)} onPageChange={changePage} />
    </section>}
  </>;
}

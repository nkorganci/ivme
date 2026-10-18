import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';
import ResourceContext from '../components/ResourceContext.jsx';

export default function TopicPdfViewer() {
  const { id } = useParams();
  const { search,hash } = useLocation();
  usePageTitle('Konu anlatımı PDF');
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const update = () => setMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const { data, loading, error, retry } = useAsync(() => api.get(`/api/topic-pdfs/${encodeURIComponent(id)}`), [id]);
  const shared=useAsync(()=>api.get('/api/learning-resources/item?key='+encodeURIComponent(`pdf:${id}`)),[id]);
  const fileUrl = `/api/learning-resources/pdf/${encodeURIComponent(id)}${/^#page=\d+$/.test(hash)?hash:''}`;
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
      <p><a className="btn btn-secondary" href={fileUrl} target="_blank" rel="noreferrer">PDF'yi tam ekranda aç</a></p>
      {!mobile && <iframe title={`${data.title} PDF`} src={fileUrl} />}
      {mobile && <p className="muted small">PDF aynı sitenin güvenli dosya yolunda tam ekranda açılır.</p>}
    </section>}
  </>;
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';

export default function TopicPdfViewer() {
  const { id } = useParams();
  usePageTitle('Konu anlatımı PDF');
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const update = () => setMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const { data, loading, error, retry } = useAsync(() => api.get(`/api/topic-pdfs/${encodeURIComponent(id)}`), [id]);
  const fileUrl = `/api/topic-pdfs/${encodeURIComponent(id)}/file`;
  return <>
    <div className="page-head">
      <div>
        <Link to="/konu-anlatimlari">← Konu anlatımlarına dön</Link>
        <h1>{data?.title || 'Konu anlatımı'}</h1>
        {data && <p className="muted">{data.exam} · {data.subject}{data.pageCount ? ` · ${data.pageCount} sayfa` : ''}</p>}
      </div>
    </div>
    {loading && <Loading text="PDF bilgisi yükleniyor…" />}
    {error && <ErrorBox error={error} onRetry={retry} />}
    {data?.status !== 'available' && data && <Empty title="Bu PDF şu anda açılamıyor."><p>Başka bir konu anlatımı seçebilirsin.</p></Empty>}
    {data?.status === 'available' && <section className="card topic-pdf-viewer">
      {data.verifiedTopic && <div className="topic-pdf-actions">
        <p>Doğrulanmış konu: <strong>{data.verifiedTopic}</strong>. Bu bağlantıda yalnız kaynakları incelenmiş sorular kullanılır.</p>
        <Link className="btn btn-primary" to={`/pratik/yeni?topicPdfId=${data.id}`}>Bu konudan soru çöz</Link>{' '}
        <Link className="btn btn-secondary" to={`/sinav/yeni?topicPdfId=${data.id}`}>Test oluştur</Link>
      </div>}
      <p><a className="btn btn-secondary" href={fileUrl} target="_blank" rel="noreferrer">PDF'yi tam ekranda aç</a></p>
      {!mobile && <iframe title={`${data.title} PDF`} src={fileUrl} />}
      {mobile && <p className="muted small">PDF aynı sitenin güvenli dosya yolunda tam ekranda açılır.</p>}
    </section>}
  </>;
}

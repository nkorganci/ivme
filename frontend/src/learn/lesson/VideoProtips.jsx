import { useEffect, useId, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MathText } from '../math.jsx';
import projection from '../content/video-protips.json';
import './video-protips.css';

const timeLabel = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** Kanıtı olan kısa yollar; öğretmen incelemesi bekleyen durum her kartta görünür. */
export default function VideoProtips({ conceptId, sectionId = null }) {
  const headingId = useId();
  const root = useRef(null);
  const { hash } = useLocation();
  const tips = projection.tips.filter((tip) => tip.conceptId === conceptId && (!sectionId || tip.sectionIds.includes(sectionId)));
  useEffect(() => {
    if (hash === '#video-protips' && root.current) root.current.scrollIntoView({ block: 'start' });
  }, [hash, conceptId, sectionId]);
  if (!tips.length) return null;
  return <section className="lr-video-protips" id="video-protips" aria-labelledby={headingId} ref={root}>
    <header>
      <h2 id={headingId}>Protip · Videodan pratik ipuçları</h2>
      <p>Önce örneği incele; kısa yolu yalnız belirtilen koşullarda kullan.</p>
    </header>
    <div className="lr-video-protips-list">
      {tips.map((tip) => <article className="lr-video-protip" key={tip.id} data-protip-id={tip.id}>
        <span className="lr-video-protip-review">Öğretmen kontrolü bekliyor</span>
        <h3>{tip.title}</h3>
        <p className="lr-video-protip-rule"><MathText text={tip.rule} /></p>
        <p><strong>Ne zaman kullanılır?</strong> <MathText text={tip.condition} /></p>
        <details>
          <summary>Örnek, gerekçe ve karşı örnek</summary>
          <p><strong>Örnek:</strong> <MathText text={tip.example} /></p>
          <p><strong>Neden çalışır?</strong> <MathText text={tip.rationale} /></p>
          <p className="lr-video-protip-counterexample"><strong>Dikkat · karşı örnek:</strong> <MathText text={tip.counterexample} /></p>
        </details>
        <a className="lr-video-protip-source" href={`https://www.youtube.com/watch?v=${tip.source.providerId.slice(8)}&t=${Math.floor(tip.source.startSeconds)}s`} target="_blank" rel="noopener noreferrer">
          Kaynak videoda izle · {timeLabel(tip.source.startSeconds)}–{timeLabel(tip.source.endSeconds)} ↗
        </a>
      </article>)}
    </div>
  </section>;
}

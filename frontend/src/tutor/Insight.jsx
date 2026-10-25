// Kavrayış katmanı: benzetme, usta zihniyeti, soru radarı ve çözüm sonrası "aaa" anı.
import RichText from './RichText.jsx';

/** Kavrayış katmanının çözümden önce açılabilen kısmı: benzetme, usta zihniyeti ve soru radarı. */
export function InsightBlock({ insight }) {
  if (!insight) return null;
  return <div className="tutor-insight">
    <section className="tutor-analogy">
      <p className="tutor-insight-label">Benzetme</p>
      <h4>{insight.analogy.title}</h4>
      <p><RichText text={insight.analogy.text} /></p>
      <p className="muted tutor-analogy-breaks"><strong>Benzetmenin bittiği yer:</strong> <RichText text={insight.analogy.breaks} /></p>
    </section>
    <section className="tutor-mindset">
      <p className="tutor-insight-label">Usta gözüyle ilk 10 saniye</p>
      <p><RichText text={insight.mindset} /></p>
      {insight.targetSeconds > 0 && <p className="muted">Kalıbı tanıyan biri bu soruyu yaklaşık {insight.targetSeconds} saniyede çözer.</p>}
    </section>
    {(insight.radar ?? []).length > 0 && <section className="tutor-radar">
      <p className="tutor-insight-label">Soru radarı: bunu görünce → bunu düşün</p>
      <ul>{insight.radar.map((item, i) => <li key={i}><span className="tutor-radar-see"><RichText text={item.see} /></span>
        <span className="tutor-radar-arrow" aria-hidden="true">→</span><span><RichText text={item.think} /></span></li>)}</ul>
    </section>}
  </div>;
}

/** Çözümden sonra: "aaa, sebebi buymuş" cümlesi ve 5 saniyelik sağlama. */
export function AhaBlock({ aha, sanityCheck }) {
  if (!aha) return null;
  return <div className="tutor-aha" role="note">
    <p className="tutor-aha-text"><span aria-hidden="true">💡</span> <RichText text={aha} /></p>
    {sanityCheck && <p className="tutor-aha-check"><strong>5 saniyede sağla:</strong> <RichText text={sanityCheck} /></p>}
  </div>;
}

import { useState } from 'react';
import { MathText, Markdown } from '../math.jsx';

/**
 * Günlük hayattan sorgula: tanıdık bir durumu matematik sorusuna çevirir. Önce öğrenci seçer,
 * seçeneğe özel geri bildirimi görür; doğru seçince veya istediğinde gerekçe ve sınavdaki karşılığı açılır.
 * Puanlanmaz, olay kaydı üretmez; "Sen de sorgula" notu da yalnız bu sayfada kalır.
 */
export default function DailyInquiry({ block }) {
  const [chosen, setChosen] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [note, setNote] = useState('');
  const [compare, setCompare] = useState(false);
  const pick = block.choices.find((c) => c.key === chosen);
  const solved = revealed || !!pick?.correct;
  return <section className="lr-inquiry">
    <span className="lr-inquiry-label">Günlük hayattan sorgula</span>
    {block.title && <h4><MathText text={block.title} /></h4>}
    <div className="lr-inquiry-situation"><Markdown text={block.situation} /></div>
    <p className="lr-inquiry-prompt"><strong>Sorgula:</strong> <MathText text={block.prompt} /></p>
    {!pick && !solved && <p className="small muted">Puanlanmaz. Seçmeden önce gerekçeni kendi cümlenle söyle.</p>}
    <div className="lr-inquiry-options" role="group" aria-label="Sorgulama cevabın">
      {block.choices.map((c) => <button key={c.key} type="button" disabled={solved} aria-pressed={chosen === c.key}
        className={solved && c.correct ? 'good' : chosen === c.key && !c.correct ? 'bad' : ''} onClick={() => setChosen(c.key)}>
        <MathText text={c.text} />
      </button>)}
    </div>
    {pick && <div className={`lr-feedback ${pick.correct ? 'good' : 'bad'}`} role="status">
      <p className="lr-feedback-title">{pick.correct ? 'Doğru düşündün.' : 'Bu seçenek neden olmaz?'}</p>
      <p><MathText text={pick.feedback} /></p>
    </div>}
    {pick && !solved && <div className="lr-actions">
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setChosen(null)}>Başka bir seçeneği düşün</button>
      <button type="button" className="lr-link" onClick={() => setRevealed(true)}>Gerekçeyi göster</button>
    </div>}
    {solved && <div className="lr-inquiry-why">
      <strong>Ne oluyor, neden?</strong>
      <Markdown text={block.why} />
      {block.exam && <p className="lr-inquiry-exam"><strong>Soruda karşına böyle çıkar:</strong> <MathText text={block.exam} /></p>}
    </div>}
    {solved && block.reflect && <div className="lr-inquiry-reflect">
      <p><strong>Sen de sorgula:</strong> <MathText text={block.reflect} /></p>
      <textarea rows={2} maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Sen de sorgula: düşüncen" placeholder="Kısa bir gerekçe yeter…" />
      {block.reflectAnswer && (compare
        ? <p className="lr-inquiry-answer"><strong>Karşılaştır:</strong> <MathText text={block.reflectAnswer} /></p>
        : <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCompare(true)}>Düşüncemi karşılaştır</button>)}
      <p className="small muted">Yazdığın not kaydedilmez; yalnız düşünmen için.</p>
    </div>}
  </section>;
}

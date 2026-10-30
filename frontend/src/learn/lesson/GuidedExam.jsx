import { useState } from 'react';
import { Link } from 'react-router-dom';
import QuestionImage from '../../components/QuestionImage.jsx';
import { MathText, Markdown } from '../math.jsx';
import { BASE } from '../ui.jsx';

export default function GuidedExam({ question, guide }) {
  const [shown, setShown] = useState(0);
  const finished = shown === guide.steps.length;
  return <section className="lr-worked lr-guided-exam">
    <p className="lm-eyebrow">Gerçek sınav sorusu · birlikte çözelim</p>
    <h4>{guide.title}</h4>
    <div className="lr-question-source small"><span>{question.year} {question.exam} · {question.source}</span><Link to={`/soru/${encodeURIComponent(question.code)}`} target="_blank" rel="noreferrer">Özgün soru sayfası ↗</Link></div>
    <div className="lr-bank-image"><QuestionImage id={question.id} readingWidth alt={`${question.year} ${question.exam}: ${guide.title}`} /></div>
    <p className="small muted">Bu bir çözümlü örnek; test puanına eklenmez. Çözümü açmadan önce ilk adımı kendin düşün.</p>
    {shown > 0 && <div className="lm-predict"><strong>Soruda neyi fark ediyoruz?</strong><p>{guide.cue}</p></div>}
    <ol className="lm-reasoning">{guide.steps.slice(0, shown).map((s, i) => <li key={i}><span className="lm-step-number">{i + 1}</span><div><Markdown text={s.text} /><p className="lr-why"><strong>Neden?</strong> <MathText text={s.why} /></p></div></li>)}</ol>
    {!finished && <div className="lr-actions"><button type="button" className="btn btn-primary" onClick={() => setShown((s) => s + 1)}>{shown ? `Sonraki çözüm adımı (${shown}/${guide.steps.length})` : 'Çözümü adım adım aç'}</button></div>}
    {finished && <div className="lm-exam-conclusion">
      <p className="lr-worked-answer"><strong>Sonuç:</strong> {guide.result}</p>
      <aside className="lm-tip"><span className="lm-eyebrow">Şimdi kısa yol · hangi koşulda?</span><Markdown text={guide.tip} /></aside>
      <details className="lm-terms"><summary>Sonucumu nasıl kontrol ederim?</summary><Markdown text={guide.check} /></details>
      <Link className="btn btn-secondary" to={`${BASE}/calis?tur=practice&konu=${guide.conceptId}&tip=${guide.archetype}`}>Benzer sorularda kendin dene →</Link>
    </div>}
  </section>;
}

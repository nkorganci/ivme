import { Link } from 'react-router-dom';
import { PATTERNS, PRESETS, STUDIO, TASKS } from './content.js';

const titleOf = (list, id) => list.find((item) => item.id === id)?.title ?? id;

/** Kalıp haritası: ünitedeki soru tipleri → soruda görülen işaret → laboratuvarda bakılacak yer. */
export default function PatternMap({ go, progress }) {
  return <div className="pm">
    <p className="muted">Bu ünitedeki çıkmış soruların hepsi aşağıdaki kalıplardan birine girer. Her kalıp aynı laboratuvarın farklı bir merceğidir:
      soruda işareti görünce laboratuvarda nereye bakacağını bilirsin.</p>
    <div className="pm-grid">
      {PATTERNS.map((pattern) => <article key={pattern.id} className="card pm-card">
        <h3>{pattern.title}</h3>
        <dl>
          <dt>Soruda görürsen</dt><dd>{pattern.see.join(' · ')}</dd>
          <dt>Laboratuvarda bak</dt><dd>{pattern.look}</dd>
          <dt>Kural</dt><dd>{pattern.rule}</dd>
          <dt>Tuzak</dt><dd>{pattern.trap}</dd>
        </dl>
        <div className="pm-links">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => go({ tab: 'lab', hazir: pattern.preset })}>
            Laboratuvarda aç: {titleOf(PRESETS, pattern.preset)}</button>
          {pattern.studio.map((id) => <button key={id} type="button" className="btn btn-secondary btn-sm" onClick={() => go({ tab: 'studyo', soru: id })}>
            {progress.studio[id]?.done ? '✓ ' : ''}Stüdyo: {titleOf(STUDIO, id)}</button>)}
          {pattern.tasks.map((id) => <button key={id} type="button" className="btn btn-secondary btn-sm" onClick={() => go({ tab: 'gorevler', gorev: id })}>
            {progress.tasks[id] ? '✓ ' : ''}Görev: {titleOf(TASKS, id)}</button>)}
        </div>
        {pattern.codes.length > 0 && <p className="small pm-codes">Çıkmış sorular: {pattern.codes.map((code, i) => <span key={code}>{i ? ', ' : ''}
          <Link to={`/soru/${encodeURIComponent(code)}`}>{code}</Link></span>)}</p>}
      </article>)}
    </div>
  </div>;
}

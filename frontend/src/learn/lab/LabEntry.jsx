import { Link } from 'react-router-dom';
import { BASE } from '../ui.jsx';
import './parity-lab.css';

export default function LabEntry({ conceptId, goal = null, compact = false }) {
  return <aside className={`pl-entry${compact ? ' pl-entry-compact' : ''}`}>
    <div><span className="pl-eyebrow">Matematik Laboratuvarı</span>
      <h2>Bir iddiayı çürütebilir misin?</h2>
      {!compact && <p>Modelle oyna, koşulu değiştir, nedenini bul. Sonra aynı fikri yeni bir soruda ve gerçek ÖSYM sorusunda kullan.</p>}
    </div>
    <Link className="btn btn-primary" to={`${BASE}/laboratuvar/${conceptId}${goal ? `?hedef=${goal}` : ''}`}>Laboratuvarı aç <span aria-hidden="true">↗</span></Link>
  </aside>;
}

import { Link } from 'react-router-dom';
import { BASE } from '../ui.jsx';
import './parity-lab.css';

export default function LabEntry({ compact = false }) {
  return <aside className={`pl-entry${compact ? ' pl-entry-compact' : ''}`}>
    <div><span className="pl-eyebrow">Matematik Laboratuvarı · Tek–çift</span>
      <h2>Bir iddiayı çürütebilir misin?</h2>
      {!compact && <p>Sayılarla oyna, koşulu değiştir, nedenini bul. Sonra aynı fikri yeni bir soruda kullan.</p>}
    </div>
    <Link className="btn btn-primary" to={`${BASE}/laboratuvar/temel-kavramlar`}>Laboratuvarı aç <span aria-hidden="true">↗</span></Link>
  </aside>;
}

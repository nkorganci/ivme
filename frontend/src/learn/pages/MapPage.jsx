import { Link, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks.js';
import { useLearn } from '../LearnContext.jsx';
import { BASE, DueText, STATUS, StatusBadge } from '../ui.jsx';
import { pastCount } from '../bank.js';

const FILTERS = [['', 'Hepsi'], ['TYT', 'TYT'], ['AYT', 'AYT']];

/** Konu haritası (spec §12): üniteler → durumuna göre renkli kavramlar; ustalık yüzdesi ve sonraki tekrar. */
export default function MapPage() {
  usePageTitle('Konu haritası · Konuyu Öğrenelim');
  const { index, state, today, settings } = useLearn();
  const [params, setParams] = useSearchParams();
  const filter = params.get('sinav') ?? '';
  const units = index.units.map((unit) => ({ ...unit, concepts: unit.concepts.map((id) => index.byId[id]).filter((m) => !filter || m.exams.includes(filter)) }))
    .filter((unit) => unit.concepts.length);
  const counts = Object.fromEntries(Object.keys(STATUS).map((key) => [key, 0]));
  for (const unit of units) for (const m of unit.concepts) counts[state.concepts[m.id].status] += 1;
  return <div className="lr-page lr-map">
    <div className="page-head"><h1>Konu haritası</h1><span className="muted">Matematik · {units.reduce((s, u) => s + u.concepts.length, 0)} kavram</span></div>
    <nav className="tabs study-tabs" aria-label="Sınav">
      {FILTERS.map(([value, label]) => <a key={label} href={`?sinav=${value}`} className={filter === value ? 'active' : ''} aria-current={filter === value ? 'page' : undefined}
        onClick={(e) => { e.preventDefault(); setParams(value ? { sinav: value } : {}, { replace: true }); }}>{label}</a>)}
    </nav>
    <ul className="lr-legend-list" aria-label="Durumlar">
      {Object.entries(STATUS).map(([key]) => <li key={key}><StatusBadge status={key} /> <span className="small muted">{counts[key]}</span></li>)}
    </ul>
    {!settings.tracks.includes('AYT') && filter === 'AYT' && <p className="small muted">Ayarlarında yalnız TYT seçili; AYT kavramları planına girmez.</p>}
    {units.map((unit) => <section key={unit.id} className="card lr-unit">
      <header className="lr-section-head"><h2>{unit.title}</h2><span className="small muted">{unit.grade}. sınıf</span></header>
      <ul className="lr-concepts">
        {unit.concepts.map((m) => {
          const c = state.concepts[m.id];
          const prereq = m.prereq.map((id) => index.byId[id]).filter((p) => p && !state.concepts[p.id].firstMasteredAt);
          return <li key={m.id} className={`lr-concept lr-concept-${STATUS[c.status].tone}`}>
            <Link to={`${BASE}/konu/${m.id}`} className="lr-concept-link">
              <span className="lr-concept-title">{m.title}</span>
              <span className="lr-concept-meta small">
                <StatusBadge status={c.status} />
                <span>%{c.mastery}</span>
                <span>{c.solvedTypes}/{m.archetypes.length} tip</span>
                {c.nextDue && <span>tekrar <DueText day={c.nextDue} today={today} /></span>}
                {pastCount(m.id) > 0 && <span title="ÖSYM çıkmış soru sayısı">{pastCount(m.id)} çıkmış</span>}
                <span>{m.exams.join(' · ')}</span>
              </span>
              {c.status === 'locked' && prereq.length > 0 && <span className="lr-concept-hint small">Önce: {prereq.map((p) => p.title).join(', ')}</span>}
            </Link>
          </li>;
        })}
      </ul>
    </section>)}
  </div>;
}

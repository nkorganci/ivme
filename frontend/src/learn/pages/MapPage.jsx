import { Link, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks.js';
import { useLearn } from '../LearnContext.jsx';
import { BASE, CatalogError, DueText, ExamBadges, STATUS, StatusBadge, useLearnCatalog } from '../ui.jsx';
import { pastCount } from '../bank.js';
import { catalogUnits } from '../catalog.js';

const FILTERS = [['', 'Hepsi'], ['TYT', 'TYT'], ['AYT', 'AYT']];

/**
 * Konu haritası (spec §12): ortak katalogdaki üniteler → durumuna göre renkli kavramlar; ustalık yüzdesi ve sonraki tekrar.
 * Ünite ve konu adları DB kataloğundandır; kavram başlığı dersin öğretim başlığıdır.
 */
export default function MapPage() {
  usePageTitle('Konu haritası · Konuyu Öğrenelim');
  const { index, state, today, settings } = useLearn();
  const catalog = useLearnCatalog();
  const [params, setParams] = useSearchParams();
  const filter = params.get('sinav') ?? '';
  const concepts = index.concepts.filter((m) => !filter || m.exams.includes(filter));
  const { units, unplaced } = catalog.byId ? catalogUnits(concepts, catalog.byId) : { units: [], unplaced: [] };
  const counts = Object.fromEntries(Object.keys(STATUS).map((key) => [key, 0]));
  for (const m of concepts) counts[state.concepts[m.id].status] += 1;
  const subject = units[0]?.subject ?? 'Matematik';
  return <div className="lr-page lr-map">
    <div className="page-head"><h1>Konu haritası</h1><span className="muted">{subject} · {concepts.length} kavram</span></div>
    <nav className="tabs study-tabs" aria-label="Sınav">
      {FILTERS.map(([value, label]) => <a key={label} href={`?sinav=${value}`} className={filter === value ? 'active' : ''} aria-current={filter === value ? 'page' : undefined}
        onClick={(e) => { e.preventDefault(); setParams(value ? { sinav: value } : {}, { replace: true }); }}>{label}</a>)}
    </nav>
    <p className="small muted">Derslerin hazırlanma durumunu <Link to={`${BASE}/icerik-durumu`}>TYT matematik içerik listesinde</Link> görebilirsin. Aşağıdaki rozetler senin çalışma ilerlemeni gösterir.</p>
    <ul className="lr-legend-list" aria-label="Durumlar">
      {Object.entries(STATUS).map(([key]) => <li key={key}><StatusBadge status={key} /> <span className="small muted">{counts[key]}</span></li>)}
    </ul>
    {!settings.tracks.includes('AYT') && filter === 'AYT' && <p className="small muted">Ayarlarında yalnız TYT seçili; AYT kavramları planına girmez.</p>}
    {catalog.error && <CatalogError catalog={catalog} />}
    {catalog.loading && <p className="muted" role="status">Müfredat üniteleri yükleniyor…</p>}
    {[...units, ...(unplaced.length ? [{ id: 'katalog-disi', name: 'Katalog bağı bulunamayan dersler', grades: [], exams: [], concepts: unplaced }] : [])].map((unit) => <section key={unit.id} className="card lr-unit">
      <header className="lr-section-head"><h2>{unit.subject ? <><span className="muted">{unit.subject} ›</span> {unit.name}</> : unit.name}</h2>
        <span className="small muted">{unit.grades.length > 0 && `${unit.grades.join(', ')}. sınıf`} <ExamBadges exams={unit.exams} /></span></header>
      <ul className="lr-concepts">
        {unit.concepts.map(({ meta: m, scope }) => {
          const c = state.concepts[m.id];
          const prereq = m.prereq.map((id) => index.byId[id]).filter((p) => p && !state.concepts[p.id].firstMasteredAt);
          return <li key={m.id} className={`lr-concept lr-concept-${STATUS[c.status].tone}`}>
            <Link to={`${BASE}/konu/${m.id}`} className="lr-concept-link">
              <span className="lr-concept-title">{m.title}</span>
              {scope.topics.length > 0 && <span className="lr-concept-topics small muted">Konu: {scope.topics.map((t) => t.topic).join(' · ')}</span>}
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

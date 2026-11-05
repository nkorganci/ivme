import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks.js';
import { useLearn } from '../LearnContext.jsx';
import { BASE, CatalogError, DueText, ExamBadges, STATUS, StatusBadge, useLearnCatalog } from '../ui.jsx';
import { pastCount } from '../bank.js';
import { catalogUnits } from '../catalog.js';
import { topicMapCatalog, selectTopicMap, topicMapParams, referenceMapUnits, topicSourcesPath } from '../mapNavigation.js';
import { pilotForTopic } from '../physics/registry.js';

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
  const filter = FILTERS.some(([value]) => value === params.get('sinav')) ? params.get('sinav') : '';
  const mapCatalog = topicMapCatalog(index.concepts, catalog.byId ?? new Map());
  const selection = selectTopicMap(mapCatalog, index.concepts, state, { subject: params.get('ders'), exam: filter,
    unit: params.get('unite'), search: params.get('ara'), status: params.get('durum') });
  const concepts = selection.concepts;
  const subjectNav = useRef(null);
  useEffect(() => {
    const nav = subjectNav.current;
    const active = nav?.querySelector('[aria-current="page"]');
    if (!nav || !active) return;
    if (nav.scrollWidth > nav.clientWidth) nav.scrollLeft = active.offsetLeft - nav.offsetLeft;
    else nav.scrollTop = Math.max(0, active.offsetTop - nav.offsetTop - nav.clientHeight / 2);
  }, [selection.subject?.id]);
  const { units, unplaced } = catalog.byId ? catalogUnits(concepts, catalog.byId, { subjectId: selection.subject?.id }) : { units: [], unplaced: [] };
  const counts = Object.fromEntries(Object.keys(STATUS).map((key) => [key, 0]));
  for (const m of concepts) counts[state.concepts[m.id].status] += 1;
  const subject = selection.subject?.name ?? 'Dersler yükleniyor';
  const change = (values, replace = false) => setParams(topicMapParams(params, values), { replace });
  const referenceUnits = referenceMapUnits(selection.topics);
  const renderReferenceUnits = () => referenceUnits.map(unit => <section key={unit.id} className="card lr-unit lr-reference-unit">
    <header className="lr-section-head"><h2><span className="muted">{subject} ›</span> {unit.name}</h2></header>
    <ul className="lr-concepts">{unit.topics.map(topic => { const pilot = pilotForTopic(topic); return <li key={topic.key} className="lr-concept lr-concept-pending">
      <div className="lr-reference-topic">
        <span className="lr-concept-title">{topic.name}</span>
        <span className="small muted"><ExamBadges exams={topic.exams} /> {topic.grades.join(', ')}{topic.grades.length > 0 && '. sınıf'}</span>
        <span className={'lr-status ' + (pilot ? 'lr-status-ready' : 'lr-status-locked')}>{pilot ? 'Görsel deneme dersi' : 'Anlatım hazırlanıyor'}</span>
        {pilot && <Link to={pilot.path}>Deneme dersini aç →</Link>}
        <Link to={topicSourcesPath(topic)}>Konu kaynaklarını incele →</Link>
      </div>
    </li>; })}</ul>
  </section>);
  return <div className="lr-page lr-map">
    <div className="page-head"><h1>Konu haritası</h1><span className="muted" aria-live="polite">{subject} · {selection.lessonCount ? `${concepts.length} kavram` : `${selection.topics.length} müfredat konusu`}</span></div>
    <div className="lr-map-layout">
    <aside className="lr-map-sidebar card" aria-label="Konu haritası filtreleri">
      <h2>Dersler</h2>
      <nav ref={subjectNav} className="lr-map-subjects" aria-label="Ders seçimi">{mapCatalog.subjects.map(item => <Link key={item.id}
        to={'?' + topicMapParams(params, { ders: item.id })} onClick={event => { event.preventDefault(); change({ ders: item.id }); }}
        className={'lr-map-subject' + (selection.subject?.id === item.id ? ' active' : '')}
        aria-current={selection.subject?.id === item.id ? 'page' : undefined}>
        <span>{item.name}</span><span className="lr-map-subject-count" title="Müfredat konu sayısı">{item.topics}</span>
      </Link>)}</nav>
      <div className="lr-map-filters">
        <label htmlFor="lr-map-search">Konu veya ünite ara</label>
        <input id="lr-map-search" type="search" value={params.get('ara') ?? ''} onChange={event => change({ ara: event.target.value }, true)} placeholder="Örn. hareket, hücre…" />
        <label htmlFor="lr-map-unit">Ünite</label>
        <select id="lr-map-unit" value={selection.units.some(unit => unit.id === params.get('unite')) ? params.get('unite') : ''} onChange={event => change({ unite: event.target.value })}>
          <option value="">Bütün üniteler</option>{selection.units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
        </select>
        {selection.lessonCount > 0 && <><label htmlFor="lr-map-status">Çalışma durumu</label>
          <select id="lr-map-status" value={params.get('durum') ?? ''} onChange={event => change({ durum: event.target.value })}>
            <option value="">Bütün durumlar</option>{Object.entries(STATUS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            <option value="preparing">Anlatım hazırlanıyor</option>
          </select></>}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => change({ sinav: '', unite: '', ara: '', durum: '' })}>Filtreleri temizle</button>
      </div>
    </aside>
    <div className="lr-map-content">
    <nav className="tabs study-tabs" aria-label="Sınav">
      {FILTERS.map(([value, label]) => <Link key={label} to={'?' + topicMapParams(params, { sinav: value, unite: '' })} className={filter === value ? 'active' : ''} aria-current={filter === value ? 'page' : undefined}
        onClick={(e) => { e.preventDefault(); change({ sinav: value, unite: '' }, true); }}>{label}</Link>)}
    </nav>
    {selection.lessonCount > 0 ? <p className="small muted">{selection.subject?.id === 'matematik' && <>Derslerin hazırlanma durumunu <Link to={`${BASE}/icerik-durumu`}>TYT matematik içerik listesinde</Link> görebilirsin. </>}Aşağıdaki rozetler senin çalışma ilerlemeni gösterir.</p>
      : selection.subject && <p className="small muted">{subject} ünite ve konuları aşağıda. Henüz öğrenme dersi eklenmemiş konuların kaynaklarını inceleyebilirsin.</p>}
    {selection.lessonCount > 0 && <ul className="lr-legend-list" aria-label="Durumlar">
      {Object.entries(STATUS).map(([key]) => <li key={key}><StatusBadge status={key} /> <span className="small muted">{counts[key]}</span></li>)}
    </ul>}
    {!settings.tracks.includes('AYT') && filter === 'AYT' && <p className="small muted">Ayarlarında yalnız TYT seçili; AYT kavramları planına girmez.</p>}
    {catalog.error && <CatalogError catalog={catalog} />}
    {catalog.loading && <p className="muted" role="status">Müfredat üniteleri yükleniyor…</p>}
    {catalog.byId && !concepts.length && !selection.topics.length && <div className="card" role="status">Bu ders için seçilen filtrelerde konu bulunamadı. <button type="button" className="lr-link" onClick={() => change({ sinav: '', unite: '', ara: '', durum: '' })}>Filtreleri temizle</button></div>}
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
    {referenceUnits.length > 0 && (concepts.length ? <details className="lr-map-other-topics"><summary>Müfredattaki diğer konular ({selection.topics.length})</summary>{renderReferenceUnits()}</details> : renderReferenceUnits())}
    </div>
    </div>
  </div>;
}

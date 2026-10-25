import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../hooks.js';
import { UNIT } from '../interactive/motion/content.js';
import FreeLab from '../interactive/motion/FreeLab.jsx';
import Studio from '../interactive/motion/Studio.jsx';
import Tasks from '../interactive/motion/Tasks.jsx';
import PatternMap from '../interactive/motion/PatternMap.jsx';
import { useUnitProgress } from '../interactive/progress.js';
import '../interactive/interactive.css';

const TABS = [
  ['lab', 'Laboratuvar', 'Serbest dene'],
  ['studyo', 'Soru stüdyosu', 'Çıkmış soruyu modele dök'],
  ['gorevler', 'Görevler', 'Hedefi tuttur'],
  ['kaliplar', 'Kalıp haritası', 'Soru tipleri'],
];

/** Bir ünitenin interaktif ortamı: laboratuvar, soru stüdyosu, görevler ve kalıp haritası. */
export default function InteractiveUnit() {
  const { subjectId, unitId } = useParams();
  const [params, setParams] = useSearchParams();
  usePageTitle(`${UNIT.title} · İnteraktif Öğrenme`);
  const [progress, record] = useUnitProgress(`${UNIT.subject}-${UNIT.id}`);
  if (subjectId !== UNIT.subject || unitId !== UNIT.id) return <Navigate to="/interaktif-ogrenme" replace />;
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'lab';
  const go = (next) => setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value != null)));
  const pick = (key, value) => setParams((current) => { const nextParams = new URLSearchParams(current); nextParams.set(key, value); return nextParams; }, { replace: true });

  return <div className="il-page il-unit-page">
    <nav className="il-crumbs small" aria-label="Konum"><Link to="/interaktif-ogrenme">İnteraktif Öğrenme</Link> › {UNIT.subjectName}</nav>
    <div className="page-head"><h1>{UNIT.title}</h1><span className="muted">{UNIT.exams}</span></div>
    <nav className="tabs study-tabs il-tabs" aria-label="Ünite bölümleri">
      {TABS.map(([id, label, hint]) => <a key={id} href={`?tab=${id}`} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined}
        onClick={(e) => { e.preventDefault(); go({ tab: id }); }}><span><strong>{label}</strong><small>{hint}</small></span></a>)}
    </nav>
    {tab === 'lab' && <FreeLab presetId={params.get('hazir')} onPreset={(id) => pick('hazir', id)} />}
    {tab === 'studyo' && <Studio activeId={params.get('soru')} onSelect={(id) => pick('soru', id)} progress={progress.studio}
      onRecord={(id, value) => record('studio', id, value)} />}
    {tab === 'gorevler' && <Tasks activeId={params.get('gorev')} onSelect={(id) => pick('gorev', id)} progress={progress.tasks}
      onRecord={(id, value) => record('tasks', id, value)} />}
    {tab === 'kaliplar' && <PatternMap go={go} progress={progress} />}
  </div>;
}

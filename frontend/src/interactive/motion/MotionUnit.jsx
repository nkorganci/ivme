import { useSearchParams } from 'react-router-dom';
import { UNIT } from './content.js';
import FreeLab from './FreeLab.jsx';
import Studio from './Studio.jsx';
import Tasks from './Tasks.jsx';
import PatternMap from './PatternMap.jsx';
import { useUnitProgress } from '../progress.js';

const TABS = [
  ['lab', 'Laboratuvar', 'Serbest dene'],
  ['studyo', 'Soru stüdyosu', 'Çıkmış soruyu modele dök'],
  ['gorevler', 'Görevler', 'Hedefi tuttur'],
  ['kaliplar', 'Kalıp haritası', 'Soru tipleri'],
];

/** Fizik · Hareket: laboratuvar, soru stüdyosu, görevler ve kalıp haritası. */
export default function MotionUnit() {
  const [params, setParams] = useSearchParams();
  const [progress, record] = useUnitProgress(`${UNIT.subject}-${UNIT.id}`);
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'lab';
  const go = (next) => setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value != null)));
  const pick = (key, value) => setParams((current) => { const nextParams = new URLSearchParams(current); nextParams.set(key, value); return nextParams; }, { replace: true });
  return <>
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
  </>;
}

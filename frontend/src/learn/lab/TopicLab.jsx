import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks.js';
import { MathText } from '../math.jsx';
import { BASE } from '../ui.jsx';
import GoalWorkbench, { freshGoal } from './GoalWorkbench.jsx';
import { LAB_LOADERS } from './konular/index.js';
import './parity-lab.css';
import './topic-lab.css';

const ParityWorkbench = lazy(() => import('./ParityLab.jsx'));
const CUSTOM = { parity: ParityWorkbench };

/** Konu laboratuvarı: hedef sekmeleri; her hedef kendi tahmin → deney → gerekçe → aktarım akışıyla. Durum yalnız açık sayfadadır. */
export default function TopicLab() {
  const { conceptId } = useParams();
  const [params] = useSearchParams();
  const wanted = params.get('hedef');
  const [loaded, setLoaded] = useState(null);
  const [goalIndex, setGoalIndex] = useState(0);
  const [states, setStates] = useState({});
  const heading = useRef(null);
  usePageTitle(`${loaded?.lab.title ?? 'Matematik laboratuvarı'} · Konuyu Öğrenelim`);
  useEffect(() => {
    let active = true;
    setLoaded(null); setGoalIndex(0); setStates({});
    const loader = LAB_LOADERS[conceptId];
    if (loader) loader().then(([lab, views]) => {
      if (!active) return;
      setLoaded({ lab: lab.default, views: views.default ?? {} });
      setGoalIndex(Math.max(0, lab.default.goals.findIndex((g) => g.id === wanted)));
      setStates(Object.fromEntries(lab.default.goals.map((g) => [g.id, freshGoal(g)])));
    });
    return () => { active = false; };
  }, [conceptId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!LAB_LOADERS[conceptId]) return <Navigate to={`${BASE}/konu/${conceptId}`} replace />;
  if (!loaded) return <div className="lr-page pl-page"><p className="muted" role="status">Laboratuvar hazırlanıyor…</p></div>;
  const { lab, views } = loaded;
  const goal = lab.goals[goalIndex];
  const state = states[goal.id];
  const patch = (changes) => setStates((old) => ({ ...old, [goal.id]: { ...old[goal.id], ...changes } }));
  const done = (g) => (g.custom ? false : states[g.id]?.transfer.finished);
  const Custom = goal.custom && CUSTOM[goal.custom];
  const pick = (i) => { setGoalIndex(i); requestAnimationFrame(() => heading.current?.focus()); };
  return <div className="lr-page pl-page tl-page">
    <nav className="lr-crumbs small" aria-label="Konum"><Link to={`${BASE}/konu/${conceptId}`}>{lab.title}</Link><span> / Matematik Laboratuvarı</span></nav>
    <header className="pl-hero">
      <div><span className="pl-eyebrow">Matematik Laboratuvarı · {lab.exam}</span><h1><MathText text={lab.hero.title} /></h1>
        <p><MathText text={lab.hero.text} /></p></div>
      <div className="pl-hero-art" aria-hidden="true"><span>{lab.hero.art[0]}</span><strong>{lab.hero.art[1]}</strong><span>{lab.hero.art[2]}</span></div>
    </header>
    <div className="pl-scenario-heading"><h2>Hedefler</h2><span>{lab.goals.filter(done).length}/{lab.goals.filter((g) => !g.custom).length + (lab.goals.some((g) => g.custom) ? ' (+ pilot)' : '')} hedefte aktarım tamamlandı</span></div>
    <nav className="tl-goals" aria-label="Laboratuvar hedefleri">
      {lab.goals.map((g, i) => <button key={g.id} type="button" aria-pressed={goalIndex === i} onClick={() => pick(i)}>
        <span className="pl-scenario-number" aria-hidden="true">{done(g) ? '✓' : String(i + 1).padStart(2, '0')}</span>
        <span><strong>{g.label}</strong><small>{g.short}</small></span>
      </button>)}
    </nav>
    <p className="tl-goal-meta"><strong>Ölçülen beceri:</strong> <MathText text={goal.objective} /> <span><strong>Sık yanılgı:</strong> <MathText text={goal.misconception} /></span></p>
    {Custom ? <Suspense fallback={<p className="muted">Yükleniyor…</p>}><Custom real={goal.real ?? []} /></Suspense>
      : <GoalWorkbench key={goal.id} goal={goal} View={views[goal.experiment.view]} conceptId={conceptId} state={state} patch={patch} headingRef={heading} />}
    <footer className="pl-footer"><Link to={`${BASE}/konu/${conceptId}`}>← Konuya dön</Link><span>Denemeler bu sayfada tutulur; yenileyince sıfırlanır. Ustalık puanını değiştirmez.</span></footer>
  </div>;
}

import { lazy, Suspense, useEffect } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Loading } from '../components/States.jsx';
import { LearnProvider, useLearn } from './LearnContext.jsx';
import { lessonLoadErrors } from './content/lessons.js';
import { maybeNotify } from './reminders.js';
import { BASE } from './ui.jsx';
import TodayPage from './pages/TodayPage.jsx';
import './learn.css';

const MapPage = lazy(() => import('./pages/MapPage.jsx'));
const ConceptPage = lazy(() => import('./pages/ConceptPage.jsx'));
const LessonPage = lazy(() => import('./pages/LessonPage.jsx'));
const PracticePage = lazy(() => import('./pages/PracticePage.jsx'));
const MistakesPage = lazy(() => import('./pages/MistakesPage.jsx'));
const ProgressPage = lazy(() => import('./pages/ProgressPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const PlacementPage = lazy(() => import('./pages/PlacementPage.jsx'));

export const LEARN_TABS = [
  ['', 'Bugün'],
  ['/harita', 'Konu haritası'],
  ['/hatalarim', 'Hatalarım'],
  ['/ilerleme', 'İlerleme'],
  ['/ayarlar', 'Ayarlar'],
];

function Shell() {
  const learn = useLearn();
  const { user } = useAuth();
  useEffect(() => {
    if (learn.loading) return undefined;
    const check = () => maybeNotify({ settings: learn.settings, plan: learn.plan, userId: user?.id });
    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [learn.loading, learn.settings, learn.plan, user?.id]);
  if (learn.loading) return <Loading text="Çalışma planın hazırlanıyor…" />;
  if (learn.error) return <div className="card"><p className="field-error" role="alert">Konuyu Öğrenelim kayıtları okunamadı: {learn.error.message}</p>
    <button type="button" className="btn btn-primary" onClick={learn.reload}>Tekrar dene</button></div>;
  const errors = lessonLoadErrors();
  return <div className="lr-shell">
    <nav className="tabs tracking-tabs lr-tabs" aria-label="Konuyu Öğrenelim">
      {LEARN_TABS.map(([path, label]) => <NavLink key={path} to={`${BASE}${path}`} end={!path} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>)}
    </nav>
    {learn.syncError && <p className="lr-sync" role="status">{learn.syncError} <button type="button" className="lr-link" onClick={learn.flush}>Şimdi dene</button></p>}
    {errors.length > 0 && <p className="field-error" role="alert">Bazı dersler okunamadı: {errors.join(' · ')}</p>}
    <Suspense fallback={<Loading text="Yükleniyor…" />}>
      <Routes>
        <Route index element={<TodayPage />} />
        <Route path="harita" element={<MapPage />} />
        <Route path="konu/:conceptId" element={<ConceptPage />} />
        <Route path="ders/:conceptId" element={<LessonPage />} />
        <Route path="calis" element={<PracticePage />} />
        <Route path="seviye/:track" element={<PlacementPage />} />
        <Route path="hatalarim" element={<MistakesPage />} />
        <Route path="ilerleme" element={<ProgressPage />} />
        <Route path="ayarlar" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to={BASE} replace />} />
      </Routes>
    </Suspense>
  </div>;
}

/** Konuyu Öğrenelim bölümü (/konuyu-ogrenelim/*): TYT–AYT Matematik öğrenme motoru. */
export default function LearnSection() {
  return <LearnProvider><Shell /></LearnProvider>;
}

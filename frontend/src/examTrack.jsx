import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './auth.jsx';
import { questionSourcesFor } from './questionSources.js';
import { featureReady, trackExams } from './examTrackModel.js';
import { bankLabel } from './format.js';

// Seçilen sınav (YKS, KPSS türleri) hesapta PostgreSQL'de saklanır; menüler ortaktır,
// içerik sayfaları etkin sınava göre gösterilir.
const ExamTrackContext = createContext(null);

export const TRACK_STATUS = {
  ACTIVE: { label: 'Hazır', badge: 'ok' },
  PREPARING: { label: 'Hazırlanıyor', badge: 'warn' },
  PLANNED: { label: 'Henüz hazır değil', badge: 'muted' },
};

export const FAMILY_LABELS = { YKS: 'YKS', KPSS: 'KPSS' };

export function ExamTrackProvider({ children }) {
  const { user } = useAuth();
  const student = user?.role === 'USER';
  const [state, setState] = useState({ tracks: [], currentId: null });
  const [loading, setLoading] = useState(student);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!student) { setState({ tracks: [], currentId: null }); setLoading(false); return undefined; }
    let active = true;
    setLoading(true); setError('');
    api.get('/api/exam-tracks')
      .then(data => { if (active) setState(data); })
      .catch(reason => { if (active) setError(`Sınav seçimi okunamadı: ${reason.message}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [student, user?.id, attempt]);

  const select = useCallback(async trackId => {
    setSaving(true); setError('');
    try { setState(await api.put('/api/exam-tracks/current', { trackId })); return true; }
    catch (reason) { setError(`Sınav seçimi kaydedilemedi: ${reason.message}`); return false; }
    finally { setSaving(false); }
  }, []);

  const value = useMemo(() => {
    const track = state.tracks.find(t => t.id === state.currentId) || null;
    const exams = trackExams(track);
    const names = new Map(exams.map(e => [e.id, e.name]));
    return { tracks: state.tracks, track, loading, saving, error, select, retry: () => setAttempt(n => n + 1),
      // İçerik yalnız ACTIVE sınavda hazırdır; diğerlerinde sayfalar "hazırlanıyor" ekranı gösterir.
      contentReady: !track || track.status === 'ACTIVE',
      kpss: track?.family === 'KPSS', exams, questionSources: questionSourcesFor(track, exams),
      examLabel: id => names.get(id) || id || '',
      // "AYT-TYT Çıkmış Sorular" yalnız YKS'te; KPSS'te sınavın adı kullanılır.
      bankName: bank => track?.family === 'KPSS' && bank === 'CIKMIS' ? `${track.name} Çıkmış Sorular` : bankLabel(bank),
      featureReady: feature => featureReady(track, feature) };
  }, [state, loading, saving, error, select]);

  return <ExamTrackContext.Provider value={value}>{children}</ExamTrackContext.Provider>;
}

export function useExamTrack() {
  return useContext(ExamTrackContext);
}

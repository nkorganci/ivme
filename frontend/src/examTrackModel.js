// Sınav hedefinin (YKS, KPSS türleri) testleri ve hazır bölümleri; examTrack.jsx bağlamı ve testler kullanır.

// Öğretmen/yönetici ve sınav seçimi yüklenmeden önce YKS testleri geçerlidir.
const YKS_EXAMS = [
  { id: 'TYT', name: 'TYT', detail: '120 soru · 165 dakika', subjects: [] },
  { id: 'AYT', name: 'AYT', detail: 'Alanına göre 80 soru · 180 dakika', subjects: [] },
];

/** Sınavın testleri (TYT/AYT, KPSS GY/GK...) exam_tracks.sections kaydından gelir. */
export function trackExams(track) {
  const sections = Array.isArray(track?.sections) ? track.sections.filter(s => s.examId) : [];
  if (!track || track.family === 'YKS' || !sections.length) return YKS_EXAMS;
  return sections.map(s => ({ id: s.examId, name: s.name, detail: s.detail || '', minutes: s.minutes, subjects: s.subjects || [] }));
}

/** Sınav içinde hazır bölümler; ACTIVE sınavda boş liste "hepsi hazır" demektir. */
export function featureReady(track, feature) {
  if (!track) return true;
  if (track.status !== 'ACTIVE') return false;
  const ready = track.readyFeatures || [];
  return !feature || !ready.length || ready.includes(feature);
}

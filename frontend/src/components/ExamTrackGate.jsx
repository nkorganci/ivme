import { Fragment } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useExamTrack } from '../examTrack.jsx';
import { usePageTitle } from '../hooks.js';
import { STATISTICS_LABEL, STUDY_LABEL } from '../config.js';
import { Loading } from './States.jsx';

// Ortak menüdeki içerik sayfaları ve bölüm kimlikleri (exam_tracks.ready_features); en uzun önek önce gelir.
// Seçilen sınavda bölüm hazır değilse aynı yerde bilgi gösterilir.
const PAGES = [
  ['/dersler-ve-konular/pdf-envanteri', 'PDF envanteri', 'pdf-inventory'],
  ['/dersler-ve-konular', 'Dersler', 'curriculum'],
  ['/konular-ve-kaynaklar', 'Konular ve kaynaklar', 'resources'],
  ['/kaynakli-ders-notlari', 'Ders notları', 'notes'],
  ['/cikmis-sorular', 'Çıkmış Sorular', 'past-questions'],
  ['/soru-bankasi', 'Soru Bankası', 'question-bank'],
  ['/calisma', STUDY_LABEL, 'study'],
  ['/gecmis', STATISTICS_LABEL, 'statistics'],
  ['/akilli-ogretmen', 'Akıllı Öğretmen', 'tutor'],
  ['/oneriler', 'Çalışma önerileri', 'recommendations'],
  ['/ogrenci-takip', 'Denemeler', 'yks-trials'],
];
const pageFor = path => path === '/' ? ['/', 'Ana Sayfa', 'home']
  : PAGES.find(([prefix]) => path.startsWith(prefix)) || [path, 'Bu sayfa', ''];
const FEATURE_LABELS = Object.fromEntries([['home', 'Ana Sayfa'], ...PAGES.map(([, label, feature]) => [feature, label])]);

/** Seçilen sınavın bu bölümü hazırsa sayfayı, değilse "hazırlanıyor" bilgisini gösterir. */
export default function ExamTrackGate({ children }) {
  const { pathname } = useLocation();
  const { loading, track, featureReady } = useExamTrack();
  if (loading) return <Loading text="Sınav seçimi yükleniyor…" />;
  // Sınav değişince sayfa yeniden kurulur; önceki sınavın süzgeçleri ve verisi taşınmaz.
  if (featureReady(pageFor(pathname)[2])) return <Fragment key={track?.id || 'none'}>{children ?? <Outlet />}</Fragment>;
  return <TrackPreparing />;
}

function TrackPreparing() {
  const { pathname } = useLocation();
  const { tracks, track, saving, select } = useExamTrack();
  const [, page] = pageFor(pathname);
  usePageTitle(page);
  const ready = tracks.find(t => t.status === 'ACTIVE' && t.id !== track.id);
  const sections = Array.isArray(track.sections) ? track.sections : [];
  // Sınav yayında ama bu bölümü henüz yok (ör. KPSS'de soru bankası): hazır bölümlere yönlendir.
  if (track.status === 'ACTIVE') {
    const available = (track.readyFeatures || []).map(f => FEATURE_LABELS[f]).filter(Boolean);
    return <>
      <div className="page-head">
        <h1>{page}</h1>
        <span className="badge badge-muted">{track.name} · Bu bölüm hazır değil</span>
      </div>
      <section className="card track-preparing" aria-labelledby="track-preparing-title">
        <h2 id="track-preparing-title">“{page}” {track.name} için henüz hazır değil</h2>
        <p>Bu bölümün {track.name} içeriği hazırlanıyor; hazır olduğunda aynı yerde açılacak.</p>
        {available.length > 0 && <p><strong>{track.name} için hazır bölümler:</strong> {available.join(', ')}.</p>}
        <div className="track-actions">
          <Link to="/dersler-ve-konular" className="btn btn-primary">Derslere git</Link>
          <Link to="/cikmis-sorular" className="btn btn-secondary">Çıkmış sorular</Link>
          {ready && <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => select(ready.id)}>
            {saving ? 'Geçiliyor…' : `${ready.name} sınavına geç`}</button>}
        </div>
      </section>
    </>;
  }

  return (
    <>
      <div className="page-head">
        <h1>{page}</h1>
        <span className="badge badge-warn">{track.name} · Hazırlanıyor</span>
      </div>
      <section className="card track-preparing" aria-labelledby="track-preparing-title">
        <h2 id="track-preparing-title">{track.name} içerikleri hazırlanıyor</h2>
        {track.note && <p>{track.note}</p>}
        <p className="muted">
          {page === 'Ana Sayfa' ? 'Sayfalar' : `“${page}” bölümü`} {track.name} için ilk içerikler yayımlandığında
          {ready ? ` ${ready.name} ile` : ''} aynı düzende açılacak. Sınavını sol menüdeki <strong>Sınavım</strong> alanından
          istediğin zaman değiştirebilirsin.
        </p>
        {track.summary && <p><strong>Sınav yapısı:</strong> {track.summary}</p>}
        {sections.length > 0 && <>
          <div className="track-sections">
            {sections.map(section => <div className="track-section" key={section.examId || section.name}>
              <h3>{section.name}{section.detail && <span className="muted small"> · {section.detail}</span>}</h3>
              {section.subjects?.length > 0 && <div className="chips">
                {section.subjects.map(subject => <span className="chip" key={subject.name}>
                  {subject.name}{subject.questions ? ` · ${subject.questions} soru` : ''}</span>)}
              </div>}
            </div>)}
          </div>
          <p className="small muted">Soru sayıları geçmiş sınavlara göre beklenen dağılımdır; ÖSYM kılavuzu değişirse güncellenir.</p>
        </>}
        <div className="track-actions">
          {ready && <button type="button" className="btn btn-primary" disabled={saving} onClick={() => select(ready.id)}>
            {saving ? 'Geçiliyor…' : `${ready.name} içeriğine dön`}</button>}
          <Link to="/ogrenci-takip" className="btn btn-secondary">Haftalık programım</Link>
        </div>
      </section>
    </>
  );
}

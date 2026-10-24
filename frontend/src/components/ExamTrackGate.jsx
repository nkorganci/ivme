import { Link, Outlet, useLocation } from 'react-router-dom';
import { useExamTrack } from '../examTrack.jsx';
import { usePageTitle } from '../hooks.js';
import { STATISTICS_LABEL, STUDY_LABEL } from '../config.js';
import { Loading } from './States.jsx';

// Ortak menüdeki içerik sayfaları; seçilen sınavın içeriği hazır değilse aynı yerde bilgi gösterilir.
const PAGES = [
  ['/dersler-ve-konular', 'Dersler'],
  ['/konular-ve-kaynaklar', 'Konular ve kaynaklar'],
  ['/kaynakli-ders-notlari', 'Ders notları'],
  ['/cikmis-sorular', 'Çıkmış Sorular'],
  ['/soru-bankasi', 'Soru Bankası'],
  ['/calisma', STUDY_LABEL],
  ['/gecmis', STATISTICS_LABEL],
  ['/akilli-ogretmen', 'Akıllı Öğretmen'],
  ['/oneriler', 'Çalışma önerileri'],
  ['/ogrenci-takip', 'Denemeler'],
];
const pageLabel = path => path === '/' ? 'Ana Sayfa' : PAGES.find(([prefix]) => path.startsWith(prefix))?.[1] || 'Bu sayfa';

/** Seçilen sınavın içeriği hazırsa sayfayı, değilse "hazırlanıyor" bilgisini gösterir. */
export default function ExamTrackGate({ children }) {
  const { loading, contentReady } = useExamTrack();
  if (loading) return <Loading text="Sınav seçimi yükleniyor…" />;
  if (contentReady) return children ?? <Outlet />;
  return <TrackPreparing />;
}

function TrackPreparing() {
  const { pathname } = useLocation();
  const { tracks, track, saving, select } = useExamTrack();
  const page = pageLabel(pathname);
  usePageTitle(page);
  const ready = tracks.find(t => t.status === 'ACTIVE');
  const sections = Array.isArray(track.sections) ? track.sections : [];

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

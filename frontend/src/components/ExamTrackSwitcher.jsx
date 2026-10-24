import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from './Modal.jsx';
import { FAMILY_LABELS, TRACK_STATUS, useExamTrack } from '../examTrack.jsx';

/** Sol menünün üstündeki "Sınavım" seçicisi; seçim hesaba (PostgreSQL) kaydedilir. */
export default function ExamTrackSwitcher() {
  const { tracks, track, loading, saving, error, select } = useExamTrack();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (!track && !loading) return null;

  const choose = async id => {
    if (id === track?.id) { setOpen(false); return; }
    // Önceki sınavın süzgeçleri (ör. examType=TYT, konu kimlikleri) yeni sınavda geçersizdir.
    if (await select(id)) { setOpen(false); navigate(pathname, { replace: true }); }
  };
  const families = [...new Set(tracks.map(t => t.family))];
  const name = track?.name || 'Yükleniyor…';

  return (
    <>
      <button type="button" className="track-switch" onClick={() => setOpen(true)} disabled={!track}
        aria-haspopup="dialog" aria-label={`Sınavım: ${name}. Sınavı değiştir`} title={`Sınavım: ${name} — değiştir`}>
        <span className="track-switch-mark" aria-hidden="true">{track?.family || '…'}</span>
        <span className="label track-switch-text">
          <span className="track-switch-caption">Sınavım</span>
          <strong>{name}</strong>
        </span>
        <span className="label track-switch-change" aria-hidden="true">▾</span>
      </button>
      {open && <Modal title="Hangi sınava hazırlanıyorsun?" onClose={() => setOpen(false)}>
        <p className="muted">Menüler aynı kalır. Dersler, Soru Çöz &amp; Pratik ve istatistikler seçtiğin sınava göre
          güncellenir. Seçimin hesabına kaydedilir; istediğin zaman buradan değiştirebilirsin.</p>
        {error && <p className="field-error" role="alert">{error}</p>}
        {families.map(family => {
          const group = tracks.filter(t => t.family === family);
          const plannedNotes = [...new Set(group.filter(t => t.status === 'PLANNED').map(t => t.note).filter(Boolean))];
          return <section className="track-group" key={family} aria-labelledby={`track-group-${family}`}>
            <h3 id={`track-group-${family}`}>{FAMILY_LABELS[family] || family}</h3>
            <div className="track-options" role="radiogroup" aria-labelledby={`track-group-${family}`}>
              {group.map(t => {
                const planned = t.status === 'PLANNED';
                const selected = t.id === track?.id;
                const status = TRACK_STATUS[t.status] || TRACK_STATUS.PLANNED;
                return <button key={t.id} type="button" role="radio" aria-checked={selected} disabled={planned || saving}
                  className={`track-option${selected ? ' selected' : ''}`} onClick={() => choose(t.id)}>
                  <span className="track-option-head">
                    <strong>{t.name}</strong>
                    {selected && <span className="badge badge-primary">✓ Seçili</span>}
                    <span className={`badge badge-${status.badge}`}>{status.label}</span>
                  </span>
                  <span className="track-option-audience">{t.audience}</span>
                  {t.summary && <span className="track-option-detail">{t.summary}</span>}
                  {!planned && t.note && <span className="track-option-detail">{t.note}</span>}
                </button>;
              })}
            </div>
            {plannedNotes.map(note => <p className="track-group-note" key={note}>{note}</p>)}
          </section>;
        })}
      </Modal>}
    </>
  );
}

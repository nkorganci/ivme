import { useRef, useState } from 'react';
import { StarValue } from './Stars.jsx';
import QuestionBoard from './QuestionBoard.jsx';
import RatingForm from './RatingForm.jsx';
import ReportForm from './ReportForm.jsx';
import QrCard from './QrCard.jsx';
import { DIFFICULTIES, bankLabel, difficultyLabel } from '../format.js';

const TONE = { KOLAY: 'ok', ORTA: 'warn', ZOR: 'bad' };

/** Soru sayfasının dar yan paneli: kompakt künye + katlanır bölümler (varsayılan kapalı). */
export default function QuestionSide({ q, onRated }) {
  const [tab, setTab] = useState('board');
  const tabRefs = useRef({});
  const [boardAvailable, setBoardAvailable] = useState(true);
  const votes = q.difficultyVotes || {};
  const total = DIFFICULTIES.reduce((t, d) => t + (votes[d] || 0), 0);
  const availableTabs = [...(boardAvailable ? ['board'] : []), 'qr'];
  const selectTab = (next) => { setTab(next); tabRefs.current[next]?.focus(); };
  const onTabKeyDown = (event, current) => {
    const index = availableTabs.indexOf(current);
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % availableTabs.length
      : event.key === 'ArrowLeft' ? (index + availableTabs.length - 1) % availableTabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? availableTabs.length - 1 : -1;
    if (nextIndex >= 0) { event.preventDefault(); selectTab(availableTabs[nextIndex]); }
  };

  return (
    <aside className="card qside" aria-label="Soru bilgileri">
      <div className="qside-tabs" role="tablist" aria-label="Soru araçları">
        {boardAvailable && <button ref={(el) => { tabRefs.current.board = el; }} type="button" role="tab" tabIndex={tab === 'board' ? 0 : -1} id="tab-board" aria-controls="panel-board" aria-selected={tab === 'board'} onKeyDown={(e) => onTabKeyDown(e, 'board')} onClick={() => setTab('board')}>Karalama</button>}
        <button ref={(el) => { tabRefs.current.qr = el; }} type="button" role="tab" tabIndex={tab === 'qr' ? 0 : -1} id="tab-qr" aria-controls="panel-qr" aria-selected={tab === 'qr'} onKeyDown={(e) => onTabKeyDown(e, 'qr')} onClick={() => setTab('qr')}>QR ve bağlantı</button>
      </div>
      {boardAvailable && <div id="panel-board" role="tabpanel" aria-labelledby="tab-board" hidden={tab !== 'board'}>
        <QuestionBoard questionId={q.id} onUnavailable={() => { setBoardAvailable(false); setTab('qr'); }} />
      </div>}
      <div id="panel-qr" role="tabpanel" aria-labelledby="tab-qr" hidden={tab !== 'qr'}><QrCard question={q} /></div>
      <dl className="meta">
        <dt>Koleksiyon</dt>
        <dd>{bankLabel(q.bank)}</dd>
        <dt>Sınav</dt>
        <dd>{q.examType}</dd>
        <dt>Ders</dt>
        <dd>{q.subject}</dd>
        <dt>Konu</dt>
        <dd>{q.topic || '—'}</dd>
        <dt>Yıl</dt>
        <dd>{q.year || '—'}</dd>
        <dt>Kaynak</dt>
        <dd>{q.source || '—'}</dd>
      </dl>

      <details className="fold">
        <summary>
          Topluluk · <StarValue value={q.avgRating} /> · {q.ratingCount || 0} oy
        </summary>
        <div className="fold-body">
          {total === 0 ? (
            <p className="muted small">Henüz zorluk oyu yok.</p>
          ) : (
            <>
              <div className="votebar" role="img" aria-label={DIFFICULTIES.map((d) => `${difficultyLabel(d)} ${votes[d] || 0} oy`).join(', ')}>
                {DIFFICULTIES.map((d) => (
                  <span key={d} className={`vote-${TONE[d]}`} style={{ width: `${((votes[d] || 0) / total) * 100}%` }} />
                ))}
              </div>
              <ul className="vote-legend">
                {DIFFICULTIES.map((d) => (
                  <li key={d}>
                    <span className={`dot vote-${TONE[d]}`} aria-hidden="true" /> {difficultyLabel(d)}: {votes[d] || 0} oy
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </details>

      <details className="fold">
        <summary>Değerlendir</summary>
        <div className="fold-body">
          <RatingForm question={q} onSaved={onRated} />
        </div>
      </details>

      <details className="fold">
        <summary>⚠ Sorun bildir</summary>
        <div className="fold-body">
          <ReportForm question={q} />
        </div>
      </details>

    </aside>
  );
}

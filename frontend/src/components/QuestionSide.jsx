import { StarValue } from './Stars.jsx';
import RatingForm from './RatingForm.jsx';
import ReportForm from './ReportForm.jsx';
import QrCard from './QrCard.jsx';
import { DIFFICULTIES, difficultyLabel } from '../format.js';

const TONE = { KOLAY: 'ok', ORTA: 'warn', ZOR: 'bad' };

/** Soru sayfasının dar yan paneli: kompakt künye + katlanır bölümler (varsayılan kapalı). */
export default function QuestionSide({ q, onRated }) {
  const votes = q.difficultyVotes || {};
  const total = DIFFICULTIES.reduce((t, d) => t + (votes[d] || 0), 0);

  return (
    <aside className="card qside" aria-label="Soru bilgileri">
      <dl className="meta">
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

      <details className="fold">
        <summary>QR kodu ve bağlantı</summary>
        <div className="fold-body">
          <QrCard question={q} />
        </div>
      </details>
    </aside>
  );
}

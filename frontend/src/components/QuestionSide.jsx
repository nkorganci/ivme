import { useRef, useState } from 'react';
import { StarValue } from './Stars.jsx';
import QuestionBoard from './QuestionBoard.jsx';
import ScientificCalculator from './ScientificCalculator.jsx';
import RatingForm from './RatingForm.jsx';
import ReportForm from './ReportForm.jsx';
import QrCard from './QrCard.jsx';
import { api } from '../api.js';
import { DIFFICULTIES, bankLabel, difficultyLabel } from '../format.js';

const TONE = { KOLAY: 'ok', ORTA: 'warn', ZOR: 'bad' };

/** Soru görselinin yanındaki karalama, QR ve istatistik alanı. */
export default function QuestionSide({ q, onRated, canVote, boardAction }) {
  const [tab, setTab] = useState('board');
  const [expanded, setExpanded] = useState(true);
  const tabRefs = useRef({});
  const [boardAvailable, setBoardAvailable] = useState(true);
  const [help, setHelp] = useState(q.helpfulness);
  const [helpError, setHelpError] = useState('');
  const [helpBusy, setHelpBusy] = useState(false);
  const votes = q.difficultyVotes || {};
  const total = DIFFICULTIES.reduce((t, d) => t + (votes[d] || 0), 0);
  const availableTabs = [...(boardAvailable ? ['board', 'shapes', 'graph'] : []), 'calculator', 'qr'];
  const selectTab = (next) => { setExpanded(next !== 'qr'); setTab(next); tabRefs.current[next]?.focus(); };
  const onTabKeyDown = (event, current) => {
    const index = availableTabs.indexOf(current);
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % availableTabs.length
      : event.key === 'ArrowLeft' ? (index + availableTabs.length - 1) % availableTabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? availableTabs.length - 1 : -1;
    if (nextIndex >= 0) { event.preventDefault(); selectTab(availableTabs[nextIndex]); }
  };
  const voteHelp = async (helpful) => {
    setHelpBusy(true);
    setHelpError('');
    try { setHelp(await api.post(`/api/questions/${q.id}/helpfulness`, { helpful })); }
    catch (error) { setHelpError(error.message); }
    finally { setHelpBusy(false); }
  };

  return (
    <aside className={`card qside${expanded && tab !== 'qr' ? ' expanded' : ''}`} aria-label="Soru bilgileri">
      <div className="qside-head">
        <div className="qside-tabs" role="tablist" aria-label="Soru araçları">
          {boardAvailable && [['board', 'Karalama'], ['shapes', 'Şekiller'], ['graph', 'Grafik']].map(([key, label]) =>
            <button key={key} ref={(el) => { tabRefs.current[key] = el; }} type="button" role="tab" tabIndex={tab === key ? 0 : -1}
              id={`tab-${key}`} aria-controls="panel-workspace" aria-selected={tab === key}
              onKeyDown={(e) => onTabKeyDown(e, key)} onClick={() => selectTab(key)}>{label}</button>)}
          <button ref={(el) => { tabRefs.current.calculator = el; }} type="button" role="tab" tabIndex={tab === 'calculator' ? 0 : -1}
            id="tab-calculator" aria-controls="panel-calculator" aria-selected={tab === 'calculator'}
            onKeyDown={(e) => onTabKeyDown(e, 'calculator')} onClick={() => selectTab('calculator')}>Hesap makinesi</button>
          <button ref={(el) => { tabRefs.current.qr = el; }} type="button" role="tab" tabIndex={tab === 'qr' ? 0 : -1} id="tab-qr" aria-controls="panel-qr" aria-selected={tab === 'qr'} onKeyDown={(e) => onTabKeyDown(e, 'qr')} onClick={() => selectTab('qr')}>QR ve bağlantı</button>
        </div>
        {tab !== 'qr' && <button type="button" className="btn btn-secondary btn-sm"
          aria-pressed={expanded} onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Küçült' : 'Genişlet'}
        </button>}
      </div>
      {boardAvailable && <div id="panel-workspace" role="tabpanel" aria-labelledby={`tab-${tab}`} hidden={!['board', 'shapes', 'graph'].includes(tab)}>
        <QuestionBoard questionId={q.id} tool={tab} action={boardAction} onUnavailable={() => { setBoardAvailable(false); setTab('qr'); }} />
      </div>}
      {tab === 'calculator' && <div id="panel-calculator" role="tabpanel" aria-labelledby="tab-calculator" className="tool-workspace">
        <ScientificCalculator />
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
        <dt>Alt konu</dt>
        <dd>{q.approvedLabels?.filter((label) => label.kind === 'SUBTOPIC').map((label) => label.name).join(', ') || 'Onaylı etiket yok'}</dd>
        <dt>Soru tipi</dt>
        <dd>{q.approvedLabels?.filter((label) => label.kind === 'QUESTION_TYPE').map((label) => label.name).join(', ') || 'Onaylı etiket yok'}</dd>
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
        <summary>Bu soru faydalı mı?</summary>
        <div className="fold-body">
          <p className="muted small">Faydalı: {help?.helpful || 0} · Faydalı değil: {help?.notHelpful || 0}</p>
          {(help?.canVote || canVote) ? <div className="rate-row">
            <button type="button" className="btn btn-secondary btn-sm" aria-pressed={help.mine === true} disabled={helpBusy} onClick={() => voteHelp(true)}>Faydalı</button>
            <button type="button" className="btn btn-secondary btn-sm" aria-pressed={help.mine === false} disabled={helpBusy} onClick={() => voteHelp(false)}>Faydalı değil</button>
          </div> : <p className="muted small">Oy vermek için önce soruyu çöz.</p>}
          {helpError && <p role="alert">{helpError}</p>}
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

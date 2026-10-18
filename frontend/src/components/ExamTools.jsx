import { useRef, useState } from 'react';
import QuestionBoard from './QuestionBoard.jsx';
import QrCard from './QrCard.jsx';

/** Sınavda sorunun yanında kalan karalama ve QR araçları. */
export default function ExamTools({ question }) {
  const [tab, setTab] = useState('board');
  const [boardAvailable, setBoardAvailable] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const tabRefs = useRef({});
  const availableTabs = boardAvailable ? ['board', 'qr'] : ['qr'];
  const selectTab = (next) => { setExpanded(next === 'board'); setTab(next); tabRefs.current[next]?.focus(); };
  const onTabKeyDown = (event, current) => {
    const index = availableTabs.indexOf(current);
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % availableTabs.length
      : event.key === 'ArrowLeft' ? (index + availableTabs.length - 1) % availableTabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? availableTabs.length - 1 : -1;
    if (nextIndex >= 0) { event.preventDefault(); selectTab(availableTabs[nextIndex]); }
  };

  return <section className={`card exam-tool-card${expanded && tab === 'board' ? ' expanded' : ''}`}
      aria-label="Soru araçları">
    <div className="exam-tool-head">
      <div className="qside-tabs" role="tablist" aria-label="Soru araçları">
        {boardAvailable && <button ref={(el) => { tabRefs.current.board = el; }} type="button" role="tab"
          tabIndex={tab === 'board' ? 0 : -1} id="exam-board-tab" aria-selected={tab === 'board'}
          aria-controls="exam-board-panel" onKeyDown={(event) => onTabKeyDown(event, 'board')}
          onClick={() => selectTab('board')}>Karalama</button>}
        <button ref={(el) => { tabRefs.current.qr = el; }} type="button" role="tab"
          tabIndex={tab === 'qr' ? 0 : -1} id="exam-qr-tab" aria-selected={tab === 'qr'}
          aria-controls="exam-qr-panel" onKeyDown={(event) => onTabKeyDown(event, 'qr')}
          onClick={() => selectTab('qr')}>QR ve bağlantı</button>
      </div>
      {boardAvailable && tab === 'board' && <button type="button" className="btn btn-secondary btn-sm"
        aria-pressed={expanded} onClick={() => setExpanded((value) => !value)}>
        {expanded ? 'Küçült' : 'Genişlet'}
      </button>}
    </div>
    {boardAvailable && <div id="exam-board-panel" role="tabpanel" aria-labelledby="exam-board-tab" hidden={tab !== 'board'}>
      <QuestionBoard questionId={question.questionId}
        onUnavailable={() => { setBoardAvailable(false); setExpanded(false); setTab('qr'); }} />
    </div>}
    <div id="exam-qr-panel" role="tabpanel" aria-labelledby="exam-qr-tab" hidden={tab !== 'qr'}>
      <QrCard question={{ id: question.questionId, code: question.code }} />
    </div>
    </section>;
}

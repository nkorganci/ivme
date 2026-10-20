import { useRef, useState } from 'react';
import QuestionBoard from './QuestionBoard.jsx';
import ScientificCalculator from './ScientificCalculator.jsx';
import QrCard from './QrCard.jsx';

/** Sınavda sorunun yanında kalan karalama ve QR araçları. */
export default function ExamTools({ question }) {
  const [tab, setTab] = useState('board');
  const [boardAvailable, setBoardAvailable] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const tabRefs = useRef({});
  const availableTabs = [...(boardAvailable ? ['board', 'shapes', 'graph'] : []), 'calculator', 'qr'];
  const selectTab = (next) => { setExpanded(next !== 'qr'); setTab(next); tabRefs.current[next]?.focus(); };
  const onTabKeyDown = (event, current) => {
    const index = availableTabs.indexOf(current);
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % availableTabs.length
      : event.key === 'ArrowLeft' ? (index + availableTabs.length - 1) % availableTabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? availableTabs.length - 1 : -1;
    if (nextIndex >= 0) { event.preventDefault(); selectTab(availableTabs[nextIndex]); }
  };

  return <section className={`card exam-tool-card${expanded && tab !== 'qr' ? ' expanded' : ''}`}
      aria-label="Soru araçları">
    <div className="exam-tool-head">
      <div className="qside-tabs" role="tablist" aria-label="Soru araçları">
        {boardAvailable && [['board', 'Karalama'], ['shapes', 'Şekiller'], ['graph', 'Grafik']].map(([key, label]) =>
          <button key={key} ref={(el) => { tabRefs.current[key] = el; }} type="button" role="tab"
            tabIndex={tab === key ? 0 : -1} id={`exam-${key}-tab`} aria-selected={tab === key}
            aria-controls="exam-workspace-panel" onKeyDown={(event) => onTabKeyDown(event, key)}
            onClick={() => selectTab(key)}>{label}</button>)}
        <button ref={(el) => { tabRefs.current.calculator = el; }} type="button" role="tab"
          tabIndex={tab === 'calculator' ? 0 : -1} id="exam-calculator-tab" aria-selected={tab === 'calculator'}
          aria-controls="exam-calculator-panel" onKeyDown={(event) => onTabKeyDown(event, 'calculator')}
          onClick={() => selectTab('calculator')}>Hesap makinesi</button>
        <button ref={(el) => { tabRefs.current.qr = el; }} type="button" role="tab"
          tabIndex={tab === 'qr' ? 0 : -1} id="exam-qr-tab" aria-selected={tab === 'qr'}
          aria-controls="exam-qr-panel" onKeyDown={(event) => onTabKeyDown(event, 'qr')}
          onClick={() => selectTab('qr')}>QR ve bağlantı</button>
      </div>
      {tab !== 'qr' && <button type="button" className="btn btn-secondary btn-sm"
        aria-pressed={expanded} onClick={() => setExpanded((value) => !value)}>
        {expanded ? 'Küçült' : 'Genişlet'}
      </button>}
    </div>
    {boardAvailable && <div id="exam-workspace-panel" role="tabpanel" aria-labelledby={`exam-${tab}-tab`} hidden={!['board', 'shapes', 'graph'].includes(tab)}>
      <QuestionBoard questionId={question.questionId} tool={tab}
        onUnavailable={() => { setBoardAvailable(false); setExpanded(false); setTab('qr'); }} />
    </div>}
    {tab === 'calculator' && <div id="exam-calculator-panel" role="tabpanel" aria-labelledby="exam-calculator-tab" className="tool-workspace">
      <ScientificCalculator />
    </div>}
    <div id="exam-qr-panel" role="tabpanel" aria-labelledby="exam-qr-tab" hidden={tab !== 'qr'}>
      <QrCard question={{ id: question.questionId, code: question.code }} />
    </div>
    </section>;
}

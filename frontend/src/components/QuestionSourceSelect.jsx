import { useEffect, useId, useRef } from 'react';
import { QUESTION_SOURCES, QUESTION_HISTORY_SOURCES } from '../questionSources.js';

export default function QuestionSourceSelect({ value, onChange, history = [], onHistoryChange }) {
  const labelId = useId();
  const selectedId = useId();
  const dropdown = useRef(null);
  useEffect(() => {
    const close = event => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !dropdown.current?.contains(event.target)) {
        if (dropdown.current) dropdown.current.open = false;
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('focusin', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('focusin', close);
      document.removeEventListener('keydown', close);
    };
  }, []);
  const selected = QUESTION_SOURCES.filter(source => value.includes(source.id));
  const label = history.length ? `${selected.length + history.length} seçim`
    : selected.length === QUESTION_SOURCES.length ? 'Tüm kaynaklar'
    : selected.length === 1 ? selected[0].label : selected.length ? `${selected.length} kaynak seçili` : 'Kaynak seç';

  return <div className="field question-source-field">
    <span className="field-label" id={labelId}>Kaynak</span>
    <details className="question-source-select" ref={dropdown}>
      <summary aria-labelledby={`${labelId} ${selectedId}`}><span id={selectedId}>{label}</span></summary>
      <div className="question-source-options" role="group" aria-labelledby={labelId}>
        {QUESTION_SOURCES.map(source => <label className="checkbox" key={source.id}>
          <input type="checkbox" checked={value.includes(source.id)} onChange={event => onChange(event.target.checked
            ? [...value, source.id] : value.filter(id => id !== source.id))} />
          {source.label}
        </label>)}
        {onHistoryChange && <div className="question-history-sources">
          {QUESTION_HISTORY_SOURCES.map(option => <label className="checkbox" key={option.id}>
            <input type="checkbox" checked={history.includes(option.id)} onChange={event => onHistoryChange(event.target.checked
              ? [...history, option.id] : history.filter(id => id !== option.id))} />
            {option.label}
          </label>)}
        </div>}
      </div>
    </details>
  </div>;
}

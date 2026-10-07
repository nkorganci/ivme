import { useEffect } from 'react';
import { ignoreHotkey } from '../hooks.js';
import { LETTERS } from '../format.js';

/**
 * A–E şık düğmeleri. correct verilirse (kontrolden sonra) doğru şık yeşil, yanlış seçim kırmızı olur.
 * Klavye: A–E veya 1–5 tuşları şık seçer (form alanı odaktayken ya da pencere açıkken çalışmaz).
 */
export default function ChoiceButtons({ count = 5, value, onSelect, disabled = false, correct = null }) {
  useEffect(() => {
    if (disabled) return undefined;
    const onKey = (e) => {
      if (ignoreHotkey(e)) return;
      let idx = LETTERS.indexOf(e.key.toUpperCase());
      if (idx < 0 && /^[1-5]$/.test(e.key)) idx = Number(e.key) - 1;
      if (idx >= 0 && idx < count) onSelect(LETTERS[idx]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, disabled, onSelect]);

  return (
    <div className="choices" role="group" aria-label="Şıklar (kısayol: A–E veya 1–5)">
      {LETTERS.slice(0, count).map((l) => {
        let state = l === value ? 'selected' : '';
        let note = l === value ? ', seçili' : '';
        if (correct) {
          if (l === correct) [state, note] = ['correct', ', doğru cevap'];
          else if (l === value) [state, note] = ['wrong', ', yanlış seçimin'];
        }
        return (
          <button
            key={l}
            type="button"
            className={`choice ${state}`}
            aria-pressed={l === value}
            aria-label={`Şık ${l}${note}`}
            title={`${l} (tuş: ${l} veya ${LETTERS.indexOf(l) + 1})`}
            disabled={disabled}
            onClick={() => onSelect(l)}
          >
            {l}
            {state === 'correct' && (
              <span className="choice-mark" aria-hidden="true">
                ✓
              </span>
            )}
            {state === 'wrong' && (
              <span className="choice-mark" aria-hidden="true">
                ✗
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

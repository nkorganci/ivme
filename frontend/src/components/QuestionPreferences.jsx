import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Segmented from './Segmented.jsx';
import { DIFFICULTIES, difficultyLabel } from '../format.js';

const DIFFICULTY_OPTIONS = [...DIFFICULTIES.map((value) => ({ value, label: difficultyLabel(value) })), { value: 'NONE', label: 'Etiketsiz' }];
const REPEAT_OPTIONS = [
  { value: 'DEFAULT', label: 'Varsayılan' },
  { value: 'AGAIN', label: 'Tekrar göster' },
  { value: 'HIDE', label: 'Tekrar gösterme' },
];
const REPEAT_HINT = {
  DEFAULT: 'Soru seçimi değişmez.',
  AGAIN: 'Sonraki otomatik pratikte bu soru öne alınır; bir kez çözünce sıra biter, işaret kalır.',
  HIDE: 'Otomatik pratik, öneri ve konu setlerinden çıkar; soru bankası listesinde ve önceki/sonraki gezintisinde gösterilmez. Gizlediklerim filtresinden geri alabilirsin. Cevap geçmişin ve sabit deneme kitapçıkları korunur.',
};

/**
 * Öğrencinin bu soruya kişisel işaretleri (TAS-06): "Benim zorluk etiketim" ve "Tekrar tercihim".
 * Yalnız bu öğrenciye aittir; öğretmen zorluğu ve topluluk özetinden ayrıdır. Seçim anında sunucuya kaydedilir.
 * initial: { difficulty, repeat } verilmezse sunucudan okunur.
 */
export default function QuestionPreferences({ questionId, initial = null, onChanged }) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  useEffect(() => {
    setSaved(''); setError('');
    if (initial) { setState(initial); return undefined; }
    let active = true;
    setState(null);
    api.get(`/api/question-preferences/questions/${questionId}`)
      .then((data) => { if (active) setState(data); })
      .catch((problem) => { if (active) setError(problem.message); });
    return () => { active = false; };
  }, [questionId, initial?.difficulty, initial?.repeat]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (patch, message) => {
    setBusy(true); setError(''); setSaved('');
    try {
      const next = await api.put(`/api/question-preferences/questions/${questionId}`, patch);
      setState(next);
      setSaved(message);
      onChanged?.(next);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  if (!state) return error ? <p className="field-error" role="alert">{error}</p> : <p className="muted small" role="status">Kişisel işaretlerin yükleniyor…</p>;
  return <div className="question-prefs">
    <div className="question-prefs-controls">
    <div className="question-prefs-group">
    <p title="Yalnız sana ait; öğretmen zorluğundan ayrı"><strong>Benim zorluk etiketim</strong><span className="sr-only"> (yalnız sana ait; öğretmen zorluğundan ayrı)</span></p>
    <Segmented label="Benim zorluk etiketim" options={DIFFICULTY_OPTIONS} value={state.difficulty ?? 'NONE'} disabled={busy}
      onChange={(value) => save({ difficulty: value }, value === 'NONE' ? 'Zorluk etiketin kaldırıldı.' : `Zorluk etiketin: ${difficultyLabel(value)}.`)} />
    </div>
    <div className="question-prefs-group">
    <p><strong>Tekrar tercihim</strong></p>
    <Segmented label="Tekrar tercihim" options={REPEAT_OPTIONS} value={state.repeat ?? 'DEFAULT'} disabled={busy}
      onChange={(value) => save({ repeat: value }, `Tekrar tercihin: ${REPEAT_OPTIONS.find((o) => o.value === value).label}.`)} />
    </div>
    </div>
    <p className="muted small">{REPEAT_HINT[state.repeat ?? 'DEFAULT']}</p>
    {error && <p className="field-error" role="alert">{error}</p>}
    {saved && <p className="small" role="status">{saved}</p>}
  </div>;
}

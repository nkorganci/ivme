import { useState } from 'react';
import { api } from '../api.js';
import { StarInput } from './Stars.jsx';
import { Alert } from './States.jsx';

/**
 * Yıldız puanı (soru başına tek kayıt, tekrar gönderilirse güncellenir). Zorluk etiketi ayrı kişisel işarettir
 * (QuestionPreferences); yıldız gönderilince o etiket silinmez.
 */
export default function RatingForm({ question, onSaved }) {
  const mine = question.myEvaluation;
  const [rating, setRating] = useState(mine?.rating || null);
  const [state, setState] = useState({ busy: false, error: '', done: false });

  const save = async (e) => {
    e.preventDefault();
    if (!rating) {
      setState({ busy: false, done: false, error: 'Önce yıldız ver.' });
      return;
    }
    setState({ busy: true, error: '', done: false });
    try {
      await api.post('/api/feedback', {
        category: 'RATING',
        questionId: question.id,
        rating,
      });
      setState({ busy: false, error: '', done: true });
      onSaved?.();
    } catch (err) {
      setState({ busy: false, error: err.message, done: false });
    }
  };

  return (
    <form onSubmit={save}>
      <div className="rate-row">
        <StarInput label="Soru puanı" value={rating} onChange={setRating} />
      </div>
      {state.error && <Alert type="error">{state.error}</Alert>}
      {state.done && <Alert type="success">Değerlendirmen kaydedildi, teşekkürler.</Alert>}
      <button type="submit" className="btn btn-primary btn-sm" disabled={state.busy}>
        {state.busy ? 'Kaydediliyor…' : 'Kaydet'}
      </button>
    </form>
  );
}

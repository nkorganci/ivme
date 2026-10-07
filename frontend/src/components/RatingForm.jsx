import { useState } from 'react';
import { api } from '../api.js';
import Segmented from './Segmented.jsx';
import { StarInput } from './Stars.jsx';
import { Alert } from './States.jsx';
import { DIFFICULTIES, difficultyLabel } from '../format.js';

const OPTIONS = DIFFICULTIES.map((d) => ({ value: d, label: difficultyLabel(d) }));

/** Kullanıcının zorluk oyu + yıldız değerlendirmesi (soru başına tek kayıt, tekrar gönderilirse güncellenir). */
export default function RatingForm({ question, onSaved }) {
  const mine = question.myEvaluation;
  const [vote, setVote] = useState(mine?.difficultyVote || '');
  const [rating, setRating] = useState(mine?.rating || null);
  const [state, setState] = useState({ busy: false, error: '', done: false });

  const save = async (e) => {
    e.preventDefault();
    if (!vote && !rating) {
      setState({ busy: false, done: false, error: 'Önce bir zorluk seç ya da yıldız ver.' });
      return;
    }
    setState({ busy: true, error: '', done: false });
    try {
      await api.post('/api/feedback', {
        category: 'RATING',
        questionId: question.id,
        difficultyVote: vote || undefined,
        rating: rating || undefined,
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
        <Segmented label="Zorluk oyu" options={OPTIONS} value={vote} onChange={setVote} />
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

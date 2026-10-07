import { useState } from 'react';
import { api } from '../api.js';
import { Field } from './Field.jsx';
import { Alert } from './States.jsx';

const REASONS = ['Cevap anahtarı yanlış olabilir', 'Görsel bozuk veya okunmuyor', 'Soru hatalı', 'Diğer'];

/** Kompakt "Sorun bildir" formu: QUESTION_ISSUE geri bildirimi gönderir. */
export default function ReportForm({ question }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [text, setText] = useState('');
  const [state, setState] = useState({ busy: false, error: '', fieldError: '', done: false });

  const submit = async (e) => {
    e.preventDefault();
    const description = text.trim();
    if (description.length < 5) {
      setState({ busy: false, done: false, error: '', fieldError: 'Açıklama en az 5 karakter olmalı.' });
      return;
    }
    setState({ busy: true, error: '', fieldError: '', done: false });
    try {
      await api.post('/api/feedback', {
        category: 'QUESTION_ISSUE',
        questionId: question.id,
        message: reason === 'Diğer' ? description : `${reason}. ${description}`,
      });
      setText('');
      setState({ busy: false, error: '', fieldError: '', done: true });
    } catch (err) {
      setState({ busy: false, done: false, error: err.message, fieldError: err.fields.message || '' });
    }
  };

  if (state.done) {
    return (
      <>
        <Alert type="success">Bildirimin alındı, teşekkürler.</Alert>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setState({ busy: false, error: '', fieldError: '', done: false })}>
          Yeni bildirim
        </button>
      </>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field as="select" label="Sorun nedir?" value={reason} onChange={(e) => setReason(e.target.value)}>
        {REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Field>
      <Field
        as="textarea"
        label="Açıklama (en az 5 karakter)"
        rows={3}
        maxLength={1900}
        value={text}
        onChange={(e) => setText(e.target.value)}
        error={state.fieldError}
      />
      {state.error && <Alert type="error">{state.error}</Alert>}
      <button type="submit" className="btn btn-secondary btn-sm" disabled={state.busy}>
        {state.busy ? 'Gönderiliyor…' : 'Bildirimi gönder'}
      </button>
    </form>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { usePageTitle } from '../hooks.js';
import { displayName } from '../format.js';
import { Field } from '../components/Field.jsx';
import { StarInput } from '../components/Stars.jsx';
import { Alert } from '../components/States.jsx';

export default function Feedback() {
  const { user } = useAuth();
  usePageTitle('Geri Bildirim');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (message.trim().length < 5) {
      setErrors({ message: 'Mesaj en az 5 karakter olmalı.' });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await api.post('/api/feedback', { category: 'GENERAL', message: message.trim(), rating: rating || undefined });
      setDone(true);
    } catch (err) {
      setErrors(err.fields);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const again = () => {
    setMessage('');
    setRating(null);
    setDone(false);
  };

  return (
    <>
      <h1>{displayName(user)}, görüşün bizim için değerli</h1>
      <p className="muted lead">
        Uygulamayla ilgili görüş ve önerilerini buradan iletebilirsin. Belirli bir soruyla ilgili geri bildirimi ise ilgili{' '}
        <Link to="/sorular">soru sayfasından</Link> verebilirsin.
      </p>
      {done ? (
        <section className="card form-card">
          <Alert type="success">
            <strong>Teşekkürler!</strong> Görüşün bize ulaştı.
          </Alert>
          <button type="button" className="btn btn-secondary" onClick={again}>
            Yeni bir görüş gönder
          </button>
        </section>
      ) : (
        <form className="card form-card" onSubmit={submit} noValidate>
          <Field
            as="textarea"
            label="Mesajın"
            rows={6}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            hint={`${message.length} / 2000`}
            error={errors.message}
          />
          <p className="field-label">Uygulamayı nasıl buldun? (isteğe bağlı)</p>
          <StarInput label="Genel puan" value={rating} onChange={setRating} />
          {error && !errors.message && <Alert type="error">{error}</Alert>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Gönderiliyor…' : 'Gönder'}
          </button>
        </form>
      )}
    </>
  );
}

import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { usePageTitle } from '../hooks.js';
import { Field } from '../components/Field.jsx';
import { Alert } from '../components/States.jsx';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

export default function Account() {
  const { user } = useAuth();
  usePageTitle('Hesap');
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ busy: false, error: '', done: false });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Mevcut şifreni gir.';
    if (form.newPassword.length < 8) next.newPassword = 'Yeni şifre en az 8 karakter olmalı.';
    if (form.confirm !== form.newPassword) next.confirm = 'Şifreler eşleşmiyor.';
    setErrors(next);
    setState({ busy: false, error: '', done: false });
    if (Object.keys(next).length) return;

    setState({ busy: true, error: '', done: false });
    try {
      await api.put('/api/account/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm(EMPTY);
      setState({ busy: false, error: '', done: true });
    } catch (err) {
      setErrors(err.fields);
      setState({ busy: false, error: err.message, done: false });
    }
  };

  return (
    <>
      <h1>Hesap</h1>
      <p className="muted lead">
        {user.username} · {user.email}
      </p>
      <form className="card form-card" onSubmit={submit} noValidate>
        <h2>Şifre değiştir</h2>
        <Field
          label="Mevcut şifre"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={set('currentPassword')}
          error={errors.currentPassword}
        />
        <Field
          label="Yeni şifre"
          type="password"
          autoComplete="new-password"
          hint="En az 8 karakter."
          value={form.newPassword}
          onChange={set('newPassword')}
          error={errors.newPassword}
        />
        <Field
          label="Yeni şifre (tekrar)"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={set('confirm')}
          error={errors.confirm}
        />
        {state.error && !Object.keys(errors).length && <Alert type="error">{state.error}</Alert>}
        {state.done && <Alert type="success">Şifren güncellendi.</Alert>}
        <button type="submit" className="btn btn-primary" disabled={state.busy}>
          {state.busy ? 'Kaydediliyor…' : 'Şifreyi değiştir'}
        </button>
      </form>
    </>
  );
}

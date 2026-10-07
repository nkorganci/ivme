import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { usePageTitle } from '../hooks.js';
import AuthCard from '../components/AuthCard.jsx';
import { Field } from '../components/Field.jsx';
import { Alert } from '../components/States.jsx';

export default function Login() {
  const { user, login } = useAuth();
  usePageTitle('Giriş');
  const location = useLocation();
  const from = location.state?.from || '/';
  const [form, setForm] = useState({ login: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Giriş yapılınca (ya da zaten açık oturum varsa) geldiği adrese dön.
  if (user) return <Navigate to={from} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.login.trim()) next.login = 'Kullanıcı adı veya e-posta gerekli.';
    if (!form.password) next.password = 'Şifre gerekli.';
    setErrors(next);
    setError('');
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await login(form.login.trim(), form.password);
    } catch (err) {
      setErrors(err.fields);
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Giriş yap"
      footer={
        <>
          Hesabın yok mu? <Link to="/kayit" state={location.state}>Kayıt ol</Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <Field label="Kullanıcı adı veya e-posta" autoComplete="username" autoFocus value={form.login} onChange={set('login')} error={errors.login} />
        <Field label="Şifre" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
        {error && !Object.keys(errors).length && <Alert type="error">{error}</Alert>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>
      </form>
    </AuthCard>
  );
}

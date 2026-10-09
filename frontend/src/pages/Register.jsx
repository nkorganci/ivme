import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { usePageTitle } from '../hooks.js';
import AuthCard from '../components/AuthCard.jsx';
import { Field } from '../components/Field.jsx';
import { Alert } from '../components/States.jsx';

export default function Register() {
  const { user, register } = useAuth();
  usePageTitle('Kayıt');
  const location = useLocation();
  const from = location.state?.from || '/';
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    const username = form.username.trim();
    if (!/^[\p{L}\p{N}_.-]{3,30}$/u.test(username)) next.username = 'Kullanıcı adı 3–30 karakter olmalı (harf, rakam, _ . -).';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Geçerli bir e-posta adresi gir.';
    if (!form.phone.trim()) next.phone = 'Cep telefonu gerekli.';
    if (form.password.length < 15) next.password = 'Şifre en az 15 karakter olmalı.';
    else if (new TextEncoder().encode(form.password).length > 72) next.password = 'Şifre en fazla 72 bayt olmalı.';
    if (form.confirm !== form.password) next.confirm = 'Şifreler eşleşmiyor.';
    setErrors(next);
    setError('');
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await register(username, form.email.trim(), form.phone.trim(), form.password);
    } catch (err) {
      setErrors(err.fields);
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Kayıt ol"
      footer={
        <>
          Zaten hesabın var mı? <Link to="/giris" state={location.state}>Giriş yap</Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <Field label="Kullanıcı adı" autoComplete="username" autoFocus value={form.username} onChange={set('username')} error={errors.username} />
        <Field label="E-posta" type="email" autoComplete="email" hint="E-posta adresi şu anda gönderimle doğrulanmıyor." value={form.email} onChange={set('email')} error={errors.email} />
        <Field label="Cep telefonu" type="tel" inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx veya +90…" hint="Numara şu anda SMS ile doğrulanmıyor ve giriş için kullanılmıyor." value={form.phone} onChange={set('phone')} error={errors.phone} />
        <Field
          label="Şifre"
          type="password"
          autoComplete="new-password"
          hint="En az 15 karakter; boşluk kullanabilirsin."
          value={form.password}
          onChange={set('password')}
          error={errors.password}
        />
        <Field label="Şifre (tekrar)" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        {error && !Object.keys(errors).length && <Alert type="error">{error}</Alert>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Kayıt yapılıyor…' : 'Kayıt ol'}
        </button>
      </form>
    </AuthCard>
  );
}

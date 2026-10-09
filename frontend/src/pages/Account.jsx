import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { usePageTitle } from '../hooks.js';
import { Field } from '../components/Field.jsx';
import { Alert, Loading } from '../components/States.jsx';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

export default function Account() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  usePageTitle('Hesap');
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ busy: false, error: '', done: false });
  const [contact, setContact] = useState({ email: user.email, phone: '', currentPassword: '' });
  const [contactReady, setContactReady] = useState(false);
  const [contactErrors, setContactErrors] = useState({});
  const [contactState, setContactState] = useState({ busy: false, error: '', done: false });

  useEffect(() => {
    let active = true;
    api.get('/api/account/contact')
      .then((data) => {
        if (active) setContact({ email: data.email, phone: data.phone || '', currentPassword: '' });
      })
      .catch((err) => {
        if (active) setContactState({ busy: false, error: err.message, done: false });
      })
      .finally(() => { if (active) setContactReady(true); });
    return () => { active = false; };
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setContactField = (key) => (e) => setContact((f) => ({ ...f, [key]: e.target.value }));

  const saveContact = async (e) => {
    e.preventDefault();
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) next.email = 'Geçerli bir e-posta adresi gir.';
    if (!contact.phone.trim()) next.phone = 'Cep telefonu gerekli.';
    if (!contact.currentPassword) next.currentPassword = 'Mevcut şifreni gir.';
    setContactErrors(next);
    setContactState({ busy: false, error: '', done: false });
    if (Object.keys(next).length) return;

    setContactState({ busy: true, error: '', done: false });
    try {
      const saved = await api.put('/api/account/contact', {
        email: contact.email.trim(), phone: contact.phone.trim(), currentPassword: contact.currentPassword,
      });
      setContact({ email: saved.email, phone: saved.phone, currentPassword: '' });
      await refreshUser();
      setContactState({ busy: false, error: '', done: true });
      if (location.state?.from) navigate(location.state.from, { replace: true });
    } catch (err) {
      setContactErrors(err.fields || {});
      setContactState({ busy: false, error: err.message, done: false });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Mevcut şifreni gir.';
    if (form.newPassword.length < 15) next.newPassword = 'Yeni şifre en az 15 karakter olmalı.';
    else if (new TextEncoder().encode(form.newPassword).length > 72) next.newPassword = 'Şifre en fazla 72 bayt olmalı.';
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
      {!user.contactComplete && user.role !== 'ADMIN' &&
        <Alert type="error">Devam etmek için e-posta ve cep telefonu bilgilerini kaydet.</Alert>}
      {!contactReady ? <Loading text="İletişim bilgileri yükleniyor…" /> : (
        <form className="card form-card" onSubmit={saveContact} noValidate>
          <h2>İletişim bilgileri</h2>
          <Field label="E-posta" type="email" autoComplete="email" hint="E-posta adresi şu anda gönderimle doğrulanmıyor." value={contact.email} onChange={setContactField('email')} error={contactErrors.email} />
          <Field label="Cep telefonu" type="tel" inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx veya +90…" hint="Numara şu anda SMS ile doğrulanmıyor ve giriş için kullanılmıyor." value={contact.phone} onChange={setContactField('phone')} error={contactErrors.phone} />
          <Field label="Mevcut şifre" type="password" autoComplete="current-password" value={contact.currentPassword} onChange={setContactField('currentPassword')} error={contactErrors.currentPassword} />
          {contactState.error && !Object.keys(contactErrors).length && <Alert type="error">{contactState.error}</Alert>}
          {contactState.done && <Alert type="success">İletişim bilgilerin güncellendi.</Alert>}
          <button type="submit" className="btn btn-primary" disabled={contactState.busy}>
            {contactState.busy ? 'Kaydediliyor…' : 'İletişim bilgilerini kaydet'}
          </button>
        </form>
      )}
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
          hint="En az 15 karakter; boşluk kullanabilirsin."
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

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

const ROLES = [['ADMIN', 'Admin'], ['USER', 'Öğrenci'], ['TEACHER', 'Öğretmen'], ['PARENT', 'Veli']];

export default function DevAccountSwitcher() {
  const { user, switchAccount } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toolbar = useRef(null);
  useEffect(() => {
    if (!accounts.length) return;
    const update = () => document.documentElement.style.setProperty('--dev-toolbar-height', `${toolbar.current.offsetHeight}px`);
    const observer = new ResizeObserver(update);
    observer.observe(toolbar.current); update();
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--dev-toolbar-height'); };
  }, [accounts.length]);
  useEffect(() => {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return;
    let active = true;
    api.get('/api/auth/dev-accounts').then(value => { if (active && Array.isArray(value)) setAccounts(value); }).catch(() => {});
    return () => { active = false; };
  }, [user?.id]);
  if (!accounts.length) return null;
  const select = async role => {
    setBusy(true); setError('');
    try {
      await switchAccount(role);
      navigate(role === 'ADMIN' ? '/yonetim?sekme=kullanicilar' : '/', { replace: true });
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <div ref={toolbar} className="dev-account-switcher" role="group" aria-label="Yerel test hesabı">
    <span>Yerel test:</span>
    {ROLES.map(([role, label]) => {
      const account = accounts.find(value => value.role === role);
      const selected = account && user?.username === account.username;
      return <button key={role} type="button" className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-secondary'}`}
        aria-pressed={!!selected} disabled={busy || !account} title={account?.username || 'Test hesabı bulunamadı'}
        onClick={() => select(role)}>{label}</button>;
    })}
    {error && <span role="alert">{error}</span>}
  </div>;
}

import { useState } from 'react';
import { useAuth } from '../auth.jsx';

export default function StudentAccountButton({ account }) {
  const { impersonateStudent } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (account.role && account.role !== 'USER') return null;
  const available = account.enabled && account.approved !== false && !account.archivedAt;
  const enter = async event => {
    event.stopPropagation();
    setBusy(true); setError('');
    try { await impersonateStudent(account.id); }
    catch (failure) { setError(failure.message); setBusy(false); }
  };
  return <span>
    <button type="button" className="btn btn-primary btn-sm" disabled={busy || !available}
      aria-label={`${account.username} hesabına gir`}
      title={available ? 'Öğrencinin hesabını aç ve onun adına işlem yap' : 'Hesap onaylı ve etkin olmalıdır'} onClick={enter}>
      {busy ? 'Açılıyor…' : 'Hesabına gir'}
    </button>
    {error && <span className="field-error" role="alert">{error}</span>}
  </span>;
}

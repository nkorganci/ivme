import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { displayName } from '../format.js';

export default function StudentAccountBanner() {
  const { user, returnToAdmin } = useAuth();
  const [error, setError] = useState('');
  const [returning, setReturning] = useState(false);
  if (!user?.impersonating) return null;
  const leaveStudent = async () => {
    setReturning(true); setError('');
    try { await returnToAdmin(); }
    catch (failure) { setError(failure.message); setReturning(false); }
  };
  return <div className="student-account-banner" role="region" aria-label="Yönetici öğrenci oturumu">
    <div><strong>{displayName(user)} hesabındasın.</strong> İşlemler bu öğrencinin hesabına kaydedilir.</div>
    <button type="button" className="btn btn-secondary" disabled={returning} onClick={leaveStudent}>
      {returning ? 'Dönülüyor…' : 'Yönetici hesabına dön'}
    </button>
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>;
}

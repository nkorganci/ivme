import { useEffect, useState } from 'react';

export default function PracticeTimer({ session, onExpire }) {
  const [now, setNow] = useState(Date.now());
  const [offset] = useState(() => new Date(session.serverNow).getTime() - Date.now());
  const remaining = session.deadlineAt
    ? Math.max(0, Math.ceil((new Date(session.deadlineAt).getTime() - now - offset) / 1000))
    : null;
  useEffect(() => {
    if (session.status !== 'IN_PROGRESS') return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session.status]);
  useEffect(() => {
    if (session.deadlineAt && session.status === 'IN_PROGRESS' && remaining === 0) onExpire?.();
  }, [remaining, session.deadlineAt, session.status, onExpire]);
  if (!session.deadlineAt || session.status !== 'IN_PROGRESS') return null;
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  return <p className={`practice-timer${remaining <= 60 ? ' practice-timer-warning' : ''}`} role="timer" aria-label={`Kalan süre ${minutes} dakika ${seconds} saniye`}>
    Kalan süre: <strong>{minutes}:{seconds}</strong>{remaining <= 60 && ' · Süre bitiyor'}
  </p>;
}

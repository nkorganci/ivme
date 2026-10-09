import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Loading } from './States.jsx';

/** Oturum yoksa girişe yollar; özel ekranlar için sunucu rolüyle aynı sınırı uygular. */
export default function RequireAuth({ admin = false, operator = false, student = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading text="Oturum kontrol ediliyor…" />;
  if (!user) return <Navigate to="/giris" replace state={{ from: location.pathname + location.search }} />;
  if (user.role === 'USER' && !user.contactComplete && location.pathname !== '/hesap') {
    return <Navigate to="/hesap" replace state={{ from: location.pathname + location.search }} />;
  }
  if (admin && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  if (operator && user.role !== 'OPERATOR') return <Navigate to="/" replace />;
  if (student && user.role !== 'USER') return <Navigate to="/" replace />;
  return <Outlet />;
}

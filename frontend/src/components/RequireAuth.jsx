import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Loading } from './States.jsx';

/** Oturum yoksa girişe yollar (geldiği adres saklanır); admin=true ise yalnız ADMIN geçer. */
export default function RequireAuth({ admin = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading text="Oturum kontrol ediliyor…" />;
  if (!user) return <Navigate to="/giris" replace state={{ from: location.pathname + location.search }} />;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <Outlet />;
}

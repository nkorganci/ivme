import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { usePageTitle } from '../hooks.js';
import AdminStats from './admin/AdminStats.jsx';
import AdminAccounts from './admin/AdminAccounts.jsx';

export default function Admin() {
  usePageTitle('Yönetim');
  const { user } = useAuth();
  const [params] = useSearchParams();
  const showAccounts = user?.siteManager && params.get('sekme') !== 'kullanim';
  return <>
    <h1>Yönetim</h1>
    {user?.siteManager && <nav className="tabs" aria-label="Yönetim sekmeleri">
      <Link to="/yonetim?sekme=kullanicilar" className={showAccounts ? 'active' : ''}
        aria-current={showAccounts ? 'page' : undefined}>Kullanıcılar</Link>
      <Link to="/yonetim?sekme=kullanim" className={!showAccounts ? 'active' : ''}
        aria-current={!showAccounts ? 'page' : undefined}>Kullanım özeti</Link>
    </nav>}
    {showAccounts ? <AdminAccounts /> : <AdminStats />}
  </>;
}

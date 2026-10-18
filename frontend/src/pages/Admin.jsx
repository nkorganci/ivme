import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { usePageTitle } from '../hooks.js';
import AdminStats from './admin/AdminStats.jsx';
import AdminStudents from './admin/AdminStudents.jsx';

export default function Admin() {
  usePageTitle('Yönetim');
  const { user } = useAuth();
  const [params] = useSearchParams();
  const showStudents = user?.siteManager && params.get('sekme') !== 'kullanim';
  return <>
    <h1>Yönetim</h1>
    {user?.siteManager && <nav className="tabs" aria-label="Yönetim sekmeleri">
      <Link to="/yonetim?sekme=ogrenciler" className={showStudents ? 'active' : ''}
        aria-current={showStudents ? 'page' : undefined}>Kayıtlı öğrenciler</Link>
      <Link to="/yonetim?sekme=kullanim" className={!showStudents ? 'active' : ''}
        aria-current={!showStudents ? 'page' : undefined}>Kullanım özeti</Link>
    </nav>}
    {showStudents ? <AdminStudents /> : <AdminStats />}
  </>;
}

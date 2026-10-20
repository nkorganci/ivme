import { useAuth } from '../auth.jsx';
import { usePageTitle } from '../hooks.js';
import AdminAccounts from './admin/AdminAccounts.jsx';

export default function Admin() {
  usePageTitle('Yönetim');
  const { user } = useAuth();
  return <>
    <h1>Yönetim</h1>
    {user?.siteManager && <AdminAccounts />}
  </>;
}

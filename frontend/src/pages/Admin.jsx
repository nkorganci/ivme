import { usePageTitle } from '../hooks.js';
import AdminStats from './admin/AdminStats.jsx';

/** Ürün yöneticisinin yalnız toplu kullanım özeti. */
export default function Admin() {
  usePageTitle('Yönetim');
  return <><h1>Yönetim · Kullanım özeti</h1><AdminStats /></>;
}

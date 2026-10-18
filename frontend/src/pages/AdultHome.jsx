import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { usePageTitle } from '../hooks.js';
import { displayName } from '../format.js';

export default function AdultHome() {
  const { user } = useAuth();
  const role = user.role === 'TEACHER' ? 'Öğretmen' : 'Veli';
  usePageTitle(`${role} ana sayfası`);
  return <section>
    <h1>Merhaba, {displayName(user)}</h1>
    <p className="lead">{role} hesabı</p>
    <div className="card">
      <p>Hesabınız onaylandı. Öğrenci bağlantıları ve takip ekranları henüz kullanıma açılmadı.</p>
      <Link className="btn btn-secondary" to="/hesap">Hesap bilgilerim</Link>
    </div>
  </section>;
}

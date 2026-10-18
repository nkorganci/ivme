import { NavLink, Outlet } from 'react-router-dom';
import { usePageTitle } from '../hooks.js';

export default function StudentTrackingPortal() {
  usePageTitle('Öğrenci Takip Portalı');
  return <div className="student-tracking-portal">
    <div className="page-head"><h1>Öğrenci Takip Portalı</h1></div>
    <nav className="tabs tracking-tabs" aria-label="Öğrenci takip bölümleri">
      <NavLink to="/ogrenci-takip" end>Haftalık Program</NavLink>
      <NavLink to="/ogrenci-takip/matematik-ozel-ders">Matematik Özel Ders</NavLink>
      <NavLink to="/ogrenci-takip/tyt-denemeleri">TYT Denemeleri</NavLink>
      <NavLink to="/ogrenci-takip/ayt-denemeleri">AYT Denemeleri</NavLink>
    </nav>
    <Outlet />
  </div>;
}

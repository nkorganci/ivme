import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { APP_NAME } from '../config.js';
import { displayName } from '../format.js';

const LINKS = [
  ['/', 'Ana Sayfa'],
  ['/sorular', 'Soru Bankası'],
  ['/sinav/yeni', 'Sınav Başlat'],
  ['/gecmis', 'Geçmişim'],
  ['/geri-bildirim', 'Geri Bildirim'],
];

function isActive(path, to) {
  if (to === '/') return path === '/';
  if (to === '/sorular') return path.startsWith('/sorular') || path.startsWith('/soru/');
  return path.startsWith(to);
}

/** Üst gezinme çubuğu + sayfa içeriği. */
export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
    setUserOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onDown = (e) => userRef.current && !userRef.current.contains(e.target) && setUserOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setUserOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const links = user.role === 'ADMIN' ? [['/yonetim', 'Yönetim']]
    : user.role === 'OPERATOR' ? [['/icerik-bakimi', 'İçerik bakımı']] : LINKS;

  const signOut = async () => {
    await logout().catch(() => {});
    navigate('/giris', { replace: true });
  };

  return (
    <>
      <a className="skip-link" href="#icerik">
        İçeriğe geç
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <button
            type="button"
            className="icon-btn hamburger"
            aria-label="Menüyü aç/kapat"
            aria-expanded={menuOpen}
            aria-controls="ana-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
          <Link to="/" className="brand">
            {APP_NAME}
          </Link>
          <nav id="ana-menu" className={`mainnav${menuOpen ? ' open' : ''}`} aria-label="Ana gezinme">
            {links.map(([to, text]) => (
              <Link key={to} to={to} className={isActive(pathname, to) ? 'active' : ''} aria-current={isActive(pathname, to) ? 'page' : undefined}>
                {text}
              </Link>
            ))}
          </nav>
          <div className="usermenu" ref={userRef}>
            <button type="button" className="user-btn" aria-haspopup="menu" aria-expanded={userOpen} onClick={() => setUserOpen((o) => !o)}>
              <span className="avatar" aria-hidden="true">
                {displayName(user).charAt(0)}
              </span>
              <span className="user-name">{displayName(user)}</span>
              <span aria-hidden="true">▾</span>
            </button>
            {userOpen && (
              <div className="dropdown" role="menu">
                <Link to="/hesap" role="menuitem">
                  Hesap
                </Link>
                <button type="button" role="menuitem" onClick={signOut}>
                  Çıkış
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main id="icerik" className={`container${pathname.startsWith('/soru/') ? ' wide' : ''}`} tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}

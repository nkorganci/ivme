import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { APP_NAME } from '../config.js';
import { displayName } from '../format.js';
import Icon from './Icons.jsx';

const ITEMS = [
  ['/', 'Ana Sayfa', 'home'],
  ['/cikmis-sorular', 'AYT-TYT Çıkmış Sorular', 'book'],
  ['/soru-bankasi', 'Soru Bankası', 'layers'],
  ['/konu-anlatimlari', 'Konu anlatımları', 'book'],
  ['/pratik/yeni', 'Pratik Başlat', 'play'],
  ['/sinav/yeni', 'Sınav Başlat', 'play'],
  ['/gecmis', 'Geçmişim', 'clock'],
  ['/ilerleme', 'İlerlemem', 'clock'],
  ['/geri-bildirim', 'Geri Bildirim', 'message'],
];
const RAIL_KEY = 'yks.sidebar';

// Soru sayfasında vurgulanacak koleksiyon: adresteki ?bank=, yoksa yüklenen sorunun koleksiyonu (loaded).
function isActive(path, search, to, loaded) {
  if (to === '/') return path === '/';
  if (path.startsWith('/soru/')) {
    const bank = new URLSearchParams(search).get('bank') || loaded;
    return (to === '/soru-bankasi' && bank === 'OGM') || (to === '/cikmis-sorular' && bank === 'CIKMIS');
  }
  return path.startsWith(to);
}

/**
 * Sol menü + içerik. Masaüstünde sabit menü (ray moduna daralır; tercih localStorage'da),
 * soru sayfasında varsayılan ray; dar ekranda üst ince çubuk + sol çekmece.
 */
export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [pref, setPref] = useState(() => localStorage.getItem(RAIL_KEY) === 'rail'); // true = ray
  const [questionOpen, setQuestionOpen] = useState(false); // soru sayfasında kullanıcı menüyü genişletti mi
  const [drawer, setDrawer] = useState(false);
  const [questionBank, setQuestionBank] = useState(''); // soru sayfası, yüklenen sorunun koleksiyonunu Outlet bağlamıyla bildirir
  const onQuestion = pathname.startsWith('/soru/');
  const rail = onQuestion ? !questionOpen : pref;
  const name = displayName(user);

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  useEffect(() => {
    if (!onQuestion) setQuestionOpen(false);
  }, [onQuestion]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const toggleRail = () => {
    if (onQuestion) {
      setQuestionOpen((o) => !o);
      return;
    }
    const next = !pref;
    localStorage.setItem(RAIL_KEY, next ? 'rail' : 'full');
    setPref(next);
  };

  const items = user.role === 'ADMIN' ? [['/yonetim', 'Yönetim', 'shield']]
    : user.role === 'OPERATOR' ? [['/icerik-bakimi', 'İçerik bakımı', 'shield']] : ITEMS;

  const signOut = async () => {
    await logout().catch(() => {});
    navigate('/giris', { replace: true });
  };

  return (
    <div className={`shell${rail ? ' rail' : ''}`}>
      <a className="skip-link" href="#icerik">
        İçeriğe geç
      </a>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
      <aside id="sol-menu" className={`sidebar${drawer ? ' open' : ''}`} aria-label="Ana gezinme">
        <div className="side-head">
          <Link to="/" className="brand" title={APP_NAME} aria-label={`${APP_NAME} ana sayfa`}>
            <span className="brand-mark" aria-hidden="true">
              H
            </span>
            <span className="label">{APP_NAME}</span>
          </Link>
          <button
            type="button"
            className="icon-btn side-toggle"
            onClick={toggleRail}
            aria-label={rail ? 'Menüyü genişlet' : 'Menüyü daralt'}
            title={rail ? 'Menüyü genişlet' : 'Menüyü daralt'}
          >
            <Icon name={rail ? 'expand' : 'collapse'} />
          </button>
        </div>
        <nav className="sidenav">
          {items.map(([to, text, icon]) => {
            const active = isActive(pathname, search, to, questionBank);
            return (
              <Link key={to} to={to} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} aria-label={text} title={text}>
                <Icon name={icon} />
                <span className="label">{text}</span>
              </Link>
            );
          })}
        </nav>
        <div className="side-user">
          <div className="who" title={name}>
            <span className="avatar" aria-hidden="true">
              {name.charAt(0)}
            </span>
            <span className="label user-name">{name}</span>
          </div>
          <Link to="/hesap" className={`side-link${pathname === '/hesap' ? ' active' : ''}`} aria-label="Hesap" title="Hesap">
            <Icon name="user" />
            <span className="label">Hesap</span>
          </Link>
          <button type="button" className="side-link" onClick={signOut} aria-label="Çıkış" title="Çıkış">
            <Icon name="logout" />
            <span className="label">Çıkış</span>
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="mobilebar">
          <button type="button" className="icon-btn" aria-label="Menüyü aç" aria-expanded={drawer} aria-controls="sol-menu" onClick={() => setDrawer(true)}>
            <Icon name="menu" />
          </button>
          <Link to="/" className="brand">
            {APP_NAME}
          </Link>
        </header>
        <main id="icerik" className={`container${onQuestion ? ' wide' : ''}`} tabIndex={-1}>
          <Outlet context={{ setQuestionBank }} />
        </main>
      </div>
    </div>
  );
}

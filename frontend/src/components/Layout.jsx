import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { APP_NAME, STUDY_LABEL, STATISTICS_LABEL } from '../config.js';
import { displayName } from '../format.js';
import Icon from './Icons.jsx';
import { api } from '../api.js';
import { CURRICULUM } from '../curriculum.js';
import ResourcesNavigation,{RESOURCE_HOME,isResourcePath,ResourceNavigationContext} from './ResourcesNavigation.jsx';
import { useDisplayPreference } from '../useDisplayPreference.js';

const ITEMS = [
  ['/', 'Ana Sayfa', 'home'],
  [RESOURCE_HOME, 'Konular ve Kaynaklar', 'book'],
  ['/akilli-ogretmen', 'Akıllı Öğretmen', 'layers'],
  ['/oneriler', 'Çalışma önerileri', 'clock'],
  ['/ogrenci-takip', 'Öğrenci Takip Portalı', 'clock'],
  ['/calisma/yeni', STUDY_LABEL, 'play'],
  ['/gecmis', STATISTICS_LABEL, 'clock'],
  ['/geri-bildirim', 'Geri Bildirim', 'message'],
];
const TRACKING_PATH = '/ogrenci-takip';
const REVIEW_PATH = '/ogretmen-dogrulamasi';
const REVIEW_BRANCHES = [...new Map(Object.values(CURRICULUM).flat().map(s => [s.id, s.name])).entries()];
const TRACKING_ITEMS = [
  [TRACKING_PATH, 'Haftalık Program'],
  [`${TRACKING_PATH}/matematik-ozel-ders`, 'Matematik Özel Ders'],
  [`${TRACKING_PATH}/tyt-denemeleri`, 'TYT Denemeleri'],
  [`${TRACKING_PATH}/ayt-denemeleri`, 'AYT Denemeleri'],
];

function isActive(path, to) {
  if(to===RESOURCE_HOME)return isResourcePath(path);
  if (to === '/') return path === '/';
  if (to === '/calisma/yeni') {
    return ['/calisma/yeni', '/cikmis-sorular', '/soru-bankasi', '/sorular', '/soru/', '/pratik/', '/sinav/']
      .some((prefix) => path === prefix || (prefix.endsWith('/') && path.startsWith(prefix)));
  }
  return path.startsWith(to);
}

/**
 * Sol menü + içerik. Masaüstünde sabit menü (ray moduna daralır; tercih hesapta saklanır),
 * soru sayfasında varsayılan ray; dar ekranda üst ince çubuk + sol çekmece.
 */
export default function Layout() {
  const [resourceSelection,setResourceSelection]=useState(null);
  const { user, logout, refreshUser, activityError } = useAuth();
  const [reviewSwitchError, setReviewSwitchError] = useState('');
  const [signOutError, setSignOutError] = useState('');
  const [switchingReview, setSwitchingReview] = useState(false);
  const [localReviewerAvailable, setLocalReviewerAvailable] = useState(false);
  useEffect(() => {
    if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
    let active = true;
    api.get('/api/auth/dev-review-available').then(available => { if (active) setLocalReviewerAvailable(available === true); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const localReviewSwitch = localReviewerAvailable && ['localhost', '127.0.0.1'].includes(location.hostname);
  const switchReview = async (branch = 'fizik') => {
    setSwitchingReview(true); setReviewSwitchError('');
    try {
      await api.post(user.role === 'OPERATOR' ? '/api/auth/dev-login' : '/api/auth/dev-teacher-review-login');
      await refreshUser(); navigate(user.role === 'OPERATOR' ? '/' : `${REVIEW_PATH}/${branch}`);
    } catch (error) { setReviewSwitchError(error.message); }
    finally { setSwitchingReview(false); }
  };
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [pref, setPref, preferenceError] = useDisplayPreference('sidebar-rail', false); // true = ray
  const [questionOpen, setQuestionOpen] = useState(false); // soru sayfasında kullanıcı menüyü genişletti mi
  const [drawer, setDrawer] = useState(false);
  const sidebarRef=useRef(null);
  const [, setQuestionBank] = useState(''); // Soru ekranının mevcut Outlet sözleşmesini korur.
  const trackingActive = pathname === TRACKING_PATH || pathname.startsWith(`${TRACKING_PATH}/`);
  const [trackingOpen, setTrackingOpen] = useState(trackingActive);
  const reviewActive = pathname.startsWith(REVIEW_PATH);
  const [reviewOpen, setReviewOpen] = useState(reviewActive);
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
    if (trackingActive) setTrackingOpen(true);
  }, [trackingActive]);

  useEffect(() => { if (reviewActive) setReviewOpen(true); }, [reviewActive]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(()=>{
    if(!drawer)return;
    const previous=document.activeElement;
    const elements=()=>[...(sidebarRef.current?.querySelectorAll('a[href],button:not(:disabled)') || [])].filter(e=>e.getClientRects().length);
    elements()[0]?.focus();
    const trap=e=>{if(e.key!=='Tab')return;const items=elements(),first=items[0],last=items.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};
    document.addEventListener('keydown',trap);
    return()=>{document.removeEventListener('keydown',trap);previous?.focus?.();};
  },[drawer]);

  const toggleRail = () => {
    if (onQuestion) {
      setQuestionOpen((o) => !o);
      return;
    }
    const next = !pref;
    setPref(next);
  };

  const items = user.role === 'ADMIN' ? [['/yonetim', 'Yönetim', 'shield']]
    : user.role === 'OPERATOR' ? [[REVIEW_PATH, 'Öğretmen Doğrulaması', 'book'], ['/akilli-ogretmen-inceleme', 'Akıllı Öğretmen İnceleme', 'layers'], ['/icerik-bakimi', 'İçerik bakımı', 'shield']]
      : ['TEACHER', 'PARENT'].includes(user.role) ? [['/', 'Ana Sayfa', 'home']]
        : [...ITEMS, ...(localReviewSwitch ? [[REVIEW_PATH, 'Öğretmen Doğrulaması', 'book']] : [])];

  const signOut = async () => {
    setSignOutError('');
    try { await logout(); navigate('/giris', { replace: true }); }
    catch (error) { setSignOutError(`Çıkış yapılamadı: ${error.message}`); }
  };

  return (
    <ResourceNavigationContext.Provider value={{value:resourceSelection,set:setResourceSelection}}><div className={`shell${rail ? ' rail' : ''}`}>
      <a className="skip-link" href="#icerik">
        İçeriğe geç
      </a>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
      <aside ref={sidebarRef} id="sol-menu" className={`sidebar${drawer ? ' open' : ''}`} aria-label="Ana gezinme">
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
            const active = isActive(pathname, to);
            if (to === REVIEW_PATH) return <div className="side-nav-group" key={to}>
              <button type="button" className={`side-nav-toggle${active ? ' active' : ''}`} aria-expanded={reviewOpen && !rail} aria-controls="review-subnav"
                aria-label={`${text} alt menüsünü ${reviewOpen && !rail ? 'kapat' : 'aç'}`} onClick={() => { if (rail) { toggleRail(); setReviewOpen(true); } else setReviewOpen(v => !v); }}>
                <Icon name={icon} /><span className="label">{text}</span><span className="side-nav-chevron label" aria-hidden="true">{reviewOpen ? '▴' : '▾'}</span>
              </button>
              {reviewOpen && !rail && <div id="review-subnav" className="side-subnav">
                {[['all','Bütün branşlar'], ...REVIEW_BRANCHES].map(([id,name]) => <NavLink key={id} to={`${REVIEW_PATH}/${id}`}
                  className={({ isActive: selected }) => selected ? 'active' : ''}
                  onClick={e => { if (user.role !== 'OPERATOR') { e.preventDefault(); switchReview(id); } }}>{name}</NavLink>)}
              </div>}
            </div>;
            if (to === TRACKING_PATH) return <div className="side-nav-group" key={to}>
              <button type="button" className={`side-nav-toggle${active ? ' active' : ''}`}
                aria-expanded={trackingOpen && !rail} aria-controls="tracking-subnav"
                aria-label={`${text} alt menüsünü ${trackingOpen && !rail ? 'kapat' : 'aç'}`}
                onClick={() => {
                  if (rail) {
                    toggleRail();
                    setTrackingOpen(true);
                  } else setTrackingOpen((open) => !open);
                }}>
                <Icon name={icon} />
                <span className="label">{text}</span>
                <span className="side-nav-chevron label" aria-hidden="true">{trackingOpen ? '▴' : '▾'}</span>
              </button>
              {trackingOpen && !rail && <div id="tracking-subnav" className="side-subnav">
                {TRACKING_ITEMS.map(([path, label]) => <NavLink key={path} to={path} end={path === TRACKING_PATH}
                  className={({ isActive: selected }) => selected ? 'active' : ''}
                  aria-label={label} title={label}>{label}</NavLink>)}
              </div>}
            </div>;
            return (
              <Link key={to} to={to} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} aria-label={text} title={text}>
                <Icon name={icon} />
                <span className="label">{text}</span>
              </Link>
            );
          })}
        </nav>
        <div className="side-user">
          {localReviewSwitch && <button type="button" className="side-link" disabled={switchingReview} onClick={() => switchReview()}
            title={user.role === 'OPERATOR' ? 'Öğrenci görünümüne dön' : 'Yerel öğretmen görünümü'}>
            <Icon name="book" /><span className="label">{switchingReview ? 'Açılıyor…' : user.role === 'OPERATOR' ? 'Öğrenci görünümüne dön' : 'Öğretmen doğrulamasına geç'}</span>
          </button>}
          {reviewSwitchError && <p className="small" role="alert">{reviewSwitchError}</p>}
          {signOutError && <p className="small" role="alert">{signOutError}</p>}
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
          {preferenceError && <p className="field-error" role="alert">{preferenceError}</p>}
          {activityError && <p className="field-error" role="alert">{activityError}</p>}
          {isResourcePath(pathname) && <ResourcesNavigation/>}
          <Outlet context={{ setQuestionBank }} />
        </main>
      </div>
    </div></ResourceNavigationContext.Provider>
  );
}

import { Link, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../hooks.js';
import AdminStats from './admin/AdminStats.jsx';
import AdminQuestions from './admin/AdminQuestions.jsx';
import AdminFeedback from './admin/AdminFeedback.jsx';
import AdminImport from './admin/AdminImport.jsx';

const TABS = [
  ['ozet', 'Özet', AdminStats],
  ['sorular', 'Sorular', AdminQuestions],
  ['bildirimler', 'Bildirimler', AdminFeedback],
  ['iceaktar', 'İçe aktar', AdminImport],
];

/** Yönetim paneli: sekme adres çubuğunda (?sekme=) tutulur. */
export default function Admin() {
  usePageTitle('Yönetim');
  const [params] = useSearchParams();
  const current = TABS.find(([key]) => key === params.get('sekme')) || TABS[0];
  const Panel = current[2];

  return (
    <>
      <h1>Yönetim</h1>
      <nav className="tabs" aria-label="Yönetim sekmeleri">
        {TABS.map(([key, label]) => (
          <Link key={key} to={`/yonetim?sekme=${key}`} className={key === current[0] ? 'active' : ''} aria-current={key === current[0] ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <Panel />
    </>
  );
}

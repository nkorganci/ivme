import { Link, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../hooks.js';
import AdminQuestions from './admin/AdminQuestions.jsx';
import AdminFeedback from './admin/AdminFeedback.jsx';
import AdminImport from './admin/AdminImport.jsx';

const TABS = [
  ['sorular', 'Sorular', AdminQuestions],
  ['bildirimler', 'Bildirimler', AdminFeedback],
  ['iceaktar', 'İçe aktar', AdminImport],
];

/** Yalnız OPERATOR: soru ve bildirim bakımı. */
export default function Operator() {
  usePageTitle('İçerik bakımı');
  const [params] = useSearchParams();
  const current = TABS.find(([key]) => key === params.get('sekme')) || TABS[0];
  const Panel = current[2];
  return <>
    <h1>İçerik bakımı</h1>
    <nav className="tabs" aria-label="İçerik bakımı sekmeleri">
      {TABS.map(([key, label]) => <Link key={key} to={`/icerik-bakimi?sekme=${key}`}
        className={key === current[0] ? 'active' : ''}
        aria-current={key === current[0] ? 'page' : undefined}>{label}</Link>)}
    </nav>
    <Panel />
  </>;
}

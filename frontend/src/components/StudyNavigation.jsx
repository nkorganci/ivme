import { NavLink, useLocation } from 'react-router-dom';
import { qs } from '../api.js';
import { STUDY_LABEL, STUDY_TITLE } from '../config.js';
import QuestionPoolSummary from './QuestionPoolSummary.jsx';
import { useExamTrack } from '../examTrack.jsx';

/** Aynı soru havuzuna çalışma oluşturarak veya kaynaklara göz atarak ulaşılır. */
export default function StudyNavigation({ bank = '', filter = {} }) {
  const { track } = useExamTrack();
  const { pathname, search } = useLocation();
  const params=new URLSearchParams(search);
  const filters = { examType: filter.examType, subject: filter.subject, topic: filter.topic, year: filter.year,
    categoryId:filter.categoryId || params.getAll('categoryId'),categoryMatch:filter.categoryMatch || params.get('categoryMatch') || 'ANY',
    questionTypeId:params.get('questionTypeId') || '',teacherDifficulty:params.get('teacherDifficulty') || '',includeCandidates:filter.includeCandidates ?? params.get('includeCandidates')!=='false' };
  const studyPath = '/calisma/yeni';
  return <>
    <h1>{STUDY_TITLE}</h1>
    <p className="muted lead">Her soru seni hedefine yaklaştırır.</p>
    {pathname === studyPath && <QuestionPoolSummary />}
    {pathname === studyPath && <p><NavLink to="/calisma/yarim-kalan">Yarım kalan çalışmalarım</NavLink></p>}
    {pathname !== studyPath && <nav className="tabs study-tabs" aria-label="Çalışma ekranları">
      {track?.id === 'KPSS_OABT' ? <>
        <NavLink to={'/cikmis-sorular' + qs({ examType: filters.examType, subject: filters.subject, topic: filters.topic, year: filters.year })}>Çıkmış Sorular</NavLink>
        <NavLink to={'/soru-bankasi' + qs({ examType: filters.examType, subject: filters.subject, topic: filters.topic, year: filters.year })}>Deneme ve Soru Bankaları</NavLink>
        <NavLink to={studyPath + qs({ bank, ...filters })}>{STUDY_LABEL}</NavLink>
      </> : <NavLink to={studyPath + qs({ bank, ...filters })}>{STUDY_LABEL}</NavLink>}
    </nav>}
  </>;
}

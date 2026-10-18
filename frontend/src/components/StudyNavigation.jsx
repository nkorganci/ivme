import { NavLink, useLocation } from 'react-router-dom';
import { qs } from '../api.js';
import { STUDY_LABEL, STUDY_TITLE } from '../config.js';
import QuestionPoolSummary from './QuestionPoolSummary.jsx';

/** Aynı soru havuzuna çalışma oluşturarak veya kaynaklara göz atarak ulaşılır. */
export default function StudyNavigation({ bank = '', filter = {} }) {
  const { pathname, search } = useLocation();
  const params=new URLSearchParams(search);
  const filters = { examType: filter.examType, subject: filter.subject, topic: filter.topic,
    categoryId:filter.categoryId || params.getAll('categoryId'),categoryMatch:filter.categoryMatch || params.get('categoryMatch') || 'ANY',
    questionTypeId:params.get('questionTypeId') || '',teacherDifficulty:params.get('teacherDifficulty') || '',includeCandidates:filter.includeCandidates ?? params.get('includeCandidates')!=='false' };
  const studyPath = '/calisma/yeni';
  return <>
    <h1>{STUDY_TITLE}</h1>
    <p className="muted lead">Her soru seni hedefine yaklaştırır.</p>
    {pathname === studyPath && <QuestionPoolSummary />}
    {pathname === studyPath && <p><NavLink to="/calisma/yarim-kalan">Yarım kalan çalışmalarım</NavLink></p>}
    {pathname !== studyPath && <nav className="tabs study-tabs" aria-label="Çalışma ekranına dön">
      <NavLink to={studyPath + qs({ bank, ...filters })}>
        {STUDY_LABEL}
      </NavLink>
    </nav>}
  </>;
}

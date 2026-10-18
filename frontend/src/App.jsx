import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import DevAccountSwitcher from './components/DevAccountSwitcher.jsx';
import AdultHome from './pages/AdultHome.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import { Loading } from './components/States.jsx';
import Recommendations from './pages/Recommendations.jsx';
import QuestionCollection from './pages/QuestionCollection.jsx';
import QuestionDetail from './pages/QuestionDetail.jsx';
import StudyNew from './pages/StudyNew.jsx';
import PracticeSession from './pages/PracticeSession.jsx';
import UnfinishedStudies from './pages/UnfinishedStudies.jsx';
import Exam from './pages/Exam.jsx';
import ExamResult from './pages/ExamResult.jsx';
import History from './pages/History.jsx';
import Feedback from './pages/Feedback.jsx';
import Account from './pages/Account.jsx';
import Admin from './pages/Admin.jsx';
import Operator from './pages/Operator.jsx';
import TopicPdfViewer from './pages/TopicPdfViewer.jsx';
import StudentTracking from './pages/StudentTracking.jsx';
import StudentTrackingPortal from './pages/StudentTrackingPortal.jsx';
import MathTutoring from './pages/MathTutoring.jsx';
import { useAuth } from './auth.jsx';

const Curriculum = lazy(() => import('./pages/Curriculum.jsx'));
const TeacherReview = lazy(() => import('./pages/TeacherReview.jsx'));
const TytTrials = lazy(() => import('./pages/TytTrials.jsx'));
const AytTrials = lazy(() => import('./pages/AytTrials.jsx'));
const SourceNotes = lazy(() => import('./pages/SourceNotes.jsx'));
const SourceLabels = lazy(() => import('./pages/SourceLabels.jsx'));
const LearningResources = lazy(() => import('./pages/LearningResources.jsx'));
const Tutor = lazy(() => import('./pages/Tutor.jsx'));
const TutorSession = lazy(() => import('./pages/TutorSession.jsx'));
const TutorReview = lazy(() => import('./pages/TutorReview.jsx'));

function ResourceLibraryRedirect() {
  const location=useLocation();
  return <Navigate to={'/konular-ve-kaynaklar'+location.search+location.hash} replace/>;
}
function LegacyPdfLibraryRedirect() {
  const {search,hash}=useLocation();const params=new URLSearchParams(search);
  if(params.has('kind'))params.set('pdfKind',params.get('kind'));
  params.set('kind','PDF');
  return <Navigate to={'/konular-ve-kaynaklar?'+params+hash} replace/>;
}
function LegacyNoteLibraryRedirect() {
  const {search,hash}=useLocation();const params=new URLSearchParams(search);
  if(['konu','kalip','baslik'].some(key=>params.has(key)))return <Navigate to={'/kaynakli-ders-notlari/tyt-turkce'+search+hash} replace/>;
  params.set('kind','NOTE');
  return <Navigate to={'/konular-ve-kaynaklar?'+params+hash} replace/>;
}

function RoleHome() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <Navigate to="/yonetim" replace />;
  if (user?.role === 'OPERATOR') return <Navigate to="/icerik-bakimi" replace />;
  if (['TEACHER', 'PARENT'].includes(user?.role)) return <AdultHome />;
  return <Home />;
}

/** Eski /sorular adresi: sorgu dizesi korunarak çıkmış sorulara yönlenir. */
function OldQuestions() {
  const { search } = useLocation();
  return <Navigate to={`/cikmis-sorular${search}`} replace />;
}

/** Eski başlatma bağlantıları konu PDF'si kapsamını koruyarak ortak ekrana açılır. */
function OldStudyNew({ exam }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (exam) params.set('mode', 'sinav');
  else params.delete('mode');
  const query = params.toString();
  return <Navigate to={`/calisma/yeni${query ? `?${query}` : ''}`} replace />;
}

export default function App() {
  return (
    <><DevAccountSwitcher /><Routes>
      <Route path="/giris" element={<Login />} />
      <Route path="/kayit" element={<Register />} />

      <Route element={<RequireAuth />}>
        {/* Sınav ekranı kendi üst çubuğunu kullanır, sol menüsü yoktur. */}
        <Route element={<RequireAuth student />}>
          <Route path="/sinav/:id" element={<Exam />} />
        </Route>

        <Route element={<Layout />}>
          <Route index element={<RoleHome />} />
          <Route element={<RequireAuth student />}>
            <Route path="/konular-ve-kaynaklar" element={<Suspense fallback={<Loading text="Kaynaklar yükleniyor…" />}><LearningResources /></Suspense>} />
            <Route path="/kaynak-kutuphanesi" element={<ResourceLibraryRedirect />} />
            <Route path="/kaynakli-ders-notlari" element={<LegacyNoteLibraryRedirect />} />
            <Route path="/kaynakli-ders-notlari/:subjectId" element={<Suspense fallback={<Loading text="Kaynaklı ders notları yükleniyor…" />}><SourceNotes /></Suspense>} />
            <Route path="/kaynakli-ders-notlari/etiketler" element={<Suspense fallback={<Loading text="Soru etiketleri yükleniyor…" />}><SourceLabels /></Suspense>} />
            <Route path="/dersler-ve-konular" element={<Suspense fallback={<Loading text="Dersler ve konular yükleniyor…" />}><Curriculum /></Suspense>} />
            <Route path="/sorular" element={<OldQuestions />} />
            <Route path="/cikmis-sorular" element={<QuestionCollection key="CIKMIS" bank="CIKMIS" />} />
            <Route path="/soru-bankasi" element={<QuestionCollection key="OGM" bank="OGM" />} />
            <Route path="/konu-anlatimlari" element={<LegacyPdfLibraryRedirect />} />
            <Route path="/konu-anlatimlari/:id" element={<TopicPdfViewer />} />
            <Route path="/soru/:code" element={<QuestionDetail />} />
            <Route path="/calisma/yeni" element={<StudyNew />} />
            <Route path="/calisma/yarim-kalan" element={<UnfinishedStudies />} />
            <Route path="/sinav/yeni" element={<OldStudyNew exam />} />
            <Route path="/pratik/yeni" element={<OldStudyNew />} />
            <Route path="/pratik/:id" element={<PracticeSession />} />
            <Route path="/sinav/:id/sonuc" element={<ExamResult />} />
            <Route path="/gecmis" element={<History />} />
            <Route path="/ilerleme" element={<Navigate to="/gecmis?tab=progress" replace />} />
            <Route path="/ogrenci-takip" element={<StudentTrackingPortal />}>
              <Route index element={<StudentTracking />} />
              <Route path="matematik-ozel-ders" element={<MathTutoring />} />
              <Route path="tyt-denemeleri" element={<Suspense fallback={<Loading text="TYT denemeleri yükleniyor…" />}><TytTrials /></Suspense>} />
              <Route path="ayt-denemeleri" element={<Suspense fallback={<Loading text="AYT denemeleri yükleniyor…" />}><AytTrials /></Suspense>} />
            </Route>
            <Route path="/akilli-ogretmen" element={<Suspense fallback={<Loading text="Akıllı Öğretmen yükleniyor…" />}><Tutor /></Suspense>} />
            <Route path="/akilli-ogretmen/:code" element={<Suspense fallback={<Loading text="Öğretim oturumu yükleniyor…" />}><TutorSession /></Suspense>} />
            <Route path="/oneriler" element={<Recommendations />} />
            <Route path="/geri-bildirim" element={<Feedback />} />
          </Route>
          <Route path="/hesap" element={<Account />} />
          <Route element={<RequireAuth admin />}>
            <Route path="/yonetim" element={<Admin />} />
          </Route>
          <Route element={<RequireAuth operator />}>
            <Route path="/fizik-denetimi" element={<Navigate to="/ogretmen-dogrulamasi/fizik" replace />} />
            <Route path="/ogretmen-dogrulamasi" element={<Navigate to="/ogretmen-dogrulamasi/fizik" replace />} />
            <Route path="/ogretmen-dogrulamasi/:subjectId" element={<Suspense fallback={<Loading text="Öğretmen doğrulaması yükleniyor…" />}><TeacherReview /></Suspense>} />
            <Route path="/icerik-bakimi" element={<Operator />} />
            <Route path="/akilli-ogretmen-inceleme" element={<Suspense fallback={<Loading text="İnceleme yükleniyor…" />}><TutorReview /></Suspense>} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></>
  );
}

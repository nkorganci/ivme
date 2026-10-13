import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loading } from './components/States.jsx';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import Progress from './pages/Progress.jsx';
import Goals from './pages/Goals.jsx';
import Recommendations from './pages/Recommendations.jsx';
import QuestionCollection from './pages/QuestionCollection.jsx';
import QuestionDetail from './pages/QuestionDetail.jsx';
import ExamNew from './pages/ExamNew.jsx';
import PracticeNew from './pages/PracticeNew.jsx';
import PracticeSession from './pages/PracticeSession.jsx';
import Exam from './pages/Exam.jsx';
import ExamResult from './pages/ExamResult.jsx';
import History from './pages/History.jsx';
import Feedback from './pages/Feedback.jsx';
import Account from './pages/Account.jsx';
import Admin from './pages/Admin.jsx';
import Operator from './pages/Operator.jsx';
import TopicPdfs from './pages/TopicPdfs.jsx';
import TopicPdfViewer from './pages/TopicPdfViewer.jsx';
import StudentTracking from './pages/StudentTracking.jsx';
import { useAuth } from './auth.jsx';

const SourceNotes = lazy(() => import('./pages/SourceNotes.jsx'));
const SourceLabels = lazy(() => import('./pages/SourceLabels.jsx'));

function RoleHome() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <Navigate to="/yonetim" replace />;
  if (user?.role === 'OPERATOR') return <Navigate to="/icerik-bakimi" replace />;
  return <Home />;
}

/** Eski /sorular adresi: sorgu dizesi korunarak çıkmış sorulara yönlenir. */
function OldQuestions() {
  const { search } = useLocation();
  return <Navigate to={`/cikmis-sorular${search}`} replace />;
}

export default function App() {
  return (
    <Routes>
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
            <Route path="/kaynakli-ders-notlari" element={<Navigate to="/kaynakli-ders-notlari/tyt-turkce" replace />} />
            <Route path="/kaynakli-ders-notlari/:subjectId" element={<Suspense fallback={<Loading text="Kaynaklı ders notları yükleniyor…" />}><SourceNotes /></Suspense>} />
            <Route path="/kaynakli-ders-notlari/etiketler" element={<Suspense fallback={<Loading text="Soru etiketleri yükleniyor…" />}><SourceLabels /></Suspense>} />
            <Route path="/sorular" element={<OldQuestions />} />
            <Route path="/cikmis-sorular" element={<QuestionCollection key="CIKMIS" bank="CIKMIS" />} />
            <Route path="/soru-bankasi" element={<QuestionCollection key="OGM" bank="OGM" />} />
            <Route path="/konu-anlatimlari" element={<TopicPdfs />} />
            <Route path="/konu-anlatimlari/:id" element={<TopicPdfViewer />} />
            <Route path="/soru/:code" element={<QuestionDetail />} />
            <Route path="/sinav/yeni" element={<ExamNew />} />
            <Route path="/pratik/yeni" element={<PracticeNew />} />
            <Route path="/pratik/:id" element={<PracticeSession />} />
            <Route path="/sinav/:id/sonuc" element={<ExamResult />} />
            <Route path="/gecmis" element={<History />} />
            <Route path="/ilerleme" element={<Progress />} />
            <Route path="/hedefler" element={<Goals />} />
            <Route path="/ogrenci-takip" element={<StudentTracking />} />
            <Route path="/oneriler" element={<Recommendations />} />
            <Route path="/geri-bildirim" element={<Feedback />} />
          </Route>
          <Route path="/hesap" element={<Account />} />
          <Route element={<RequireAuth admin />}>
            <Route path="/yonetim" element={<Admin />} />
          </Route>
          <Route element={<RequireAuth operator />}>
            <Route path="/icerik-bakimi" element={<Operator />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

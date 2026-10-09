import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import QuestionBank from './pages/QuestionBank.jsx';
import QuestionDetail from './pages/QuestionDetail.jsx';
import ExamNew from './pages/ExamNew.jsx';
import Exam from './pages/Exam.jsx';
import ExamResult from './pages/ExamResult.jsx';
import History from './pages/History.jsx';
import Feedback from './pages/Feedback.jsx';
import Account from './pages/Account.jsx';
import Admin from './pages/Admin.jsx';
import Operator from './pages/Operator.jsx';
import { useAuth } from './auth.jsx';

function RoleHome() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <Navigate to="/yonetim" replace />;
  if (user?.role === 'OPERATOR') return <Navigate to="/icerik-bakimi" replace />;
  return <Home />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/giris" element={<Login />} />
      <Route path="/kayit" element={<Register />} />

      <Route element={<RequireAuth />}>
        {/* Sınav ekranı kendi üst çubuğunu kullanır, genel gezinme çubuğu yoktur. */}
        <Route element={<RequireAuth student />}>
          <Route path="/sinav/:id" element={<Exam />} />
        </Route>

        <Route element={<Layout />}>
          <Route index element={<RoleHome />} />
          <Route element={<RequireAuth student />}>
            <Route path="/sorular" element={<QuestionBank />} />
            <Route path="/soru/:code" element={<QuestionDetail />} />
            <Route path="/sinav/yeni" element={<ExamNew />} />
            <Route path="/sinav/:id/sonuc" element={<ExamResult />} />
            <Route path="/gecmis" element={<History />} />
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

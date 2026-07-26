import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './hooks/useSession';
import { LoginPage } from './pages/LoginPage';
import { StudiesPage } from './pages/StudiesPage';
import { StudyDetailPage } from './pages/StudyDetailPage';
import { RoundDetailPage } from './pages/RoundDetailPage';
import { SubmissionCreatePage } from './pages/SubmissionCreatePage';
import { ReminderPage } from './pages/ReminderPage';
import { NotFoundPage } from './pages/NotFoundPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Protected><StudiesPage /></Protected>} />
      <Route path="/studies/:studyId" element={<Protected><StudyDetailPage /></Protected>} />
      <Route path="/rounds/:roundId" element={<Protected><RoundDetailPage /></Protected>} />
      <Route path="/rounds/:roundId/submit" element={<Protected><SubmissionCreatePage /></Protected>} />
      <Route path="/rounds/:roundId/reminder" element={<Protected><ReminderPage /></Protected>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

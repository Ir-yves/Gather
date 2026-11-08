import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { AdminLayout, MemberLayout } from './components';
import { AdminAnalyticsPage, AdminContentPage, AdminHomePage, AdminLivePage, AdminUsersPage, LoginPage, MemberPage, MessagesPage, RegisterPage } from './pages';
import { SettingsPage } from './settings-page';

function RequireRole({ children, role }: { children: JSX.Element; role: 'admin' | 'user' }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="screen-loading"><span className="spinner" /> Loading your space…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/app" replace />;
  return children;
}

function LoginRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen-loading"><span className="spinner" /> Loading your space…</div>;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace />;
  return <LoginPage />;
}

function RegisterRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen-loading"><span className="spinner" /> Loading your space…</div>;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace />;
  return <RegisterPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginRedirect />} />
      <Route path="/register" element={<RegisterRedirect />} />
      <Route path="/app" element={<RequireRole role="user"><MemberLayout /></RequireRole>}>
        <Route index element={<MemberPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
        <Route index element={<AdminHomePage />} />
        <Route path="content" element={<AdminContentPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="live" element={<AdminLivePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

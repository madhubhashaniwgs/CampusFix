import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from './context/AuthContext';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';

import ProtectedRoute from './routes/ProtectedRoute';

import './App.css';

function HomeRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading CampusFix...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const paths = {
    student: '/student/dashboard',
    staff: '/staff/dashboard',
    admin: '/admin/dashboard',
  };

  return <Navigate to={paths[user.role] || '/login'} replace />;
}

function UnauthorizedPage() {
  return (
    <div className="loading-screen">
      <h1>403 - Access Denied</h1>
      <p>You don't have permission to access this page.</p>
      <a href="/login">Back to Login</a>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route
          path="/student/dashboard"
          element={<DashboardPage />}
        />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
        <Route
          path="/staff/dashboard"
          element={<DashboardPage />}
        />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route
          path="/admin/dashboard"
          element={<DashboardPage />}
        />
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
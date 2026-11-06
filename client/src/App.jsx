
import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from './context/AuthContext';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ReportIssuePage from './pages/student/ReportIssuePage';
import MyIssuesPage from './pages/student/MyIssuesPage';
import IssueDetailsPage from './pages/student/IssueDetailsPage';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminIssuesPage from './pages/admin/AdminIssuesPage';
import AdminIssueDetailsPage from './pages/admin/AdminIssueDetailsPage';
import StaffDashboardPage from './pages/staff/StaffDashboardPage';
import StaffIssuesPage from './pages/staff/StaffIssuesPage';
import StaffIssueDetailsPage from './pages/staff/StaffIssueDetailsPage';

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

      {/* Student Routes */}
      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route
          path="/student/dashboard"
          element={<DashboardPage />}
        />
        <Route
          path="/student/report-issue"
          element={<ReportIssuePage />}
        />

        <Route
        path="/student/my-issues"
        element={<MyIssuesPage />}
      />

        <Route
          path="/student/issues/:id"
          element={<IssueDetailsPage />}
        />
      </Route>

      

      {/* Staff Routes */}
      <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
        <Route
          path="/staff/dashboard"
          element={<StaffDashboardPage />}
        />

        <Route
          path="/staff/issues"
          element={<StaffIssuesPage />}
        />

        <Route
          path="/staff/issues/:id"
          element={<StaffIssueDetailsPage />}
        />
      </Route>

      {/* Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route
          path="/admin/dashboard"
          element={<AdminDashboardPage />}
        />

        <Route
          path="/admin/issues"
          element={<AdminIssuesPage />}
        />

        <Route
          path="/admin/issues/:id"
          element={<AdminIssueDetailsPage />}
        />

      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

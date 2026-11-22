
import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from './context/AuthContext';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ReportIssuePage from './pages/student/ReportIssuePage';
import MyIssuesPage from './pages/student/MyIssuesPage';
import IssueDetailsPage from './pages/student/IssueDetailsPage';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminIssuesPage from './pages/admin/AdminIssuesPage';
import AdminIssueDetailsPage from './pages/admin/AdminIssueDetailsPage';
import AdminStaffPage from './pages/admin/AdminStaffPage';
import StaffDashboardPage from './pages/staff/StaffDashboardPage';
import StaffIssuesPage from './pages/staff/StaffIssuesPage';
import StaffIssueDetailsPage from './pages/staff/StaffIssueDetailsPage';

import { ShieldAlert, ShieldCheck } from 'lucide-react';
import './App.css';

function HomeRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 mb-4 animate-pulse">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">Connecting to CampusFix...</p>
      </div>
    );
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="bg-white rounded-3xl border border-rose-200/90 shadow-xl max-w-md w-full p-8 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">403 - Access Denied</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          You don't have authorization or credentials to view this section of CampusFix.
        </p>
        <a
          href="/login"
          className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all hover:scale-[1.01]"
        >
          Return to Login
        </a>
      </div>
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

        <Route
          path="/admin/staff"
          element={<AdminStaffPage />}
        />

      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

import { Navigate, Route, Routes } from 'react-router-dom';

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
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import LandingPage from './pages/LandingPage';
import StaffDashboardPage from './pages/staff/StaffDashboardPage';
import StaffIssuesPage from './pages/staff/StaffIssuesPage';
import StaffIssueDetailsPage from './pages/staff/StaffIssueDetailsPage';

import { ShieldAlert } from 'lucide-react';
import './App.css';

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
      <Route path="/" element={<LandingPage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Student Routes */}
      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route path="/student/dashboard" element={<DashboardPage />} />
        <Route path="/student/report-issue" element={<ReportIssuePage />} />

        <Route path="/student/my-issues" element={<MyIssuesPage />} />

        <Route path="/student/issues/:id" element={<IssueDetailsPage />} />
      </Route>

      {/* Staff Routes */}
      <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
        <Route path="/staff/dashboard" element={<StaffDashboardPage />} />

        <Route path="/staff/issues" element={<StaffIssuesPage />} />

        <Route path="/staff/issues/:id" element={<StaffIssueDetailsPage />} />
      </Route>

      {/* Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

        <Route path="/admin/issues" element={<AdminIssuesPage />} />

        <Route path="/admin/issues/:id" element={<AdminIssueDetailsPage />} />

        <Route path="/admin/staff" element={<Navigate to="/admin/users" replace />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
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

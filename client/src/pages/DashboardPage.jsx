
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  ShieldCheck,
  PlusCircle,
  ClipboardList,
  AlertCircle,
  Clock,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

import { getIssues, getIssueCount } from '../services/issueService';

const statusLabels = {
  reported: 'Reported',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total: 0,
    reported: 0,
    in_progress: 0,
    resolved: 0,
  });
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (user?.role !== 'student') {
        setLoading(false);
        return;
      }

      try {
        const [issuesRes, total, reported, inProgress, resolved] =
          await Promise.all([
            getIssues({ limit: 4 }),
            getIssueCount({}),
            getIssueCount({ status: 'reported' }),
            getIssueCount({ status: 'in_progress' }),
            getIssueCount({ status: 'resolved' }),
          ]);

        setRecentIssues(issuesRes.data || []);
        setStats({
          total,
          reported,
          in_progress: inProgress,
          resolved,
        });
      } catch {
        // Dashboard stats are non-critical; fail silently.
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user?.role]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const statCards = [
    { label: 'Total Issues', value: stats.total, icon: ClipboardList, color: 'purple' },
    { label: 'Reported', value: stats.reported, icon: AlertCircle, color: 'orange' },
    { label: 'In Progress', value: stats.in_progress, icon: Clock, color: 'indigo' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'green' },
  ];

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck size={25} />
          </div>
          <span>CampusFix</span>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-welcome">
          <span className="welcome-label">CAMPUSFIX DASHBOARD</span>
          <h1>Welcome, {user?.fullName}!</h1>
          <p>You are successfully logged in to CampusFix.</p>
        </div>

        {user?.role === 'student' && (
          <>
            <div className="student-actions">
              <button
                className="student-action-button primary-action"
                onClick={() => navigate('/student/report-issue')}
              >
                <PlusCircle size={20} />
                Report New Issue
              </button>

              <button
                className="student-action-button secondary-action"
                onClick={() => navigate('/student/my-issues')}
              >
                <ClipboardList size={20} />
                My Issues
              </button>
            </div>

            {!loading && stats.total > 0 && (
              <div className="student-stats-grid">
                {statCards.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div className="student-stat-card" key={stat.label}>
                      <div className={`student-stat-icon ${stat.color}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && recentIssues.length > 0 && (
              <div className="user-info-card recent-issues-card">
                <div className="recent-issues-heading">
                  <h2>Recent Issues</h2>
                  <button
                    className="view-all-link"
                    onClick={() => navigate('/student/my-issues')}
                  >
                    View all <ArrowRight size={15} />
                  </button>
                </div>

                {recentIssues.map((issue) => (
                  <button
                    key={issue._id}
                    className="recent-issue-row"
                    onClick={() =>
                      navigate(`/student/issues/${issue._id}`)
                    }
                  >
                    <div className="recent-issue-info">
                      <strong>{issue.title}</strong>
                      <span>{issue.ticketId}</span>
                    </div>
                    <span className={`status-pill status-${issue.status}`}>
                      {statusLabels[issue.status] || issue.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div className="user-info-card">
          <h2>Account Information</h2>

          <div className="info-row">
            <span>Full Name</span>
            <strong>{user?.fullName}</strong>
          </div>

          <div className="info-row">
            <span>Email</span>
            <strong>{user?.email}</strong>
          </div>

          <div className="info-row">
            <span>Role</span>
            <strong className="role-label">{user?.role}</strong>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;

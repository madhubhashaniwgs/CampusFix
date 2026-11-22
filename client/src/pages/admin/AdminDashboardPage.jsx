
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LogOut,
  ClipboardList,
  AlertCircle,
  Clock,
  CheckCircle,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { getIssues, getIssueCount } from '../../services/issueService';

import './AdminDashboardPage.css';

function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [totalIssues, setTotalIssues] = useState(0);
  const [statusCounts, setStatusCounts] = useState({
    reported: 0,
    assigned: 0,
    in_progress: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError('');

      const [response, reported, assigned, inProgress, resolved] =
        await Promise.all([
          getIssues({ limit: 5 }),
          getIssueCount({ status: 'reported' }),
          getIssueCount({ status: 'assigned' }),
          getIssueCount({ status: 'in_progress' }),
          getIssueCount({ status: 'resolved' }),
        ]);

      setIssues(response.data || []);
      setTotalIssues(response.pagination?.totalItems || 0);
      setStatusCounts({
        reported,
        assigned,
        in_progress: inProgress,
        resolved,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to load dashboard data.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const statistics = [
    {
      title: 'Total Issues',
      count: totalIssues,
      icon: ClipboardList,
      color: 'purple',
    },
    {
      title: 'Reported',
      count: statusCounts.reported,
      icon: AlertCircle,
      color: 'orange',
    },
    {
      title: 'Assigned',
      count: statusCounts.assigned,
      icon: UserCheck,
      color: 'blue',
    },
    {
      title: 'In Progress',
      count: statusCounts.in_progress,
      icon: Clock,
      color: 'indigo',
    },
    {
      title: 'Resolved',
      count: statusCounts.resolved,
      icon: CheckCircle,
      color: 'green',
    },
  ];

  const recentIssues = issues;

  const formatDate = (date) => {
    if (!date) return 'N/A';

    return new Date(date).toLocaleDateString();
  };

  const formatStatus = (status) => {
    return status?.replace('_', ' ') || 'Unknown';
  };

  return (
    <div className="admin-dashboard-page">
      <header className="admin-dashboard-header">
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <ShieldCheck size={25} />
          </div>
          <span>CampusFix</span>
          <span className="admin-badge">ADMIN</span>
        </div>

        <button
          className="admin-logout-button"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <main className="admin-dashboard-content">
        <section className="admin-welcome-section">
          <div>
        <span className="admin-welcome-label">
            ADMINISTRATION
        </span>

        <h1>Welcome, {user?.fullName}!</h1>

        <p>
            Manage campus issues and monitor their progress.
        </p>

        <div className="admin-welcome-actions">
        <button
            className="admin-manage-issues-button"
            onClick={() => navigate('/admin/issues')}
        >
            <ClipboardList size={19} />
            Manage All Issues
        </button>

        <button
            className="admin-manage-issues-button"
            onClick={() => navigate('/admin/staff')}
        >
            <UserCheck size={19} />
            Manage Staff
        </button>
        </div>
        </div>

          <button
            className="admin-refresh-button"
            onClick={fetchIssues}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </section>

        {error && (
          <div className="admin-error-message">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <section className="admin-statistics-section">
          <div className="admin-section-heading">
            <h2>Overview</h2>
            <span>Issue statistics</span>
          </div>

          <div className="admin-statistics-grid">
            {statistics.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  className="admin-stat-card"
                  key={stat.title}
                >
                  <div className={`admin-stat-icon ${stat.color}`}>
                    <Icon size={23} />
                  </div>

                  <div>
                    <p>{stat.title}</p>

                    <h3>
                      {loading ? '--' : stat.count}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="admin-recent-section">
          <div className="admin-section-heading">
            <h2>Recent Issues</h2>
            <span>Latest reported campus issues</span>
          </div>

          {loading ? (
            <div className="admin-loading">
              Loading dashboard data...
            </div>
          ) : recentIssues.length === 0 ? (
            <div className="admin-empty-state">
              <ClipboardList size={35} />
              <h3>No issues found</h3>
              <p>There are no reported campus issues yet.</p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-issues-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Issue</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {recentIssues.map((issue) => (
                    <tr key={issue._id}>
                      <td className="admin-ticket-id">
                        {issue.ticketId}
                      </td>

                      <td>
                        <strong>{issue.title}</strong>
                      </td>

                      <td>{issue.category}</td>

                      <td>
                        <span
                          className={`admin-priority ${issue.priority}`}
                        >
                          {issue.priority}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`admin-status ${issue.status}`}
                        >
                          {formatStatus(issue.status)}
                        </span>
                      </td>

                      <td>{formatDate(issue.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminDashboardPage;

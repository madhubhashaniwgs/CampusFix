
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
import { getIssues } from '../../services/issueService';

import './AdminDashboardPage.css';

function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await getIssues();
      setIssues(response.data || []);
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
      count: issues.length,
      icon: ClipboardList,
      color: 'purple',
    },
    {
      title: 'Reported',
      count: issues.filter((issue) => issue.status === 'reported').length,
      icon: AlertCircle,
      color: 'orange',
    },
    {
      title: 'Assigned',
      count: issues.filter((issue) => issue.status === 'assigned').length,
      icon: UserCheck,
      color: 'blue',
    },
    {
      title: 'In Progress',
      count: issues.filter((issue) => issue.status === 'in_progress').length,
      icon: Clock,
      color: 'indigo',
    },
    {
      title: 'Resolved',
      count: issues.filter((issue) => issue.status === 'resolved').length,
      icon: CheckCircle,
      color: 'green',
    },
  ];

  const recentIssues = [...issues]
    .sort(
      (a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    )
    .slice(0, 5);

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

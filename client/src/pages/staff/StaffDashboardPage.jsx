
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  ShieldCheck,
  ClipboardList,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { getIssues } from '../../services/issueService';

import './StaffDashboardPage.css';

function StaffDashboardPage() {
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
        'Unable to load assigned issues.'
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

  const totalAssigned = issues.length;

  const pendingIssues = issues.filter(
    (issue) => issue.status === 'assigned'
  ).length;

  const inProgressIssues = issues.filter(
    (issue) => issue.status === 'in_progress'
  ).length;

  const resolvedIssues = issues.filter(
    (issue) => issue.status === 'resolved'
  ).length;

  const recentIssues = [...issues]
    .sort(
      (a, b) =>
        new Date(b.updatedAt) - new Date(a.updatedAt)
    )
    .slice(0, 5);

  const formatStatus = (status) => {
    return status
      ?.replaceAll('_', ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';

    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="staff-dashboard-page">
      <header className="staff-dashboard-header">
        <div className="staff-brand">
          <div className="staff-brand-icon">
            <ShieldCheck size={25} />
          </div>
          <span>CampusFix</span>
          <span className="staff-brand-label">STAFF PORTAL</span>
        </div>

        <button
          className="staff-logout-button"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <main className="staff-dashboard-content">
        <section className="staff-welcome">
          <span className="staff-welcome-label">
            STAFF DASHBOARD
          </span>

          <h1>Welcome, {user?.fullName}!</h1>

          <p>
            Manage your assigned campus issues and track their progress.
          </p>
        </section>

        <section className="staff-stats-grid">
          <div className="staff-stat-card">
            <div className="staff-stat-icon purple">
              <ClipboardList size={22} />
            </div>
            <div>
              <p>Total Assigned</p>
              <h2>{loading ? '—' : totalAssigned}</h2>
            </div>
          </div>

          <div className="staff-stat-card">
            <div className="staff-stat-icon orange">
              <Clock size={22} />
            </div>
            <div>
              <p>Pending</p>
              <h2>{loading ? '—' : pendingIssues}</h2>
            </div>
          </div>

          <div className="staff-stat-card">
            <div className="staff-stat-icon blue">
              <RefreshCw size={22} />
            </div>
            <div>
              <p>In Progress</p>
              <h2>{loading ? '—' : inProgressIssues}</h2>
            </div>
          </div>

          <div className="staff-stat-card">
            <div className="staff-stat-icon green">
              <CheckCircle size={22} />
            </div>
            <div>
              <p>Resolved</p>
              <h2>{loading ? '—' : resolvedIssues}</h2>
            </div>
          </div>
        </section>

        <section className="staff-recent-section">
          <div className="staff-section-header">
            <div>
              <h2>Recent Assigned Issues</h2>
              <p>Latest issues assigned to you</p>
            </div>

            <button
              className="staff-view-all-button"
              onClick={() => navigate('/staff/issues')}
            >
              <ClipboardList size={17} />
              View All Issues
            </button>
          </div>

          {error && (
            <div className="staff-error-message">
              <AlertCircle size={18} />
              {error}
              <button onClick={fetchIssues}>Retry</button>
            </div>
          )}

          {loading ? (
            <div className="staff-dashboard-state">
              <div className="staff-spinner" />
              <p>Loading assigned issues...</p>
            </div>
          ) : !error && recentIssues.length === 0 ? (
            <div className="staff-dashboard-state">
              <ClipboardList size={35} />
              <h3>No Assigned Issues</h3>
              <p>
                You don't have any issues assigned to you yet.
              </p>
            </div>
          ) : !error ? (
            <div className="staff-table-wrapper">
              <table className="staff-issues-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Issue</th>
                    <th>Location</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Updated Date</th>
                  </tr>
                </thead>

                <tbody>
                  {recentIssues.map((issue) => (
                    <tr key={issue._id}>
                      <td className="staff-ticket-id">
                        {issue.ticketId}
                      </td>

                      <td className="staff-issue-title">
                        {issue.title}
                      </td>

                      <td>{issue.location}</td>

                      <td>
                        <span
                          className={`staff-priority-badge ${issue.priority}`}
                        >
                          {issue.priority}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`staff-status-badge ${issue.status}`}
                        >
                          {formatStatus(issue.status)}
                        </span>
                      </td>

                      <td>{formatDate(issue.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default StaffDashboardPage;

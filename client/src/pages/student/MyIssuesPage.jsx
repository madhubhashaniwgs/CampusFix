
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardList,
  Plus,
  RefreshCw,
  MapPin,
  CalendarDays,
} from 'lucide-react';

import { getIssues } from '../../services/issueService';
import './MyIssuesPage.css';

const statusLabels = {
  reported: 'Reported',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function MyIssuesPage() {
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [filter, setFilter] = useState('all');
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
        'Unable to load your issues. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const filteredIssues =
    filter === 'all'
      ? issues
      : issues.filter((issue) => issue.status === filter);

  const statusCounts = {
    all: issues.length,
    reported: issues.filter((issue) => issue.status === 'reported').length,
    assigned: issues.filter((issue) => issue.status === 'assigned').length,
    in_progress: issues.filter((issue) => issue.status === 'in_progress').length,
    resolved: issues.filter((issue) => issue.status === 'resolved').length,
    rejected: issues.filter((issue) => issue.status === 'rejected').length,
  };

  return (
    <div className="my-issues-page">
      <header className="issues-topbar">
        <button
          className="back-button"
          onClick={() => navigate('/student/dashboard')}
        >
          <ArrowLeft size={18} />
          Dashboard
        </button>

        <span className="issues-brand">CampusFix</span>
      </header>

      <main className="my-issues-container">
        <section className="my-issues-heading">
          <div>
            <span className="issues-eyebrow">STUDENT PORTAL</span>
            <h1>My Issues</h1>
            <p>Track and manage the issues you have reported.</p>
          </div>

          <button
            className="new-issue-button"
            onClick={() => navigate('/student/report-issue')}
          >
            <Plus size={18} />
            Report New Issue
          </button>
        </section>

        <section className="issues-summary">
          <div className="summary-card">
            <span>Total Issues</span>
            <strong>{statusCounts.all}</strong>
          </div>

          <div className="summary-card">
            <span>Reported</span>
            <strong>{statusCounts.reported}</strong>
          </div>

          <div className="summary-card">
            <span>In Progress</span>
            <strong>{statusCounts.in_progress}</strong>
          </div>

          <div className="summary-card">
            <span>Resolved</span>
            <strong>{statusCounts.resolved}</strong>
          </div>
        </section>

        <section className="issues-list-section">
          <div className="issues-list-heading">
            <div>
              <h2>Reported Issues</h2>
              <p>{filteredIssues.length} issue(s) found</p>
            </div>

            <button
              className="refresh-button"
              onClick={fetchIssues}
              disabled={loading}
              title="Refresh issues"
            >
              <RefreshCw size={17} />
              Refresh
            </button>
          </div>

          <div className="issue-filters">
            {[
              ['all', 'All'],
              ['reported', 'Reported'],
              ['assigned', 'Assigned'],
              ['in_progress', 'In Progress'],
              ['resolved', 'Resolved'],
              ['rejected', 'Rejected'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`filter-button ${filter === value ? 'active' : ''}`}
                onClick={() => setFilter(value)}
              >
                {label}
                <span>{statusCounts[value]}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="issues-message">
              <RefreshCw className="loading-icon" size={24} />
              <p>Loading your issues...</p>
            </div>
          ) : error ? (
            <div className="issues-message error-message">
              <p>{error}</p>
              <button onClick={fetchIssues}>Try Again</button>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="issues-empty-state">
              <div className="empty-icon">
                <ClipboardList size={30} />
              </div>
              <h3>No issues found</h3>
              <p>
                {filter === 'all'
                  ? "You haven't reported any issues yet."
                  : `You don't have any ${statusLabels[filter]?.toLowerCase()} issues.`}
              </p>

              {filter === 'all' && (
                <button
                  className="new-issue-button"
                  onClick={() => navigate('/student/report-issue')}
                >
                  <Plus size={18} />
                  Report Your First Issue
                </button>
              )}
            </div>
          ) : (
            <div className="issues-grid">
              {filteredIssues.map((issue) => (
                <article
                    className="issue-card"
                    key={issue._id}
                    onClick={() => navigate(`/student/issues/${issue._id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                        navigate(`/student/issues/${issue._id}`);
                        }
                    }}
                >
                  <div className="issue-card-top">
                    <span className="ticket-id">{issue.ticketId}</span>

                    <span className={`status-badge status-${issue.status}`}>
                      {statusLabels[issue.status] || issue.status}
                    </span>
                  </div>

                  <h3>{issue.title}</h3>

                  <p className="issue-description">
                    {issue.description}
                  </p>

                  <div className="issue-meta">
                    <span>
                      <MapPin size={15} />
                      {issue.location}
                    </span>

                    <span>
                      <CalendarDays size={15} />
                      {formatDate(issue.createdAt)}
                    </span>
                  </div>

                  <div className="issue-card-bottom">
                    <span className="issue-category">
                      {issue.category.replace('_', ' ')}
                    </span>

                    <span className={`priority-badge priority-${issue.priority}`}>
                      {priorityLabels[issue.priority] || issue.priority} Priority
                    </span>
                  </div>

                  <button
                    className="view-details-button"
                    onClick={() => navigate(`/student/issues/${issue._id}`)}
                    >
                    View Details →
                  </button>

                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default MyIssuesPage;

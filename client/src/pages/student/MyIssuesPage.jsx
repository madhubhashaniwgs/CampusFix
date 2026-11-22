
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardList,
  Plus,
  RefreshCw,
  MapPin,
  CalendarDays,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { getIssues, getIssueCount } from '../../services/issueService';
import './MyIssuesPage.css';

const PAGE_SIZE = 10;

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

const statusTabs = [
  ['all', 'All'],
  ['reported', 'Reported'],
  ['assigned', 'Assigned'],
  ['in_progress', 'In Progress'],
  ['resolved', 'Resolved'],
  ['rejected', 'Rejected'],
];

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
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: PAGE_SIZE,
  });
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    reported: 0,
    assigned: 0,
    in_progress: 0,
    resolved: 0,
    rejected: 0,
  });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCounts = useCallback(async () => {
    const statuses = statusTabs.map(([value]) => value);

    const counts = await Promise.all(
      statuses.map((value) =>
        value === 'all'
          ? getIssueCount()
          : getIssueCount({ status: value })
      )
    );

    setStatusCounts(
      Object.fromEntries(statuses.map((value, i) => [value, counts[i]]))
    );
  }, []);

  const fetchIssues = useCallback(
    async (targetPage = page) => {
      try {
        setLoading(true);
        setError('');

        const params = { page: targetPage, limit: PAGE_SIZE };

        if (filter !== 'all') params.status = filter;
        if (debouncedSearch) params.search = debouncedSearch;

        const response = await getIssues(params);

        setIssues(response.data || []);
        setPagination(
          response.pagination || {
            currentPage: targetPage,
            totalPages: 1,
            totalItems: 0,
            pageSize: PAGE_SIZE,
          }
        );
      } catch (err) {
        setError(
          err.response?.data?.message ||
          'Unable to load your issues. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    },
    [page, filter, debouncedSearch]
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchCounts(), fetchIssues(page)]);
  }, [fetchCounts, fetchIssues, page]);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchIssues(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter, debouncedSearch]);

  const handleFilterChange = (value) => {
    setFilter(value);
    setPage(1);
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
              <p>{pagination.totalItems} issue(s) found</p>
            </div>

            <button
              className="refresh-button"
              onClick={refreshAll}
              disabled={loading}
              title="Refresh issues"
            >
              <RefreshCw size={17} />
              Refresh
            </button>
          </div>

          <div className="my-issues-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search by ticket ID, title or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="issue-filters">
            {statusTabs.map(([value, label]) => (
              <button
                key={value}
                className={`filter-button ${filter === value ? 'active' : ''}`}
                onClick={() => handleFilterChange(value)}
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
              <button onClick={refreshAll}>Try Again</button>
            </div>
          ) : issues.length === 0 ? (
            <div className="issues-empty-state">
              <div className="empty-icon">
                <ClipboardList size={30} />
              </div>
              <h3>No issues found</h3>
              <p>
                {filter === 'all' && !debouncedSearch
                  ? "You haven't reported any issues yet."
                  : 'No issues match your current search or filters.'}
              </p>

              {filter === 'all' && !debouncedSearch && (
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
              {issues.map((issue) => (
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

          {!loading && pagination.totalPages > 1 && (
            <div className="my-issues-pagination">
              <button
                className="pagination-button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.currentPage <= 1}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span className="pagination-info">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>

              <button
                className="pagination-button"
                onClick={() =>
                  setPage((p) =>
                    Math.min(pagination.totalPages, p + 1)
                  )
                }
                disabled={pagination.currentPage >= pagination.totalPages}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default MyIssuesPage;

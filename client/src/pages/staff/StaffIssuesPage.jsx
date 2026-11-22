
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Search,
  RefreshCw,
  ClipboardList,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { getIssues, getIssueCount } from '../../services/issueService';

import './StaffIssuesPage.css';

const PAGE_SIZE = 10;

function StaffIssuesPage() {
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: PAGE_SIZE,
  });
  const [counts, setCounts] = useState({ total: 0, assigned: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);

  const buildParams = useCallback(
    (targetPage = page) => {
      const params = { page: targetPage, limit: PAGE_SIZE };

      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      return params;
    },
    [page, debouncedSearch, statusFilter, priorityFilter, categoryFilter]
  );

  const fetchCounts = useCallback(async () => {
    const [total, assigned, inProgress, resolved] = await Promise.all([
      getIssueCount(),
      getIssueCount({ status: 'assigned' }),
      getIssueCount({ status: 'in_progress' }),
      getIssueCount({ status: 'resolved' }),
    ]);

    setCounts({ total, assigned, inProgress, resolved });
  }, []);

  const fetchIssues = useCallback(
    async (targetPage = page) => {
      try {
        setLoading(true);
        setError('');

        const response = await getIssues(buildParams(targetPage));

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
          'Unable to load assigned issues.'
        );
      } finally {
        setLoading(false);
      }
    },
    [buildParams, page]
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
  }, [page, debouncedSearch, statusFilter, priorityFilter, categoryFilter]);

  const handleFilterChange = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

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
    <div className="staff-issues-page">
      <header className="staff-issues-header">
        <div className="staff-issues-brand">
          <div className="staff-issues-brand-icon">
            <ShieldCheck size={24} />
          </div>
          <span>CampusFix</span>
          <span className="staff-issues-portal-label">
            STAFF PORTAL
          </span>
        </div>

        <button
          className="staff-dashboard-nav-button"
          onClick={() => navigate('/staff/dashboard')}
        >
          <LayoutDashboard size={17} />
          Dashboard
        </button>
      </header>

      <main className="staff-issues-content">
        <div className="staff-issues-heading">
          <div>
            <span className="staff-issues-eyebrow">
              ISSUE MANAGEMENT
            </span>
            <h1>Assigned Issues</h1>
            <p>
              View and manage campus issues assigned to you.
            </p>
          </div>

          <button
            className="staff-refresh-button"
            onClick={refreshAll}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <section className="staff-issues-summary">
          <div>
            <span>Total Assigned Issues</span>
            <strong>{loading ? '—' : counts.total}</strong>
          </div>

          <div>
            <span>Pending</span>
            <strong>
              {loading ? '—' : counts.assigned}
            </strong>
          </div>

          <div>
            <span>In Progress</span>
            <strong>
              {loading ? '—' : counts.inProgress}
            </strong>
          </div>

          <div>
            <span>Resolved</span>
            <strong>
              {loading ? '—' : counts.resolved}
            </strong>
          </div>
        </section>

        <section className="staff-issues-list-card">
          <div className="staff-issues-list-heading">
            <div>
              <h2>All Assigned Issues</h2>
              <p>
                {pagination.totalItems} issue(s) found
              </p>
            </div>
          </div>

          <div className="staff-issues-filters">
            <div className="staff-issues-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search ticket, title, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={statusFilter}
              onChange={handleFilterChange(setStatusFilter)}
            >
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={priorityFilter}
              onChange={handleFilterChange(setPriorityFilter)}
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <select
              value={categoryFilter}
              onChange={handleFilterChange(setCategoryFilter)}
            >
              <option value="all">All Categories</option>
              <option value="electrical">Electrical</option>
              <option value="plumbing">Plumbing</option>
              <option value="it">IT</option>
              <option value="furniture">Furniture</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error ? (
            <div className="staff-issues-error">
              <AlertCircle size={19} />
              <span>{error}</span>
              <button onClick={refreshAll}>Retry</button>
            </div>
          ) : loading ? (
            <div className="staff-issues-state">
              <div className="staff-issues-spinner" />
              <p>Loading assigned issues...</p>
            </div>
          ) : issues.length === 0 ? (
            <div className="staff-issues-state">
              <ClipboardList size={38} />
              <h3>No Issues Found</h3>
              <p>
                No issues match your current search or filters.
              </p>
            </div>
          ) : (
            <div className="staff-issues-table-wrapper">
              <table className="staff-issues-list-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Issue</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Reported Date</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {issues.map((issue) => (
                    <tr key={issue._id}>
                      <td className="staff-list-ticket">
                        {issue.ticketId}
                      </td>

                      <td className="staff-list-title">
                        {issue.title}
                      </td>

                      <td>{issue.category}</td>

                      <td>{issue.location}</td>

                      <td>
                        <span
                          className={`staff-list-priority ${issue.priority}`}
                        >
                          {issue.priority}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`staff-list-status ${issue.status}`}
                        >
                          {formatStatus(issue.status)}
                        </span>
                      </td>

                      <td>{formatDate(issue.createdAt)}</td>

                      <td>
                        <button
                          className="staff-view-issue-button"
                          onClick={() =>
                            navigate(`/staff/issues/${issue._id}`)
                          }
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && pagination.totalPages > 1 && (
            <div className="staff-issues-pagination">
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

export default StaffIssuesPage;

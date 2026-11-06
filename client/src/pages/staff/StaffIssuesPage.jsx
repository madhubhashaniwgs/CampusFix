
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Search,
  RefreshCw,
  ClipboardList,
  AlertCircle,
  Eye,
} from 'lucide-react';

import { getIssues } from '../../services/issueService';

import './StaffIssuesPage.css';

function StaffIssuesPage() {
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

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

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        issue.ticketId?.toLowerCase().includes(search) ||
        issue.title?.toLowerCase().includes(search) ||
        issue.location?.toLowerCase().includes(search) ||
        issue.category?.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === 'all' ||
        issue.status === statusFilter;

      const matchesPriority =
        priorityFilter === 'all' ||
        issue.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [issues, searchTerm, statusFilter, priorityFilter]);

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
            onClick={fetchIssues}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <section className="staff-issues-summary">
          <div>
            <span>Total Assigned Issues</span>
            <strong>{loading ? '—' : issues.length}</strong>
          </div>

          <div>
            <span>Pending</span>
            <strong>
              {loading
                ? '—'
                : issues.filter((issue) => issue.status === 'assigned').length}
            </strong>
          </div>

          <div>
            <span>In Progress</span>
            <strong>
              {loading
                ? '—'
                : issues.filter((issue) => issue.status === 'in_progress').length}
            </strong>
          </div>

          <div>
            <span>Resolved</span>
            <strong>
              {loading
                ? '—'
                : issues.filter((issue) => issue.status === 'resolved').length}
            </strong>
          </div>
        </section>

        <section className="staff-issues-list-card">
          <div className="staff-issues-list-heading">
            <div>
              <h2>All Assigned Issues</h2>
              <p>
                {filteredIssues.length} issue(s) found
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
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {error ? (
            <div className="staff-issues-error">
              <AlertCircle size={19} />
              <span>{error}</span>
              <button onClick={fetchIssues}>Retry</button>
            </div>
          ) : loading ? (
            <div className="staff-issues-state">
              <div className="staff-issues-spinner" />
              <p>Loading assigned issues...</p>
            </div>
          ) : filteredIssues.length === 0 ? (
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
                  {filteredIssues.map((issue) => (
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
        </section>
      </main>
    </div>
  );
}

export default StaffIssuesPage;

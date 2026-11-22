
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  ClipboardList,
  AlertCircle,
  UserCheck,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import {
  getIssues,
  getIssueCount,
  getStaffMembers,
  assignIssue,
} from '../../services/issueService';

import './AdminIssuesPage.css';

const PAGE_SIZE = 10;

function AdminIssuesPage() {
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: PAGE_SIZE,
  });
  const [counts, setCounts] = useState({ total: 0, reported: 0, awaiting: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedStaff, setSelectedStaff] = useState({});
  const [assigningId, setAssigningId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

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
    const [total, reported, awaiting] = await Promise.all([
      getIssueCount(),
      getIssueCount({ status: 'reported' }),
      getIssueCount({
        assignee: 'unassigned',
        status: 'reported,assigned,in_progress',
      }),
    ]);

    setCounts({ total, reported, awaiting });
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
          'Failed to load issues. Please try again.'
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
    getStaffMembers()
      .then((response) => setStaffMembers(response.data || []))
      .catch(() => setStaffMembers([]));
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

  const handleAssign = async (issueId) => {
    const staffId = selectedStaff[issueId];

    if (!staffId) {
      setError('Please select a staff member first.');
      return;
    }

    try {
      setAssigningId(issueId);
      setError('');
      setSuccessMessage('');

      await assignIssue(issueId, staffId);

      setSuccessMessage('Issue assigned successfully.');

      await refreshAll();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to assign issue.'
      );
    } finally {
      setAssigningId(null);
    }
  };

  const formatStatus = (status) =>
  status
    ? status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    : 'Unknown';


    const formatDate = (date) => {
        if (!date) return 'N/A';

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return 'N/A';
        }

        return parsedDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
        };


  return (
    <div className="admin-issues-page">

        <header className="admin-issues-header">
        <div>
            <h1>Issue Management</h1>
            <p>View, filter and assign campus issues.</p>
        </div>

        <div className="admin-issues-header-actions">
            <button
            className="admin-issues-dashboard-button"
            onClick={() => navigate('/admin/dashboard')}
            >
            <LayoutDashboard size={17} />
            Dashboard
            </button>

            <button
            className="admin-issues-refresh"
            onClick={refreshAll}
            disabled={loading}
            >
            <RefreshCw size={17} />
            Refresh
            </button>
        </div>
        </header>


      <section className="admin-issues-summary">
        <div>
          <ClipboardList size={22} />
          <span>Total Issues</span>
          <strong>{loading ? '--' : counts.total}</strong>
        </div>

        <div>
          <AlertCircle size={22} />
          <span>Unassigned</span>
          <strong>
            {loading ? '--' : counts.reported}
          </strong>
        </div>

        <div>
          <UserCheck size={22} />
          <span>Assigned</span>

            <strong>
            {loading ? '--' : counts.awaiting}
            </strong>

        </div>
      </section>

      {error && (
        <div className="admin-issues-error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="admin-issues-success">
          {successMessage}
        </div>
      )}

      <section className="admin-issues-filters">
        <div className="admin-issues-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by ticket ID, title or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={handleFilterChange(setStatusFilter)}
        >
          <option value="all">All Statuses</option>
          <option value="reported">Reported</option>
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
      </section>

      <section className="admin-issues-list">
        <div className="admin-issues-list-heading">
          <h2>All Campus Issues</h2>
          <span>{pagination.totalItems} issue(s) found</span>
        </div>

        {loading ? (
          <div className="admin-issues-empty">
            Loading issues...
          </div>
        ) : issues.length === 0 ? (
          <div className="admin-issues-empty">
            <ClipboardList size={35} />
            <h3>No issues found</h3>
            <p>Try changing your search or filters.</p>
          </div>
        ) : (
          <div className="admin-issues-table-wrapper">
            <table className="admin-issues-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Issue</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned Staff</th>
                  <th>Reported Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {issues.map((issue) => (
                  <tr key={issue._id}>
                    <td className="admin-issues-ticket">
                      {issue.ticketId}
                    </td>

                    <td>
                      <strong>{issue.title}</strong>
                      <small>{issue.location}</small>
                    </td>

                    <td>{issue.category}</td>

                    <td>
                      <span
                        className={`admin-issues-priority ${issue.priority}`}
                      >
                        {issue.priority}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`admin-issues-status ${issue.status}`}
                      >
                        {formatStatus(issue.status)}
                      </span>
                    </td>

                    <td>
                      {issue.assignedTo?.fullName || 'Not assigned'}
                    </td>

                    <td>{formatDate(issue.createdAt)}</td>

                    <td>
                      <div className="admin-issues-actions">
                        <button
                          className="admin-issues-view"
                          onClick={() =>
                            navigate(`/admin/issues/${issue._id}`)
                          }
                        >
                          View
                        </button>

                        {issue.status !== 'resolved' &&
                          issue.status !== 'rejected' && (
                            <div className="admin-issues-assign">
                              <select
                                value={
                                    selectedStaff[issue._id] ??
                                    issue.assignedTo?._id ??
                                    ''
                                    }
                                onChange={(e) =>
                                  setSelectedStaff((previous) => ({
                                    ...previous,
                                    [issue._id]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Select staff</option>

                                {staffMembers.map((staff) => (
                                  <option
                                    key={staff._id}
                                    value={staff._id}
                                  >
                                    {staff.fullName}
                                  </option>
                                ))}
                              </select>

                              <button
                                className="admin-issues-assign-button"
                                onClick={() => handleAssign(issue._id)}
                                disabled={assigningId === issue._id}
                              >
                                {assigningId === issue._id
                                    ? 'Assigning...'
                                    : issue.assignedTo
                                        ? 'Reassign'
                                        : 'Assign'}
                              </button>
                            </div>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pagination.totalPages > 1 && (
          <div className="admin-issues-pagination">
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
    </div>
  );
}

export default AdminIssuesPage;

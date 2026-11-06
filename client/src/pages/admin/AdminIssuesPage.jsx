
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  ClipboardList,
  AlertCircle,
  UserCheck,
  LayoutDashboard,
} from 'lucide-react';

import {
  getIssues,
  getStaffMembers,
  assignIssue,
} from '../../services/issueService';

import './AdminIssuesPage.css';

function AdminIssuesPage() {
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState({});
  const [assigningId, setAssigningId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [issuesResponse, staffResponse] = await Promise.all([
        getIssues(),
        getStaffMembers(),
      ]);

      setIssues(issuesResponse.data || []);
      setStaffMembers(staffResponse.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to load issues. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


const filteredIssues = useMemo(() => {
  const search = searchTerm.trim().toLowerCase();

  return issues.filter((issue) => {
    const searchableFields = [
      issue.ticketId,
      issue.title,
      issue.location,
      issue.category,
      issue.assignedTo?.fullName,
      issue.reportedBy?.fullName,
    ];

    const matchesSearch = searchableFields.some((field) =>
      field?.toLowerCase().includes(search)
    );

    const matchesStatus =
      statusFilter === 'all' ||
      issue.status === statusFilter;

    const matchesPriority =
      priorityFilter === 'all' ||
      issue.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });
}, [issues, searchTerm, statusFilter, priorityFilter]);

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

      await fetchData();
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
            onClick={fetchData}
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
          <strong>{loading ? '--' : issues.length}</strong>
        </div>

        <div>
          <AlertCircle size={22} />
          <span>Unassigned</span>
          <strong>
            {loading
              ? '--'
              : issues.filter(
                  (issue) => issue.status === 'reported'
                ).length}
          </strong>
        </div>

        <div>
          <UserCheck size={22} />
          <span>Assigned</span>
          
            <strong>
            {loading
                ? '--'
                : issues.filter(
                    (issue) =>
                    !issue.assignedTo &&
                    !['resolved', 'rejected'].includes(issue.status)
                ).length}
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
          onChange={(e) => setStatusFilter(e.target.value)}
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
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </section>

      <section className="admin-issues-list">
        <div className="admin-issues-list-heading">
          <h2>All Campus Issues</h2>
          <span>{filteredIssues.length} issue(s) found</span>
        </div>

        {loading ? (
          <div className="admin-issues-empty">
            Loading issues...
          </div>
        ) : filteredIssues.length === 0 ? (
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
                {filteredIssues.map((issue) => (
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
      </section>
    </div>
  );
}

export default AdminIssuesPage;

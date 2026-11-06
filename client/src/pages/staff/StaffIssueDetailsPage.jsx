
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowLeft,
  MapPin,
  CalendarDays,
  User,
  Clock,
  CheckCircle,
  Circle,
  RefreshCw,
  AlertCircle,
  ClipboardList,
  Send,
} from 'lucide-react';

import {
  getIssueById,
  updateIssueStatus,
} from '../../services/issueService';

import './StaffIssueDetailsPage.css';

function StaffIssueDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [note, setNote] = useState('');

  const fetchIssue = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await getIssueById(id);
      setIssue(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to load issue details.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      setUpdating(true);
      setError('');
      setSuccess('');

      await updateIssueStatus(id, newStatus, note.trim());

      setSuccess(
        `Issue status updated to ${formatStatus(newStatus)} successfully.`
      );
      setNote('');

      await fetchIssue();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to update issue status.'
      );
    } finally {
      setUpdating(false);
    }
  };

  const formatStatus = (status) => {
    return status
      ?.replaceAll('_', ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';

    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const progressSteps = [
    { value: 'reported', label: 'Reported' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
  ];

  const getProgressIndex = () => {
    if (!issue) return -1;

    if (issue.status === 'rejected') return -1;

    return progressSteps.findIndex(
      (step) => step.value === issue.status
    );
  };

  const currentProgressIndex = getProgressIndex();

  if (loading) {
    return (
      <div className="staff-detail-state">
        <div className="staff-detail-spinner" />
        <p>Loading issue details...</p>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="staff-detail-state">
        <AlertCircle size={35} />
        <h2>Issue Not Found</h2>
        <p>{error || 'Unable to find this issue.'}</p>
        <button
          onClick={() => navigate('/staff/issues')}
          className="staff-detail-back-button"
        >
          <ArrowLeft size={17} />
          Back to Assigned Issues
        </button>
      </div>
    );
  }

  return (
    <div className="staff-detail-page">
      <header className="staff-detail-header">
        <div className="staff-detail-brand">
          <div className="staff-detail-brand-icon">
            <ShieldCheck size={24} />
          </div>
          <span>CampusFix</span>
          <span className="staff-detail-portal-label">
            STAFF PORTAL
          </span>
        </div>

        <button
          className="staff-detail-back-button"
          onClick={() => navigate('/staff/issues')}
        >
          <ArrowLeft size={17} />
          Back to Issues
        </button>
      </header>

      <main className="staff-detail-content">
        <div className="staff-detail-heading">
          <div>
            <span className="staff-detail-eyebrow">
              ISSUE MANAGEMENT
            </span>
            <h1>Issue Details</h1>
            <p>Review the issue and update its progress.</p>
          </div>

          <button
            className="staff-detail-refresh-button"
            onClick={fetchIssue}
            disabled={loading || updating}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="staff-detail-alert error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="staff-detail-alert success">
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        <section className="staff-detail-main-card">
          <div className="staff-detail-card-header">
            <div>
              <span className="staff-detail-ticket">
                {issue.ticketId}
              </span>
              <h2>{issue.title}</h2>
            </div>

            <span
              className={`staff-detail-status ${issue.status}`}
            >
              {formatStatus(issue.status)}
            </span>
          </div>

          <div className="staff-detail-description">
            <h3>Description</h3>
            <p>{issue.description}</p>
          </div>

          <div className="staff-detail-info-grid">
            <div className="staff-detail-info-item">
              <ClipboardList size={19} />
              <div>
                <span>Category</span>
                <strong>{issue.category}</strong>
              </div>
            </div>

            <div className="staff-detail-info-item">
              <MapPin size={19} />
              <div>
                <span>Location</span>
                <strong>{issue.location}</strong>
              </div>
            </div>

            <div className="staff-detail-info-item">
              <AlertCircle size={19} />
              <div>
                <span>Priority</span>
                <strong className={`staff-detail-priority ${issue.priority}`}>
                  {issue.priority}
                </strong>
              </div>
            </div>

            <div className="staff-detail-info-item">
              <CalendarDays size={19} />
              <div>
                <span>Reported Date</span>
                <strong>{formatDate(issue.createdAt)}</strong>
              </div>
            </div>

            <div className="staff-detail-info-item">
              <Clock size={19} />
              <div>
                <span>Last Updated</span>
                <strong>{formatDate(issue.updatedAt)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="staff-detail-section-card">
          <h2 className="staff-detail-section-heading">
            Reported By
          </h2>

          <div className="staff-detail-person">
            <div className="staff-detail-person-icon">
              <User size={21} />
            </div>
            <div>
              <strong>
                {issue.reportedBy?.fullName || 'N/A'}
              </strong>
              <span>
                {issue.reportedBy?.email || 'N/A'}
              </span>
            </div>
          </div>
        </section>

        <section className="staff-detail-section-card">
          <h2 className="staff-detail-section-heading">
            Issue Progress
          </h2>

          {issue.status === 'rejected' ? (
            <div className="staff-detail-rejected">
              This issue has been rejected.
            </div>
          ) : (
            <div className="staff-detail-progress">
              {progressSteps.map((step, index) => {
                const completed = index <= currentProgressIndex;
                const current = index === currentProgressIndex;

                return (
                  <div
                    className="staff-detail-progress-step"
                    key={step.value}
                  >
                    <div
                      className={`staff-detail-progress-icon ${
                        completed ? 'completed' : ''
                      } ${current ? 'current' : ''}`}
                    >
                      {completed ? (
                        <CheckCircle size={20} />
                      ) : (
                        <Circle size={20} />
                      )}
                    </div>

                    <span className={completed ? 'completed' : ''}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="staff-detail-section-card">
          <h2 className="staff-detail-section-heading">
            Update Issue Status
          </h2>

          {issue.status === 'assigned' && (
            <>
              <p className="staff-detail-update-description">
                Start working on this issue when you begin handling it.
              </p>

              <textarea
                className="staff-detail-note-input"
                placeholder="Add an optional progress note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                disabled={updating}
              />

              <button
                className="staff-detail-update-button"
                onClick={() => handleStatusUpdate('in_progress')}
                disabled={updating}
              >
                <RefreshCw size={17} />
                {updating ? 'Updating...' : 'Start Working'}
              </button>
            </>
          )}

          {issue.status === 'in_progress' && (
            <>
              <p className="staff-detail-update-description">
                Mark this issue as resolved after completing the work.
              </p>

              <textarea
                className="staff-detail-note-input"
                placeholder="Describe the work completed..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                disabled={updating}
              />

              <button
                className="staff-detail-resolve-button"
                onClick={() => handleStatusUpdate('resolved')}
                disabled={updating}
              >
                <CheckCircle size={17} />
                {updating ? 'Updating...' : 'Mark as Resolved'}
              </button>
            </>
          )}

          {issue.status === 'resolved' && (
            <div className="staff-detail-completed">
              <CheckCircle size={20} />
              This issue has been successfully resolved.
            </div>
          )}

          {issue.status === 'rejected' && (
            <div className="staff-detail-completed rejected">
              This issue is rejected and cannot be updated.
            </div>
          )}
        </section>

        <section className="staff-detail-section-card">
          <h2 className="staff-detail-section-heading">
            Status History
          </h2>

          {issue.statusHistory?.length > 0 ? (
            <div className="staff-detail-history">
              {[...issue.statusHistory]
                .reverse()
                .map((history, index) => (
                  <div
                    className="staff-detail-history-item"
                    key={`${history._id || history.updatedAt}-${index}`}
                  >
                    <div className="staff-detail-history-dot" />

                    <div>
                      <strong>
                        {formatStatus(history.status)}
                      </strong>

                      <span>
                        Updated by{' '}
                        {history.updatedBy?.fullName || 'System'}
                      </span>

                      {history.note && (
                        <p>{history.note}</p>
                      )}

                      <small>
                        {formatDate(history.updatedAt)}
                      </small>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="staff-detail-no-history">
              No status history available.
            </p>
          )}
        </section>

        <div className="staff-detail-footer">
          <button
            className="staff-detail-back-button"
            onClick={() => navigate('/staff/issues')}
          >
            <ArrowLeft size={17} />
            Back to Assigned Issues
          </button>
        </div>
      </main>
    </div>
  );
}

export default StaffIssueDetailsPage;


import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  UserRound,
  Clock,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';

import { getIssueById } from '../../services/issueService';
import './IssueDetailsPage.css';

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

const statusSteps = [
  'reported',
  'assigned',
  'in_progress',
  'resolved',
];

function formatDate(dateString) {
  if (!dateString) return '—';

  return new Date(dateString).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function IssueDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return (
      <div className="details-state">
        <RefreshCw size={25} className="details-spinner" />
        <p>Loading issue details...</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="details-state">
        <h2>Unable to load issue</h2>
        <p>{error || 'Issue not found.'}</p>
        <button onClick={() => navigate('/student/my-issues')}>
          Back to My Issues
        </button>
      </div>
    );
  }

  const currentStep = statusSteps.indexOf(issue.status);
  const isRejected = issue.status === 'rejected';

  return (
    <div className="issue-details-page">
      <header className="details-topbar">
        <button
          className="details-back-button"
          onClick={() => navigate('/student/my-issues')}
        >
          <ArrowLeft size={18} />
          Back to My Issues
        </button>

        <span className="details-brand">CampusFix</span>
      </header>

      <main className="details-container">
        <div className="details-page-heading">
          <span className="details-eyebrow">ISSUE TRACKING</span>
          <h1>Issue Details</h1>
          <p>View the information and progress of your reported issue.</p>
        </div>

        <section className="details-main-card">
          <div className="details-card-header">
            <div>
              <span className="details-ticket-id">{issue.ticketId}</span>
              <h2>{issue.title}</h2>
            </div>

            <span className={`status-badge status-${issue.status}`}>
              {statusLabels[issue.status] || issue.status}
            </span>
          </div>

          <p className="details-description">{issue.description}</p>

          <div className="details-info-grid">
            <div className="details-info-item">
              <span>Category</span>
              <strong>{issue.category}</strong>
            </div>

            <div className="details-info-item">
              <span>Priority</span>
              <strong className={`priority-text priority-${issue.priority}`}>
                {priorityLabels[issue.priority] || issue.priority}
              </strong>
            </div>

            <div className="details-info-item">
              <span><MapPin size={15} /> Location</span>
              <strong>{issue.location}</strong>
            </div>

            <div className="details-info-item">
              <span><CalendarDays size={15} /> Reported Date</span>
              <strong>{formatDate(issue.createdAt)}</strong>
            </div>

            <div className="details-info-item">
              <span><Clock size={15} /> Last Updated</span>
              <strong>{formatDate(issue.updatedAt)}</strong>
            </div>

            <div className="details-info-item">
              <span><UserRound size={15} /> Assigned Staff</span>
              <strong>
                {issue.assignedTo?.fullName || 'Not assigned yet'}
              </strong>
            </div>
          </div>
        </section>

        <section className="details-section-card">
          <div className="details-section-heading">
            <ClipboardList size={20} />
            <div>
              <h2>Issue Progress</h2>
              <p>Current progress through the resolution process.</p>
            </div>
          </div>

          {isRejected ? (
            <div className="rejected-notice">
              This issue has been rejected.
            </div>
          ) : (
            <div className="progress-steps">
              {statusSteps.map((step, index) => {
                const completed = currentStep >= index;

                return (
                  <div
                    className={`progress-step ${completed ? 'completed' : ''}`}
                    key={step}
                  >
                    <div className="progress-indicator">
                      {completed ? '✓' : index + 1}
                    </div>
                    <span>{statusLabels[step]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="details-section-card">
          <div className="details-section-heading">
            <Clock size={20} />
            <div>
              <h2>Status History</h2>
              <p>Updates recorded for this issue.</p>
            </div>
          </div>

          <div className="history-list">
            {[...(issue.statusHistory || [])]
              .reverse()
              .map((entry) => (
                <div className="history-item" key={entry._id}>
                  <div className="history-dot" />

                  <div className="history-content">
                    <div className="history-title-row">
                      <strong>
                        {statusLabels[entry.status] || entry.status}
                      </strong>
                      <span>{formatDate(entry.updatedAt)}</span>
                    </div>

                    <p>{entry.note || 'No additional note.'}</p>

                    <span className="history-user">
                      Updated by:{' '}
                      {entry.updatedBy?.fullName || 'CampusFix user'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <div className="details-footer">
          <button onClick={() => navigate('/student/my-issues')}>
            <ArrowLeft size={17} />
            Back to My Issues
          </button>
        </div>
      </main>
    </div>
  );
}

export default IssueDetailsPage;

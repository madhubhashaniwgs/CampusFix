
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
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';

import { getIssueById } from '../../services/issueService';
import './AdminIssueDetailsPage.css';

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

function AdminIssueDetailsPage() {
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
      <div className="admin-detail-state">
        <RefreshCw size={25} className="admin-detail-spinner" />
        <p>Loading issue details...</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="admin-detail-state">
        <h2>Unable to load issue</h2>
        <p>{error || 'Issue not found.'}</p>
        <button onClick={() => navigate('/admin/issues')}>
          Back to All Issues
        </button>
      </div>
    );
  }

  const currentStep = statusSteps.indexOf(issue.status);
  const isRejected = issue.status === 'rejected';

  return (
    <div className="admin-issue-details-page">
      <header className="admin-detail-topbar">
        <button
          className="admin-detail-back-button"
          onClick={() => navigate('/admin/issues')}
        >
          <ArrowLeft size={18} />
          Back to All Issues
        </button>

        <div className="admin-detail-brand">
          <ShieldCheck size={23} />
          CampusFix
          <span>ADMIN</span>
        </div>
      </header>

      <main className="admin-detail-container">
        <div className="admin-detail-heading">
          <span>ADMINISTRATION / ISSUE MANAGEMENT</span>
          <h1>Issue Details</h1>
          <p>Review complete issue information and monitor its resolution.</p>
        </div>

        <section className="admin-detail-main-card">
          <div className="admin-detail-card-header">
            <div>
              <span className="admin-detail-ticket">
                {issue.ticketId}
              </span>
              <h2>{issue.title}</h2>
            </div>

            <span className={`admin-detail-status ${issue.status}`}>
              {statusLabels[issue.status] || issue.status}
            </span>
          </div>

          <p className="admin-detail-description">
            {issue.description}
          </p>

          <div className="admin-detail-info-grid">
            <div>
              <span>Category</span>
              <strong>{issue.category}</strong>
            </div>

            <div>
              <span>Priority</span>
              <strong className={`admin-detail-priority ${issue.priority}`}>
                {priorityLabels[issue.priority] || issue.priority}
              </strong>
            </div>

            <div>
              <span><MapPin size={15} /> Location</span>
              <strong>{issue.location}</strong>
            </div>

            <div>
              <span><CalendarDays size={15} /> Reported Date</span>
              <strong>{formatDate(issue.createdAt)}</strong>
            </div>

            <div>
              <span><Clock size={15} /> Last Updated</span>
              <strong>{formatDate(issue.updatedAt)}</strong>
            </div>

            <div>
              <span><UserRound size={15} /> Assigned Staff</span>
              <strong>
                {issue.assignedTo?.fullName || 'Not assigned yet'}
              </strong>
            </div>
          </div>
        </section>

        <section className="admin-detail-section-card">
          <div className="admin-detail-section-heading">
            <GraduationCap size={21} />
            <div>
              <h2>Reported By</h2>
              <p>Student who submitted this issue.</p>
            </div>
          </div>

          <div className="admin-detail-person-info">
            <div>
              <span>Full Name</span>
              <strong>
                {issue.reportedBy?.fullName || 'Unknown student'}
              </strong>
            </div>

            <div>
              <span>Email Address</span>
              <strong>
                {issue.reportedBy?.email || 'Not available'}
              </strong>
            </div>
          </div>
        </section>

        <section className="admin-detail-section-card">
          <div className="admin-detail-section-heading">
            <ClipboardList size={21} />
            <div>
              <h2>Issue Progress</h2>
              <p>Current progress through the resolution process.</p>
            </div>
          </div>

          {isRejected ? (
            <div className="admin-detail-rejected">
              This issue has been rejected.
            </div>
          ) : (
            <div className="admin-detail-progress">
              {statusSteps.map((step, index) => {
                const completed = currentStep >= index;

                return (
                  <div
                    className={`admin-detail-progress-step ${completed ? 'completed' : ''}`}
                    key={step}
                  >
                    <div>{completed ? '✓' : index + 1}</div>
                    <span>{statusLabels[step]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="admin-detail-section-card">
          <div className="admin-detail-section-heading">
            <Clock size={21} />
            <div>
              <h2>Status History</h2>
              <p>All recorded updates for this issue.</p>
            </div>
          </div>

          <div className="admin-detail-history">
            {[...(issue.statusHistory || [])]
              .reverse()
              .map((entry) => (
                <div className="admin-detail-history-item" key={entry._id}>
                  <div className="admin-detail-history-dot" />

                  <div>
                    <div className="admin-detail-history-title">
                      <strong>
                        {statusLabels[entry.status] || entry.status}
                      </strong>
                      <span>{formatDate(entry.updatedAt)}</span>
                    </div>

                    <p>{entry.note || 'No additional note.'}</p>

                    <span className="admin-detail-history-user">
                      Updated by: {entry.updatedBy?.fullName || 'CampusFix user'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <div className="admin-detail-footer">
          <button onClick={() => navigate('/admin/issues')}>
            <ArrowLeft size={17} />
            Back to All Issues
          </button>
        </div>
      </main>
    </div>
  );
}

export default AdminIssueDetailsPage;

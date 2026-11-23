import { useCallback, useEffect, useState } from 'react';
import { ScrollText, Search, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react';

import AppLayout from '../../components/layouts/AppLayout';
import './AdminAuditLogsPage.css';
import EmptyState from '../../components/common/EmptyState';
import { getAuditLogs } from '../../services/auditService';
import { useToast } from '../../context/ToastContext';
import { useRealtimeRefresh } from '../../hooks/useRealtime';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'user.registered', label: 'User Registered' },
  { value: 'user.login', label: 'User Login' },
  { value: 'user.logout', label: 'User Logout' },
  { value: 'user.password_changed', label: 'Password Changed' },
  { value: 'staff.created', label: 'Staff Created' },
  { value: 'staff.approved', label: 'Staff Approved' },
  { value: 'staff.rejected', label: 'Staff Rejected' },
  { value: 'issue.created', label: 'Issue Created' },
  { value: 'issue.assigned', label: 'Issue Assigned' },
  { value: 'issue.status_changed', label: 'Issue Status Changed' },
  { value: 'issue.photo_uploaded', label: 'Photo Uploaded' },
];

const TARGET_OPTIONS = [
  { value: '', label: 'All Targets' },
  { value: 'user', label: 'User' },
  { value: 'issue', label: 'Issue' },
];

const PAGE_SIZE = 15;

const ACTION_LABELS = Object.fromEntries(
  ACTION_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label])
);

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const shortId = (id) => (id ? String(id).slice(-8) : '—');

// Render event-specific metadata in a readable form instead of raw JSON.
const formatMetadata = (action, metadata = {}) => {
  const parts = [];

  if (metadata.status) parts.push(`status → ${metadata.status}`);
  if (metadata.role) parts.push(`role: ${metadata.role}`);
  if (metadata.ticketId) parts.push(metadata.ticketId);
  if (metadata.category) parts.push(metadata.category);
  if (metadata.priority) parts.push(`${metadata.priority} priority`);
  if (metadata.hasPhoto !== undefined) parts.push(metadata.hasPhoto ? 'with photo' : 'no photo');
  if (metadata.from && metadata.to) parts.push(`${metadata.from} → ${metadata.to}`);
  if (metadata.fromStaffId || metadata.toStaffId)
    parts.push(`staff ${shortId(metadata.fromStaffId)} → ${shortId(metadata.toStaffId)}`);
  if (metadata.publicId) parts.push(shortId(metadata.publicId));

  return parts.length ? parts.join(' · ') : '—';
};

export default function AdminAuditLogsPage() {
  const { error: toastError } = useToast();

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    totalItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    actorId: '',
    targetType: '',
    startDate: '',
    endDate: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAuditLogs({
        page,
        limit: PAGE_SIZE,
        action: appliedFilters.action || undefined,
        actorId: appliedFilters.actorId || undefined,
        targetType: appliedFilters.targetType || undefined,
        startDate: appliedFilters.startDate || undefined,
        endDate: appliedFilters.endDate || undefined,
      });
      setLogs(res.data || []);
      setPagination(res.pagination || { page: 1, totalPages: 0, totalItems: 0 });
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to load audit logs.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilters, toastError]);

  useEffect(() => {
    // Defer to a macrotask so setLoading inside fetchLogs is not a
    // synchronous setState within the effect body.
    const timer = setTimeout(fetchLogs, 0);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  useRealtimeRefresh(
    ['audit:new'],
    () => {
      fetchLogs();
    },
    [fetchLogs]
  );

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    const empty = {
      action: '',
      actorId: '',
      targetType: '',
      startDate: '',
      endDate: '',
    };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  };

  const hasActiveFilters = Object.values(appliedFilters).some(Boolean);

  return (
    <AppLayout activeNav="audit">
      <div className="audit-page">
        <div className="audit-header">
          <div>
            <h1 className="audit-title">
              <ScrollText className="audit-title-icon" />
              Audit Logs
            </h1>
            <p className="audit-subtitle">System-wide record of security and workflow events.</p>
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            className="audit-refresh-btn"
            aria-label="Refresh audit logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <form onSubmit={applyFilters} className="audit-filters">
          <div className="audit-filter-field">
            <label htmlFor="action">Action</label>
            <select id="action" name="action" value={filters.action} onChange={handleFilterChange}>
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="audit-filter-field">
            <label htmlFor="actorId">Actor ID</label>
            <input
              id="actorId"
              name="actorId"
              type="text"
              placeholder="User ObjectId"
              value={filters.actorId}
              onChange={handleFilterChange}
            />
          </div>

          <div className="audit-filter-field">
            <label htmlFor="targetType">Target Type</label>
            <select
              id="targetType"
              name="targetType"
              value={filters.targetType}
              onChange={handleFilterChange}
            >
              {TARGET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="audit-filter-field">
            <label htmlFor="startDate">From</label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
          </div>

          <div className="audit-filter-field">
            <label htmlFor="endDate">To</label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>

          <div className="audit-filter-actions">
            <button type="submit" className="audit-apply-btn">
              <Search className="w-4 h-4" />
              Apply
            </button>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="audit-clear-btn">
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </form>

        {loading ? (
          <div className="audit-loading">Loading audit logs…</div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit records"
            description={
              hasActiveFilters
                ? 'No records match the current filters.'
                : 'Audit events will appear here as users perform actions.'
            }
          />
        ) : (
          <>
            <div className="audit-table-wrap">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="audit-cell-time">{formatDateTime(log.createdAt)}</td>
                      <td>
                        {log.actor?.userId ? (
                          <span title={log.actor.userId}>{shortId(log.actor.userId)}</span>
                        ) : (
                          <span className="audit-anon">Anonymous</span>
                        )}
                      </td>
                      <td>
                        <span className={`audit-role audit-role-${log.actor?.role || 'anonymous'}`}>
                          {log.actor?.role || 'anonymous'}
                        </span>
                      </td>
                      <td>
                        <span className="audit-action">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td>
                        <span className="audit-target">
                          {log.target?.type} · {shortId(log.target?.id)}
                        </span>
                      </td>
                      <td className="audit-cell-meta">
                        {formatMetadata(log.action, log.metadata)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="audit-pagination">
              <span className="audit-page-info">
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)} ·{' '}
                {pagination.totalItems} records
              </span>
              <div className="audit-page-btns">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="audit-page-btn"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="audit-page-btn"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

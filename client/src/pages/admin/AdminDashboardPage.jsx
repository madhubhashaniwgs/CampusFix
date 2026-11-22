import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ClipboardList,
  AlertCircle,
  Clock,
  CheckCircle2,
  LayoutGrid,
  List,
  ArrowRight,
  TrendingUp,
  Sparkles,
  MapPin,
  Calendar,
  Image as ImageIcon,
  UserPlus,
} from 'lucide-react';

import AppLayout from '../../components/layouts/AppLayout';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import CategoryBadge from '../../components/common/CategoryBadge';
import ImageModal from '../../components/common/ImageModal';
import EmptyState from '../../components/common/EmptyState';
import IssuePhoto from '../../components/common/IssuePhoto';
import IssueCard from '../../components/issues/IssueCard';
import { getIssues, getIssueCount, getStaffMembers, assignIssue } from '../../services/issueService';
import { useToast } from '../../context/ToastContext';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [issues, setIssues] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    reported: 0,
    assigned: 0,
    in_progress: 0,
    resolved: 0,
    unassigned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [activePhoto, setActivePhoto] = useState({ isOpen: false, src: '', title: '' });
  const [assigningId, setAssigningId] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [
        issuesRes,
        staffRes,
        total,
        reported,
        assigned,
        inProgress,
        resolved,
        unassigned,
      ] = await Promise.all([
        getIssues({
          status: 'reported,assigned,in_progress',
          limit: 6,
        }),
        getStaffMembers().catch(() => ({ data: [] })),
        getIssueCount(),
        getIssueCount({ status: 'reported' }),
        getIssueCount({ status: 'assigned' }),
        getIssueCount({ status: 'in_progress' }),
        getIssueCount({ status: 'resolved' }),
        getIssueCount({ assignee: 'unassigned', status: 'reported,assigned,in_progress' }),
      ]);

      setIssues(issuesRes.data || []);
      setStaffMembers(staffRes.data?.staff || staffRes.data || []);
      setCounts({
        total,
        reported,
        assigned,
        in_progress: inProgress,
        resolved,
        unassigned,
      });
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleQuickAssign = async (issueId, staffId) => {
    if (!staffId) return;
    try {
      setAssigningId(issueId);
      await assignIssue(issueId, staffId);
      const assignedStaff = staffMembers.find((s) => s._id === staffId);
      success(
        `Assigned to ${assignedStaff?.fullName || 'Technician'} successfully!`,
        'Staff Assigned'
      );
      await fetchDashboard();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to assign staff.');
    } finally {
      setAssigningId(null);
    }
  };

  const resolutionRate = useMemo(() => {
    if (!counts.total) return 0;
    return Math.round((counts.resolved / counts.total) * 100);
  }, [counts]);

  const statCards = [
    {
      title: 'Total Campus Issues',
      value: counts.total,
      icon: ClipboardList,
      color: 'purple',
      subtitle: 'All-time reports',
    },
    {
      title: 'Awaiting Staff Dispatch',
      value: counts.unassigned,
      icon: AlertCircle,
      color: 'amber',
      subtitle: 'Needs technician',
    },
    {
      title: 'In Active Repair',
      value: counts.in_progress,
      icon: Clock,
      color: 'indigo',
      subtitle: 'Work underway',
    },
    {
      title: 'Resolved Tickets',
      value: counts.resolved,
      icon: CheckCircle2,
      color: 'emerald',
      subtitle: `${resolutionRate}% campus fix rate`,
    },
  ];

  return (
    <AppLayout activeNav="dashboard">
      <ImageModal
        isOpen={activePhoto.isOpen}
        src={activePhoto.src}
        title={activePhoto.title}
        onClose={() => setActivePhoto({ isOpen: false, src: '', title: '' })}
      />

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white p-6 sm:p-8 md:p-10 shadow-xl mb-8 border border-purple-400/30">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-purple-200 text-xs font-bold uppercase tracking-wider border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              Campus Operations & Facility Management
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              Administrator Control Center
            </h1>
            <p className="text-purple-100 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
              Monitor facilities across campus, assign technical staff to incoming tickets, and maintain high campus infrastructure standards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/admin/issues')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-purple-950 font-black text-sm shadow-lg shadow-black/15 hover:bg-purple-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ClipboardList className="w-5 h-5 text-purple-700" />
              Manage All Issues
            </button>
            <button
              onClick={() => navigate('/admin/staff')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm backdrop-blur-md border border-white/25 transition-all"
            >
              <UserPlus className="w-5 h-5 text-purple-200" />
              Staff Team ({staffMembers.length})
            </button>
          </div>
        </div>

        {/* Mini Resolution Progress */}
        {counts.total > 0 && (
          <div className="relative z-10 mt-6 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-purple-100">
            <div className="flex items-center gap-2 font-bold">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Campus Resolution Rate:</span>
              <strong className="text-white text-sm font-black">{resolutionRate}%</strong>
              <span className="text-purple-200 font-semibold">({counts.resolved} of {counts.total} completed)</span>
            </div>
            <div className="w-full sm:w-64 bg-white/25 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${resolutionRate}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            subtitle={stat.subtitle}
            onClick={() => navigate('/admin/issues')}
          />
        ))}
      </div>

      {/* Recent Issues Section with Quick Assignment */}
      <div className="purple-card rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-purple-100">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-purple-950 tracking-tight">Recent Campus Issues</h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                Live Feed
              </span>
            </div>
            <p className="text-xs text-purple-900/70 mt-1">
              Latest tickets reported across all campus facilities
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-purple-100/90 p-1 rounded-xl border border-purple-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-purple-700 hover:text-purple-950'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-purple-700 hover:text-purple-950'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => navigate('/admin/issues')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 px-3 py-2 rounded-xl hover:bg-purple-100 transition-colors"
            >
              All issues
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-purple-900/70 font-semibold">Loading campus issues...</p>
          </div>
        ) : issues.length === 0 ? (
          <EmptyState
            title="No issues reported yet"
            description="The campus maintenance log is clean! As students report issues, they will appear here."
            actionLabel="Refresh Feed"
            onAction={fetchDashboard}
          />
        ) : viewMode === 'grid' ? (
          /* Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-6">
            {issues.map((issue) => (
              <IssueCard
                key={issue._id}
                issue={issue}
                onClick={() => navigate(`/admin/issues/${issue._id}`)}
                onPhotoClick={(src, title) =>
                  setActivePhoto({ isOpen: true, src, title })
                }
              />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto mt-6 -mx-6 sm:mx-0 rounded-2xl border border-purple-200 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-purple-200 text-purple-950 font-bold uppercase tracking-wider bg-purple-100/80">
                  <th className="py-3.5 px-4">Ticket</th>
                  <th className="py-3.5 px-4">Issue Details</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Assign Technician</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white/70">
                {issues.map((issue) => (
                  <tr
                    key={issue._id}
                    onClick={() => navigate(`/admin/issues/${issue._id}`)}
                    className="hover:bg-purple-100/60 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono font-black text-purple-800 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <IssuePhoto
                          src={issue.photo}
                          alt={issue.title}
                          category={issue.category}
                          variant="thumbnail"
                        />
                        <span>{issue.ticketId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-bold text-purple-950 group-hover:text-purple-700 transition-colors truncate">
                        {issue.title}
                      </p>
                      <p className="text-[11px] text-purple-900/70 truncate">{issue.description}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <CategoryBadge category={issue.category} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-purple-950 font-medium max-w-[150px] truncate whitespace-nowrap">
                      {issue.location}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <PriorityBadge priority={issue.priority} size="sm" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={issue.status} size="sm" />
                    </td>
                    <td
                      className="py-3 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        value={issue.assignedTo?._id || ''}
                        onChange={(e) => handleQuickAssign(issue._id, e.target.value)}
                        disabled={assigningId === issue._id}
                        className="text-xs py-1 px-2.5 rounded-lg border border-purple-200 bg-white font-bold text-purple-900 outline-none focus:border-purple-600"
                      >
                        <option value="">+ Assign Staff</option>
                        {staffMembers.map((staff) => (
                          <option key={staff._id} value={staff._id}>
                            {staff.fullName}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

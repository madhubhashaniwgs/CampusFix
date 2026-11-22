import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  ArrowRight,
  RefreshCw,
  Sparkles,
  MapPin,
  Calendar,
  Image as ImageIcon,
  Edit3,
} from 'lucide-react';

import AppLayout from '../../components/layouts/AppLayout';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import CategoryBadge from '../../components/common/CategoryBadge';
import ImageModal from '../../components/common/ImageModal';
import QuickStatusModal from '../../components/issues/QuickStatusModal';
import EmptyState from '../../components/common/EmptyState';
import IssuePhoto from '../../components/common/IssuePhoto';
import { getIssues, getIssueCount } from '../../services/issueService';

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    assigned: 0,
    in_progress: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [activePhoto, setActivePhoto] = useState({ isOpen: false, src: '', title: '' });
  const [statusModalIssue, setStatusModalIssue] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [issuesRes, assigned, inProgress, resolved] = await Promise.all([
        getIssues({ limit: 6 }),
        getIssueCount({ status: 'assigned' }),
        getIssueCount({ status: 'in_progress' }),
        getIssueCount({ status: 'resolved' }),
      ]);

      const list = issuesRes.data || [];
      setIssues(list);
      setCounts({
        total: issuesRes.pagination?.totalItems || list.length,
        assigned,
        in_progress: inProgress,
        resolved,
      });
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // Auto-refresh dashboard data every 30 seconds.
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const statCards = [
    {
      title: 'Active Workload',
      value: counts.assigned + counts.in_progress,
      icon: ClipboardList,
      color: 'purple',
      subtitle: 'Open tickets',
    },
    {
      title: 'Awaiting Pickup',
      value: counts.assigned,
      icon: AlertCircle,
      color: 'sky',
      subtitle: 'Assigned to you',
    },
    {
      title: 'Under Repair',
      value: counts.in_progress,
      icon: Clock,
      color: 'indigo',
      subtitle: 'Currently in progress',
    },
    {
      title: 'Resolved By You',
      value: counts.resolved,
      icon: CheckCircle2,
      color: 'emerald',
      subtitle: 'Completed tasks',
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

      <QuickStatusModal
        isOpen={Boolean(statusModalIssue)}
        issue={statusModalIssue}
        onClose={() => setStatusModalIssue(null)}
        onUpdated={fetchDashboard}
      />

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white p-6 sm:p-8 md:p-10 shadow-xl mb-8 border border-purple-400/30">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-purple-200 text-xs font-bold uppercase tracking-wider border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              Staff Specialist Portal
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              {greeting}, {user?.fullName || 'Specialist'}!
            </h1>
            <p className="text-purple-100 text-sm sm:text-base leading-relaxed max-w-xl">
              You have{' '}
              <strong className="text-white font-black underline decoration-purple-400">
                {counts.assigned + counts.in_progress} pending tasks
              </strong>{' '}
              requiring attention. Update statuses, add maintenance notes, and resolve campus
              issues.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/staff/issues')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-purple-950 font-black text-sm shadow-lg shadow-black/15 hover:bg-purple-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ClipboardList className="w-5 h-5 text-purple-700" />
              View Assigned Tickets
            </button>
            <button
              onClick={fetchDashboard}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm backdrop-blur-md border border-white/25 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            subtitle={stat.subtitle}
            onClick={() => navigate('/staff/issues')}
          />
        ))}
      </div>

      {/* Recent Assigned Issues Section */}
      <div className="purple-card rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-purple-100">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-purple-950 tracking-tight">
                Assigned Work Orders
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                {issues.length} Active
              </span>
            </div>
            <p className="text-xs text-purple-900/70 mt-1">
              Issues assigned to you for inspection and repair
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
              onClick={() => navigate('/staff/issues')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 px-3 py-2 rounded-xl hover:bg-purple-100 transition-colors"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-purple-900/70 font-semibold">
              Loading assigned work orders...
            </p>
          </div>
        ) : issues.length === 0 ? (
          <EmptyState
            title="No assigned issues right now"
            description="You are caught up! When the administrator assigns maintenance tickets to your queue, they will show up here."
            actionLabel="Refresh Queue"
            onAction={fetchDashboard}
          />
        ) : viewMode === 'grid' ? (
          /* Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-6">
            {issues.map((issue) => (
              <div
                key={issue._id}
                onClick={() => navigate(`/staff/issues/${issue._id}`)}
                className="group relative purple-card rounded-2xl overflow-hidden flex flex-col cursor-pointer"
              >
                {/* Image Banner with SVG Placeholder fallback */}
                <div className="relative h-40 w-full overflow-hidden border-b border-purple-200">
                  <IssuePhoto
                    src={issue.photo}
                    alt={issue.title}
                    category={issue.category}
                    variant="banner"
                    className="h-40"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-purple-950 font-mono text-xs font-black px-2.5 py-1 rounded-lg border border-purple-200 shadow-xs">
                    {issue.ticketId}
                  </div>
                  <div className="absolute top-3 right-3">
                    <PriorityBadge priority={issue.priority} size="sm" />
                  </div>
                  {issue.photo && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePhoto({
                          isOpen: true,
                          src: issue.photo,
                          title: `${issue.ticketId} - ${issue.title}`,
                        });
                      }}
                      className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-black/70 backdrop-blur-md text-white transition-all opacity-0 group-hover:opacity-100 border border-white/20"
                      title="Inspect Photo"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-purple-950 group-hover:text-purple-700 transition-colors line-clamp-1 text-sm sm:text-base">
                      {issue.title}
                    </h3>
                    <p className="text-xs text-purple-900/70 line-clamp-2 mt-1 font-medium">
                      {issue.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-purple-100 text-xs text-purple-900/70">
                    <div className="flex items-center gap-1.5 text-purple-950 font-semibold truncate">
                      <MapPin className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                      <span className="truncate">{issue.location}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <CategoryBadge category={issue.category} size="sm" />
                      <div className="flex items-center gap-1 text-[11px] text-purple-700 font-semibold">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(issue.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-purple-100 flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={issue.status} size="sm" />

                    {issue.status !== 'resolved' && issue.status !== 'rejected' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusModalIssue(issue);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg transition-all shadow-md shadow-purple-600/25 hover:scale-[1.03] whitespace-nowrap"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Update Status
                      </button>
                    )}
                  </div>
                </div>
              </div>
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
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white/70">
                {issues.map((issue) => (
                  <tr
                    key={issue._id}
                    onClick={() => navigate(`/staff/issues/${issue._id}`)}
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
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {issue.status !== 'resolved' && issue.status !== 'rejected' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusModalIssue(issue);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg transition-all shadow-md shadow-purple-600/25 hover:scale-[1.03] whitespace-nowrap"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Update Status
                        </button>
                      )}
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

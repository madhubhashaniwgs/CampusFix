import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList,
  AlertCircle,
  Clock,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  List,
  TrendingUp,
  MapPin,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';

import AppLayout from '../components/layouts/AppLayout';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import PriorityBadge from '../components/common/PriorityBadge';
import CategoryBadge from '../components/common/CategoryBadge';
import ImageModal from '../components/common/ImageModal';
import EmptyState from '../components/common/EmptyState';
import IssueCard from '../components/issues/IssueCard';
import IssuePhoto from '../components/common/IssuePhoto';
import { getIssues, getIssueCount } from '../services/issueService';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total: 0,
    reported: 0,
    in_progress: 0,
    resolved: 0,
  });
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [activePhoto, setActivePhoto] = useState({ isOpen: false, src: '', title: '' });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const [issuesRes, total, reported, inProgress, resolved] = await Promise.all([
          getIssues({ limit: 6 }),
          getIssueCount({}),
          getIssueCount({ status: 'reported' }),
          getIssueCount({ status: 'in_progress' }),
          getIssueCount({ status: 'resolved' }),
        ]);

        setRecentIssues(issuesRes.data || []);
        setStats({
          total,
          reported,
          in_progress: inProgress,
          resolved,
        });
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user?.role]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const resolutionRate = useMemo(() => {
    if (!stats.total) return 0;
    return Math.round((stats.resolved / stats.total) * 100);
  }, [stats]);

  const statCards = [
    {
      title: 'Total Issues Reported',
      value: stats.total,
      icon: ClipboardList,
      color: 'purple',
      subtitle: 'All time',
    },
    {
      title: 'Awaiting Action',
      value: stats.reported,
      icon: AlertCircle,
      color: 'amber',
      subtitle: 'Needs triage',
    },
    {
      title: 'In Progress',
      value: stats.in_progress,
      icon: Clock,
      color: 'indigo',
      subtitle: 'Technician on it',
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle2,
      color: 'emerald',
      subtitle: `${resolutionRate}% resolved`,
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

      {/* Hero Welcome Banner - Rich Purple Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 text-white p-6 sm:p-8 md:p-10 shadow-xl mb-8 border border-purple-400/30">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-purple-200 text-xs font-bold uppercase tracking-wider border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              Student Maintenance Hub
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              {greeting}, {user?.fullName || 'Student'}!
            </h1>
            <p className="text-purple-100 text-sm sm:text-base leading-relaxed max-w-xl">
              Track maintenance tickets across lecture halls, labs, and dorms. Report new issues in seconds and follow live progress.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/student/report-issue')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-purple-900 font-extrabold text-sm shadow-lg shadow-black/15 hover:bg-purple-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-5 h-5 text-purple-700" />
              Report Issue Now
            </button>
            <button
              onClick={() => navigate('/student/my-issues')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm backdrop-blur-md border border-white/25 transition-all"
            >
              <ClipboardList className="w-5 h-5 text-purple-200" />
              View My Tickets
            </button>
          </div>
        </div>

        {/* Mini Resolution Progress Indicator */}
        {stats.total > 0 && (
          <div className="relative z-10 mt-6 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-purple-100">
            <div className="flex items-center gap-2 font-bold">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Campus Resolution Rate:</span>
              <strong className="text-white text-sm font-black">{resolutionRate}%</strong>
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
            onClick={() => navigate('/student/my-issues')}
          />
        ))}
      </div>

      {/* Recent Issues Section (Purple Frosted Card) */}
      <div className="purple-card rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-purple-100">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-extrabold text-purple-950 tracking-tight">Recent Issues</h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                {recentIssues.length} Latest
              </span>
            </div>
            <p className="text-xs text-purple-900/70 mt-1">
              Your most recently logged maintenance and facility tickets
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
              onClick={() => navigate('/student/my-issues')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 px-3 py-2 rounded-xl hover:bg-purple-100/80 transition-colors"
            >
              View all tickets
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-purple-900/70 font-semibold">Loading your tickets...</p>
          </div>
        ) : recentIssues.length === 0 ? (
          <EmptyState
            title="No tickets reported yet"
            description="Notice a broken light, faulty AC, leak, or damaged furniture? Report it to help keep campus in top shape."
            actionLabel="Report Your First Issue"
            onAction={() => navigate('/student/report-issue')}
          />
        ) : viewMode === 'grid' ? (
          /* Cards Grid View with IssueCard & Placeholder */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-6">
            {recentIssues.map((issue) => (
              <IssueCard
                key={issue._id}
                issue={issue}
                onClick={() => navigate(`/student/issues/${issue._id}`)}
                onPhotoClick={(src, title) =>
                  setActivePhoto({
                    isOpen: true,
                    src,
                    title,
                  })
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
                  <th className="py-3.5 px-4 text-right">Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white/70">
                {recentIssues.map((issue) => (
                  <tr
                    key={issue._id}
                    onClick={() => navigate(`/student/issues/${issue._id}`)}
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
                    <td className="py-3 px-4 text-right text-purple-800 font-medium whitespace-nowrap">
                      {new Date(issue.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
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

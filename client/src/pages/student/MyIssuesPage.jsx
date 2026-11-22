import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  PlusCircle,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

import AppLayout from '../../components/layouts/AppLayout';
import IssueCard from '../../components/issues/IssueCard';
import IssuePhoto from '../../components/common/IssuePhoto';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import CategoryBadge from '../../components/common/CategoryBadge';
import ImageModal from '../../components/common/ImageModal';
import EmptyState from '../../components/common/EmptyState';
import { getIssues, getIssueCount } from '../../services/issueService';

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { value: 'all', label: 'All Issues' },
  { value: 'reported', label: 'Reported' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
];

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'it', label: 'IT & Equipment' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'other', label: 'General / Facility' },
];

const PRIORITIES = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export default function MyIssuesPage() {
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: PAGE_SIZE,
  });
  const [statusCounts, setStatusCounts] = useState({});
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [activePhoto, setActivePhoto] = useState({ isOpen: false, src: '', title: '' });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCounts = useCallback(async () => {
    try {
      const counts = await Promise.all(
        STATUS_TABS.map((t) =>
          t.value === 'all'
            ? getIssueCount()
            : getIssueCount({ status: t.value })
        )
      );
      const map = {};
      STATUS_TABS.forEach((t, i) => {
        map[t.value] = counts[i];
      });
      setStatusCounts(map);
    } catch {
      // Ignore
    }
  }, []);

  const fetchIssues = useCallback(
    async (targetPage = page) => {
      try {
        setLoading(true);
        const params = { page: targetPage, limit: PAGE_SIZE };
        if (filter !== 'all') params.status = filter;
        if (categoryFilter !== 'all') params.category = categoryFilter;
        if (priorityFilter !== 'all') params.priority = priorityFilter;
        if (debouncedSearch) params.search = debouncedSearch;

        const res = await getIssues(params);
        setIssues(res.data || []);
        setPagination(
          res.pagination || {
            currentPage: targetPage,
            totalPages: 1,
            totalItems: 0,
            pageSize: PAGE_SIZE,
          }
        );
      } catch {
        setIssues([]);
      } finally {
        setLoading(false);
      }
    },
    [filter, categoryFilter, priorityFilter, debouncedSearch, page]
  );

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchIssues(page);
  }, [fetchIssues, page]);

  const resetFilters = () => {
    setFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setSearchTerm('');
    setPage(1);
  };

  const hasActiveFilters =
    filter !== 'all' ||
    categoryFilter !== 'all' ||
    priorityFilter !== 'all' ||
    debouncedSearch !== '';

  return (
    <AppLayout activeNav="issues">
      <ImageModal
        isOpen={activePhoto.isOpen}
        src={activePhoto.src}
        title={activePhoto.title}
        onClose={() => setActivePhoto({ isOpen: false, src: '', title: '' })}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
            My Maintenance Tickets
          </h1>
          <p className="text-sm text-purple-900/70 mt-1">
            Track status updates, technician notes, and historical campus reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchCounts();
              fetchIssues(page);
            }}
            className="p-2.5 rounded-xl border border-purple-200 bg-white/80 hover:bg-purple-100 text-purple-800 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-700' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/student/report-issue')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            Report Issue
          </button>
        </div>
      </div>

      {/* Filter & Search Bar (Purple Card) */}
      <div className="purple-card rounded-3xl p-4 sm:p-5 mb-6 space-y-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const isActive = filter === tab.value;
            const count = statusCounts[tab.value];
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setFilter(tab.value);
                  setPage(1);
                }}
                className={`flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-purple-700 text-white shadow-sm shadow-purple-700/25'
                    : 'bg-purple-100/70 hover:bg-purple-200 text-purple-900'
                }`}
              >
                <span>{tab.label}</span>
                {count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-purple-200 text-purple-900'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Dropdown Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-purple-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, location or ticket ID..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-purple-200 bg-white/90 text-xs font-medium text-purple-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none transition-all placeholder:text-purple-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-purple-200 bg-white/90 text-xs font-bold text-purple-900 outline-none focus:border-purple-600"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-purple-200 bg-white/90 text-xs font-bold text-purple-900 outline-none focus:border-purple-600"
            >
              {PRIORITIES.map((pri) => (
                <option key={pri.value} value={pri.value}>
                  {pri.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
              >
                Clear Filters
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-purple-100/90 p-1 rounded-xl border border-purple-200 ml-auto sm:ml-0">
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
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-purple-900/70 font-semibold">Loading tickets...</p>
        </div>
      ) : issues.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? 'No matching tickets found' : 'No tickets reported yet'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search terms or filters to find what you are looking for.'
              : 'When you report a facility problem on campus, it will appear here.'
          }
          actionLabel={hasActiveFilters ? 'Clear All Filters' : 'Report an Issue'}
          onAction={hasActiveFilters ? resetFilters : () => navigate('/student/report-issue')}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {issues.map((issue) => (
            <IssueCard
              key={issue._id}
              issue={issue}
              onClick={() => navigate(`/student/issues/${issue._id}`)}
              onPhotoClick={(src, title) => setActivePhoto({ isOpen: true, src, title })}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="purple-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-purple-200 text-purple-950 font-bold uppercase tracking-wider bg-purple-100/80">
                  <th className="py-3.5 px-4">Ticket</th>
                  <th className="py-3.5 px-4">Title & Description</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned To</th>
                  <th className="py-3.5 px-4 text-right">Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white/70">
                {issues.map((issue) => (
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
                    <td className="py-3 px-4 text-purple-900/80 font-medium whitespace-nowrap">
                      {issue.assignedTo?.fullName || (
                        <span className="text-purple-400 italic">Unassigned</span>
                      )}
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
        </div>
      )}

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between border-t border-purple-200 pt-4 px-2">
          <p className="text-xs text-purple-900/70 font-medium">
            Showing <strong className="text-purple-950">{(page - 1) * PAGE_SIZE + 1}</strong> to{' '}
            <strong className="text-purple-950">
              {Math.min(page * PAGE_SIZE, pagination.totalItems)}
            </strong>{' '}
            of <strong className="text-purple-950">{pagination.totalItems}</strong> tickets
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-purple-200 bg-white/80 text-xs font-bold text-purple-800 hover:bg-purple-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs font-black text-purple-950 px-2 font-mono">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
              disabled={page >= pagination.totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-purple-200 bg-white/80 text-xs font-bold text-purple-800 hover:bg-purple-100 disabled:opacity-40 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

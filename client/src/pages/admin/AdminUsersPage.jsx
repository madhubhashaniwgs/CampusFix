import { useEffect, useState } from 'react';
import {
  Users,
  Search,
  X,
  RefreshCw,
  Eye,
  GraduationCap,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';

import AppLayout from '../../components/layouts/AppLayout';
import EmptyState from '../../components/common/EmptyState';
import { getUsers } from '../../services/userService';
import { useToast } from '../../context/ToastContext';

const ROLE_FILTERS = [
  { value: '', label: 'All Roles' },
  { value: 'student', label: 'Students' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admins' },
];

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];

const statusBadgeClass = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  rejected: 'bg-rose-100 text-rose-800 border-rose-300',
};

export default function AdminUsersPage() {
  const { error: toastError } = useToast();

  const PAGE_SIZE = 10;

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async (targetPage = 1) => {
    try {
      setLoading(true);
      const res = await getUsers({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page: targetPage,
        limit: PAGE_SIZE,
      });
      setUsers(res.data?.users || []);
      setPagination(
        res.data?.pagination || {
          page: targetPage,
          pageSize: PAGE_SIZE,
          totalItems: 0,
          totalPages: 0,
        }
      );
    } catch (err) {
      toastError(err.response?.data?.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter]);

  const goToPage = (p) => {
    if (p >= 1 && p <= pagination.totalPages) fetchUsers(p);
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.fullName?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.studentId?.toLowerCase().includes(term) ||
      u.staffId?.toLowerCase().includes(term) ||
      u.department?.toLowerCase().includes(term)
    );
  });

  const roleIcon = (role) => {
    if (role === 'student') return <GraduationCap className="w-4 h-4" />;
    if (role === 'staff') return <Briefcase className="w-4 h-4" />;
    return <ShieldCheck className="w-4 h-4" />;
  };

  const memberId = (u) => u.studentId || u.staffId || '—';

  return (
    <AppLayout activeNav="users">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-purple-900/70 mt-1 font-medium">
            View all registered students, staff, and administrators.
          </p>
        </div>

        <button
          onClick={() => fetchUsers(pagination.page)}
          className="p-2.5 rounded-xl border border-purple-200 bg-white/80 hover:bg-purple-100 text-purple-900 transition-colors self-start"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-700' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="purple-card rounded-3xl p-4 sm:p-5 mb-6 flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, ID, or department..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-purple-200 bg-white/90 text-xs font-medium text-purple-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none transition-all placeholder:text-purple-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-purple-200 bg-white/90 text-xs font-bold text-purple-950 focus:border-purple-600 outline-none"
          >
            {ROLE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-purple-200 bg-white/90 text-xs font-bold text-purple-950 focus:border-purple-600 outline-none"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="purple-card rounded-3xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-purple-900/70 font-semibold">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState title="No users found" description="Try adjusting your search or filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-purple-200 bg-purple-50/60">
                  <th className="py-3.5 px-4 text-xs font-black uppercase tracking-wider text-purple-900/70">
                    User
                  </th>
                  <th className="py-3.5 px-4 text-xs font-black uppercase tracking-wider text-purple-900/70">
                    Role
                  </th>
                  <th className="py-3.5 px-4 text-xs font-black uppercase tracking-wider text-purple-900/70">
                    ID / Dept
                  </th>
                  <th className="py-3.5 px-4 text-xs font-black uppercase tracking-wider text-purple-900/70">
                    Status
                  </th>
                  <th className="py-3.5 px-4 text-xs font-black uppercase tracking-wider text-purple-900/70">
                    Registered
                  </th>
                  <th className="py-3.5 px-4 text-xs font-black uppercase tracking-wider text-purple-900/70 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-purple-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-purple-950 text-sm">{u.fullName}</p>
                      <p className="text-xs text-purple-800/60 font-medium">{u.email}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-purple-800 capitalize">
                        {roleIcon(u.role)}
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-purple-900/80 whitespace-nowrap">
                      {memberId(u)}
                      {u.department && (
                        <span className="text-purple-700/50"> · {u.department}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full border text-[11px] font-black capitalize ${statusBadgeClass[u.status] || statusBadgeClass.active}`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-purple-800/70 whitespace-nowrap">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-white text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs font-semibold text-purple-900/70">
            Showing{' '}
            <strong className="text-purple-950">{(pagination.page - 1) * PAGE_SIZE + 1}</strong> to{' '}
            <strong className="text-purple-950">
              {Math.min(pagination.page * PAGE_SIZE, pagination.totalItems)}
            </strong>{' '}
            of <strong className="text-purple-950">{pagination.totalItems}</strong> users
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-lg border border-purple-200 bg-white text-xs font-bold text-purple-800 disabled:opacity-40 hover:bg-purple-50"
            >
              Previous
            </button>
            <span className="text-xs font-black text-purple-950">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 rounded-lg border border-purple-200 bg-white text-xs font-bold text-purple-800 disabled:opacity-40 hover:bg-purple-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="relative max-w-md w-full bg-white rounded-3xl shadow-2xl border border-purple-200 overflow-hidden text-purple-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100">
              <h3 className="font-black text-purple-950">User Details</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg text-purple-400 hover:text-purple-700 hover:bg-purple-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                  {roleIcon(selectedUser.role)}
                </div>
                <div>
                  <p className="font-extrabold text-purple-950">{selectedUser.fullName}</p>
                  <p className="text-xs text-purple-800/60 font-medium">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-purple-50/70 rounded-xl p-3 border border-purple-100">
                  <p className="text-purple-700/60 font-bold uppercase text-[10px] mb-1">Role</p>
                  <p className="font-extrabold text-purple-950 capitalize">{selectedUser.role}</p>
                </div>
                <div className="bg-purple-50/70 rounded-xl p-3 border border-purple-100">
                  <p className="text-purple-700/60 font-bold uppercase text-[10px] mb-1">Status</p>
                  <p
                    className={`font-extrabold capitalize ${
                      selectedUser.status === 'active'
                        ? 'text-emerald-700'
                        : selectedUser.status === 'pending'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                    }`}
                  >
                    {selectedUser.status}
                  </p>
                </div>
                <div className="bg-purple-50/70 rounded-xl p-3 border border-purple-100">
                  <p className="text-purple-700/60 font-bold uppercase text-[10px] mb-1">
                    {selectedUser.role === 'student'
                      ? 'Student ID'
                      : selectedUser.role === 'staff'
                        ? 'Staff ID'
                        : 'ID'}
                  </p>
                  <p className="font-extrabold text-purple-950">{memberId(selectedUser)}</p>
                </div>
                <div className="bg-purple-50/70 rounded-xl p-3 border border-purple-100">
                  <p className="text-purple-700/60 font-bold uppercase text-[10px] mb-1">
                    Department
                  </p>
                  <p className="font-extrabold text-purple-950">{selectedUser.department || '—'}</p>
                </div>
                <div className="bg-purple-50/70 rounded-xl p-3 border border-purple-100 col-span-2">
                  <p className="text-purple-700/60 font-bold uppercase text-[10px] mb-1">
                    Registered
                  </p>
                  <p className="font-extrabold text-purple-950">
                    {selectedUser.createdAt
                      ? new Date(selectedUser.createdAt).toLocaleString()
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

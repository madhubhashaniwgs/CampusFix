import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  LockKeyhole,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  UserRound,
  ShieldCheck,
} from 'lucide-react';

import AppLayout from '../../components/layouts/AppLayout';
import EmptyState from '../../components/common/EmptyState';
import { getStaffMembers } from '../../services/issueService';
import { createStaffMember, getUsers, approveStaff, rejectStaff } from '../../services/userService';
import { useToast } from '../../context/ToastContext';
import { Check, X as XIcon, Clock } from 'lucide-react';

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export default function AdminStaffPage() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const PAGE_SIZE = 10;

  const [staffMembers, setStaffMembers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
  });
  const [pendingStaff, setPendingStaff] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStaff = async (targetPage = 1) => {
    try {
      setLoading(true);
      const [staffRes, pendingRes] = await Promise.all([
        getStaffMembers({ page: targetPage, limit: PAGE_SIZE }),
        getUsers({ role: 'staff', status: 'pending', limit: 100 }),
      ]);
      setStaffMembers(staffRes.data?.staff || []);
      setPagination(
        staffRes.data?.pagination || {
          page: targetPage,
          pageSize: PAGE_SIZE,
          totalItems: 0,
          totalPages: 0,
        }
      );
      setPendingStaff(pendingRes.data?.users || []);
    } catch (err) {
      toastError(err.response?.data?.message || 'Unable to load staff directory.');
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (p) => {
    if (p >= 1 && p <= pagination.totalPages) fetchStaff(p);
  };

  useEffect(() => {
    fetchStaff(1);
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toastError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      toastError('Password must contain at least 8 characters.');
      return;
    }

    try {
      setSubmitting(true);
      await createStaffMember({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      success(`Staff account for ${formData.fullName} created successfully!`, 'Account Created');
      setFormData(emptyForm);
      setModalOpen(false);
      await fetchStaff(pagination.page);
    } catch (err) {
      toastError(
        err.response?.data?.message ||
          'Unable to create staff account. Please check inputs and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (member) => {
    try {
      await approveStaff(member.id);
      success(`${member.fullName} approved and can now sign in.`, 'Staff Approved');
      await fetchStaff(pagination.page);
    } catch (err) {
      toastError(err.response?.data?.message || 'Unable to approve staff member.');
    }
  };

  const handleReject = async (member) => {
    try {
      await rejectStaff(member.id);
      success(`${member.fullName}'s registration was rejected.`, 'Registration Rejected');
      await fetchStaff(pagination.page);
    } catch (err) {
      toastError(err.response?.data?.message || 'Unable to reject staff member.');
    }
  };

  const filteredStaff = staffMembers.filter(
    (staff) =>
      staff.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout activeNav="staff">
      {/* Modal: Create Staff Account */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-md animate-in fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative max-w-md w-full bg-white rounded-3xl shadow-2xl border border-purple-200 overflow-hidden text-purple-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 bg-purple-50/80">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-700" />
                <h3 className="text-base font-black text-purple-950">Add Staff Specialist</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-purple-400 hover:text-purple-700 hover:bg-purple-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-purple-950 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. John Electrician"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50/30 text-xs font-medium text-purple-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none transition-all placeholder:text-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-purple-950 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. staff.john@campus.edu"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50/30 text-xs font-medium text-purple-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none transition-all placeholder:text-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-purple-950 mb-1.5">
                  Temporary Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <LockKeyhole className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-purple-200 bg-purple-50/30 text-xs font-medium text-purple-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none transition-all placeholder:text-purple-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-purple-950 mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <LockKeyhole className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50/30 text-xs font-medium text-purple-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none transition-all placeholder:text-purple-400"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-purple-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-purple-600/25 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
            Staff & Technician Team
          </h1>
          <p className="text-sm text-purple-900/70 mt-1 font-medium">
            Manage authorized staff accounts, review personnel directory, and provision new
            technician credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStaff}
            className="p-2.5 rounded-xl border border-purple-200 bg-white/80 hover:bg-purple-100 text-purple-900 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-700' : ''}`} />
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Search & Statistics Bar */}
      <div className="purple-card rounded-3xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search staff by name or email..."
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

        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 font-black text-purple-950">
            <Users className="w-4 h-4 text-purple-700" />
            {staffMembers.length} Active Specialists
          </span>
        </div>
      </div>

      {/* Pending Staff Approvals */}
      {pendingStaff.length > 0 && (
        <div className="purple-card rounded-3xl p-5 sm:p-6 mb-6 border-2 border-amber-300/60 bg-amber-50/40">
          <div className="flex items-center gap-2.5 mb-4">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-black text-purple-950">Pending Staff Approvals</h2>
            <span className="ml-auto text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full">
              {pendingStaff.length} waiting
            </span>
          </div>

          <div className="space-y-3">
            {pendingStaff.map((member) => (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 border border-amber-200 rounded-2xl p-4"
              >
                <div className="min-w-0">
                  <p className="font-extrabold text-purple-950 truncate">{member.fullName}</p>
                  <p className="text-xs text-purple-800/70 font-medium truncate">{member.email}</p>
                  <p className="text-[11px] text-purple-700/60 font-semibold mt-0.5">
                    {member.staffId && `Staff ID: ${member.staffId}`}
                    {member.staffId && member.department && ' · '}
                    {member.department && `Dept: ${member.department}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(member)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(member)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Grid Cards */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-purple-900/70 font-semibold">Loading staff members...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <EmptyState
          title={searchTerm ? 'No staff match your search' : 'No staff accounts found'}
          description={
            searchTerm
              ? 'Try searching with a different name or email address.'
              : 'Create your first staff account to start dispatching campus maintenance tickets.'
          }
          actionLabel="Add Staff Member"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map((staff) => {
            const initials = staff.fullName
              ? staff.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'ST';

            return (
              <div
                key={staff.id || staff._id}
                className="purple-card rounded-3xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-purple-600/25">
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-purple-950 text-sm leading-tight">
                          {staff.fullName}
                        </h3>
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
                          Technician
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-purple-100 text-xs text-purple-900/80">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                      <span className="truncate font-semibold">{staff.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-purple-700 text-[11px] font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>Authorized Campus Specialist</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-purple-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-purple-700 font-semibold">
                    Added{' '}
                    {new Date(staff.createdAt || Date.now()).toLocaleDateString('en-GB', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Active
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs font-semibold text-purple-900/70">
            Showing{' '}
            <strong className="text-purple-950">{(pagination.page - 1) * PAGE_SIZE + 1}</strong> to{' '}
            <strong className="text-purple-950">
              {Math.min(pagination.page * PAGE_SIZE, pagination.totalItems)}
            </strong>{' '}
            of <strong className="text-purple-950">{pagination.totalItems}</strong> staff members
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
    </AppLayout>
  );
}

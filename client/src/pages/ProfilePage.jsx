import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/authService';
import { useToast } from '../context/ToastContext';
import {
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';

import AppLayout from '../components/layouts/AppLayout';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toastError('New passwords do not match.');
      return;
    }

    if (formData.newPassword.length < 6) {
      toastError('New password must contain at least 6 characters.');
      return;
    }

    setSubmitting(true);

    try {
      await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      success('Password changed successfully!', 'Security Updated');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      toastError(
        err.response?.data?.errors?.[0] ||
        err.response?.data?.message ||
        'Unable to change password. Please verify your current password.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const roleBadges = {
    student: { label: 'Student Portal', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    staff: { label: 'Staff Technician', color: 'bg-sky-100 text-sky-900 border-sky-300' },
    admin: { label: 'Campus Administrator', color: 'bg-purple-100 text-purple-900 border-purple-300' },
  };

  const currentRole = roleBadges[user?.role] || roleBadges.student;

  return (
    <AppLayout activeNav="profile">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
            Account & Security Settings
          </h1>
          <p className="text-sm text-purple-900/70 mt-1 font-medium">
            Manage your personal profile information, role credentials, and password.
          </p>
        </div>

        {/* Profile Card */}
        <div className="purple-card rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-purple-100">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-800 via-purple-700 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-purple-600/30">
              {initials}
            </div>

            <div className="text-center sm:text-left space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h2 className="text-xl font-black text-purple-950">{user?.fullName}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${currentRole.color}`}>
                  {currentRole.label}
                </span>
              </div>
              <p className="text-xs text-purple-800 font-semibold flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="w-3.5 h-3.5 text-purple-500" />
                {user?.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200">
              <span className="text-purple-700 font-bold block mb-1">Access Role</span>
              <strong className="text-purple-950 capitalize text-sm font-black">{user?.role}</strong>
            </div>
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200">
              <span className="text-purple-700 font-bold block mb-1">Account Status</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-800 font-black text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-600" /> Active & Verified
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200">
              <span className="text-purple-700 font-bold block mb-1">Session Security</span>
              <strong className="text-purple-800 font-black text-sm">HTTP-Only JWT Cookie</strong>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="purple-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2 pb-4 mb-6 border-b border-purple-100">
            <KeyRound className="w-5 h-5 text-purple-700" />
            <h3 className="text-base font-black text-purple-950">Change Password</h3>
          </div>

          <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-purple-950 mb-1.5">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <LockKeyhole className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  name="currentPassword"
                  required
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Enter current password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-purple-200 bg-white/95 text-xs font-medium text-purple-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none transition-all placeholder:text-purple-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-purple-950 mb-1.5">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <LockKeyhole className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  name="newPassword"
                  required
                  minLength={6}
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-purple-200 bg-white/95 text-xs font-medium text-purple-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none transition-all placeholder:text-purple-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-purple-950 mb-1.5">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <LockKeyhole className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-purple-200 bg-white/95 text-xs font-medium text-purple-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none transition-all placeholder:text-purple-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="text-xs text-purple-700 hover:text-purple-950 font-bold flex items-center gap-1.5"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPasswords ? 'Hide password characters' : 'Show password characters'}
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

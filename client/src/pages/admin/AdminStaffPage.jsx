
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  UserPlus,
  Users,
  RefreshCw,
  AlertCircle,
  Mail,
  LockKeyhole,
  UserRound,
} from 'lucide-react';

import { getStaffMembers } from '../../services/issueService';
import { createStaffMember } from '../../services/userService';

import './AdminStaffPage.css';

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function AdminStaffPage() {
  const navigate = useNavigate();

  const [staffMembers, setStaffMembers] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await getStaffMembers();
      setStaffMembers(response.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to load staff members.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const staffData = {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
      };

      await createStaffMember(staffData);

      setSuccessMessage('Staff account created successfully.');
      setFormData(emptyForm);
      await fetchStaff();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to create staff account. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-staff-page">
      <header className="admin-staff-header">
        <div className="admin-staff-brand">
          <div className="admin-staff-brand-icon">
            <ShieldCheck size={24} />
          </div>
          <span>CampusFix</span>
          <span className="admin-staff-badge">ADMIN</span>
        </div>

        <button
          className="admin-staff-dashboard-button"
          onClick={() => navigate('/admin/dashboard')}
        >
          <LayoutDashboard size={17} />
          Dashboard
        </button>
      </header>

      <main className="admin-staff-content">
        <section className="admin-staff-heading">
          <div>
            <span className="admin-staff-eyebrow">ADMINISTRATION</span>
            <h1>Staff Management</h1>
            <p>Create staff accounts and view active staff members.</p>
          </div>
        </section>

        {error && (
          <div className="admin-staff-message error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="admin-staff-message success">
            {successMessage}
          </div>
        )}

        <div className="admin-staff-grid">
          <section className="admin-staff-card">
            <h2>
              <UserPlus size={19} />
              Create Staff Account
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="admin-staff-field">
                <label htmlFor="fullName">Full name</label>
                <div className="admin-staff-input">
                  <UserRound size={18} />
                  <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    placeholder="Enter staff full name"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="admin-staff-field">
                <label htmlFor="email">Email address</label>
                <div className="admin-staff-input">
                  <Mail size={18} />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="Enter staff email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="admin-staff-field">
                <label htmlFor="password">Password</label>
                <div className="admin-staff-input">
                  <LockKeyhole size={18} />
                  <input
                    id="password"
                    type="password"
                    name="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <div className="admin-staff-field">
                <label htmlFor="confirmPassword">Confirm password</label>
                <div className="admin-staff-input">
                  <LockKeyhole size={18} />
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="admin-staff-submit"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Staff Account'}
              </button>
            </form>
          </section>

          <section className="admin-staff-card">
            <div className="admin-staff-card-heading">
              <h2>
                <Users size={19} />
                Active Staff ({staffMembers.length})
              </h2>

              <button
                className="admin-staff-refresh"
                onClick={fetchStaff}
                disabled={loading}
                title="Refresh staff list"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {loading ? (
              <div className="admin-staff-state">Loading staff members...</div>
            ) : staffMembers.length === 0 ? (
              <div className="admin-staff-state">
                <Users size={32} />
                <p>No active staff members yet.</p>
              </div>
            ) : (
              <div className="admin-staff-table-wrapper">
                <table className="admin-staff-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffMembers.map((staff) => (
                      <tr key={staff._id}>
                        <td>{staff.fullName}</td>
                        <td>{staff.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default AdminStaffPage;

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LockKeyhole, Mail, ShieldCheck, Eye, EyeOff, TicketCheck, Users, BarChart3 } from 'lucide-react';

const getDashboardPath = (role) => {
  const paths = {
    student: '/student/dashboard',
    staff: '/staff/dashboard',
    admin: '/admin/dashboard',
  };

  return paths[role] || '/login';
};

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await login(formData);

      navigate(
        getDashboardPath(response.data.user.role),
        { replace: true }
      );
    } catch (error) {
      setError(
        error.response?.data?.message ||
        'Unable to login. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <aside className="auth-showcase">
          <div className="auth-showcase-brand">
            <div className="brand-icon">
              <ShieldCheck size={22} />
            </div>
            <span>CampusFix</span>
          </div>

          <div>
            <h2>Report. Track. Resolve.</h2>
            <p>
              CampusFix connects students, staff, and admins so every
              campus issue gets the attention it deserves.
            </p>

            <div className="auth-showcase-features">
              <div className="auth-showcase-feature">
                <TicketCheck size={18} />
                Track every issue with a unique ticket ID
              </div>
              <div className="auth-showcase-feature">
                <Users size={18} />
                Direct routing to the right staff member
              </div>
              <div className="auth-showcase-feature">
                <BarChart3 size={18} />
                Live status updates from report to resolution
              </div>
            </div>
          </div>

          <div className="auth-showcase-footer">
            Campus issue management, simplified.
          </div>
        </aside>

        <div className="auth-form-panel">
          <div className="auth-card">
        <div className="auth-heading">
          <h1>Welcome back!</h1>
          <p>Sign in to continue to your CampusFix account.</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>

            <div className="input-wrapper">
              <Mail size={19} />
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <div className="input-wrapper">
              <LockKeyhole size={19} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? 'Hide password' : 'Show password'
                }
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register">Create an account</Link>
        </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
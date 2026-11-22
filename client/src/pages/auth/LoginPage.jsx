import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  LockKeyhole,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  TicketCheck,
  Users,
  BarChart3,
} from 'lucide-react';

const getDashboardPath = (role) => {
  const paths = {
    student: '/student/dashboard',
    staff: '/staff/dashboard',
    admin: '/admin/dashboard',
  };
  return paths[role] || '/login';
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { success, error: toastError } = useToast();

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
      success(`Welcome back, ${response.data.user.fullName}!`, 'Signed In');
      navigate(getDashboardPath(response.data.user.role), { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password. Please try again.';
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page ambient-purple-bg">
      <div className="auth-layout shadow-2xl border border-purple-300">
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
              CampusFix connects students, staff technicians, and campus administrators so every campus facility issue gets resolved swiftly.
            </p>

            <div className="auth-showcase-features">
              <div className="auth-showcase-feature">
                <TicketCheck size={18} />
                Unique ticket tracking with photo inspection
              </div>
              <div className="auth-showcase-feature">
                <Users size={18} />
                Real-time technician allocation & dispatch
              </div>
              <div className="auth-showcase-feature">
                <BarChart3 size={18} />
                Live status tracking from report to verification
              </div>
            </div>
          </div>

          <div className="auth-showcase-footer">
            Campus facility & infrastructure management, simplified.
          </div>
        </aside>

        <div className="auth-form-panel bg-purple-50/70">
          <div className="auth-card">
            <div className="auth-heading">
              <h1 className="text-purple-950 font-black">Welcome back!</h1>
              <p className="text-purple-800 font-medium">Sign in to continue to your CampusFix portal.</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email" className="text-purple-950 font-bold">Email address</label>
                <div className="input-wrapper border-purple-200 bg-white">
                  <Mail size={18} className="text-purple-500" />
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
                <label htmlFor="password" className="text-purple-950 font-bold">Password</label>
                <div className="input-wrapper border-purple-200 bg-white">
                  <LockKeyhole size={18} className="text-purple-500" />
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
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle text-purple-500"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="auth-button bg-purple-700 hover:bg-purple-800"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-footer text-purple-900/80">
              <span>Don't have an account? </span>
              <Link to="/register" className="text-purple-700 font-bold hover:underline">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

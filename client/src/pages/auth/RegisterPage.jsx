import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRound, Mail, LockKeyhole, ShieldCheck, Eye, EyeOff, TicketCheck, Users, BarChart3 } from 'lucide-react';

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const { confirmPassword, ...userData } = formData;

      const response = await register(userData);

      navigate('/student/dashboard', { replace: true });
    } catch (error) {
      setError(
        error.response?.data?.message ||
        'Unable to create your account. Please try again.'
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
            <h2>Join CampusFix today</h2>
            <p>
              Report campus issues in seconds and watch them move from
              reported to resolved — all in one place.
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
          <h1>Create an account</h1>
          <p>Join CampusFix and help improve your campus.</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">Full name</label>
            <div className="input-wrapper">
              <UserRound size={19} />
              <input
                id="fullName"
                type="text"
                name="fullName"
                autoComplete="name"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

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
                autoComplete="new-password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                minLength={6}
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
            <small className="form-hint">
              At least 6 characters with uppercase, lowercase and a
              number.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm password</label>
            <div className="input-wrapper">
              <LockKeyhole size={19} />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword((prev) => !prev)
                }
                aria-label={
                  showConfirmPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={submitting}
          >
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  UserRound,
  Mail,
  LockKeyhole,
  ShieldCheck,
  Eye,
  EyeOff,
  TicketCheck,
  Users,
  BarChart3,
  GraduationCap,
  Briefcase,
  IdCard,
  Building2,
} from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { success, error: toastError } = useToast();

  const [formData, setFormData] = useState({
    role: 'student',
    fullName: '',
    email: '',
    studentId: '',
    staffId: '',
    department: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const passwordStrength = useMemo(() => {
    const pw = formData.password;
    if (!pw) return { level: 0, text: '', color: '' };
    if (pw.length < 6)
      return { level: 1, text: 'Too short (min 6 chars)', color: 'bg-rose-500 text-rose-600' };
    if (pw.length < 9) return { level: 2, text: 'Moderate', color: 'bg-amber-500 text-amber-600' };
    return { level: 3, text: 'Strong', color: 'bg-emerald-500 text-emerald-600' };
  }, [formData.password]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      const msg = 'Passwords do not match.';
      setError(msg);
      toastError(msg);
      return;
    }

    if (formData.password.length < 6) {
      const msg = 'Password must contain at least 6 characters.';
      setError(msg);
      toastError(msg);
      return;
    }

    if (formData.role === 'student' && !formData.studentId.trim()) {
      const msg = 'Student ID / registration number is required.';
      setError(msg);
      toastError(msg);
      return;
    }

    if (formData.role === 'staff') {
      if (!formData.staffId.trim() || !formData.department.trim()) {
        const msg = 'Staff ID and department are required.';
        setError(msg);
        toastError(msg);
        return;
      }
    }

    setSubmitting(true);

    try {
      const userData = { ...formData };
      delete userData.confirmPassword;
      await register(userData);

      if (formData.role === 'staff') {
        success(
          'Registration received! Your staff account is pending admin approval.',
          'Awaiting Approval'
        );
        navigate('/login', { replace: true });
        return;
      }

      success(`Account created! Please log in to continue.`, 'Account Created');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to create your account. Please try again.';
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
            <h2>Join CampusFix today</h2>
            <p>
              Report campus maintenance issues in seconds and watch them move from reported to
              resolved — all in one unified portal.
            </p>

            <div className="auth-showcase-features">
              <div className="auth-showcase-feature">
                <TicketCheck size={18} />
                Instant ticket ID with live activity history
              </div>
              <div className="auth-showcase-feature">
                <Users size={18} />
                Direct routing to designated campus technicians
              </div>
              <div className="auth-showcase-feature">
                <BarChart3 size={18} />
                Real-time progress verification
              </div>
            </div>
          </div>

          <div className="auth-showcase-footer">Student facility reporting, simplified.</div>
        </aside>

        <div className="auth-form-panel bg-purple-50/70">
          <div className="auth-card">
            <div className="auth-heading">
              <h1 className="text-purple-950 font-black">Create Account</h1>
              <p className="text-purple-800 font-medium">
                {formData.role === 'student'
                  ? 'Sign up as a student to log tickets and track campus repairs.'
                  : 'Sign up as staff — your account requires admin approval.'}
              </p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="text-purple-950 font-bold">I am a</label>
                <div className="role-toggle">
                  <button
                    type="button"
                    className={`role-toggle-btn ${formData.role === 'student' ? 'active' : ''}`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        role: 'student',
                        staffId: '',
                        department: '',
                      }))
                    }
                  >
                    <GraduationCap size={17} />
                    Student
                  </button>
                  <button
                    type="button"
                    className={`role-toggle-btn ${formData.role === 'staff' ? 'active' : ''}`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        role: 'staff',
                        studentId: '',
                      }))
                    }
                  >
                    <Briefcase size={17} />
                    Staff
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="fullName" className="text-purple-950 font-bold">
                  Full name
                </label>
                <div className="input-wrapper border-purple-200 bg-white">
                  <UserRound size={18} className="text-purple-500" />
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
                <label htmlFor="email" className="text-purple-950 font-bold">
                  Email address
                </label>
                <div className="input-wrapper border-purple-200 bg-white">
                  <Mail size={18} className="text-purple-500" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="Enter your student email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {formData.role === 'student' && (
                <div className="form-group">
                  <label htmlFor="studentId" className="text-purple-950 font-bold">
                    Student ID / Registration No.
                  </label>
                  <div className="input-wrapper border-purple-200 bg-white">
                    <IdCard size={18} className="text-purple-500" />
                    <input
                      id="studentId"
                      type="text"
                      name="studentId"
                      autoComplete="off"
                      placeholder="e.g. 2023CS012"
                      value={formData.studentId}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              )}

              {formData.role === 'staff' && (
                <>
                  <div className="form-group">
                    <label htmlFor="staffId" className="text-purple-950 font-bold">
                      Staff ID
                    </label>
                    <div className="input-wrapper border-purple-200 bg-white">
                      <IdCard size={18} className="text-purple-500" />
                      <input
                        id="staffId"
                        type="text"
                        name="staffId"
                        autoComplete="off"
                        placeholder="e.g. STF-1042"
                        value={formData.staffId}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="department" className="text-purple-950 font-bold">
                      Department
                    </label>
                    <div className="input-wrapper border-purple-200 bg-white">
                      <Building2 size={18} className="text-purple-500" />
                      <input
                        id="department"
                        type="text"
                        name="department"
                        autoComplete="off"
                        placeholder="e.g. Faculty of IT"
                        value={formData.department}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label htmlFor="password" className="text-purple-950 font-bold">
                  Password
                </label>
                <div className="input-wrapper border-purple-200 bg-white">
                  <LockKeyhole size={18} className="text-purple-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
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
                {formData.password && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    <div className="w-16 h-1.5 rounded-full bg-purple-200 overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color.split(' ')[0]}`}
                        style={{ width: `${(passwordStrength.level / 3) * 100}%` }}
                      />
                    </div>
                    <span className={passwordStrength.color.split(' ')[1]}>
                      {passwordStrength.text}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="text-purple-950 font-bold">
                  Confirm password
                </label>
                <div className="input-wrapper border-purple-200 bg-white">
                  <LockKeyhole size={18} className="text-purple-500" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="password-toggle text-purple-500"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="auth-button bg-purple-700 hover:bg-purple-800"
              >
                {submitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="auth-footer text-purple-900/80">
              <span>Already have an account? </span>
              <Link to="/login" className="text-purple-700 font-bold hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

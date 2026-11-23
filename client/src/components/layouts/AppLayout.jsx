import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../notifications/NotificationBell';
import {
  ShieldCheck,
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Users,
  UserRound,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ScrollText,
} from 'lucide-react';

export default function AppLayout({ children, activeNav }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  const role = user?.role || 'student';

  const navLinksByRole = {
    student: [
      { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/student/my-issues', label: 'My Issues', icon: ClipboardList },
      { to: '/student/report-issue', label: 'Report Issue', icon: PlusCircle },
    ],
    staff: [
      { to: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/staff/issues', label: 'Assigned Issues', icon: ClipboardList },
    ],
    admin: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/issues', label: 'All Issues', icon: ClipboardList },
      { to: '/admin/staff', label: 'Staff Team', icon: Users },
      { to: '/admin/users', label: 'User Management', icon: UserRound },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
    ],
  };

  const navLinks = navLinksByRole[role] || [];

  const roleLabels = {
    student: { text: 'Student', color: 'bg-emerald-500/15 text-emerald-800 border-emerald-300' },
    staff: { text: 'Technician', color: 'bg-sky-500/15 text-sky-800 border-sky-300' },
    admin: { text: 'Administrator', color: 'bg-purple-600/15 text-purple-900 border-purple-300' },
  };

  const roleInfo = roleLabels[role] || roleLabels.student;

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen ambient-purple-bg text-purple-950 flex flex-col font-sans antialiased relative">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-purple-200/80 shadow-sm shadow-purple-900/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Tag */}
            <div className="flex items-center gap-8">
              <button
                onClick={() => navigate(`/${role}/dashboard`)}
                className="flex items-center gap-2.5 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/25 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-lg text-purple-950 tracking-tight leading-none group-hover:text-purple-700 transition-colors">
                      Campus<span className="text-purple-700">Fix</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700/70 tracking-wider uppercase block mt-0.5">
                    Operations Portal
                  </span>
                </div>
              </button>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-1.5">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all ${
                          isActive
                            ? 'bg-purple-700 text-white shadow-sm shadow-purple-700/25'
                            : 'text-purple-900/70 hover:text-purple-950 hover:bg-purple-100/70'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Right Action Icons & User Dropdown */}
            <div className="flex items-center gap-3">
              {/* Contextual Quick CTA for student */}
              {role === 'student' && location.pathname !== '/student/report-issue' && (
                <button
                  onClick={() => navigate('/student/report-issue')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Report Issue
                </button>
              )}

              {/* Notifications */}
              <NotificationBell />

              {/* Role Badge */}
              <span
                className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${roleInfo.color}`}
              >
                {roleInfo.text}
              </span>

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-purple-100/80 transition-colors border border-transparent hover:border-purple-200"
                  aria-expanded={userDropdownOpen}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                    {initials}
                  </div>
                  <span className="hidden md:block text-xs font-bold text-purple-950 max-w-[120px] truncate">
                    {user?.fullName || 'User'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-purple-700/70" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white/95 rounded-2xl shadow-xl border border-purple-200 py-2 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                    <div className="px-4 py-2.5 border-b border-purple-100">
                      <p className="text-xs font-bold text-purple-950 truncate">{user?.fullName}</p>
                      <p className="text-[11px] text-purple-700/70 truncate">{user?.email}</p>
                      <div className="mt-1.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${roleInfo.color}`}
                        >
                          {role}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          navigate('/profile');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-purple-900 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                      >
                        <UserRound className="w-4 h-4 text-purple-500" />
                        Account Settings
                      </button>
                    </div>

                    <div className="border-t border-purple-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-purple-900 hover:bg-purple-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-purple-200 bg-white/95 backdrop-blur-xl px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-purple-100">
              <span className="text-xs font-semibold text-purple-700/70">Signed in as</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${roleInfo.color}`}
              >
                {role}
              </span>
            </div>

            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-purple-700 text-white'
                        : 'text-purple-900/80 hover:bg-purple-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}

            <div className="border-t border-purple-100 pt-2 space-y-1">
              <button
                onClick={() => navigate('/profile')}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-bold text-purple-900 hover:bg-purple-100"
              >
                <UserRound className="w-4 h-4 text-purple-500" />
                Profile
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
        {children}
      </main>

      {/* Modern Compact Footer */}
      <footer className="border-t border-purple-200/60 bg-purple-50/70 backdrop-blur-md py-6 text-xs text-purple-900/60 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-purple-950">CampusFix</span>
            <span>&bull;</span>
            <span>Campus Facility & Maintenance Operations</span>
          </div>
          <div>
            <span>Smart tracking from report to resolution</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';

function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck size={25} />
          </div>
          <span>CampusFix</span>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-welcome">
          <span className="welcome-label">CAMPUSFIX DASHBOARD</span>
          <h1>Welcome, {user?.fullName}!</h1>
          <p>You are successfully logged in to CampusFix.</p>
        </div>

        <div className="user-info-card">
          <h2>Account Information</h2>

          <div className="info-row">
            <span>Full Name</span>
            <strong>{user?.fullName}</strong>
          </div>

          <div className="info-row">
            <span>Email</span>
            <strong>{user?.email}</strong>
          </div>

          <div className="info-row">
            <span>Role</span>
            <strong className="role-label">{user?.role}</strong>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
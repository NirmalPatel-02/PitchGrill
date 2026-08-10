import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const FlameIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 2c1 3-2 4-2 7a4 4 0 108 0c0-1.5-1-2.5-1-2.5.8 2-.5 3.5-2 3.5a2.5 2.5 0 01-2.5-2.5c0-2 2-3 1.5-5.5C15.5 3.5 16 5 16 5c2 2 3 5 3 7.5A7 7 0 015 12.5C5 8 8.5 5 12 2z" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l3 3" />
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
  </svg>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initial = (user?.full_name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <nav className="sidebar">
      <div className="brand">
        <img src="/PitchGrill.svg" alt="PitchGrill Logo" className="auth-brand-logo" />
        <span className="brand-name">PitchGrill</span>
      </div>

      <div className="nav-links">
        <NavLink to="/grill" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FlameIcon />
          Grill
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <HistoryIcon />
          History
        </NavLink>
      </div>

      <div className="sidebar-bottom">
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>

        <div className="profile-row">
          <div className="avatar">{initial}</div>
          <div className="profile-info">
            <span className="profile-name">{user?.full_name || 'Founder'}</span>
            <span className="profile-email">{user?.email}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} aria-label="Log out" title="Log out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .sidebar {
          width: 232px;
          flex-shrink: 0;
          height: 100vh;
          background: var(--color-bg-elevated);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          padding: 22px 16px;
          position: sticky;
          top: 0;
        }
        .auth-brand-logo {
          width: 28px;
          height: 28px;
          object-fit: contain;
          display: block;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 8px;
          margin-bottom: 32px;
        }
        .brand-mark {
          font-family: var(--font-mono);
          font-weight: 600;
          font-size: 13px;
          background: var(--color-accent);
          color: var(--color-accent-contrast);
          width: 28px;
          height: 28px;
          border-radius: 7px;
          display: grid;
          place-items: center;
        }
        .brand-name {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 15.5px;
          letter-spacing: -0.01em;
        }
        .nav-links {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.15s ease, color 0.15s ease;
        }
        .nav-link:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }
        .nav-link.active {
          background: var(--color-accent-soft);
          color: var(--color-accent);
        }
        .sidebar-bottom {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .theme-toggle {
          display: flex;
          align-items: center;
          gap: 9px;
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          border-radius: var(--radius-sm);
          padding: 9px 12px;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .theme-toggle:hover {
          background: var(--color-surface-hover);
        }
        .profile-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-top: 1px solid var(--color-border);
          padding-top: 16px;
        }
        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--color-accent-soft);
          color: var(--color-accent);
          font-family: var(--font-display);
          font-weight: 600;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .profile-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }
        .profile-name {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .profile-email {
          font-size: 11.5px;
          color: var(--color-text-faint);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .logout-btn {
          background: transparent;
          border: none;
          color: var(--color-text-faint);
          cursor: pointer;
          padding: 6px;
          border-radius: var(--radius-sm);
          display: grid;
          place-items: center;
        }
        .logout-btn:hover {
          color: var(--color-danger);
          background: var(--color-danger-soft);
        }
      `}</style>
    </nav>
  );
}

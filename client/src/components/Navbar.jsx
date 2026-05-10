import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  if (!user) return null;

  const isViewer = user.role === 'viewer';

  return (
    <nav className="navbar" id="main-navbar">
      <Link to="/" className="navbar-logo" id="navbar-logo">
        IPL<span>AUCTION</span>
      </Link>

      <div className="navbar-links" id="navbar-links">
        {isAdmin ? (
          <>
            <button
              className={`nav-link ${isActive('/admin')}`}
              onClick={() => navigate('/admin')}
              id="nav-admin"
            >
              ⚡ Control Panel
            </button>
            <button
              className={`nav-link ${isActive('/auction')}`}
              onClick={() => navigate('/auction')}
              id="nav-auction"
            >
              🏏 Auction Room
            </button>
            <button
              className={`nav-link ${isActive('/results')}`}
              onClick={() => navigate('/results')}
              id="nav-results"
            >
              📊 Results
            </button>
          </>
        ) : isViewer ? (
          <>
            <button
              className={`nav-link ${isActive('/auction')}`}
              onClick={() => navigate('/auction')}
              id="nav-auction"
            >
              🏏 Auction
            </button>
            <button
              className={`nav-link ${isActive('/results')}`}
              onClick={() => navigate('/results')}
              id="nav-results"
            >
              📊 Results
            </button>
          </>
        ) : (
          <>
            <button
              className={`nav-link ${isActive('/auction')}`}
              onClick={() => navigate('/auction')}
              id="nav-auction"
            >
              🏏 Auction
            </button>
            <button
              className={`nav-link ${isActive('/dashboard')}`}
              onClick={() => navigate('/dashboard')}
              id="nav-dashboard"
            >
              📊 Dashboard
            </button>
            <button
              className={`nav-link ${isActive('/results')}`}
              onClick={() => navigate('/results')}
              id="nav-results"
            >
              🏆 Results
            </button>
          </>
        )}
      </div>

      <div className="nav-user" id="nav-user-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? 'var(--neon-green)' : 'var(--crimson)',
            boxShadow: connected ? '0 0 8px var(--neon-green)' : 'none',
            display: 'inline-block'
          }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {user.teamName && (
          <div className="nav-budget" id="nav-team-badge">
            🏆 {user.teamName}
          </div>
        )}

        {isViewer && (
          <div style={{
            padding: '0.3rem 0.75rem',
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: 'var(--radius-xl)',
            fontFamily: 'var(--font-display)',
            fontSize: '0.8rem',
            color: '#A855F7',
            letterSpacing: '0.08em'
          }}>
            👁 VIEWER
          </div>
        )}

        <div className="nav-avatar" id="nav-avatar">
          {user.name?.charAt(0).toUpperCase()}
        </div>

        <button className="nav-link" onClick={handleLogout} id="nav-logout">
          Logout
        </button>
      </div>
    </nav>
  );
}

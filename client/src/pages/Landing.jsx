import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { user, isAdmin } = useAuth();

  return (
    <div id="landing-page">
      {/* Hero Section */}
      <section className="landing-hero" id="landing-hero">
        <div className="landing-badge" id="landing-badge">
          🏏 Season 2026 — Live Now
        </div>

        <h1 className="landing-title" id="landing-title">
          <span className="gold">IPL</span> PLAYER<br />
          AUCTION
        </h1>

        <p className="landing-subtitle" id="landing-subtitle">
          Experience the thrill of real-time bidding. Build your dream team with
          strategic budget management, live countdowns, and instant results.
          Every second counts.
        </p>

        <div className="landing-actions" id="landing-actions">
          {user ? (
            <>
              <Link to="/auction" className="btn btn-gold btn-lg" id="cta-auction">
                🏏 Enter Auction
              </Link>
              <Link to={isAdmin ? '/admin' : '/dashboard'} className="btn btn-outline btn-lg" id="cta-dashboard">
                📊 {isAdmin ? 'Admin Panel' : 'My Dashboard'}
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="btn btn-gold btn-lg" id="cta-register">
                🚀 Register Your Team
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg" id="cta-login">
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Animated decorative elements */}
        <div style={{
          position: 'absolute', bottom: '2rem',
          display: 'flex', gap: '0.5rem', alignItems: 'center',
          color: 'var(--text-muted)', fontSize: '0.8rem',
          animation: 'float 3s ease-in-out infinite'
        }}>
          <span style={{ fontSize: '1.2rem' }}>↓</span>
          Scroll to explore
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features" id="landing-features">
        <h2 className="landing-features-title">
          <span className="text-gold">WHY</span> IPL AUCTION?
        </h2>

        <div className="feature-grid" id="feature-grid">
          <div className="feature-card" id="feature-realtime">
            <div className="feature-icon gold">⚡</div>
            <h3 className="feature-title">Real-Time Bidding</h3>
            <p className="feature-desc">
              Lightning-fast bid updates powered by WebSocket technology.
              Every bid is broadcast to all connected teams in milliseconds.
            </p>
          </div>

          <div className="feature-card" id="feature-timer">
            <div className="feature-icon crimson">⏱️</div>
            <h3 className="feature-title">30-Second Countdown</h3>
            <p className="feature-desc">
              Each player gets a 30-second bidding window. The clock resets on every
              new bid, keeping the action intense and strategic.
            </p>
          </div>

          <div className="feature-card" id="feature-budget">
            <div className="feature-icon green">💰</div>
            <h3 className="feature-title">Smart Budget System</h3>
            <p className="feature-desc">
              ₹120 Cr per team with automatic validation. Build your squad
              strategically — you can't spend what you don't have.
            </p>
          </div>

          <div className="feature-card" id="feature-roles">
            <div className="feature-icon blue">🛡️</div>
            <h3 className="feature-title">Role-Based Access</h3>
            <p className="feature-desc">
              Admins control the auction flow. Teams focus on bidding.
              Secure JWT authentication keeps everyone in their lane.
            </p>
          </div>

          <div className="feature-card" id="feature-dashboard">
            <div className="feature-icon gold">📊</div>
            <h3 className="feature-title">Live Dashboard</h3>
            <p className="feature-desc">
              Track your budget, purchased players, and bid history
              in real-time. See the full auction picture at a glance.
            </p>
          </div>

          <div className="feature-card" id="feature-pdf">
            <div className="feature-icon crimson">📄</div>
            <h3 className="feature-title">PDF Reports</h3>
            <p className="feature-desc">
              Download detailed auction reports with your team's purchases,
              spending breakdown, and complete bid history.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '3rem 2rem',
        borderTop: '1px solid var(--border-subtle)',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }} id="landing-footer">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
          <span className="text-gold">IPL</span> AUCTION 2026
        </div>
        <p>Built with ⚡ React • Socket.io • MongoDB</p>
      </footer>
    </div>
  );
}

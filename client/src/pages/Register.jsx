import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [registerAs, setRegisterAs] = useState('team'); // 'team' or 'viewer'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password, registerAs === 'team' ? teamName : null, registerAs);
      navigate(registerAs === 'team' ? '/dashboard' : '/auction');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" id="register-page">
      <div className="auth-card" id="register-card">
        <h1 className="auth-title" id="register-title">REGISTER</h1>
        <p className="auth-subtitle">Create your account and join the auction</p>

        {error && (
          <div className="alert alert-error" id="register-error">
            ⚠️ {error}
          </div>
        )}

        {/* Role Toggle */}
        <div className="role-toggle mb-3" id="role-toggle">
          <button
            type="button"
            className={`role-toggle-btn ${registerAs === 'team' ? 'active' : ''}`}
            onClick={() => setRegisterAs('team')}
          >
            🏆 Team Owner
          </button>
          <button
            type="button"
            className={`role-toggle-btn ${registerAs === 'viewer' ? 'active' : ''}`}
            onClick={() => setRegisterAs('viewer')}
          >
            👁 Viewer
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          <div className="input-group">
            <label htmlFor="register-name">{registerAs === 'team' ? 'Owner Name' : 'Your Name'}</label>
            <input
              type="text"
              id="register-name"
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {registerAs === 'team' && (
            <div className="input-group">
              <label htmlFor="register-team">Team Name</label>
              <input
                type="text"
                id="register-team"
                className="input"
                placeholder="e.g., Mumbai Warriors"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label htmlFor="register-email">Email</label>
            <input
              type="email"
              id="register-email"
              className="input"
              placeholder="team@iplauction.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="register-password">Password</label>
            <input
              type="password"
              id="register-password"
              className="input"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-gold btn-lg w-full"
            disabled={loading}
            id="register-submit"
          >
            {loading
              ? '⏳ Creating Account...'
              : registerAs === 'team'
              ? '🚀 Create Team'
              : '👁 Join as Viewer'}
          </button>
        </form>

        <div className="auth-footer" id="register-footer">
          Already have a team?{' '}
          <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}

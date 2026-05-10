import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(email, password);
      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" id="login-page">
      <div className="auth-card" id="login-card">
        <h1 className="auth-title" id="login-title">SIGN IN</h1>
        <p className="auth-subtitle">Welcome back to the auction floor</p>

        {error && (
          <div className="alert alert-error" id="login-error">
            ⚠️ {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} id="login-form">
          <div className="input-group">
            <label htmlFor="login-email">Email</label>
            <input
              type="email"
              id="login-email"
              className="input"
              placeholder="team@iplauction.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-gold btn-lg w-full"
            disabled={loading}
            id="login-submit"
          >
            {loading ? '⏳ Signing In...' : '🏏 Enter Auction'}
          </button>
        </form>

        <div className="auth-footer" id="login-footer">
          Don't have a team?{' '}
          <Link to="/register">Register Now</Link>
        </div>
      </div>
    </div>
  );
}

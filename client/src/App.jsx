import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import AuctionRoom from './pages/AuctionRoom';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import AuctionResults from './pages/AuctionResults';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '3rem',
            letterSpacing: '0.1em',
            background: 'linear-gradient(135deg, var(--gold), #FFD07B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            IPL AUCTION
          </div>
          <div style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.9rem' }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'viewer' ? '/auction' : '/dashboard'} /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={user.role === 'viewer' ? '/auction' : '/dashboard'} /> : <Register />} />
        <Route path="/auction" element={
          <ProtectedRoute>
            <AuctionRoom />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/pool/:poolId/auction" element={
          <ProtectedRoute>
            <AuctionRoom />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute role="admin">
            <AdminPanel />
          </ProtectedRoute>
        } />
        <Route path="/results" element={
          <ProtectedRoute>
            <AuctionResults />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

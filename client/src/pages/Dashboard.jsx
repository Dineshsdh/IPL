import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import BudgetGauge from '../components/BudgetGauge';
import PlayerCard from '../components/PlayerCard';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

function formatCr(val) {
  if (val === undefined || val === null) return '₹0';
  if (val >= 1) return `₹${val.toFixed(2)} Cr`;
  return `₹${(val * 100).toFixed(0)} L`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState(null);
  const [pools, setPools] = useState({ created: [], joined: [] });
  const [joinCode, setJoinCode] = useState('');
  const [poolName, setPoolName] = useState('');
  const navigate = require('react-router-dom').useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamRes, poolRes] = await Promise.all([
        api.get('/teams/my/team').catch(() => ({ data: null })),
        api.get('/pools/my').catch(() => ({ data: { created: [], joined: [] } }))
      ]);
      setTeam(teamRes.data);
      setPools(poolRes.data);
      if (teamRes.data?._id) {
        try {
          const sugRes = await api.get(`/suggestions/${teamRes.data._id}`);
          setSuggestions(sugRes.data);
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePool = async () => {
    if (!poolName) return alert('Enter pool name');
    try {
      await api.post('/pools', { name: poolName, mode: 'multi' });
      setPoolName('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create pool');
    }
  };

  const handleJoinPool = async () => {
    if (!joinCode) return alert('Enter join code');
    try {
      await api.post('/pools/join', { joinCode, teamName: `${user.name}'s Team` });
      setJoinCode('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join pool');
    }
  };

  const generatePDF = () => {
    if (!team) return;

    const maxBudget = team.maxBudget || 120;
    const doc = new jsPDF();

    // Title
    doc.setFontSize(24);
    doc.setTextColor(245, 166, 35);
    doc.text('IPL AUCTION REPORT', 105, 20, { align: 'center' });

    // Team info
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text(`Team: ${team.name}`, 14, 40);
    doc.setFontSize(12);
    doc.text(`Budget Remaining: ${formatCr(team.budget)} / ${formatCr(maxBudget)}`, 14, 50);
    doc.text(`Players Acquired: ${team.players?.length || 0}`, 14, 58);
    doc.text(`Total Spent: ${formatCr(maxBudget - team.budget)}`, 14, 66);

    // Players table
    if (team.players?.length > 0) {
      doc.setFontSize(14);
      doc.text('Purchased Players', 14, 82);

      const tableData = team.players.map((p, i) => [
        i + 1,
        p.player?.name || 'Unknown',
        p.player?.role || '-',
        formatCr(p.boughtAt)
      ]);

      doc.autoTable({
        startY: 88,
        head: [['#', 'Player', 'Role', 'Price']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [245, 166, 35] },
        alternateRowStyles: { fillColor: [248, 248, 248] }
      });
    }

    // Bid History
    if (team.bidHistory?.length > 0) {
      const finalY = doc.lastAutoTable?.finalY || 100;
      doc.setFontSize(14);
      doc.text('Bid History', 14, finalY + 15);

      const bidData = team.bidHistory.map((b, i) => [
        i + 1,
        b.playerName || 'Unknown',
        formatCr(b.amount),
        b.won ? '✓ Won' : '✗ Lost'
      ]);

      doc.autoTable({
        startY: finalY + 21,
        head: [['#', 'Player', 'Amount', 'Result']],
        body: bidData,
        theme: 'grid',
        headStyles: { fillColor: [245, 166, 35] }
      });
    }

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text(`Generated on ${new Date().toLocaleString()} — IPL Auction 2026`, 105, 285, { align: 'center' });

    doc.save(`${team.name}_auction_report.pdf`);
  };

  if (loading) {
    return (
      <div className="page-container flex-center" style={{ minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', animation: 'float 2s ease infinite' }}>🏏</div>
          <p className="text-muted mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="page-container flex-center" style={{ minHeight: '60vh' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
          <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>Team Not Found</h2>
          <p className="text-muted mt-1">Your team could not be loaded.</p>
        </div>
      </div>
    );
  }

  const maxBudget = team.maxBudget || 120;
  const spent = parseFloat((maxBudget - team.budget).toFixed(2));

  return (
    <div className="page-container" id="dashboard-page">
      {/* Header */}
      <div className="dashboard-header" id="dashboard-header">
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.5rem',
            letterSpacing: '0.08em'
          }}>
            <span className="text-gold">{team.name}</span> DASHBOARD
          </h1>
          <p className="text-muted">Season 2026 — Live Auction Tracker</p>
        </div>
        <button className="btn btn-gold" onClick={generatePDF} id="download-pdf">
          📄 Download Report
        </button>
      </div>

      {/* Virtual Pools Section */}
      <div className="card mb-4" id="pools-section">
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.08em', color: 'var(--neon-green)', marginBottom: '1rem' }}>
          🏊 VIRTUAL POOLS
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Join a Pool</h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" className="input" placeholder="Join Code" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
              <button className="btn btn-outline" onClick={handleJoinPool}>Join</button>
            </div>
            
            <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Create a Pool</h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" className="input" placeholder="Pool Name" value={poolName} onChange={e => setPoolName(e.target.value)} />
              <button className="btn btn-green" onClick={handleCreatePool}>Create</button>
            </div>
          </div>
          
          <div>
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>My Pools</h4>
            {pools.created.length === 0 && pools.joined.length === 0 ? (
              <div className="text-muted" style={{ fontSize: '0.9rem' }}>You haven't joined any pools yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pools.created.map(p => (
                  <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name} <span className="badge badge-gold">Admin</span></div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Code: {p.joinCode} • {p.teams.length} Teams</div>
                    </div>
                    <button className="btn btn-sm btn-gold" onClick={() => navigate(`/pool/${p._id}/auction`)}>Enter</button>
                  </div>
                ))}
                {pools.joined.map(p => (
                  <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.teams.length} Teams</div>
                    </div>
                    <button className="btn btn-sm btn-outline" onClick={() => navigate(`/pool/${p._id}/auction`)}>Enter</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard-stats" id="dashboard-stats">
        <div className="stat-card gold" id="stat-budget">
          <div className="stat-label">Budget Remaining</div>
          <div className="stat-value gold" style={{ fontSize: '1.6rem' }}>{formatCr(team.budget)}</div>
        </div>
        <div className="stat-card crimson" id="stat-spent">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value crimson" style={{ fontSize: '1.6rem' }}>{formatCr(spent)}</div>
        </div>
        <div className="stat-card green" id="stat-players">
          <div className="stat-label">Players Acquired</div>
          <div className="stat-value green">{team.players?.length || 0}</div>
        </div>
        <div className="stat-card blue" id="stat-bids">
          <div className="stat-label">Total Bids</div>
          <div className="stat-value blue">{team.bidHistory?.length || 0}</div>
        </div>
      </div>

      {/* Budget Gauge + Player Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem', marginBottom: '2rem' }} id="dashboard-main">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--gold)', fontSize: '1.2rem' }}>
            BUDGET
          </h3>
          <BudgetGauge budget={team.budget} maxBudget={maxBudget} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {Math.round((team.budget / maxBudget) * 100)}% remaining
            </div>
          </div>
        </div>

        <div>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            letterSpacing: '0.08em',
            marginBottom: '1rem',
            color: 'var(--gold)'
          }}>
            🏆 YOUR SQUAD ({team.players?.length || 0})
          </h3>

          {team.players?.length > 0 ? (
            <div className="grid-3" id="squad-grid">
              {team.players.map((p, i) => (
                <div className="card" key={i} id={`squad-player-${i}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.05em' }}>
                        {p.player?.name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {p.player?.role}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--gold)' }}>
                      {formatCr(p.boughtAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏏</div>
              No players acquired yet. Join the auction to start bidding!
            </div>
          )}
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions?.suggestions?.length > 0 && (
        <div className="mb-3" id="ai-suggestions">
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            letterSpacing: '0.08em',
            marginBottom: '1rem',
            color: 'var(--electric-blue)'
          }}>
            🤖 AI SUGGESTIONS
          </h3>
          <div className="grid-4">
            {suggestions.suggestions.map((p, i) => (
              <div className="card" key={p._id || i} style={{
                border: '1px solid rgba(61, 139, 255, 0.2)',
                background: 'rgba(61, 139, 255, 0.04)'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {p.image ? (
                    <img src={p.image} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      onError={(e) => e.target.style.display = 'none'} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🏏</div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.country} {p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {p.role} · {formatCr(p.basePrice)}
                    </div>
                    {p.roleNeed > 0 && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--electric-blue)' }}>
                        Need {p.roleNeed} more {p.role}s
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bid History */}
      <div id="bid-history-section">
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          letterSpacing: '0.08em',
          marginBottom: '1rem',
          color: 'var(--gold)'
        }}>
          📋 BID HISTORY
        </h3>

        {team.bidHistory?.length > 0 ? (
          <div className="table-container" id="bid-history-table">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Bid Amount</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {[...team.bidHistory].reverse().map((bid, i) => (
                  <tr key={i}>
                    <td>{team.bidHistory.length - i}</td>
                    <td>{bid.playerName || 'Unknown'}</td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', letterSpacing: '0.05em' }}>
                        {formatCr(bid.amount)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${bid.won ? 'badge-live' : 'badge-sold'}`}>
                        {bid.won ? '✓ WON' : '✗ LOST'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No bids placed yet.
          </div>
        )}
      </div>
    </div>
  );
}

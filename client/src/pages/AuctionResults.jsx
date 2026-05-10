import { useState, useEffect } from 'react';
import api from '../utils/api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

function formatCr(val) {
  if (val === undefined || val === null) return '₹0';
  if (val >= 1) return `₹${val.toFixed(2)} Cr`;
  return `₹${(val * 100).toFixed(0)} L`;
}

export default function AuctionResults() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [expandedTeam, setExpandedTeam] = useState(null);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const res = await api.get('/results/summary');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateFullPDF = () => {
    if (!data) return;
    const doc = new jsPDF();

    // Title
    doc.setFontSize(26);
    doc.setTextColor(245, 166, 35);
    doc.text('IPL AUCTION SUMMARY', 105, 22, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 30, { align: 'center' });

    // Overview stats
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Overview', 14, 45);

    doc.setFontSize(11);
    doc.text(`Total Players: ${data.totalPlayers}`, 14, 55);
    doc.text(`Sold: ${data.soldCount}  |  Unsold: ${data.unsoldCount}`, 14, 62);
    doc.text(`Total Spent: ${formatCr(data.totalSpent)}`, 14, 69);
    if (data.highestPurchase) {
      doc.text(`Highest: ${data.highestPurchase.player} — ${formatCr(data.highestPurchase.price)} (${data.highestPurchase.team})`, 14, 76);
    }

    // Team summary table
    doc.setFontSize(14);
    doc.text('Team Summary', 14, 90);

    const teamData = (data.teamSummaries || []).map((t, i) => [
      i + 1,
      t.name,
      `${t.playerCount}`,
      formatCr(t.spent),
      formatCr(t.budget)
    ]);

    doc.autoTable({
      startY: 96,
      head: [['#', 'Team', 'Players', 'Spent', 'Budget Left']],
      body: teamData,
      theme: 'grid',
      headStyles: { fillColor: [245, 166, 35] },
      alternateRowStyles: { fillColor: [248, 248, 248] }
    });

    // Sold players
    if (data.soldPlayers?.length > 0) {
      const finalY = doc.lastAutoTable?.finalY || 120;
      doc.setFontSize(14);
      doc.text('Sold Players', 14, finalY + 15);

      const soldData = data.soldPlayers.map((p, i) => [
        i + 1,
        p.name,
        p.role,
        p.category || '-',
        formatCr(p.finalPrice),
        p.soldToName || '-'
      ]);

      doc.autoTable({
        startY: finalY + 21,
        head: [['#', 'Player', 'Role', 'Category', 'Price', 'Sold To']],
        body: soldData,
        theme: 'grid',
        headStyles: { fillColor: [245, 166, 35] }
      });
    }

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text('IPL Auction 2026 — Full Summary Report', 105, 285, { align: 'center' });

    doc.save('IPL_Auction_Summary.pdf');
  };

  if (loading) {
    return (
      <div className="page-container flex-center" style={{ minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', animation: 'float 2s ease infinite' }}>📊</div>
          <p className="text-muted mt-2">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-container flex-center" style={{ minHeight: '60vh' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
          <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>No Data Available</h2>
          <p className="text-muted mt-1">Auction results will appear here once the auction begins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" id="results-page">
      {/* Header */}
      <div className="dashboard-header" id="results-header">
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.5rem',
            letterSpacing: '0.08em'
          }}>
            🏆 <span className="text-gold">AUCTION</span> RESULTS
          </h1>
          <p className="text-muted">Season 2026 — Complete Auction Summary</p>
        </div>
        <button className="btn btn-gold" onClick={generateFullPDF} id="download-summary-pdf">
          📄 Download Summary
        </button>
      </div>

      {/* Stats */}
      <div className="dashboard-stats" id="results-stats">
        <div className="stat-card gold">
          <div className="stat-label">Total Players</div>
          <div className="stat-value gold">{data.totalPlayers}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Sold</div>
          <div className="stat-value green">{data.soldCount}</div>
        </div>
        <div className="stat-card crimson">
          <div className="stat-label">Unsold</div>
          <div className="stat-value crimson">{data.unsoldCount}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value blue" style={{ fontSize: '1.8rem' }}>{formatCr(data.totalSpent)}</div>
        </div>
      </div>

      {/* Highest Purchase Banner */}
      {data.highestPurchase && (
        <div className="card mb-3" style={{
          background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.08), rgba(255, 61, 87, 0.05))',
          border: '1px solid rgba(245, 166, 35, 0.3)',
          textAlign: 'center', padding: '2rem'
        }} id="highest-purchase">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            💎 HIGHEST PURCHASE
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', letterSpacing: '0.05em', color: 'var(--gold)' }}>
            {data.highestPurchase.player}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--neon-green)', marginTop: '0.25rem' }}>
            {formatCr(data.highestPurchase.price)}
          </div>
          <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            → {data.highestPurchase.team}
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="admin-tabs mb-3" id="results-tabs">
        {['overview', 'sold', 'unsold'].map(tab => (
          <button
            key={tab}
            className={`admin-tab ${activeView === tab ? 'active' : ''}`}
            onClick={() => setActiveView(tab)}
            id={`results-tab-${tab}`}
          >
            {tab === 'overview' ? '🏆 Team Overview' :
             tab === 'sold' ? '✅ Sold Players' : '❌ Unsold Players'}
          </button>
        ))}
      </div>

      {/* Overview — Team Cards */}
      {activeView === 'overview' && (
        <div className="grid-2" id="team-results">
          {(data.teamSummaries || []).sort((a, b) => b.spent - a.spent).map(t => (
            <div
              className="card"
              key={t._id}
              style={{ cursor: 'pointer' }}
              onClick={() => setExpandedTeam(expandedTeam === t._id ? null : t._id)}
            >
              <div className="flex-between mb-2">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.06em' }}>
                  {t.name}
                </h3>
                <span className={`badge ${t.budget > 60 ? 'badge-live' : t.budget > 30 ? 'badge-allrounder' : 'badge-sold'}`}>
                  {formatCr(t.budget)} Left
                </span>
              </div>

              <div style={{
                width: '100%', height: 8, borderRadius: 4,
                background: 'var(--bg-secondary)', marginBottom: '1rem', overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(t.spent / (t.maxBudget || 120)) * 100}%`,
                  height: '100%', borderRadius: 4,
                  background: t.budget > 60 ? 'var(--neon-green)' : t.budget > 30 ? 'var(--gold)' : 'var(--crimson)',
                  transition: 'width 0.5s ease'
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>Players: <strong>{t.playerCount}</strong></span>
                <span>Spent: <strong className="text-gold">{formatCr(t.spent)}</strong></span>
              </div>

              {expandedTeam === t._id && t.players?.length > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {t.players.map((p, i) => (
                    <span key={i} style={{
                      padding: '0.3rem 0.7rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)'
                    }}>
                      {p.player?.name || 'Player'} <span className="text-gold">({formatCr(p.boughtAt)})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sold Players Table */}
      {activeView === 'sold' && (
        <div className="table-container" id="sold-results-table">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Photo</th>
                <th>Player</th>
                <th>Role</th>
                <th>Category</th>
                <th>Base Price</th>
                <th>Sold Price</th>
                <th>Sold To</th>
              </tr>
            </thead>
            <tbody>
              {(data.soldPlayers || []).map((p, i) => (
                <tr key={p._id}>
                  <td>{i + 1}</td>
                  <td>
                    {p.image ? (
                      <img src={p.image} alt="" style={{
                        width: 40, height: 40, borderRadius: '50%',
                        objectFit: 'cover', border: '2px solid var(--border-card)'
                      }} onError={(e) => e.target.style.display = 'none'} />
                    ) : (
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'var(--bg-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem'
                      }}>🏏</div>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {p.name}
                    {p.country && <span style={{ marginLeft: '0.25rem' }}>{p.country}</span>}
                  </td>
                  <td><span className={`badge badge-${p.role.toLowerCase().replace('-', '')}`}>{p.role}</span></td>
                  <td>
                    <span className={`badge badge-${p.category || 'capped'}`}>
                      {(p.category || 'capped').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>{formatCr(p.basePrice)}</td>
                  <td style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', letterSpacing: '0.05em', fontSize: '1.1rem' }}>
                    {formatCr(p.finalPrice)}
                  </td>
                  <td style={{ color: 'var(--neon-green)', fontWeight: 600 }}>{p.soldToName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data.soldPlayers || data.soldPlayers.length === 0) && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p className="text-muted">No players have been sold yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Unsold Players */}
      {activeView === 'unsold' && (
        <div>
          {(data.unsoldPlayers || []).length > 0 ? (
            <div className="grid-4" id="unsold-results-grid">
              {data.unsoldPlayers.map(p => (
                <div className="card" key={p._id} style={{ textAlign: 'center', padding: '1.25rem' }}>
                  {p.image ? (
                    <img
                      src={p.image} alt=""
                      style={{
                        width: 80, height: 80, borderRadius: '50%',
                        objectFit: 'cover', margin: '0 auto 0.75rem',
                        border: '2px solid var(--border-card)', display: 'block'
                      }}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  ) : (
                    <div style={{
                      width: 80, height: 80, borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '2rem', margin: '0 auto 0.75rem'
                    }}>🏏</div>
                  )}
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.04em' }}>
                    {p.country} {p.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {p.role} · {formatCr(p.basePrice)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
              <p className="text-muted">All players have been sold!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import PlayerCard from '../components/PlayerCard';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('players');
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', role: 'Batsman', basePrice: 1, category: 'capped' });
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const { startPlayerAuction, startMultiAuction, skipPlayer, endAuction, pauseAuction, resumeAuction, auctionState, placeBid } = useSocket();

  const formatCr = (val) => {
    if (val === undefined || val === null) return '₹0';
    if (val >= 1) return `₹${val.toFixed(2)} Cr`;
    return `₹${(val * 100).toFixed(0)} L`;
  };

  // Import state
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  // Multi-player selection state
  const [auctionMode, setAuctionMode] = useState('single'); // 'single' or 'multi'
  const [selectedForAuction, setSelectedForAuction] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [playersRes, teamsRes] = await Promise.all([
        api.get('/players'),
        api.get('/teams')
      ]);
      setPlayers(playersRes.data);
      setTeams(teamsRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Player CRUD ───
  const addPlayer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/players', newPlayer);
      setNewPlayer({ name: '', role: 'Batsman', basePrice: 1, category: 'capped' });
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add player');
    }
  };

  const bulkAddPlayers = async () => {
    try {
      const lines = bulkText.trim().split('\n').filter(l => l.trim());
      const playersList = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        return {
          name: parts[0] || 'Unknown',
          role: parts[1] || 'Batsman',
          basePrice: parseInt(parts[2]) || 10
        };
      });
      await api.post('/players/bulk', { players: playersList });
      setBulkText('');
      setShowBulk(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk add failed');
    }
  };

  const deletePlayer = async (id) => {
    if (!confirm('Delete this player?')) return;
    try {
      await api.delete(`/players/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const resetAuction = async () => {
    if (!confirm('Reset entire auction? All player sales will be cleared.')) return;
    try {
      await api.post('/auction/reset');
      fetchData();
    } catch (err) {
      alert('Reset failed');
    }
  };

  // ─── Import Functions ───
  const loadSeasons = async () => {
    try {
      const res = await api.get('/import/seasons');
      setSeasons(res.data);
    } catch (err) {
      console.error('Failed to load seasons:', err);
    }
  };

  const previewSeason = async (season) => {
    setSelectedSeason(season);
    setImportLoading(true);
    try {
      const res = await api.get(`/import/preview/${season}`);
      setPreviewData(res.data);
    } catch (err) {
      alert('Failed to preview: ' + (err.response?.data?.message || err.message));
    } finally {
      setImportLoading(false);
    }
  };

  const importSeason = async () => {
    if (!selectedSeason) return;
    if (!confirm(`Import all players from Season ${selectedSeason}? This will add them to the database.`)) return;
    setImportLoading(true);
    try {
      const res = await api.post('/import/season', { season: selectedSeason });
      alert(res.data.message);
      setPreviewData(null);
      setSelectedSeason('');
      fetchData();
    } catch (err) {
      alert('Import failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setImportLoading(false);
    }
  };

  const importTeam = async (teamShort) => {
    if (!confirm(`Import players from ${teamShort} (Season ${selectedSeason})?`)) return;
    setImportLoading(true);
    try {
      const res = await api.post('/import/season', { season: selectedSeason, team: teamShort });
      alert(res.data.message);
      fetchData();
    } catch (err) {
      alert('Import failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setImportLoading(false);
    }
  };

  const deleteSeasonPlayers = async (season) => {
    if (!confirm(`Delete ALL players from Season ${season}?`)) return;
    try {
      const res = await api.delete(`/import/season/${season}`);
      alert(res.data.message);
      fetchData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  // ─── Pool Functions ───
  const togglePool = async (teamId) => {
    try {
      await api.put(`/teams/pool/toggle/${teamId}`);
      fetchData();
    } catch (err) {
      alert('Failed to toggle pool');
    }
  };

  const addAllToPool = async () => {
    try {
      await api.post('/teams/pool/add-all');
      fetchData();
    } catch (err) {
      alert('Failed');
    }
  };

  const clearPool = async () => {
    try {
      await api.post('/teams/pool/clear');
      fetchData();
    } catch (err) {
      alert('Failed');
    }
  };

  // ─── Auction Functions ───
  const handleStartAuction = (player) => {
    startPlayerAuction(player._id, 'single');
    setActiveTab('auction');
  };

  const togglePlayerSelection = (player) => {
    setSelectedForAuction(prev => {
      const exists = prev.find(p => p._id === player._id);
      if (exists) return prev.filter(p => p._id !== player._id);
      return [...prev, player];
    });
  };

  const handleStartMultiAuction = () => {
    if (selectedForAuction.length === 0) {
      alert('Select at least one player');
      return;
    }
    const ids = selectedForAuction.map(p => p._id);
    startMultiAuction(ids);
    setSelectedForAuction([]);
    setActiveTab('auction');
  };

  const selectAllUnsold = () => {
    setSelectedForAuction(unsoldPlayers);
  };

  const clearSelection = () => {
    setSelectedForAuction([]);
  };

  const unsoldPlayers = players.filter(p => p.status === 'unsold');
  const soldPlayers = players.filter(p => p.status === 'sold');
  const poolTeams = teams.filter(t => t.inPool);

  if (loading) {
    return (
      <div className="page-container flex-center" style={{ minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', animation: 'float 2s ease infinite' }}>⚡</div>
          <p className="text-muted mt-2">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" id="admin-panel">
      <div className="dashboard-header" id="admin-header">
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.5rem',
            letterSpacing: '0.08em'
          }}>
            ⚡ <span className="text-gold">ADMIN</span> CONTROL PANEL
          </h1>
          <p className="text-muted">Manage players, control auctions, import seasons, manage pool</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {auctionState.isActive && (
            <>
              {auctionState.isPaused ? (
                <button className="btn btn-green btn-sm" onClick={resumeAuction} id="admin-resume">
                  ▶ Resume
                </button>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={pauseAuction} id="admin-pause">
                  ⏸ Pause
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={skipPlayer} id="admin-skip">
                ⏭ Skip
              </button>
              <button className="btn btn-crimson btn-sm" onClick={endAuction} id="admin-end">
                🛑 End
              </button>
            </>
          )}
          <button className="btn btn-outline btn-sm" onClick={resetAuction} id="admin-reset">
            🔄 Reset
          </button>
          
          {/* SIMULATE BID BUTTON FOR ADMIN TESTING */}
          {auctionState.isActive && !auctionState.isPaused && (
            <button 
              className="btn btn-gold btn-sm" 
              onClick={async () => {
                if (teams.length === 0) return alert('No teams available to bid.');
                // Pick a random team
                const randomTeam = teams[Math.floor(Math.random() * teams.length)];
                const minIncrement = auctionState.currentBid < 1 ? 0.05 : 
                                     auctionState.currentBid < 2 ? 0.10 : 
                                     auctionState.currentBid < 5 ? 0.20 : 
                                     auctionState.currentBid < 10 ? 0.25 : 
                                     auctionState.currentBid < 20 ? 0.50 : 1;
                const bidAmount = auctionState.currentBidder ? auctionState.currentBid + minIncrement : auctionState.currentBid;
                
                try {
                  placeBid(randomTeam._id, randomTeam.name, bidAmount);
                } catch(e) {
                  alert('Error simulating bid');
                }
              }} 
              style={{ marginLeft: '1rem', borderStyle: 'dashed' }}
              id="admin-simulate-bid"
            >
              🤖 Simulate Random Bid
            </button>
          )}
        </div>
      </div>

      {/* Multi-mode queue indicator */}
      {auctionState.mode === 'multi' && auctionState.queueLength > 0 && (
        <div className="card mb-3" style={{
          background: 'rgba(0, 230, 118, 0.08)',
          border: '1px solid rgba(0, 230, 118, 0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-live">● MULTI MODE</span>
            <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
              Player {auctionState.queueIndex + 1} / {auctionState.queueLength}
            </span>
          </div>
          <div style={{
            width: '200px', height: 6, borderRadius: 3,
            background: 'var(--bg-secondary)', overflow: 'hidden'
          }}>
            <div style={{
              width: `${((auctionState.queueIndex + 1) / auctionState.queueLength) * 100}%`,
              height: '100%', borderRadius: 3,
              background: 'var(--neon-green)', transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="dashboard-stats" id="admin-stats">
        <div className="stat-card gold">
          <div className="stat-label">Total Players</div>
          <div className="stat-value gold">{players.length}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Unsold</div>
          <div className="stat-value green">{unsoldPlayers.length}</div>
        </div>
        <div className="stat-card crimson">
          <div className="stat-label">Sold</div>
          <div className="stat-value crimson">{soldPlayers.length}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Pool</div>
          <div className="stat-value blue">{poolTeams.length}/{teams.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs" id="admin-tabs">
        {['players', 'auction', 'import', 'pool', 'teams'].map(tab => (
          <button
            key={tab}
            className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              if (tab === 'import' && seasons.length === 0) loadSeasons();
            }}
            id={`admin-tab-${tab}`}
          >
            {tab === 'players' ? '🏏 Players' :
             tab === 'auction' ? '⚡ Auction' :
             tab === 'import' ? '📥 Import' :
             tab === 'pool' ? '🏊 Pool' :
             '🏆 Teams'}
          </button>
        ))}
      </div>

      {/* ══════ PLAYERS TAB ══════ */}
      {activeTab === 'players' && (
        <div id="admin-players-tab">
          <div className="flex-between mb-3">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.08em' }}>
              Player Roster
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-gold btn-sm" onClick={() => setShowAddModal(true)} id="admin-add-player">
                + Add Player
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setShowBulk(!showBulk)} id="admin-bulk-add">
                📋 Bulk Add
              </button>
            </div>
          </div>

          {showBulk && (
            <div className="card mb-3" id="bulk-add-section">
              <h4 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                BULK ADD PLAYERS
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Format: Name, Role, BasePrice (one per line)
              </p>
              <textarea
                className="input w-full"
                rows={6}
                placeholder="Virat Kohli, Batsman, 20&#10;Jasprit Bumrah, Bowler, 18&#10;Hardik Pandya, All-rounder, 15"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
                id="bulk-textarea"
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button className="btn btn-gold btn-sm" onClick={bulkAddPlayers} id="bulk-submit">
                  Add All
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => setShowBulk(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="table-container" id="players-table">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Photo</th>
                  <th>Player</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Base Price</th>
                  <th>Status</th>
                  <th>Sold To</th>
                  <th>Final Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={p._id}>
                    <td>{i + 1}</td>
                    <td>
                      {p.image ? (
                        <img src={p.image} alt="" style={{
                          width: 36, height: 36, borderRadius: '50%',
                          objectFit: 'cover', border: '2px solid var(--border-card)'
                        }} onError={(e) => e.target.style.display = 'none'} />
                      ) : (
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'var(--bg-secondary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.9rem'
                        }}>
                          🏏
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {p.name}
                      {p.country && <span style={{ marginLeft: '0.25rem' }}>{p.country}</span>}
                    </td>
                    <td><span className={`badge badge-${p.role.toLowerCase().replace('-', '')}`}>{p.role}</span></td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.originalTeam || '-'}</td>
                    <td style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>{formatCr(p.basePrice)}</td>
                    <td>
                      <span className={`badge ${p.status === 'sold' ? 'badge-sold' : p.status === 'in-auction' ? 'badge-live' : 'badge-unsold'}`}>
                        {p.status === 'in-auction' ? '● LIVE' : p.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{p.soldToName || '-'}</td>
                    <td style={{ fontFamily: 'var(--font-display)', color: p.finalPrice ? 'var(--gold)' : 'var(--text-muted)' }}>
                      {p.finalPrice ? formatCr(p.finalPrice) : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {p.status === 'unsold' && (
                          <button
                            className="btn btn-green btn-sm"
                            onClick={() => handleStartAuction(p)}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            ▶
                          </button>
                        )}
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => deletePlayer(p._id)}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: 'var(--crimson)' }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {players.length === 0 && (
            <div className="card mt-3" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏏</div>
              <p className="text-muted">No players added yet. Use "Import" tab to load season data, or add manually.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════ AUCTION TAB ══════ */}
      {activeTab === 'auction' && (
        <div id="admin-auction-tab">
          {/* Mode Selector */}
          <div className="flex-between mb-3">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.08em' }}>
              {auctionMode === 'single' ? '🎯 Single Player Mode' : '🔥 Multi Player Mode'}
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{
                display: 'flex', borderRadius: 'var(--radius-sm)',
                overflow: 'hidden', border: '1px solid var(--border-card)'
              }}>
                <button
                  className={`btn btn-sm ${auctionMode === 'single' ? 'btn-gold' : 'btn-outline'}`}
                  onClick={() => { setAuctionMode('single'); clearSelection(); }}
                  style={{ borderRadius: 0, border: 'none' }}
                >
                  Single
                </button>
                <button
                  className={`btn btn-sm ${auctionMode === 'multi' ? 'btn-gold' : 'btn-outline'}`}
                  onClick={() => setAuctionMode('multi')}
                  style={{ borderRadius: 0, border: 'none' }}
                >
                  Multi
                </button>
              </div>
            </div>
          </div>

          {/* Single mode quick start */}
          {auctionMode === 'single' && unsoldPlayers.length > 0 && (
            <div className="card mb-3" style={{
              background: 'rgba(0, 230, 118, 0.06)',
              border: '1px solid rgba(0, 230, 118, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '0.75rem'
            }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.08em', color: 'var(--neon-green)' }}>
                  QUICK START
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
                  Instantly start the auction for the next available player
                </span>
              </div>
              <button
                className="btn btn-green btn-lg"
                onClick={() => handleStartAuction(unsoldPlayers[0])}
                style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}
              >
                ▶ Start Next Player
              </button>
            </div>
          )}

          {/* Multi mode controls */}
          {auctionMode === 'multi' && (
            <div className="card mb-3" style={{
              background: 'rgba(245, 166, 35, 0.06)',
              border: '1px solid rgba(245, 166, 35, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '0.75rem'
            }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.08em', color: 'var(--gold)' }}>
                  {selectedForAuction.length} PLAYERS SELECTED
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
                  Click player cards to select/deselect
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline btn-sm" onClick={selectAllUnsold}>
                  Select All ({unsoldPlayers.length})
                </button>
                <button className="btn btn-outline btn-sm" onClick={clearSelection}>
                  Clear
                </button>
                <button
                  className="btn btn-green btn-sm"
                  onClick={handleStartMultiAuction}
                  disabled={selectedForAuction.length === 0}
                >
                  🚀 Start Multi Auction
                </button>
              </div>
            </div>
          )}

          <h4 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.2rem',
            letterSpacing: '0.08em', marginBottom: '1rem'
          }}>
            Unsold Players — Ready for Auction ({unsoldPlayers.length})
          </h4>

          {unsoldPlayers.length > 0 ? (
            <div className="grid-4" id="unsold-players-grid">
              {unsoldPlayers.map(p => (
                <PlayerCard
                  key={p._id}
                  player={p}
                  onAction={auctionMode === 'single' ? handleStartAuction : undefined}
                  actionLabel="▶ Start Auction"
                  showStatus={false}
                  selectable={auctionMode === 'multi'}
                  selected={selectedForAuction.some(s => s._id === p._id)}
                  onSelect={togglePlayerSelection}
                />
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
              <p className="text-muted">All players have been auctioned!</p>
            </div>
          )}

          {soldPlayers.length > 0 && (
            <>
              <h4 style={{
                fontFamily: 'var(--font-display)', fontSize: '1.2rem',
                letterSpacing: '0.08em', margin: '2rem 0 1rem'
              }}>
                Sold Players ({soldPlayers.length})
              </h4>
              <div className="grid-4" id="sold-players-grid">
                {soldPlayers.map(p => (
                  <PlayerCard key={p._id} player={p} showStatus={true} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════ IMPORT TAB ══════ */}
      {activeTab === 'import' && (
        <div id="admin-import-tab">
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.5rem',
            letterSpacing: '0.08em', marginBottom: '1.5rem'
          }}>
            📥 Import Season Data
          </h3>
          <p className="text-muted mb-3">
            Load real IPL player data from season HTML files. Players will be parsed with names, roles, headshot images, and auto-assigned base prices.
          </p>

          {/* Season Cards */}
          {seasons.length > 0 ? (
            <div className="grid-4 mb-4" id="season-grid">
              {seasons.map(s => (
                <div
                  key={s.year}
                  className={`card ${selectedSeason === s.year ? '' : ''}`}
                  onClick={() => previewSeason(s.year)}
                  style={{
                    cursor: 'pointer', textAlign: 'center',
                    border: selectedSeason === s.year ? '1px solid var(--gold)' : undefined,
                    boxShadow: selectedSeason === s.year ? 'var(--shadow-gold)' : undefined
                  }}
                  id={`season-card-${s.year}`}
                >
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2.5rem', letterSpacing: '0.05em',
                    color: selectedSeason === s.year ? 'var(--gold)' : 'var(--text-primary)'
                  }}>
                    {s.year}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {s.totalTeams} teams
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                    {s.teams.map(t => (
                      <span key={t} style={{
                        padding: '0.15rem 0.4rem', fontSize: '0.65rem',
                        background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-secondary)'
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <button className="btn btn-gold" onClick={loadSeasons}>
                🔍 Scan for Seasons
              </button>
            </div>
          )}

          {/* Preview Data */}
          {importLoading && (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '2rem', animation: 'float 2s ease infinite' }}>📡</div>
              <p className="text-muted mt-1">Parsing HTML files...</p>
            </div>
          )}

          {previewData && !importLoading && (
            <div id="import-preview">
              <div className="flex-between mb-3">
                <div>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', letterSpacing: '0.08em' }}>
                    Season {previewData.season} Preview
                  </h4>
                  <p className="text-muted">
                    {previewData.totalPlayers} players across {previewData.teams} teams
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-gold" onClick={importSeason} disabled={importLoading}>
                    📥 Import All ({previewData.totalPlayers})
                  </button>
                  <button className="btn btn-crimson btn-sm" onClick={() => deleteSeasonPlayers(previewData.season)}>
                    🗑 Delete Season
                  </button>
                </div>
              </div>

              {Object.entries(previewData.byTeam).map(([teamShort, teamPlayers]) => (
                <div key={teamShort} className="mb-3">
                  <div className="flex-between mb-2">
                    <h4 style={{
                      fontFamily: 'var(--font-display)', fontSize: '1.1rem',
                      letterSpacing: '0.08em', color: 'var(--gold)'
                    }}>
                      {teamShort} ({teamPlayers.length} players)
                    </h4>
                    <button className="btn btn-outline btn-sm" onClick={() => importTeam(teamShort)}>
                      Import {teamShort}
                    </button>
                  </div>
                  <div className="grid-4">
                    {teamPlayers.map((p, i) => (
                      <div key={i} className="card" style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          {p.image ? (
                            <img
                              src={p.image} alt=""
                              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          ) : (
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              🏏
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.country} {p.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {p.role} · {p.basePrice} PTS
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════ POOL TAB ══════ */}
      {activeTab === 'pool' && (
        <div id="admin-pool-tab">
          <div className="flex-between mb-3">
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.08em' }}>
                🏊 Team Bidding Pool
              </h3>
              <p className="text-muted">
                {poolTeams.length} of {teams.length} teams in pool — Only pool teams can bid during auction.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-green btn-sm" onClick={addAllToPool}>
                Add All
              </button>
              <button className="btn btn-outline btn-sm" onClick={clearPool}>
                Clear Pool
              </button>
            </div>
          </div>

          {teams.length > 0 ? (
            <div className="grid-2" id="pool-teams">
              {teams.map(t => (
                <div key={t._id} className="card" style={{
                  border: t.inPool ? '1px solid rgba(0, 230, 118, 0.3)' : undefined,
                  background: t.inPool ? 'rgba(0, 230, 118, 0.04)' : undefined
                }}>
                  <div className="flex-between mb-2">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: t.inPool
                          ? 'linear-gradient(135deg, var(--neon-green), #00B860)'
                          : 'var(--bg-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontSize: '1rem',
                        color: t.inPool ? '#0D0F14' : 'var(--text-muted)'
                      }}>
                        {t.inPool ? '✓' : t.name.charAt(0)}
                      </div>
                      <div>
                        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', letterSpacing: '0.06em' }}>
                          {t.name}
                        </h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Budget: {formatCr(t.budget)} · {t.players?.length || 0} players
                        </div>
                      </div>
                    </div>
                    <button
                      className={`btn btn-sm ${t.inPool ? 'btn-crimson' : 'btn-green'}`}
                      onClick={() => togglePool(t._id)}
                    >
                      {t.inPool ? 'Remove' : 'Add'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏆</div>
              <p className="text-muted">No teams registered yet. Teams must register and login first.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════ TEAMS TAB ══════ */}
      {activeTab === 'teams' && (
        <div id="admin-teams-tab">
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.5rem',
            letterSpacing: '0.08em', marginBottom: '1.5rem'
          }}>
            All Teams Overview
          </h3>

          {teams.length > 0 ? (
            <div className="grid-2" id="teams-overview">
              {teams.map(t => (
                <div className="card" key={t._id}>
                  <div className="flex-between mb-2">
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.06em' }}>
                      {t.name}
                      {t.inPool && <span className="badge badge-live" style={{ marginLeft: '0.5rem', fontSize: '0.6rem' }}>POOL</span>}
                    </h4>
                    <span className={`badge ${t.budget > 100 ? 'badge-live' : t.budget > 50 ? 'badge-allrounder' : 'badge-sold'}`}>
                      {formatCr(t.budget)}
                    </span>
                  </div>

                  <div style={{
                    width: '100%', height: 8, borderRadius: 4,
                    background: 'var(--bg-secondary)', marginBottom: '1rem',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(t.budget / (t.maxBudget || 120)) * 100}%`,
                      height: '100%', borderRadius: 4,
                      background: t.budget > 100 ? 'var(--neon-green)' : t.budget > 50 ? 'var(--gold)' : 'var(--crimson)',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div>Owner: {t.owner?.name || '-'}</div>
                    <div>Players: {t.players?.length || 0}</div>
                    <div>Spent: {formatCr((t.maxBudget || 120) - t.budget)}</div>
                  </div>

                  {t.players?.length > 0 && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {t.players.map((p, i) => (
                        <span key={i} style={{
                          padding: '0.25rem 0.6rem',
                          background: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          color: 'var(--text-primary)'
                        }}>
                          {p.player?.name || 'Player'} ({formatCr(p.boughtAt)})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏆</div>
              <p className="text-muted">No teams registered yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Player Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">ADD PLAYER</h3>
            <form onSubmit={addPlayer} className="auth-form">
              <div className="input-group">
                <label>Player Name</label>
                <input type="text" className="input" value={newPlayer.name}
                  onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                  placeholder="e.g., Virat Kohli" required />
              </div>
              <div className="input-group">
                <label>Role</label>
                <select className="input" value={newPlayer.role}
                  onChange={(e) => setNewPlayer({ ...newPlayer, role: e.target.value })}>
                  <option value="Batsman">Batsman</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-rounder">All-rounder</option>
                  <option value="Wicketkeeper">Wicketkeeper</option>
                </select>
              </div>
              <div className="input-group">
                <label>Base Price (₹ Cr)</label>
                <input type="number" className="input" value={newPlayer.basePrice}
                  onChange={(e) => setNewPlayer({ ...newPlayer, basePrice: parseFloat(e.target.value) || 0.5 })}
                  step="0.25"
                  min={1} required />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-gold">Add Player</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

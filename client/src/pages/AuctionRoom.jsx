import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import CountdownRing from '../components/CountdownRing';
import BidFeed from '../components/BidFeed';
import BudgetGauge from '../components/BudgetGauge';
import SoldOverlay from '../components/SoldOverlay';
import useSoundEffects from '../utils/useSoundEffects';

// Format ₹ Cr display
function formatCr(val) {
  if (val === undefined || val === null) return '0';
  if (val >= 1) return `₹${val.toFixed(2)} Cr`;
  return `₹${(val * 100).toFixed(0)} L`;
}

function formatCrShort(val) {
  if (val === undefined || val === null) return '0';
  if (val >= 1) return val.toFixed(2);
  return (val * 100).toFixed(0) + 'L';
}

export default function AuctionRoom() {
  const { poolId } = useParams();
  const { user, isAdmin } = useAuth();
  const isViewer = user?.role === 'viewer';
  const {
    auctionState, soldInfo, unsoldInfo,
    placeBid, clearSold, clearUnsold, joinPool, leavePool,
    startPlayerAuction, skipPlayer, endAuction, pauseAuction, resumeAuction
  } = useSocket();
  
  const [bidAmount, setBidAmount] = useState('');
  const [team, setTeam] = useState(null);
  const [pool, setPool] = useState(null);
  const [error, setError] = useState('');
  const [imgError, setImgError] = useState(false);
  const [autoBidMax, setAutoBidMax] = useState('');
  const [autoBidActive, setAutoBidActive] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const { playBid, playSold, playUnsold, playCountdown, muted, toggleMute } = useSoundEffects();
  const prevBidRef = useRef(null);
  const prevTimerRef = useRef(30);

  useEffect(() => {
    if (poolId) {
      joinPool(poolId);
      api.get(`/pools/${poolId}`).then(res => setPool(res.data)).catch(console.error);
    }
    return () => leavePool();
  }, [poolId]);

  useEffect(() => {
    if (poolId && user) {
      // Find team for this pool
      api.get(`/pools/my`).then(res => {
        const joinedPools = res.data.joined;
        if (joinedPools) {
          // Team is fetched in dashboard, but here we can just fetch the user's team for this pool.
          // Wait, the API doesn't have a direct route for this, let's just use the pool's teams array.
        }
      });
      // Better: get all my teams and find the one with poolId
      api.get('/teams').then(res => {
        const myTeam = res.data.find(t => t.owner?._id === user.id && t.poolId === poolId);
        if (myTeam) setTeam(myTeam);
      });
    }
  }, [poolId, user, soldInfo]);

  // Reset img error when player changes
  useEffect(() => {
    setImgError(false);
  }, [auctionState.currentPlayer?._id]);

  // Sound effects
  useEffect(() => {
    if (soldInfo) playSold();
  }, [soldInfo, playSold]);

  useEffect(() => {
    if (unsoldInfo) playUnsold();
  }, [unsoldInfo, playUnsold]);

  useEffect(() => {
    const curBid = auctionState.currentBid;
    if (prevBidRef.current !== null && curBid !== prevBidRef.current && curBid > 0) {
      playBid();
    }
    prevBidRef.current = curBid;
  }, [auctionState.currentBid, playBid]);

  useEffect(() => {
    const t = auctionState.timer;
    if (t !== prevTimerRef.current && t <= 5 && t > 0 && auctionState.isActive) {
      playCountdown(t);
    }
    prevTimerRef.current = t;
  }, [auctionState.timer, auctionState.isActive, playCountdown]);

  const { isActive, isPaused, currentPlayer, currentBid, currentBidderName, timer, bids, mode, queueLength, queueIndex, quickIncrements, minIncrement } = auctionState;

  const handleBid = () => {
    setError('');
    const amount = parseFloat(bidAmount);

    if (!amount || isNaN(amount)) {
      setError('Enter a valid bid amount');
      return;
    }
    const minBid = auctionState.currentBidder
      ? parseFloat((currentBid + minIncrement).toFixed(2))
      : currentBid;
    if (amount < minBid) {
      setError(`Bid must be at least ${formatCr(minBid)}`);
      return;
    }
    if (team && amount > team.budget) {
      setError(`Insufficient budget (${formatCr(team.budget)} remaining)`);
      return;
    }

    placeBid(user.teamId, user.teamName, amount);
    setBidAmount('');
  };

  const quickBid = (increment) => {
    const newBid = parseFloat((currentBid + increment).toFixed(2));
    if (team && newBid > team.budget) {
      setError(`Insufficient budget (${formatCr(team.budget)} remaining)`);
      return;
    }
    setError('');
    placeBid(user.teamId, user.teamName, newBid);
  };

  const setAutoBid = async () => {
    const max = parseFloat(autoBidMax);
    if (!max || max <= currentBid) {
      setError('Auto-bid max must be higher than current bid');
      return;
    }
    try {
      await api.post('/autobid', {
        teamId: user.teamId,
        playerId: currentPlayer._id,
        maxAmount: max
      });
      setAutoBidActive(true);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set auto-bid');
    }
  };

  const cancelAutoBid = async () => {
    try {
      await api.delete(`/autobid/${currentPlayer._id}`);
      setAutoBidActive(false);
    } catch { /* ignore */ }
  };

  const getRoleIcon = (role) => {
    const map = { 'Batsman': '🏏', 'Bowler': '🎯', 'All-rounder': '⚡', 'Wicketkeeper': '🧤' };
    return map[role] || '🏏';
  };

  const getRoleBadge = (role) => {
    const map = { 'Batsman': 'badge-batsman', 'Bowler': 'badge-bowler', 'All-rounder': 'badge-allrounder', 'Wicketkeeper': 'badge-wicketkeeper' };
    return map[role] || 'badge-batsman';
  };

  const getCategoryBadge = (cat) => {
    const map = { 'marquee': 'badge-marquee', 'capped': 'badge-capped', 'uncapped': 'badge-uncapped' };
    return map[cat] || '';
  };

  const isPoolAdmin = pool && (pool.creator === user?.id || pool.creator?._id === user?.id);

  return (
    <div className="page-container" id="auction-room">
      {/* Sound mute toggle */}
      <button
        className="sound-toggle"
        onClick={toggleMute}
        title={muted ? 'Unmute sounds' : 'Mute sounds'}
        id="sound-toggle"
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {/* SOLD Overlay */}
      {soldInfo && <SoldOverlay soldInfo={soldInfo} onClose={clearSold} />}

      {/* UNSOLD notification */}
      {unsoldInfo && (
        <div className="sold-overlay" onClick={clearUnsold} id="unsold-overlay">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="sold-stamp" style={{ color: 'var(--text-muted)' }}>UNSOLD</div>
            <div className="sold-details">
              <div className="sold-player-name">{unsoldInfo.player?.name}</div>
              <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginTop: '0.5rem', letterSpacing: '0.1em' }}>
                No bids placed
              </div>
            </div>
          </div>
        </div>
      )}

      {!isActive && !soldInfo && !unsoldInfo ? (
        /* Waiting State */
        <div className="auction-waiting" id="auction-waiting">
          {pool && (pool.creator === user?.id || pool.creator?._id === user?.id) ? (
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
              <h2 style={{ color: 'var(--gold)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
                🛠️ POOL ADMIN CONTROLS
              </h2>
              <p className="text-muted mb-3">You are the admin of this pool. Select a player to start the auction.</p>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <select 
                  className="input" 
                  value={selectedPlayerId} 
                  onChange={e => setSelectedPlayerId(e.target.value)}
                >
                  <option value="">-- Select Player --</option>
                  {pool.playerStates?.filter(p => p.status === 'unsold').map(ps => (
                    <option key={ps.player._id || ps.player} value={ps.player._id || ps.player}>
                      {ps.player.name || 'Player'} ({ps.player.role || 'Unknown'}) - {formatCr(ps.player.basePrice || 0)}
                    </option>
                  ))}
                </select>
                <button 
                  className="btn btn-gold"
                  onClick={() => {
                    if (selectedPlayerId) startPlayerAuction(selectedPlayerId, 'single');
                  }}
                  disabled={!selectedPlayerId}
                >
                  Start Auction
                </button>
              </div>
              
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Players: <strong>{pool.playerStates?.length || 0}</strong></span>
                  <span>Unsold: <strong>{pool.playerStates?.filter(p => p.status === 'unsold').length || 0}</strong></span>
                  <span>Sold: <strong>{pool.playerStates?.filter(p => p.status === 'sold').length || 0}</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="auction-waiting-icon">🏟️</div>
              <h2>WAITING FOR AUCTION</h2>
              <p>
                {isAdmin ? (
                  <span>
                    Use the <strong>Control Panel</strong> to start the global auction. <br />
                    <em style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                      (Note: Admins cannot place bids. Open a new window and register a Team to test bidding.)
                    </em>
                  </span>
                )
                  : isViewer
                  ? 'The auction will begin shortly. Stay tuned for live updates!'
                  : 'The pool admin will begin shortly. Stay on this page for live updates.'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--neon-green)', marginTop: '1rem' }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'var(--neon-green)',
                  animation: 'pulse-glow 2s ease infinite',
                  display: 'inline-block'
                }} />
                Connected — Listening for auction events
              </div>
            </>
          )}
        </div>
      ) : isActive && currentPlayer ? (
        /* Active Auction */
        <div className="auction-layout" id="auction-active">
          <div className="auction-main">
            {/* Paused banner */}
            {isPaused && (
              <div className="card mb-2" style={{
                background: 'rgba(245, 166, 35, 0.1)',
                border: '1px solid rgba(245, 166, 35, 0.3)',
                textAlign: 'center', padding: '1rem',
                animation: 'pulse-glow 2s ease infinite'
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.15em', color: 'var(--gold)' }}>
                  ⏸ AUCTION PAUSED
                </span>
              </div>
            )}

            {/* Multi-mode progress bar */}
            {mode === 'multi' && queueLength > 0 && (
              <div className="card mb-2" style={{
                background: 'rgba(0, 230, 118, 0.06)',
                border: '1px solid rgba(0, 230, 118, 0.2)',
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.25rem'
              }}>
                <span className="badge badge-live">● MULTI</span>
                <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em', fontSize: '0.9rem' }}>
                  Player {queueIndex + 1} / {queueLength}
                </span>
                <div style={{
                  flex: 1, height: 6, borderRadius: 3,
                  background: 'var(--bg-secondary)', overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${((queueIndex + 1) / queueLength) * 100}%`,
                    height: '100%', borderRadius: 3,
                    background: 'var(--neon-green)', transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            )}

            {/* Player Showcase */}
            <div className="auction-player-showcase" id="auction-showcase">
              <div className="auction-player-avatar">
                {currentPlayer.image && !imgError ? (
                  <img
                    src={currentPlayer.image}
                    alt={currentPlayer.name}
                    onError={() => setImgError(true)}
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'cover', objectPosition: 'top center',
                      borderRadius: 'var(--radius-md)'
                    }}
                  />
                ) : (
                  <span>{getRoleIcon(currentPlayer.role)}</span>
                )}
              </div>

              <div className="auction-player-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`badge ${getRoleBadge(currentPlayer.role)}`}>
                    {currentPlayer.role}
                  </span>
                  {currentPlayer.category && (
                    <span className={`badge ${getCategoryBadge(currentPlayer.category)}`}>
                      {currentPlayer.category.toUpperCase()}
                    </span>
                  )}
                  {currentPlayer.country && (
                    <span style={{ fontSize: '1.2rem' }}>{currentPlayer.country}</span>
                  )}
                  {currentPlayer.originalTeam && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                      {currentPlayer.originalTeam}
                    </span>
                  )}
                </div>
                <h1 className="auction-player-name">{currentPlayer.name}</h1>

                <div className="auction-bid-section">
                  <div>
                    <CountdownRing timer={timer} />
                  </div>
                  <div className="auction-current-bid">
                    <label>Current Bid</label>
                    <div className="auction-current-bid-value">{formatCr(currentBid)}</div>
                    <div className="auction-bidder-name">
                      {currentBidderName || `Base: ${formatCr(currentPlayer.basePrice)}`}
                    </div>
                  </div>
                </div>

                {/* Bid Controls (teams only, not viewers) */}
                {!isAdmin && !isViewer && team && (
                  <div style={{ marginTop: '1.5rem' }}>
                    {error && (
                      <div className="alert alert-error mb-2" id="bid-error">
                        ⚠️ {error}
                      </div>
                    )}

                    {isPaused ? (
                      <div className="card" style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(245, 166, 35, 0.06)' }}>
                        <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--gold)' }}>
                          BIDDING PAUSED — PLEASE WAIT
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="auction-bid-controls" id="bid-controls">
                          {(quickIncrements || [0.05, 0.10, 0.25, 0.50]).map((inc, i) => (
                            <button
                              key={i}
                              className="btn btn-outline btn-sm"
                              onClick={() => quickBid(inc)}
                            >
                              +{inc >= 1 ? `${inc}Cr` : `${(inc * 100).toFixed(0)}L`}
                            </button>
                          ))}
                          <input
                            type="number"
                            className="input bid-amount-input"
                            placeholder="₹ Cr"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            id="bid-custom-input"
                            step="0.05"
                            min={currentBid + (minIncrement || 0.05)}
                          />
                          <button className="btn btn-gold" onClick={handleBid} id="bid-submit">
                            🔨 BID
                          </button>
                        </div>
                        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Your budget: <span className="text-green">{formatCr(team.budget)}</span>
                          {minIncrement && (
                            <span style={{ marginLeft: '1rem' }}>
                              Min increment: <span className="text-gold">{formatCr(minIncrement)}</span>
                            </span>
                          )}
                        </div>

                        {/* Auto-bid toggle */}
                        <div className="card mt-2" style={{ padding: '1rem', background: 'rgba(61, 139, 255, 0.06)', border: '1px solid rgba(61, 139, 255, 0.2)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.08em', color: 'var(--electric-blue)' }}>
                              🤖 AUTO-BID
                            </span>
                          </div>
                          {autoBidActive ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span className="badge badge-live">ACTIVE — Max {formatCr(parseFloat(autoBidMax))}</span>
                              <button className="btn btn-outline btn-sm" onClick={cancelAutoBid}>Cancel</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input
                                type="number"
                                className="input"
                                placeholder="Max ₹ Cr"
                                value={autoBidMax}
                                onChange={(e) => setAutoBidMax(e.target.value)}
                                style={{ width: '120px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                                step="0.05"
                              />
                              <button className="btn btn-outline btn-sm" onClick={setAutoBid} style={{ color: 'var(--electric-blue)', borderColor: 'var(--electric-blue)' }}>
                                Set Auto-Bid
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Viewer indicator */}
                {isViewer && (
                  <div className="card mt-2" style={{ textAlign: 'center', padding: '1rem', background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                    <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: '#A855F7' }}>
                      👁 SPECTATOR MODE
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bid Feed */}
            <BidFeed bids={bids} />
          </div>

          {/* Sidebar */}
          <div className="auction-sidebar" id="auction-sidebar">
            {team && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--gold)' }}>
                  {team.name}
                </h3>
                <BudgetGauge budget={team.budget} maxBudget={team.maxBudget || 120} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {team.players?.length || 0} / {team.maxPlayers || 25} players
                </div>
              </div>
            )}

            {isPoolAdmin && (
              <div className="card mb-3">
                <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--gold)', marginBottom: '1rem', fontSize: '1rem' }}>
                  ⚙️ ADMIN CONTROLS
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {isPaused ? (
                    <button className="btn btn-green" onClick={resumeAuction}>▶ Resume</button>
                  ) : (
                    <button className="btn btn-outline" onClick={pauseAuction}>⏸ Pause</button>
                  )}
                  <button className="btn btn-outline" onClick={skipPlayer}>⏭ Skip Player</button>
                  <button className="btn btn-outline" onClick={endAuction} style={{ color: 'var(--crimson)', borderColor: 'var(--crimson)' }}>⏹ End Auction</button>
                </div>
              </div>
            )}

            <div className="card">
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                letterSpacing: '0.1em',
                marginBottom: '1rem',
                color: 'var(--gold)'
              }}>
                ℹ️ AUCTION RULES
              </h3>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 2, paddingLeft: '1rem' }}>
                <li>30 seconds per player</li>
                <li>Timer resets on new bid</li>
                <li>Highest bid wins</li>
                <li>Cannot exceed budget</li>
                <li>Dynamic bid increments</li>
                <li>Max 25 players per squad</li>
                <li>Max 8 overseas players</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

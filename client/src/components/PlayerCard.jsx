import { useState } from 'react';

function formatCr(val) {
  if (val === undefined || val === null) return '₹0';
  if (val >= 1) return `₹${val.toFixed(2)} Cr`;
  return `₹${(val * 100).toFixed(0)} L`;
}

export default function PlayerCard({ player, onAction, actionLabel, showStatus = true, selectable, selected, onSelect }) {
  const [imgError, setImgError] = useState(false);

  const getRoleBadge = (role) => {
    const map = {
      'Batsman': 'badge-batsman',
      'Bowler': 'badge-bowler',
      'All-rounder': 'badge-allrounder',
      'Wicketkeeper': 'badge-wicketkeeper'
    };
    return map[role] || 'badge-batsman';
  };

  const getRoleIcon = (role) => {
    const map = {
      'Batsman': '🏏',
      'Bowler': '🎯',
      'All-rounder': '⚡',
      'Wicketkeeper': '🧤'
    };
    return map[role] || '🏏';
  };

  const isSold = player.status === 'sold';
  const hasImage = player.image && !imgError;

  return (
    <div
      className={`player-card ${selected ? 'selected-card' : ''}`}
      id={`player-card-${player._id}`}
      onClick={selectable ? () => onSelect?.(player) : undefined}
      style={selectable ? { cursor: 'pointer' } : {}}
    >
      <div className="player-card-image">
        {hasImage ? (
          <img
            src={player.image}
            alt={player.name}
            onError={() => setImgError(true)}
            loading="lazy"
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'top center',
              position: 'relative', zIndex: 1
            }}
          />
        ) : (
          <span className="player-silhouette">{getRoleIcon(player.role)}</span>
        )}
        {showStatus && (
          <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 2 }}>
            <span className={`badge ${isSold ? 'badge-sold' : player.status === 'in-auction' ? 'badge-live' : 'badge-unsold'}`}>
              {player.status === 'in-auction' ? '● LIVE' : player.status?.toUpperCase()}
            </span>
          </div>
        )}
        {player.country && (
          <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 2, fontSize: '1.2rem' }}>
            {player.country}
          </div>
        )}
        {selected && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 3,
            background: 'rgba(0, 230, 118, 0.15)',
            border: '2px solid var(--neon-green)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontSize: '2rem' }}>✓</span>
          </div>
        )}
      </div>
      <div className="player-card-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span className={`badge ${getRoleBadge(player.role)}`}>{player.role}</span>
          {player.originalTeam && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
              {player.originalTeam}
            </span>
          )}
        </div>
        <div className="player-card-name">{player.name}</div>
        <div className="player-card-price">
          {formatCr(isSold ? player.finalPrice : player.basePrice)}
        </div>
        {isSold && player.soldToName && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--neon-green)' }}>
            → {player.soldToName}
          </div>
        )}
        {onAction && !selectable && (
          <button
            className="btn btn-gold btn-sm w-full mt-2"
            onClick={() => onAction(player)}
            id={`player-action-${player._id}`}
          >
            {actionLabel || 'Select'}
          </button>
        )}
      </div>
    </div>
  );
}

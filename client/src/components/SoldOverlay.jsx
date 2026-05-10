import { useEffect, useState } from 'react';

function formatCr(val) {
  if (val === undefined || val === null) return '₹0';
  if (val >= 1) return `₹${val.toFixed(2)} Cr`;
  return `₹${(val * 100).toFixed(0)} L`;
}

function Confetti() {
  const pieces = Array.from({ length: 50 }, (_, i) => {
    const colors = ['#F5A623', '#FF3D57', '#00E676', '#3D8BFF', '#A855F7', '#FFD07B'];
    return {
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360
    };
  });

  return (
    <div className="confetti-container">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`
          }}
        />
      ))}
    </div>
  );
}

export default function SoldOverlay({ soldInfo, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, 4000);
    return () => clearTimeout(timeout);
  }, [onClose]);

  if (!visible || !soldInfo) return null;

  return (
    <>
      <Confetti />
      <div className="sold-overlay" onClick={() => { setVisible(false); onClose?.(); }} id="sold-overlay">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="sold-stamp">SOLD!</div>
          <div className="sold-details">
            <div className="sold-player-name">{soldInfo.player?.name}</div>
            <div className="sold-team-name">→ {soldInfo.soldTo}</div>
            <div className="sold-price">{formatCr(soldInfo.finalPrice)}</div>
          </div>
        </div>
      </div>
    </>
  );
}

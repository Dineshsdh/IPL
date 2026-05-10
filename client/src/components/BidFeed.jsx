function formatCr(val) {
  if (val === undefined || val === null) return '₹0';
  if (val >= 1) return `₹${val.toFixed(2)} Cr`;
  return `₹${(val * 100).toFixed(0)} L`;
}

export default function BidFeed({ bids = [] }) {
  const reversed = [...bids].reverse();

  return (
    <div className="card" id="bid-feed-card">
      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.3rem',
        letterSpacing: '0.1em',
        marginBottom: '1rem',
        color: 'var(--gold)'
      }}>
        📡 LIVE BID FEED
      </h3>

      <div className="bid-feed" id="bid-feed-list">
        {reversed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🕐</div>
            Waiting for bids...
          </div>
        ) : (
          reversed.map((bid, i) => (
            <div className="bid-entry" key={i} id={`bid-entry-${i}`}>
              <div>
                <div className="bid-entry-team">{bid.teamName}</div>
                <div className="bid-entry-time">
                  {new Date(bid.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <div className="bid-entry-amount">{formatCr(bid.amount)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

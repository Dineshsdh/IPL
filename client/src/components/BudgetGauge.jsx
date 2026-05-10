export default function BudgetGauge({ budget, maxBudget = 120 }) {
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const percentage = budget / maxBudget;
  const offset = circumference - (percentage * circumference);

  const getColor = () => {
    if (percentage > 0.6) return 'var(--neon-green)';
    if (percentage > 0.3) return 'var(--gold)';
    return 'var(--crimson)';
  };

  const formatCr = (val) => {
    if (val >= 1) return `₹${val.toFixed(1)}`;
    return `₹${(val * 100).toFixed(0)}L`;
  };

  return (
    <div className="budget-gauge" id="budget-gauge">
      <svg viewBox="0 0 180 180">
        <circle
          className="budget-gauge-bg"
          cx="90" cy="90" r={radius}
        />
        <circle
          className="budget-gauge-fill"
          cx="90" cy="90" r={radius}
          style={{
            stroke: getColor(),
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            filter: `drop-shadow(0 0 6px ${getColor()})`
          }}
        />
      </svg>
      <div className="budget-gauge-text">
        <div className="budget-gauge-value" style={{ color: getColor(), fontSize: '2rem' }}>
          {formatCr(budget)}
        </div>
        <div className="budget-gauge-label">Cr Remaining</div>
      </div>
    </div>
  );
}

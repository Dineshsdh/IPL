export default function CountdownRing({ timer, maxTime = 30 }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (timer / maxTime) * circumference;
  const offset = circumference - progress;

  const getState = () => {
    if (timer <= 5) return 'urgent';
    if (timer <= 10) return 'warning';
    return '';
  };

  const state = getState();

  return (
    <div className="countdown-ring-wrapper" id="countdown-ring">
      <svg className="countdown-ring" viewBox="0 0 160 160">
        <circle
          className="countdown-ring-bg"
          cx="80" cy="80" r={radius}
        />
        <circle
          className={`countdown-ring-progress ${state}`}
          cx="80" cy="80" r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={`countdown-timer-text ${state}`}>
        {timer}
      </span>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';

const URGENT_SECONDS = 10;

export default function Countdown({ remainingMs, totalSeconds }) {
  // remainingMs comes from the server; anchoring to the local clock avoids device clock skew.
  const endsAt = useMemo(() => Date.now() + remainingMs, [remainingMs]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const seconds = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const percent = Math.min(100, (seconds / totalSeconds) * 100);
  const urgent = seconds <= URGENT_SECONDS;

  return (
    <div className={`ei-countdown ${urgent ? 'urgent' : ''}`}>
      <span className="ei-countdown-text">⏱️ {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
      <div className="ei-countdown-bar">
        <div className="ei-countdown-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

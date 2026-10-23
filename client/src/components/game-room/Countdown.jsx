import React, { useState, useEffect, useMemo } from 'react';

const URGENT_SECONDS = 10;

// running=false freezes the display (e.g. while an answer is being checked).
export default function Countdown({ remainingMs, totalSeconds, running = true }) {
  // remainingMs comes from the server; anchoring to the local clock avoids device clock skew.
  const endsAt = useMemo(() => Date.now() + remainingMs, [remainingMs]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  const ms = running ? endsAt - now : remainingMs;
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const percent = Math.min(100, (seconds / totalSeconds) * 100);
  const urgent = running && seconds <= URGENT_SECONDS;

  return (
    <div className={`gr-countdown ${urgent ? 'urgent' : ''} ${running ? '' : 'paused'}`}>
      <span className="gr-countdown-text">{running ? '⏱️' : '⏸️'} {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
      <div className="gr-countdown-bar">
        <div className="gr-countdown-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

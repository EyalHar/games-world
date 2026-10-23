import React from 'react';

const PODIUM_ORDER = [1, 0, 2];
const MEDALS = ['🥇', '🥈', '🥉'];

// ranked: [{ id, name, score }] sorted by score, highest first.
export default function Podium({ ranked }) {
  if (ranked.length < 2) return null;
  return (
    <div className="gr-podium">
      {PODIUM_ORDER.filter(i => ranked[i]).map(i => (
        <div key={ranked[i].id} className={`gr-podium-step place-${i + 1}`}>
          <span className="gr-podium-name">{ranked[i].name}</span>
          <span className="gr-podium-score">{ranked[i].score}</span>
          <div className="gr-podium-block">{MEDALS[i]}</div>
        </div>
      ))}
    </div>
  );
}

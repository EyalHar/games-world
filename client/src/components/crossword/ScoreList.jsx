import React from 'react';

export default function ScoreList({ state, colorOf }) {
  const currentId = state.turn?.playerId;
  return (
    <ul className="cw-scores">
      {state.players.map(p => (
        <li
          key={p.id}
          className={`cw-score ${p.id === currentId ? 'current' : ''} ${state.myPlayerIds.includes(p.id) ? 'me' : ''} ${p.connected ? '' : 'offline'}`}
        >
          <span className={`cw-swatch p${colorOf(p.id)}`} />
          <span className="cw-score-name">{p.name}</span>
          <strong>{p.score}</strong>
        </li>
      ))}
    </ul>
  );
}

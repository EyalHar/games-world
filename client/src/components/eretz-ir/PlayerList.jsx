import React from 'react';

export default function PlayerList({ state, playerId }) {
  return (
    <div className="ei-players">
      <h4 className="ei-setting-title">👥 שחקנים ({state.players.length})</h4>
      <ul className="ei-player-list">
        {state.players.map(p => (
          <li key={p.id} className={`ei-player ${p.id === playerId ? 'me' : ''} ${p.connected ? '' : 'offline'}`}>
            <span className={`ei-dot ${p.connected ? 'on' : ''}`} />
            <span>{p.name}</span>
            {p.id === state.hostId && <span title="מנהל החדר">👑</span>}
            {p.id === playerId && <span className="ei-muted">(את/ה)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

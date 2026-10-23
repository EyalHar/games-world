import React from 'react';

export default function PlayerList({ state, playerId }) {
  return (
    <div className="gr-players">
      <h4 className="gr-setting-title">👥 שחקנים ({state.players.length})</h4>
      <ul className="gr-player-list">
        {state.players.map(p => (
          <li key={p.id} className={`gr-player ${p.id === playerId ? 'me' : ''} ${p.connected ? '' : 'offline'}`}>
            <span className={`gr-dot ${p.connected ? 'on' : ''}`} />
            <span>{p.name}</span>
            {p.id === state.hostId && <span title="מנהל החדר">👑</span>}
            {p.id === playerId && <span className="gr-muted">(את/ה)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

import React from 'react';

export const formatTime = ms => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function StatusBar({ game, fishLeft, elapsedMs, mode, setMode, onHint, onNewGame }) {
  const over = game.status === 'won' || game.status === 'lost';
  const hearts = Array.from({ length: game.maxHearts }, (_, i) => i < game.hearts);

  return (
    <div className="fh-status">
      <div className="fh-status-group">
        <span className="fh-hearts" aria-label={`${game.hearts} לבבות`}>
          {hearts.map((full, i) => <span key={i} className={`fh-heart ${full ? '' : 'lost'}`}>{full ? '❤️' : '🤍'}</span>)}
        </span>
        <span className="fh-counter" title="דגים שעוד לא סומנו">🐟 {fishLeft}</span>
        <span className="fh-counter">⏱️ {formatTime(elapsedMs)}</span>
      </div>

      <button className="fh-new-game" onClick={onNewGame} aria-label="משחק חדש" title="משחק חדש">
        {game.status === 'won' ? '😎' : game.status === 'lost' ? '🐡' : '🐠'}
      </button>

      <div className="fh-status-group">
        <div className="fh-mode" role="group" aria-label="מצב לחיצה">
          <button className={mode === 'open' ? 'active' : ''} onClick={() => setMode('open')}>🌊 פתיחה</button>
          <button className={mode === 'flag' ? 'active' : ''} onClick={() => setMode('flag')}>🎣 חכה</button>
        </div>
        <button className="btn-hint fh-hint-btn" onClick={onHint} disabled={over}>💡 רמז</button>
      </div>
    </div>
  );
}

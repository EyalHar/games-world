import React from 'react';
import { formatTime } from './StatusBar';

const SWIMMERS = ['🐠', '🐟', '🐡', '🐠', '🐟', '🦈', '🐙', '🐠'];

export default function EndBanner({ game, result, elapsedMs, onNewGame }) {
  const won = game.status === 'won';
  return (
    <div className={`fh-end ${won ? 'won' : 'lost'}`}>
      {won && (
        <div className="fh-swimmers" aria-hidden>
          {SWIMMERS.map((f, i) => <span key={i} className="fh-swimmer">{f}</span>)}
        </div>
      )}
      <div className="fh-end-card">
        <div className="fh-end-icon">{won ? '🎉' : '🌊'}</div>
        <h2 className="fh-end-title">{won ? 'מצאת את כל הדגים!' : 'הדגים ברחו...'}</h2>
        <p className="fh-end-text">
          {won
            ? `זמן: ${formatTime(elapsedMs)}${game.hintsUsed ? ` · ${game.hintsUsed} רמזים` : ''}`
            : 'לא נורא, כל משחק מלמד משהו. ננסה שוב?'}
        </p>
        {result?.newRecord && <p className="fh-record">🏆 שיא חדש!</p>}
        {won && game.hintsUsed > 0 && <p className="fh-end-note">משחק עם רמזים לא נכנס לטבלת השיאים</p>}
        <button className="btn-primary" onClick={onNewGame}>{won ? 'עוד משחק ▶' : 'עוד פעם 🔄'}</button>
      </div>
    </div>
  );
}

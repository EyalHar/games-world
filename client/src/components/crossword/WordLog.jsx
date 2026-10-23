import React from 'react';

export default function WordLog({ state, colorOf }) {
  const nameOf = id => state.players.find(p => p.id === id)?.name ?? 'שחקן שיצא';
  const placed = state.words.slice(1).reverse();

  return (
    <div className="cw-log">
      <h3 className="gr-section-title">📜 המילים שעל הלוח</h3>
      <ul className="cw-log-list">
        {placed.map(w => (
          <li key={w.id} className="cw-log-item">
            <div className="cw-log-head">
              <span className={`cw-swatch p${colorOf(w.playerId)}`} />
              <strong className="cw-log-word">{w.text}</strong>
              {w.relatedTo && <span className="gr-muted">← {w.relatedTo}</span>}
              <span className="cw-log-points">+{w.points}</span>
            </div>
            <p className="cw-log-reason">
              {nameOf(w.playerId)}{w.reason ? ` · ${w.reason}` : ''}
            </p>
            {w.explanation && <p className="cw-log-explanation">💬 "{w.explanation}"</p>}
            {(w.breakdown?.multiCross > 0 || w.breakdown?.firstWord > 0) && (
              <div className="cw-log-bonuses">
                {w.breakdown.multiCross > 0 && <span className="cw-bonus">✖️ חוצה כמה מילים +{w.breakdown.multiCross}</span>}
                {w.breakdown.firstWord > 0 && <span className="cw-bonus">⭐ קשורה למילה הראשונה +{w.breakdown.firstWord}</span>}
              </div>
            )}
          </li>
        ))}
        <li className="cw-log-item first">
          <div className="cw-log-head">
            <span className="cw-swatch first" />
            <strong className="cw-log-word">{state.words[0]?.text}</strong>
            <span className="gr-muted">המילה הראשונה</span>
          </div>
        </li>
      </ul>
    </div>
  );
}

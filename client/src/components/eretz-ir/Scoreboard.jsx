import React from 'react';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Scoreboard({ state, playerId }) {
  const ranked = [...state.players].sort((a, b) => b.total - a.total);

  return (
    <div className="ei-scoreboard">
      <h3 className="gr-section-title">📊 לוח הנקודות</h3>
      <div className="gr-table-wrap">
        <table className="gr-table">
          <thead>
            <tr>
              <th />
              <th className="gr-table-name">שחקן</th>
              {state.history.map(h => (
                <th key={h.round} className={h.isBonus ? 'bonus' : ''} title={`סיבוב ${h.round}`}>{h.letter}</th>
              ))}
              <th>סה״כ</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr key={p.id} className={p.id === playerId ? 'me' : ''}>
                <td>{p.total > 0 ? MEDALS[i] : ''}</td>
                <td className="gr-table-name">{p.name}</td>
                {state.history.map(h => <td key={h.round}>{h.scores[p.id] ?? '–'}</td>)}
                <td className="gr-table-total">{p.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

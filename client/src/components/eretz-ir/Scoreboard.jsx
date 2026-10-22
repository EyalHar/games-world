import React from 'react';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Scoreboard({ state, playerId }) {
  const ranked = [...state.players].sort((a, b) => b.total - a.total);

  return (
    <div className="ei-scoreboard">
      <h3 className="ei-section-title">📊 לוח הנקודות</h3>
      <div className="ei-table-wrap">
        <table className="ei-table">
          <thead>
            <tr>
              <th />
              <th className="ei-table-name">שחקן</th>
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
                <td className="ei-table-name">{p.name}</td>
                {state.history.map(h => <td key={h.round}>{h.scores[p.id] ?? '–'}</td>)}
                <td className="ei-table-total">{p.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

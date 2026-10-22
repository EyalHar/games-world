import React, { useEffect, useRef } from 'react';
import Scoreboard from './Scoreboard';
import { useSound } from '../../hooks/useSound';

const PODIUM_ORDER = [1, 0, 2];

export default function GameOver({ state, playerId, isHost, send, onLeave }) {
  const { playCelebration } = useSound();
  const ranked = [...state.players].sort((a, b) => b.total - a.total);
  const topScore = ranked[0]?.total ?? 0;
  const winners = ranked.filter(p => p.total === topScore);

  const celebrated = useRef(false);
  useEffect(() => {
    if (celebrated.current) return;
    celebrated.current = true;
    playCelebration();
  });

  return (
    <div className="ei-card wide">
      <div className="ei-icon">🏆</div>
      <h2 className="ei-title">
        {winners.length > 1 ? 'תיקו!' : `${winners[0]?.name} ניצח/ה!`}
      </h2>
      {winners.length > 1 && <p className="ei-subtitle">{winners.map(w => w.name).join(' ו')} עם {topScore} נקודות</p>}

      {ranked.length > 1 && (
        <div className="ei-podium">
          {PODIUM_ORDER.filter(i => ranked[i]).map(i => (
            <div key={ranked[i].id} className={`ei-podium-step place-${i + 1}`}>
              <span className="ei-podium-name">{ranked[i].name}</span>
              <span className="ei-podium-score">{ranked[i].total}</span>
              <div className="ei-podium-block">{['🥇', '🥈', '🥉'][i]}</div>
            </div>
          ))}
        </div>
      )}

      <Scoreboard state={state} playerId={playerId} />

      <div className="ei-host-actions">
        {isHost
          ? <button className="btn-primary" onClick={() => send('newGame')}>משחק חדש 🔄</button>
          : <p className="ei-waiting">מנהל החדר יכול להתחיל משחק חדש</p>}
        <button className="btn-secondary" onClick={onLeave}>יציאה</button>
      </div>
    </div>
  );
}

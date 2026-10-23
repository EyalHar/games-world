import React, { useEffect, useRef } from 'react';
import Scoreboard from './Scoreboard';
import Podium from '../game-room/Podium';
import { useSound } from '../../hooks/useSound';

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
    <div className="gr-card wide">
      <div className="gr-icon">🏆</div>
      <h2 className="gr-title">
        {winners.length > 1 ? 'תיקו!' : `${winners[0]?.name} ניצח/ה!`}
      </h2>
      {winners.length > 1 && <p className="gr-subtitle">{winners.map(w => w.name).join(' ו')} עם {topScore} נקודות</p>}

      <Podium ranked={ranked.map(p => ({ id: p.id, name: p.name, score: p.total }))} />

      <Scoreboard state={state} playerId={playerId} />

      <div className="gr-actions">
        {isHost
          ? <button className="btn-primary" onClick={() => send('newGame')}>משחק חדש 🔄</button>
          : <p className="gr-waiting">מנהל החדר יכול להתחיל משחק חדש</p>}
        <button className="btn-secondary" onClick={onLeave}>יציאה</button>
      </div>
    </div>
  );
}

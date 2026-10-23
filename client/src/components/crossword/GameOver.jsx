import React, { useEffect, useRef, useCallback } from 'react';
import Podium from '../game-room/Podium';
import CrosswordBoard from './CrosswordBoard';
import WordLog from './WordLog';
import { useSound } from '../../hooks/useSound';

const END_REASONS = {
  stuck: 'אף שחקן לא הצליח להניח מילה בסבב שלם',
  host: 'מנהל החדר סיים את המשחק',
};

export default function GameOver({ state, config, isHost, send, onLeave }) {
  const { playCelebration } = useSound();
  const celebrated = useRef(false);
  useEffect(() => {
    if (celebrated.current) return;
    celebrated.current = true;
    playCelebration();
  });

  const colorOf = useCallback(id => Math.max(0, state.players.findIndex(p => p.id === id)) % 6, [state.players]);
  const ranked = [...state.players].sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score ?? 0;
  const winners = ranked.filter(p => p.score === top);

  return (
    <div className="cw-gameover">
      <div className="gr-card wide">
        <div className="gr-icon">🏆</div>
        <h2 className="gr-title">{winners.length > 1 ? 'תיקו!' : `${winners[0]?.name} ניצח/ה!`}</h2>
        <p className="gr-subtitle">{END_REASONS[state.endReason]} · {state.words.length} מילים על הלוח</p>
        <Podium ranked={ranked} />
        <div className="gr-actions">
          {isHost
            ? <button className="btn-primary" onClick={() => send('newGame')}>משחק חדש 🔄</button>
            : <p className="gr-waiting">מנהל החדר יכול להתחיל משחק חדש</p>}
          <button className="btn-secondary" onClick={onLeave}>יציאה</button>
        </div>
      </div>

      <div className="cw-layout">
        <div className="cw-board-col">
          <CrosswordBoard words={state.words} size={config.boardSize} colorOf={colorOf} interactive={false} />
        </div>
        <WordLog state={state} colorOf={colorOf} />
      </div>
    </div>
  );
}

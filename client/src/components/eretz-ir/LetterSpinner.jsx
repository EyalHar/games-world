import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSound } from '../../hooks/useSound';

const TICK_MS = 111;

export default function LetterSpinner({ state, playerId, send }) {
  const { round, players, phase } = state;
  const { playClick, playSuccess } = useSound();
  const [idx, setIdx] = useState(0);
  const [stopping, setStopping] = useState(false);

  const isStopper = round.stopperId === playerId;
  const stopperName = players.find(p => p.id === round.stopperId)?.name;
  const spinning = phase === 'spinning' && !stopping;
  const pool = round.pool || [];

  useEffect(() => {
    if (!spinning || !pool.length) return;
    const t = setInterval(() => setIdx(i => (i + 1) % pool.length), TICK_MS);
    return () => clearInterval(t);
  }, [spinning, pool.length]);

  const prevPhase = useRef(phase);
  useEffect(() => {
    if (phase === 'reveal' && prevPhase.current !== 'reveal') playSuccess();
    prevPhase.current = phase;
  });

  const stop = useCallback(async () => {
    if (!isStopper || !spinning) return;
    setStopping(true);
    playClick();
    const res = await send('stopLetter', { letter: pool[idx % pool.length] });
    if (!res.ok) setStopping(false);
  }, [isStopper, spinning, pool, idx, send, playClick]);

  useEffect(() => {
    const onKey = e => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      stop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stop]);

  const letter = phase === 'reveal' ? round.letter : pool[idx % pool.length];

  return (
    <div className="ei-spinner-screen">
      <p className="ei-round-label">סיבוב {round.number}</p>

      {round.bonusStart && phase === 'spinning' && (
        <div className="ei-bonus-banner">
          🔥 שלב הבונוס! אותיות למומחים — ניקוד כפול 🔥
        </div>
      )}

      <button
        className={`ei-letter-box ${isStopper && spinning ? 'clickable' : ''} ${phase === 'reveal' ? 'revealed' : ''} ${round.isBonus ? 'bonus' : ''}`}
        onClick={stop}
        disabled={!isStopper || !spinning}
        aria-label="עצירת האות"
      >
        {letter}
      </button>

      <p className="ei-spinner-hint">
        {phase === 'reveal'
          ? `האות היא ${round.letter}! מתכוננים...`
          : isStopper
            ? '✋ התור שלך! לחיצה על הריבוע או על מקש הרווח עוצרת את האות'
            : `התור של ${stopperName} לעצור את האות...`}
      </p>
    </div>
  );
}

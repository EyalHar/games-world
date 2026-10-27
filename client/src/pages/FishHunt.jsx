import React, { useState } from 'react';
import { useFishGame } from '../hooks/useFishGame';
import { flagsPlaced } from '../utils/fish/engine';
import OptionsBar from '../components/fish/OptionsBar';
import StatusBar from '../components/fish/StatusBar';
import FishBoard from '../components/fish/FishBoard';
import EndBanner from '../components/fish/EndBanner';
import StatsCard from '../components/fish/StatsCard';
import './FishHunt.css';

const BUBBLES = Array.from({ length: 12 }, (_, i) => i);

const HINT_ICONS = { safe: '💡', fish: '🎣', wrongFlag: '⚠️', start: '👆', guess: '🤔' };

function HintBubble({ hint, onClose }) {
  return (
    <div className={`fh-hint fh-hint-${hint.kind}`} role="status">
      <span className="fh-hint-icon">{HINT_ICONS[hint.kind]}</span>
      <p>{hint.text}</p>
      <button className="fh-hint-close" onClick={onClose} aria-label="סגירת הרמז">✕</button>
    </div>
  );
}

export default function FishHunt() {
  const { settings, game, hint, result, stats, elapsedMs, act, newGame, changeSetting, askHint, closeHint } = useFishGame();
  const [mode, setMode] = useState('open');
  const over = game.status === 'won' || game.status === 'lost';

  return (
    <div className="fh-page">
      <div className="fh-bubbles" aria-hidden>
        {BUBBLES.map(i => <span key={i} className={`fh-bubble b${i}`} />)}
      </div>

      <header className="fh-header">
        <h1 className="fh-title"><span className="fh-title-emoji" aria-hidden>🐠</span> <span className="fh-title-text">דגים במחבוא</span></h1>
        <p className="fh-subtitle">
          הדגים מתחבאים מתחת לגלים. פתחו משבצות של מים ריקים, וסמנו כל דג בחכה. המספר אומר כמה דגים מסתתרים מסביב.
        </p>
      </header>

      <OptionsBar settings={settings} onChange={changeSetting} />

      <div className="fh-game">
        <StatusBar
          game={game}
          fishLeft={game.fishCount - flagsPlaced(game)}
          elapsedMs={elapsedMs}
          mode={mode}
          setMode={setMode}
          onHint={askHint}
          onNewGame={() => newGame()}
        />
        {hint && <HintBubble hint={hint} onClose={closeHint} />}
        {game.status === 'playing' && game.guaranteed === false && settings.noGuess && (
          <p className="fh-note">הפעם לא נמצא לוח שבטוח אפשר לפתור בלי לנחש, אז ייתכן שתצטרכו לנחש.</p>
        )}
        <div className="fh-board-area">
          <FishBoard game={game} hint={hint} mode={mode} onAct={act} />
          {over && <EndBanner game={game} result={result} elapsedMs={elapsedMs} onNewGame={() => newGame()} />}
        </div>
        <p className="fh-help">
          מחשב: קליק לפתיחה, קליק ימני לחכה. טלפון: נגיעה לפתיחה, לחיצה ארוכה לחכה.
          לחיצה על מספר שכל החכות שלו במקום פותחת את כל השכנים.
        </p>
      </div>

      <StatsCard stats={stats} />
    </div>
  );
}

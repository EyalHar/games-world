import React, { useState } from 'react';
import RoomCode from '../game-room/RoomCode';
import SettingsPanel from './SettingsPanel';

export default function Lobby({ state, config, isHost, send, onLeave }) {
  const [showSettings, setShowSettings] = useState(false);
  const [localName, setLocalName] = useState('');
  const [error, setError] = useState('');
  const mine = state.myPlayerIds;

  const run = async (event, payload) => {
    const res = await send(event, payload);
    setError(res.ok ? '' : res.error);
    return res;
  };

  const addLocal = async () => {
    if (!localName.trim()) return;
    const res = await run('addLocalPlayer', { name: localName.trim() });
    if (res.ok) setLocalName('');
  };

  return (
    <div className="gr-card wide">
      <div className="gr-icon">🧩</div>
      <h2 className="gr-title">תשבץ אסוציאציות</h2>

      <RoomCode code={state.code} lanAddresses={config.lanAddresses} path="/crossword" />

      <div className="gr-players">
        <h4 className="gr-setting-title">👥 שחקנים ({state.players.length}) — זה סדר התורות</h4>
        <ul className="gr-player-list">
          {state.players.map((p, i) => (
            <li key={p.id} className={`gr-player ${mine.includes(p.id) ? 'me' : ''} ${p.connected ? '' : 'offline'}`}>
              <span className={`cw-swatch p${i % 6}`} />
              <span>{p.name}</span>
              {p.id === state.hostId && <span title="מנהל החדר">👑</span>}
              {mine.includes(p.id) && mine.length > 1 && (
                <button className="cw-remove-player" onClick={() => run('removeLocalPlayer', { playerId: p.id })} aria-label={`הסרת ${p.name}`}>✕</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="cw-add-local">
        <p className="gr-muted">משחקים כמה אנשים על המכשיר הזה? הוסיפו אותם כאן, והמכשיר יעבור מיד ליד בתורות.</p>
        <div className="cw-add-local-row">
          <input
            className="gr-input"
            value={localName}
            onChange={e => setLocalName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addLocal()}
            placeholder="שם של שחקן נוסף"
            maxLength={16}
          />
          <button className="btn-secondary" onClick={addLocal} disabled={!localName.trim()}>➕ הוספה</button>
        </div>
      </div>

      {isHost && !state.judgeAvailable && (
        <p className="gr-warning">
          ⚠️ השופט האוטומטי לא מוגדר (חסר GEMINI_API_KEY בשרת). כל מילה תאושר בהצבעה של שאר השחקנים.
        </p>
      )}

      <button className="gr-link-btn" onClick={() => setShowSettings(s => !s)}>
        ⚙️ {showSettings ? 'הסתרת ההגדרות' : isHost ? 'הגדרות המשחק' : 'צפייה בהגדרות'}
      </button>
      {showSettings && (
        <SettingsPanel
          config={config}
          settings={state.settings}
          readOnly={!isHost}
          onChange={(key, value) => run('updateSettings', { settings: { [key]: value } })}
        />
      )}

      {error && <p className="gr-error">{error}</p>}

      {isHost
        ? <button className="btn-primary" onClick={() => run('startGame')}>התחלת המשחק ▶</button>
        : <p className="gr-waiting">ממתינים שמנהל החדר יתחיל את המשחק...</p>}

      <button className="gr-link-btn subtle" onClick={onLeave}>יציאה מהחדר</button>
    </div>
  );
}

import React, { useState } from 'react';
import SettingsPanel from './SettingsPanel';
import PlayerList from './PlayerList';
import RoomCode from '../game-room/RoomCode';

export default function Lobby({ state, config, playerId, isHost, send, onLeave }) {
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');

  const changeSetting = async (key, value) => {
    const res = await send('updateSettings', { settings: { [key]: value } });
    setError(res.ok ? '' : res.error);
  };

  const start = async () => {
    const res = await send('startGame');
    if (!res.ok) setError(res.error);
  };

  return (
    <div className="gr-card wide">
      <div className="gr-icon">🌍</div>
      <h2 className="gr-title">חדר המשחק</h2>

      <RoomCode code={state.code} lanAddresses={config.lanAddresses} path="/eretz-ir" />

      <PlayerList state={state} playerId={playerId} />

      {isHost && !state.checkerAvailable && (
        <p className="gr-warning">
          ⚠️ הבדיקה האוטומטית לא מוגדרת (חסר GEMINI_API_KEY בשרת). כל התשובות שמתחילות באות הנכונה יתקבלו,
          ואפשר יהיה לפסול תשובות בהצבעה.
        </p>
      )}

      <button className="gr-link-btn" onClick={() => setShowSettings(s => !s)}>
        ⚙️ {showSettings ? 'הסתרת ההגדרות' : isHost ? 'הגדרות המשחק' : 'צפייה בהגדרות'}
      </button>

      {showSettings && (
        <SettingsPanel config={config} settings={state.settings} readOnly={!isHost} onChange={changeSetting} />
      )}

      {error && <p className="gr-error">{error}</p>}

      {isHost
        ? <button className="btn-primary" onClick={start}>התחלת המשחק ▶</button>
        : <p className="gr-waiting">ממתינים שמנהל החדר יתחיל את המשחק...</p>}

      <button className="gr-link-btn subtle" onClick={onLeave}>יציאה מהחדר</button>
    </div>
  );
}

import React, { useState } from 'react';
import SettingsPanel from './SettingsPanel';
import PlayerList from './PlayerList';

function shareLinks(lanAddresses, code) {
  const port = window.location.port ? `:${window.location.port}` : '';
  const hosts = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? lanAddresses
    : [window.location.hostname];
  return hosts.map(h => `http://${h}${port}/eretz-ir?room=${code}`);
}

export default function Lobby({ state, config, playerId, isHost, send, onLeave }) {
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');
  const links = shareLinks(config.lanAddresses, state.code);

  const copy = async link => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(link);
      setTimeout(() => setCopied(''), 1500);
    } catch {}
  };

  const changeSetting = async (key, value) => {
    const res = await send('updateSettings', { settings: { [key]: value } });
    setError(res.ok ? '' : res.error);
  };

  const start = async () => {
    const res = await send('startGame');
    if (!res.ok) setError(res.error);
  };

  return (
    <div className="ei-card wide">
      <div className="ei-icon">🌍</div>
      <h2 className="ei-title">חדר המשחק</h2>

      <div className="ei-room-code">
        <span className="ei-muted">קוד החדר</span>
        <span className="ei-room-code-value">{state.code}</span>
      </div>

      {links.length > 0 && (
        <div className="ei-share">
          <p className="ei-muted">חברים באותה רשת ביתית יכולים להיכנס בקישור:</p>
          {links.map(link => (
            <button key={link} className="ei-share-link" onClick={() => copy(link)} dir="ltr">
              {copied === link ? '✓ הועתק!' : link}
            </button>
          ))}
        </div>
      )}

      <PlayerList state={state} playerId={playerId} />

      {isHost && !state.checkerAvailable && (
        <p className="ei-warning">
          ⚠️ הבדיקה האוטומטית לא מוגדרת (חסר GEMINI_API_KEY בשרת). כל התשובות שמתחילות באות הנכונה יתקבלו,
          ואפשר יהיה לפסול תשובות בהצבעה.
        </p>
      )}

      <button className="ei-link-btn" onClick={() => setShowSettings(s => !s)}>
        ⚙️ {showSettings ? 'הסתרת ההגדרות' : isHost ? 'הגדרות המשחק' : 'צפייה בהגדרות'}
      </button>

      {showSettings && (
        <SettingsPanel config={config} settings={state.settings} readOnly={!isHost} onChange={changeSetting} />
      )}

      {error && <p className="ei-error">{error}</p>}

      {isHost
        ? <button className="btn-primary" onClick={start}>התחלת המשחק ▶</button>
        : <p className="ei-waiting">ממתינים שמנהל החדר יתחיל את המשחק...</p>}

      <button className="ei-link-btn subtle" onClick={onLeave}>יציאה מהחדר</button>
    </div>
  );
}

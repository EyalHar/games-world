import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrosswordRoom } from '../hooks/useCrosswordRoom';
import Stars from '../components/Stars';
import EntryScreen from '../components/game-room/EntryScreen';
import StatusCard from '../components/game-room/StatusCard';
import Lobby from '../components/crossword/Lobby';
import PlayingView from '../components/crossword/PlayingView';
import GameOver from '../components/crossword/GameOver';
import '../components/game-room/GameRoom.css';
import './Crossword.css';

function GameBar({ state, onLeave }) {
  const mine = state.players.filter(p => state.myPlayerIds.includes(p.id));
  return (
    <div className="gr-game-bar">
      <span className="gr-game-bar-name">{mine.map(p => p.name).join(' · ')}</span>
      <span className="gr-game-bar-code">חדר {state.code}</span>
      <button className="gr-link-btn subtle" onClick={onLeave}>יציאה</button>
    </div>
  );
}

export default function Crossword() {
  const room = useCrosswordRoom();
  const [params] = useSearchParams();
  const { config, configError, connected, state, session, send, createRoom, joinRoom, leaveRoom } = room;
  const inRoom = state && session;
  const isHost = inRoom && state.myPlayerIds.includes(state.hostId);
  const props = { state, config, send, isHost, onLeave: leaveRoom };

  let content;
  if (configError) {
    content = (
      <StatusCard icon="⚠️" title="אין חיבור לשרת">
        <p className="gr-muted">ודאו שהשרת פועל: cd server && npm run dev</p>
      </StatusCard>
    );
  } else if (!config) {
    content = <StatusCard icon="⏳" title="טוען..."><div className="gr-loader" /></StatusCard>;
  } else if (!inRoom) {
    content = (
      <EntryScreen
        icon="🧩"
        title="תשבץ אסוציאציות"
        subtitle="מניחים מילים על הלוח, וכל מילה חייבת להיות קשורה למילה שכבר שם"
        initialCode={params.get('room')}
        onCreate={createRoom}
        onJoin={joinRoom}
        practice={{ desc: 'בלי שעון ועם רמזים, כדי ללמוד את המשחק' }}
      />
    );
  } else if (state.phase === 'lobby') {
    content = <Lobby {...props} />;
  } else if (state.phase === 'playing') {
    content = <PlayingView {...props} />;
  } else {
    content = <GameOver {...props} />;
  }

  return (
    <div className="gr-page cw-page">
      <Stars />
      {config && !connected && <div className="gr-offline-banner">🔌 מתחברים מחדש לשרת...</div>}
      {inRoom && state.phase === 'playing' && <GameBar state={state} onLeave={leaveRoom} />}
      {content}
    </div>
  );
}

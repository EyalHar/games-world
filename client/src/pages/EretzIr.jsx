import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEretzIrRoom } from '../hooks/useEretzIrRoom';
import Stars from '../components/Stars';
import EntryScreen from '../components/eretz-ir/EntryScreen';
import Lobby from '../components/eretz-ir/Lobby';
import LetterSpinner from '../components/eretz-ir/LetterSpinner';
import Board from '../components/eretz-ir/Board';
import RoundResults from '../components/eretz-ir/RoundResults';
import GameOver from '../components/eretz-ir/GameOver';
import './EretzIr.css';

function StatusCard({ icon, title, children }) {
  return (
    <div className="ei-card">
      <div className="ei-icon">{icon}</div>
      <h2 className="ei-title small">{title}</h2>
      {children}
    </div>
  );
}

function GameBar({ state, playerId, onLeave }) {
  const me = state.players.find(p => p.id === playerId);
  return (
    <div className="ei-game-bar">
      <span className="ei-game-bar-score">⭐ {me?.total ?? 0}</span>
      <span className="ei-game-bar-name">{me?.name}</span>
      <span className="ei-game-bar-code">חדר {state.code}</span>
      <button className="ei-link-btn subtle" onClick={onLeave}>יציאה</button>
    </div>
  );
}

function PhaseView({ room }) {
  const { state, config, playerId, send, leaveRoom } = room;
  const props = { state, config, playerId, send, isHost: state.hostId === playerId, onLeave: leaveRoom };

  switch (state.phase) {
    case 'lobby':
      return <Lobby {...props} />;
    case 'spinning':
    case 'reveal':
      return <LetterSpinner key={state.round.number} {...props} />;
    case 'filling':
      return <Board key={state.round.number} {...props} />;
    case 'collecting':
    case 'checking':
      return (
        <StatusCard icon="🔍" title="בודקים את התשובות...">
          <div className="ei-loader" />
          <p className="ei-muted">השופט האוטומטי עובר על כל הלוחות</p>
        </StatusCard>
      );
    case 'review':
      return <RoundResults {...props} />;
    case 'gameOver':
      return <GameOver {...props} />;
    default:
      return null;
  }
}

export default function EretzIr() {
  const room = useEretzIrRoom();
  const [params] = useSearchParams();
  const { config, configError, connected, state, playerId, createRoom, joinRoom, leaveRoom } = room;
  const inRoom = state && playerId;
  const inGame = inRoom && state.phase !== 'lobby' && state.phase !== 'gameOver';

  let content;
  if (configError) {
    content = (
      <StatusCard icon="⚠️" title="אין חיבור לשרת">
        <p className="ei-muted">ודאו שהשרת פועל: cd server && npm run dev</p>
      </StatusCard>
    );
  } else if (!config) {
    content = <StatusCard icon="⏳" title="טוען..."><div className="ei-loader" /></StatusCard>;
  } else if (!inRoom) {
    content = <EntryScreen initialCode={params.get('room')} onCreate={createRoom} onJoin={joinRoom} />;
  } else {
    content = <PhaseView room={room} />;
  }

  return (
    <div className="ei-page">
      <Stars />
      {config && !connected && <div className="ei-offline-banner">🔌 מתחברים מחדש לשרת...</div>}
      {inGame && <GameBar state={state} playerId={playerId} onLeave={leaveRoom} />}
      {content}
    </div>
  );
}

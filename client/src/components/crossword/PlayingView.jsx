import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Countdown from '../game-room/Countdown';
import CrosswordBoard from './CrosswordBoard';
import TurnPanel from './TurnPanel';
import VotePanel from './VotePanel';
import ScoreList from './ScoreList';
import WordLog from './WordLog';
import EventToast from './EventToast';
import { buildBoard, checkPlacement } from '../../utils/crosswordRules';
import { useSound } from '../../hooks/useSound';

const EMPTY_DRAFT = { selected: null, dir: 'h', word: '', explanation: '' };

function WatchPanel({ state }) {
  const { turn, players } = state;
  const player = players.find(p => p.id === turn.playerId);
  if (player?.isBot) return (
    <div className="cw-panel bot">
      <div className="cw-bot-thinking">🤖</div>
      <p className="cw-panel-title">{player.name} חושב על מילה...</p>
    </div>
  );
  return (
    <div className="cw-panel">
      <p className="cw-panel-title">⏳ התור של {player?.name}</p>
      {turn.status === 'checking' && <p className="gr-muted">🔍 בודקים את "{turn.attempt?.text}"...</p>}
      {turn.status === 'voting' && <p className="gr-muted">🗳️ מצביעים על "{turn.attempt?.text}"...</p>}
      {turn.status === 'thinking' && turn.lastRejection && (
        <p className="gr-muted">❌ "{turn.lastRejection.text}" לא התקבלה: {turn.lastRejection.reason}</p>
      )}
    </div>
  );
}

export default function PlayingView({ state, config, isHost, send }) {
  const { turn, words, players, myPlayerIds } = state;
  const { playSuccess, playWrong, playHint } = useSound();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [zoomed, setZoomed] = useState(false);

  const myTurn = myPlayerIds.includes(turn.playerId);
  const player = players.find(p => p.id === turn.playerId);
  const turnKey = `${turn.playerId}-${words.length}`;
  const colorOf = useCallback(id => Math.max(0, players.findIndex(p => p.id === id)) % 6, [players]);

  useEffect(() => setDraft(EMPTY_DRAFT), [turnKey]);

  // Sound cues on transitions only, tracked with refs so re-renders don't replay them.
  const prev = useRef({ eventAt: state.lastEvent?.at, turnKey, rejection: turn.lastRejection?.text });
  useEffect(() => {
    if (state.lastEvent?.at !== prev.current.eventAt && state.lastEvent?.type === 'placed') playSuccess();
    if (turnKey !== prev.current.turnKey && myTurn) playHint();
    if (myTurn && turn.lastRejection && turn.lastRejection.text !== prev.current.rejection) playWrong();
    prev.current = { eventAt: state.lastEvent?.at, turnKey, rejection: turn.lastRejection?.text };
  });

  const board = useMemo(() => buildBoard(words, config.boardSize), [words, config.boardSize]);
  const check = useMemo(() => {
    if (!myTurn || !draft.selected || !draft.word.trim()) return null;
    return checkPlacement(board, words, { word: draft.word, row: draft.selected.r, col: draft.selected.c, dir: draft.dir });
  }, [myTurn, board, words, draft]);

  const preview = myTurn
    ? draft.selected && { text: draft.word.trim(), row: draft.selected.r, col: draft.selected.c, dir: draft.dir }
    : turn.attempt;

  const onCellClick = (r, c) => {
    setDraft(d => (d.selected?.r === r && d.selected?.c === c
      ? { ...d, dir: d.dir === 'h' ? 'v' : 'h' }
      : { ...d, selected: { r, c } }));
  };

  const amVoter = turn.status === 'voting' && turn.vote.voters.some(id => myPlayerIds.includes(id));
  const canPlace = myTurn && turn.status === 'thinking';

  return (
    <div className="cw-game">
      <EventToast state={state} />

      <div className="cw-top">
        <ScoreList state={state} colorOf={colorOf} />
        {state.practice ? (
          <span className="cw-practice-badge">🎯 אימון{state.hintsUsed > 0 && ` · 💡 ${state.hintsUsed} רמזים`}</span>
        ) : (
          <Countdown
            key={turnKey}
            remainingMs={turn.remainingMs}
            totalSeconds={state.settings.turnSeconds}
            running={turn.running}
          />
        )}
      </div>

      <div className="cw-layout">
        <div className="cw-board-col">
          <CrosswordBoard
            words={words}
            size={config.boardSize}
            colorOf={colorOf}
            selected={canPlace ? draft.selected : null}
            dir={draft.dir}
            preview={preview}
            check={check}
            highlightId={state.lastEvent?.wordId}
            interactive={canPlace}
            zoomed={zoomed}
            onCellClick={onCellClick}
          />
          <button className="gr-link-btn cw-zoom-btn" onClick={() => setZoomed(z => !z)}>
            {zoomed ? '🔍 הקטנת הלוח' : '🔍 הגדלת הלוח'}
          </button>
        </div>

        <div className="cw-side">
          {myTurn
            ? <TurnPanel key={turnKey} state={state} config={config} player={player} draft={draft} setDraft={setDraft} check={check} send={send} />
            : <WatchPanel state={state} />}
          {amVoter && <VotePanel state={state} send={send} />}
          <WordLog state={state} colorOf={colorOf} />
          {isHost && !state.practice && (
            <button className="gr-link-btn subtle" onClick={() => send('endGame')}>🏁 סיום המשחק</button>
          )}
        </div>
      </div>
    </div>
  );
}

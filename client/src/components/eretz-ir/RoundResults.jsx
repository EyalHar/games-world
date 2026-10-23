import React, { useState } from 'react';
import Scoreboard from './Scoreboard';
import DisputeBox from './DisputeBox';
import { startsWithLetter } from '../../utils/hebrew';

const MANUAL_REASONS = {
  'no-key': 'הבדיקה האוטומטית לא מוגדרת',
  error: 'הבדיקה האוטומטית לא הצליחה הפעם',
};

function AnswerItem({ answer, ownerId, catId, idx, ctx }) {
  const { state, playerId, send, nameOf, canDispute } = ctx;
  const disputeId = `${ownerId}|${catId}|${idx}`;
  const dispute = state.disputes.find(d => d.id === disputeId);
  const letterOk = startsWithLetter(answer.text, state.round.letter);

  const canAppeal = canDispute && !dispute && !answer.valid && ownerId === playerId && letterOk;
  const canChallenge = canDispute && !dispute && answer.valid && state.results.manual && ownerId !== playerId;
  const open = () => send('openDispute', { playerId: ownerId, catId, idx });

  return (
    <li className={`ei-answer ${answer.valid ? (answer.duplicate ? 'dup' : 'ok') : 'bad'}`}>
      <div className="ei-answer-main">
        <span className="ei-answer-mark">{answer.valid ? '✓' : '✗'}</span>
        <span className="ei-answer-text">{answer.text}</span>
        {answer.points > 0 && <span className="ei-points">+{answer.points}</span>}
        {answer.duplicate && <span className="ei-tag">כפול</span>}
        {canAppeal && <button className="ei-dispute-btn" onClick={open}>🙋 ערעור</button>}
        {canChallenge && <button className="ei-dispute-btn" onClick={open}>🤔 לפסול?</button>}
      </div>
      {!answer.valid && answer.reason && <p className="ei-answer-reason">{answer.reason}</p>}
      {dispute && <DisputeBox dispute={dispute} playerId={playerId} nameOf={nameOf} send={send} />}
    </li>
  );
}

export default function RoundResults({ state, config, playerId, isHost, send }) {
  const [error, setError] = useState('');
  const { round, results, players } = state;
  const categories = config.categories.filter(c => state.settings.categories.includes(c.id));
  const nameOf = id => players.find(p => p.id === id)?.name ?? '?';
  const otherConnected = players.some(p => p.connected && p.id !== playerId);
  const ctx = { state, playerId, send, nameOf, canDispute: otherConnected };
  const openDisputes = state.disputes.some(d => d.status === 'open');
  const roundScores = state.history.find(h => h.round === round.number)?.scores || {};
  const isLast = state.settings.rounds !== 'all' && round.number >= state.settings.rounds;

  const hostAction = async event => {
    const res = await send(event);
    setError(res.ok ? '' : res.error);
  };

  const orderedPlayers = [...players].sort((a, b) => (a.id === playerId ? -1 : b.id === playerId ? 1 : 0));

  return (
    <div className="ei-results-screen">
      <div className="ei-results-header">
        <div className={`ei-letter-badge ${round.isBonus ? 'bonus' : ''}`}>{round.letter}</div>
        <div>
          <h2 className="gr-title small">תוצאות סיבוב {round.number}</h2>
          <p className="gr-muted">
            {round.finishedBy ? `🏁 ${nameOf(round.finishedBy)} סיים/ה ראשון/ה` : '⏱️ נגמר הזמן'}
            {round.isBonus && ' · 🔥 ניקוד כפול'}
          </p>
        </div>
      </div>

      {results.manual && (
        <p className="gr-warning">
          ⚠️ {MANUAL_REASONS[results.manualReason]}, ולכן כל התשובות שמתחילות באות הנכונה התקבלו.
          אם תשובה של מישהו לא נראית לכם, לחצו "לפסול?" ותתקיים הצבעה.
        </p>
      )}

      <div className="ei-round-scores">
        {[...players].sort((a, b) => (roundScores[b.id] || 0) - (roundScores[a.id] || 0)).map(p => (
          <div key={p.id} className={`ei-round-score ${p.id === playerId ? 'me' : ''}`}>
            <span>{p.name}</span>
            <strong>+{roundScores[p.id] || 0}</strong>
          </div>
        ))}
      </div>

      <div className="ei-results-grid">
        {categories.map(c => (
          <div key={c.id} className="ei-result-cat">
            <h3 className="ei-board-cell-title">{c.emoji} {c.label}</h3>
            {orderedPlayers.map(p => {
              const list = results.byPlayer[p.id]?.[c.id] || [];
              return (
                <div key={p.id} className="ei-result-player">
                  <span className="ei-result-player-name">{p.name}</span>
                  {list.length ? (
                    <ul className="ei-answer-list">
                      {list.map((answer, idx) => (
                        <AnswerItem key={idx} answer={answer} ownerId={p.id} catId={c.id} idx={idx} ctx={ctx} />
                      ))}
                    </ul>
                  ) : <span className="gr-muted">—</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <Scoreboard state={state} playerId={playerId} />

      {error && <p className="gr-error">{error}</p>}

      {isHost ? (
        <div className="gr-actions">
          <button className="btn-primary" onClick={() => hostAction('nextRound')} disabled={openDisputes}>
            {isLast ? 'לתוצאות הסופיות 🏆' : 'סיבוב הבא ▶'}
          </button>
          {!isLast && <button className="btn-secondary" onClick={() => hostAction('endGame')}>סיום המשחק 🏁</button>}
          {openDisputes && <p className="gr-muted">ממתינים לסיום ההצבעות...</p>}
        </div>
      ) : (
        <p className="gr-waiting">ממתינים שמנהל החדר ימשיך...</p>
      )}
    </div>
  );
}

import React, { useState } from 'react';

export default function VotePanel({ state, send }) {
  const [error, setError] = useState('');
  const { turn, players, myPlayerIds } = state;
  const { vote, attempt, lastRejection } = turn;
  const nameOf = id => players.find(p => p.id === id)?.name ?? '?';
  const myVoters = vote.voters.filter(id => myPlayerIds.includes(id));
  const votes = Object.values(vote.votes);
  const yes = votes.filter(Boolean).length;

  const cast = async (playerId, approve) => {
    const res = await send('vote', { playerId, approve });
    setError(res.ok ? '' : res.error);
  };

  return (
    <div className="cw-panel vote">
      {vote.kind === 'appeal' ? (
        <p className="cw-panel-title">
          🙋 {nameOf(turn.playerId)} מערער/ת על "{attempt.text}"
        </p>
      ) : (
        <p className="cw-panel-title">
          🤔 {nameOf(turn.playerId)} הניח/ה "{attempt.text}". המילה קשורה למשהו על הלוח?
        </p>
      )}
      {vote.kind === 'appeal' && lastRejection && <p className="gr-muted">השופט אמר: {lastRejection.reason}</p>}
      <p className="gr-muted">{yes}/{vote.voters.length} בעד</p>

      {myVoters.map(id => (
        <div key={id} className="cw-vote-row">
          <span>{myVoters.length > 1 || myPlayerIds.length > 1 ? `${nameOf(id)}:` : 'ההצבעה שלך:'}</span>
          {id in vote.votes ? (
            <span className="gr-muted">{vote.votes[id] ? '👍 הצבעת בעד' : '👎 הצבעת נגד'}</span>
          ) : (
            <span className="gr-actions">
              <button className="cw-vote yes" onClick={() => cast(id, true)}>👍 לקבל</button>
              <button className="cw-vote no" onClick={() => cast(id, false)}>👎 לפסול</button>
            </span>
          )}
        </div>
      ))}
      {error && <p className="gr-error">{error}</p>}
    </div>
  );
}

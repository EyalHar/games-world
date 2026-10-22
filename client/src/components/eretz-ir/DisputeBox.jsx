import React from 'react';

export default function DisputeBox({ dispute, playerId, nameOf, send }) {
  const votes = Object.values(dispute.votes);
  const yes = votes.filter(Boolean).length;
  const canVote = dispute.status === 'open' && dispute.voters.includes(playerId) && !(playerId in dispute.votes);
  const label = dispute.kind === 'appeal' ? '🙋 ערעור' : `🤔 ${nameOf(dispute.initiatorId)} מבקש/ת לפסול`;

  if (dispute.status !== 'open') {
    const accepted = dispute.status === 'accepted';
    const text = dispute.kind === 'appeal'
      ? (accepted ? '✓ הערעור התקבל' : '✗ הערעור נדחה')
      : (accepted ? '✗ נפסלה בהצבעה' : '✓ נשארה בתוקף');
    return <div className={`ei-dispute closed ${accepted ? 'accepted' : 'rejected'}`}>{text}</div>;
  }

  return (
    <div className="ei-dispute">
      <span>{label} · {yes}/{dispute.voters.length} בעד</span>
      {canVote && (
        <span className="ei-vote-btns">
          <button className="ei-vote yes" onClick={() => send('vote', { disputeId: dispute.id, approve: true })}>👍 בעד</button>
          <button className="ei-vote no" onClick={() => send('vote', { disputeId: dispute.id, approve: false })}>👎 נגד</button>
        </span>
      )}
    </div>
  );
}

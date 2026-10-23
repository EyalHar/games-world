import React, { useState } from 'react';

export default function TurnPanel({ state, config, player, draft, setDraft, check, send }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { turn, settings } = state;
  const multiLocal = state.myPlayerIds.length > 1;
  const othersConnected = state.players.some(p => p.connected && p.id !== player.id);
  const rejection = turn.lastRejection;
  const canSubmit = !rejection || settings.retry;
  const canAppeal = rejection && !turn.appealed && othersConnected;

  const act = async (event, payload) => {
    setBusy(true);
    const res = await send(event, payload);
    setError(res.ok ? '' : res.error);
    setBusy(false);
    return res;
  };

  const submit = async () => {
    if (!draft.selected || !check?.ok) return;
    const res = await act('submitWord', {
      word: draft.word,
      row: draft.selected.r,
      col: draft.selected.c,
      dir: draft.dir,
      explanation: draft.explanation,
    });
    if (res.ok) setDraft(d => ({ ...d, explanation: '' }));
  };

  if (turn.status === 'checking') return (
    <div className="cw-panel">
      <div className="gr-loader" />
      <p className="cw-panel-title">🔍 בודקים את המילה "{turn.attempt?.text}"...</p>
    </div>
  );

  if (turn.status === 'voting') return (
    <div className="cw-panel">
      <p className="cw-panel-title">🗳️ שאר השחקנים מצביעים על "{turn.attempt?.text}"...</p>
    </div>
  );

  return (
    <div className="cw-panel mine">
      <p className="cw-panel-title">
        {multiLocal ? `✋ ${player.name}, התור שלך!` : '✋ התור שלך!'}
      </p>

      {rejection && (
        <div className="cw-rejection">
          <p>❌ "{rejection.text}" לא התקבלה: {rejection.reason}</p>
          <div className="gr-actions">
            {canAppeal && <button className="cw-appeal-btn" onClick={() => act('appeal')} disabled={busy}>🙋 ערעור — שהשחקנים יחליטו</button>}
            {!canSubmit && <span className="gr-muted">אין ניסיון נוסף בתור הזה</span>}
          </div>
        </div>
      )}

      {canSubmit && (
        <>
          <p className="gr-muted cw-hint">
            לחצו על המשבצת של <strong>האות הראשונה</strong> של המילה. לחיצה נוספת על אותה משבצת מחליפה כיוון.
          </p>

          <div className="cw-dir-toggle">
            <button className={`gr-pill ${draft.dir === 'h' ? 'active' : ''}`} onClick={() => setDraft(d => ({ ...d, dir: 'h' }))}>
              ← מאוזן
            </button>
            <button className={`gr-pill ${draft.dir === 'v' ? 'active' : ''}`} onClick={() => setDraft(d => ({ ...d, dir: 'v' }))}>
              ↓ מאונך
            </button>
          </div>

          <input
            className="gr-input"
            value={draft.word}
            onChange={e => setDraft(d => ({ ...d, word: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="המילה שלך"
            maxLength={config.boardSize}
            autoFocus
          />
          <input
            className="gr-input cw-explanation"
            value={draft.explanation}
            onChange={e => setDraft(d => ({ ...d, explanation: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="למה זה קשור? (לא חובה, עוזר לשופט)"
            maxLength={config.maxExplanationLength}
          />

          {draft.word.trim() && !draft.selected && <p className="cw-check">👆 בחרו משבצת על הלוח</p>}
          {draft.word.trim() && draft.selected && check && (
            <p className={`cw-check ${check.ok ? 'ok' : 'bad'}`}>{check.ok ? '✓ המילה נכנסת ללוח' : `✗ ${check.error}`}</p>
          )}
        </>
      )}

      {error && <p className="gr-error">{error}</p>}

      <div className="gr-actions">
        {canSubmit && (
          <button className="btn-primary" onClick={submit} disabled={busy || !check?.ok}>הנחת המילה ✔</button>
        )}
        <button className="btn-secondary" onClick={() => act('pass')} disabled={busy}>ויתור על התור</button>
      </div>
    </div>
  );
}

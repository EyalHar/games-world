import React, { useState, useEffect, useRef } from 'react';
import Countdown from './Countdown';
import { startsWithLetter } from '../../utils/hebrew';

const SYNC_DEBOUNCE_MS = 400;

function readDraft(key, categories) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    if (saved) return saved;
  } catch {}
  return Object.fromEntries(categories.map(c => [c.id, ['']]));
}

export default function Board({ state, config, send }) {
  const { round, settings, code } = state;
  const categories = config.categories.filter(c => settings.categories.includes(c.id));
  const draftKey = `eretzIrDraft-${code}-${round.number}`;

  const [answers, setAnswers] = useState(() => readDraft(draftKey, categories));
  const [error, setError] = useState('');
  const latest = useRef(answers);

  useEffect(() => {
    latest.current = answers;
    try { sessionStorage.setItem(draftKey, JSON.stringify(answers)); } catch {}
    const t = setTimeout(() => send('answers', { answers }), SYNC_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [answers, draftKey, send]);

  // The board unmounts when the round ends, so that's when the final answers go out.
  useEffect(() => () => {
    send('answers', { answers: latest.current, final: true });
    try { sessionStorage.removeItem(draftKey); } catch {}
  }, [draftKey, send]);

  const update = (catId, idx, value) => {
    setAnswers(a => ({ ...a, [catId]: a[catId].map((v, i) => (i === idx ? value : v)) }));
  };
  const addAnswer = catId => setAnswers(a => ({ ...a, [catId]: [...a[catId], ''] }));
  const removeAnswer = (catId, idx) => {
    setAnswers(a => ({ ...a, [catId]: a[catId].filter((_, i) => i !== idx) }));
  };

  const boardFull = categories.every(c => answers[c.id]?.some(v => v.trim()));

  const finish = async () => {
    const res = await send('finish', { answers });
    if (!res.ok) setError(res.error);
  };

  return (
    <div className="ei-board-screen">
      <div className="ei-board-header">
        <div className={`ei-letter-badge ${round.isBonus ? 'bonus' : ''}`}>{round.letter}</div>
        <div className="ei-board-header-info">
          <span className="ei-round-label">
            סיבוב {round.number}{round.isBonus && ' · 🔥 בונוס ×2'}
          </span>
          <Countdown remainingMs={round.remainingMs} totalSeconds={settings.roundSeconds} />
        </div>
      </div>

      <div className="ei-board">
        {categories.map(c => (
          <div key={c.id} className="ei-board-cell">
            <h3 className="ei-board-cell-title">{c.emoji} {c.label}</h3>
            {(answers[c.id] || []).map((value, idx) => (
              <div key={idx} className="ei-answer-row">
                <input
                  className={`ei-input ei-answer-input ${value.trim() && !startsWithLetter(value, round.letter) ? 'warn' : ''}`}
                  value={value}
                  onChange={e => update(c.id, idx, e.target.value)}
                  placeholder={`${round.letter}...`}
                  maxLength={30}
                />
                {idx > 0 && (
                  <button className="ei-remove-btn" onClick={() => removeAnswer(c.id, idx)} aria-label="מחיקת תשובה">✕</button>
                )}
              </div>
            ))}
            {(answers[c.id] || []).length < config.maxAnswersPerCategory && (
              <button className="ei-add-btn" onClick={() => addAnswer(c.id)}>+ עוד תשובה</button>
            )}
          </div>
        ))}
      </div>

      {error && <p className="ei-error">{error}</p>}

      <button className="btn-primary ei-finish-btn" onClick={finish} disabled={!boardFull}>
        🏁 סיימתי!
      </button>
      {!boardFull && <p className="ei-muted">אפשר ללחוץ "סיימתי" אחרי שממלאים תשובה בכל התחומים</p>}
    </div>
  );
}

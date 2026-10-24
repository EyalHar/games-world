import React, { useState } from 'react';

const MODE_HEADINGS = {
  create: { icon: '🏠', title: 'פתיחת חדר', action: 'פתיחת החדר ▶' },
  join: { icon: '🔑', title: 'הצטרפות לחדר', action: 'הצטרפות ▶' },
  practice: { icon: '🎯', title: 'אימון', action: 'בואו נתאמן ▶' },
};

// practice: optional { desc } — shows a solo-practice option that creates a room with { practice: true }.
export default function EntryScreen({ icon, title, subtitle, initialCode, onCreate, onJoin, practice }) {
  const [mode, setMode] = useState(initialCode ? 'join' : null);
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = name.trim() && (mode !== 'join' || code.trim().length === 4);

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError('');
    const n = name.trim();
    const res = mode === 'join'
      ? await onJoin(code.trim(), n)
      : await onCreate(n, mode === 'practice' ? { practice: true } : {});
    if (!res.ok) setError(res.error);
    setBusy(false);
  };

  const onKey = e => e.key === 'Enter' && submit();

  if (!mode) return (
    <div className="gr-card">
      <div className="gr-icon">{icon}</div>
      <h1 className="gr-title">{title}</h1>
      <p className="gr-subtitle">{subtitle}</p>
      <div className="gr-choice-btns">
        <button className="gr-choice" onClick={() => setMode('create')}>
          <span className="gr-choice-emoji">🏠</span>
          <span className="gr-choice-label">פתיחת חדר חדש</span>
          <span className="gr-choice-desc">תקבלו קוד לשתף עם החברים</span>
        </button>
        <button className="gr-choice" onClick={() => setMode('join')}>
          <span className="gr-choice-emoji">🔑</span>
          <span className="gr-choice-label">הצטרפות לחדר</span>
          <span className="gr-choice-desc">יש לכם קוד? הכניסו אותו כאן</span>
        </button>
        {practice && (
          <button className="gr-choice" onClick={() => setMode('practice')}>
            <span className="gr-choice-emoji">🎯</span>
            <span className="gr-choice-label">אימון לבד</span>
            <span className="gr-choice-desc">{practice.desc}</span>
          </button>
        )}
      </div>
    </div>
  );

  const heading = MODE_HEADINGS[mode];
  return (
    <div className="gr-card">
      <div className="gr-icon">{heading.icon}</div>
      <h2 className="gr-title">{heading.title}</h2>

      {mode === 'join' && (
        <input
          className="gr-input gr-code-input"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={onKey}
          placeholder="קוד החדר (4 ספרות)"
          inputMode="numeric"
          autoFocus={!initialCode}
        />
      )}

      <input
        className="gr-input"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={onKey}
        placeholder="איך קוראים לך?"
        maxLength={16}
        autoFocus={mode !== 'join' || Boolean(initialCode)}
      />

      {error && <p className="gr-error">{error}</p>}

      <button className="btn-primary" onClick={submit} disabled={!canSubmit || busy}>
        {heading.action}
      </button>
      <button className="gr-link-btn" onClick={() => { setMode(null); setError(''); }}>
        → חזרה
      </button>
    </div>
  );
}

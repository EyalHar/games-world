import React, { useState } from 'react';

export default function EntryScreen({ icon, title, subtitle, initialCode, onCreate, onJoin }) {
  const [mode, setMode] = useState(initialCode ? 'join' : null);
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = name.trim() && (mode === 'create' || code.trim().length === 4);

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError('');
    const res = mode === 'create' ? await onCreate(name.trim()) : await onJoin(code.trim(), name.trim());
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
      </div>
    </div>
  );

  return (
    <div className="gr-card">
      <div className="gr-icon">{mode === 'create' ? '🏠' : '🔑'}</div>
      <h2 className="gr-title">{mode === 'create' ? 'פתיחת חדר' : 'הצטרפות לחדר'}</h2>

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
        autoFocus={mode === 'create' || Boolean(initialCode)}
      />

      {error && <p className="gr-error">{error}</p>}

      <button className="btn-primary" onClick={submit} disabled={!canSubmit || busy}>
        {mode === 'create' ? 'פתיחת החדר ▶' : 'הצטרפות ▶'}
      </button>
      <button className="gr-link-btn" onClick={() => { setMode(null); setError(''); }}>
        → חזרה
      </button>
    </div>
  );
}

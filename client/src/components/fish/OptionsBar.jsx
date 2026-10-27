import React from 'react';
import { LEVELS } from '../../utils/fish/engine';

const LEVEL_NAMES = { easy: 'קלה', medium: 'בינונית', hard: 'קשה', expert: 'מומחים' };

export default function OptionsBar({ settings, onChange }) {
  return (
    <div className="fh-options">
      <div className="fh-pills" role="group" aria-label="רמה">
        {Object.entries(LEVELS).map(([key, { rows, cols, fish }]) => (
          <button
            key={key}
            className={`fh-pill ${settings.level === key ? 'active' : ''}`}
            onClick={() => onChange('level', key)}
            title={`${rows}×${cols}, ${fish} דגים`}
          >
            {LEVEL_NAMES[key]}
            <span className="fh-pill-sub">{rows}×{cols}</span>
          </button>
        ))}
      </div>
      <div className="fh-pills" role="group" aria-label="מצב משחק">
        <button className={`fh-pill ${settings.hearts === 3 ? 'active' : ''}`} onClick={() => onChange('hearts', 3)}>❤️❤️❤️ 3 לבבות</button>
        <button className={`fh-pill ${settings.hearts === 1 ? 'active' : ''}`} onClick={() => onChange('hearts', 1)}>❤️ קלאסי</button>
        <button
          className={`fh-pill ${settings.noGuess ? 'active' : ''}`}
          onClick={() => onChange('noGuess', !settings.noGuess)}
          aria-pressed={settings.noGuess}
          title="כל לוח אפשר לפתור בהיגיון, בלי לנחש"
        >
          {settings.noGuess ? '✅' : '⬜'} בלי ניחושים
        </button>
      </div>
    </div>
  );
}

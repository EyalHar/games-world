import React from 'react';
import OptionGroup from '../game-room/OptionGroup';

const SETTING_LABELS = {
  level: { title: '🎚️ רמה', values: { easy: '😊 קלה', medium: '🤓 בינונית', hard: '🔥 קשה' } },
  turnSeconds: { title: '⏱️ זמן לתור', values: { 30: '30 שניות', 60: 'דקה', 90: 'דקה וחצי', 120: '2 דקות' } },
  retry: { title: '🔁 אחרי שמילה נפסלת', values: { true: 'מותר לנסות שוב', false: 'ניסיון אחד בתור' } },
  leniency: { title: '✏️ סלחנות לשגיאות כתיב', values: { strict: 'מחמיר', medium: 'בינוני', lenient: 'סלחני' } },
  voteThreshold: { title: '🗳️ רוב נדרש בהצבעה', values: { majority: 'יותר מחצי', p65: 'לפחות 65%', unanimous: 'פה אחד' } },
};

const LEVEL_NOTES = {
  easy: 'המילה הראשונה: חיות, בית או אוכל. רובי בוחר מילים קצרות ופשוטות.',
  medium: 'המילה הראשונה: טבע, בית ספר, מקצועות או תחבורה. רובי בוחר מילים מגוונות.',
  hard: 'המילה הראשונה: מושגים כמו חופש, חלום ואומץ. רובי מחפש את המהלך עם הכי הרבה נקודות.',
};

const PRACTICE_SETTINGS = ['level', 'leniency'];

export default function SettingsPanel({ config, settings, practice, readOnly, onChange }) {
  const { perLetter, multiCrossBonus, firstWordBonus } = config.scoring;
  const names = Object.keys(SETTING_LABELS).filter(name => !practice || PRACTICE_SETTINGS.includes(name));

  return (
    <div className="gr-settings">
      {names.map(name => (
        <OptionGroup
          key={name}
          title={SETTING_LABELS[name].title}
          labels={SETTING_LABELS[name].values}
          options={config.options[name]}
          value={settings[name]}
          note={name === 'level' ? LEVEL_NOTES[settings.level] : null}
          readOnly={readOnly}
          onChange={value => onChange(name, value)}
        />
      ))}
      <div className="gr-setting">
        <h4 className="gr-setting-title">🏅 ניקוד</h4>
        <ul className="cw-rules-list">
          <li>{perLetter} נקודה לכל אות במילה</li>
          <li>+{multiCrossBonus} כשהמילה חוצה 2 מילים או יותר</li>
          <li>+{firstWordBonus} כשהמילה קשורה ישירות למילה הראשונה</li>
        </ul>
      </div>
    </div>
  );
}

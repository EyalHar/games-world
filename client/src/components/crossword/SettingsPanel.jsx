import React from 'react';
import OptionGroup from '../game-room/OptionGroup';

const SETTING_LABELS = {
  turnSeconds: { title: '⏱️ זמן לתור', values: { 30: '30 שניות', 60: 'דקה', 90: 'דקה וחצי', 120: '2 דקות' } },
  retry: { title: '🔁 אחרי שמילה נפסלת', values: { true: 'מותר לנסות שוב', false: 'ניסיון אחד בתור' } },
  leniency: { title: '✏️ סלחנות לשגיאות כתיב', values: { strict: 'מחמיר', medium: 'בינוני', lenient: 'סלחני' } },
  voteThreshold: { title: '🗳️ רוב נדרש בהצבעה', values: { majority: 'יותר מחצי', p65: 'לפחות 65%', unanimous: 'פה אחד' } },
};

export default function SettingsPanel({ config, settings, readOnly, onChange }) {
  const { perLetter, multiCrossBonus, firstWordBonus } = config.scoring;
  return (
    <div className="gr-settings">
      {Object.entries(SETTING_LABELS).map(([name, { title, values }]) => (
        <OptionGroup
          key={name}
          title={title}
          labels={values}
          options={config.options[name]}
          value={settings[name]}
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

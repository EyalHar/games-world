import React from 'react';
import OptionGroup from '../game-room/OptionGroup';
import { SETTING_LABELS, SETTING_NOTES } from './settingLabels';

export default function SettingsPanel({ config, settings, readOnly, onChange }) {
  const toggleCategory = id => {
    const selected = settings.categories.includes(id);
    if (selected && settings.categories.length <= config.minCategories) return;
    const next = selected
      ? settings.categories.filter(c => c !== id)
      : [...settings.categories, id];
    onChange('categories', next);
  };

  return (
    <div className="gr-settings">
      <div className="gr-setting">
        <h4 className="gr-setting-title">
          📋 תחומים <span className="gr-muted">({settings.categories.length} נבחרו, מינימום {config.minCategories})</span>
        </h4>
        <div className="ei-category-grid">
          {config.categories.map(c => (
            <button
              key={c.id}
              className={`ei-category-toggle ${settings.categories.includes(c.id) ? 'active' : ''}`}
              onClick={() => toggleCategory(c.id)}
              disabled={readOnly}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {Object.keys(SETTING_LABELS).map(name => (
        <OptionGroup
          key={name}
          title={SETTING_LABELS[name].title + (name === 'hardLetters' ? ` (${config.hardLetters.join(', ')})` : '')}
          labels={SETTING_LABELS[name].values}
          options={config.options[name]}
          value={settings[name]}
          note={SETTING_NOTES[name]?.[settings[name]]}
          readOnly={readOnly}
          onChange={value => onChange(name, value)}
        />
      ))}
    </div>
  );
}

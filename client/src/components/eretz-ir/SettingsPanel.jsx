import React from 'react';
import { SETTING_LABELS, SETTING_NOTES } from './settingLabels';

function OptionGroup({ name, options, value, onChange, readOnly, titleSuffix }) {
  const { title, values } = SETTING_LABELS[name];
  const note = SETTING_NOTES[name]?.[value];
  return (
    <div className="ei-setting">
      <h4 className="ei-setting-title">{title}{titleSuffix}</h4>
      <div className="ei-pills">
        {options.map(opt => (
          <button
            key={opt}
            className={`ei-pill ${opt === value ? 'active' : ''}`}
            onClick={() => onChange(name, opt)}
            disabled={readOnly}
          >
            {values[opt]}
          </button>
        ))}
      </div>
      {note && <p className="ei-setting-note">{note}</p>}
    </div>
  );
}

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
    <div className="ei-settings">
      <div className="ei-setting">
        <h4 className="ei-setting-title">
          📋 תחומים <span className="ei-muted">({settings.categories.length} נבחרו, מינימום {config.minCategories})</span>
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
          name={name}
          options={config.options[name]}
          value={settings[name]}
          onChange={onChange}
          readOnly={readOnly}
          titleSuffix={name === 'hardLetters' ? ` (${config.hardLetters.join(', ')})` : ''}
        />
      ))}
    </div>
  );
}

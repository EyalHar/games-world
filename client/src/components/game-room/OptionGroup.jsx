import React from 'react';

export default function OptionGroup({ title, labels, options, value, note, readOnly, onChange }) {
  return (
    <div className="gr-setting">
      <h4 className="gr-setting-title">{title}</h4>
      <div className="gr-pills">
        {options.map(opt => (
          <button
            key={String(opt)}
            className={`gr-pill ${opt === value ? 'active' : ''}`}
            onClick={() => onChange(opt)}
            disabled={readOnly}
          >
            {labels[String(opt)]}
          </button>
        ))}
      </div>
      {note && <p className="gr-setting-note">{note}</p>}
    </div>
  );
}

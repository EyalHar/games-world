import React from 'react';

export default function StatusCard({ icon, title, children }) {
  return (
    <div className="gr-card">
      <div className="gr-icon">{icon}</div>
      <h2 className="gr-title small">{title}</h2>
      {children}
    </div>
  );
}

import React from 'react';
import { formatTime } from './StatusBar';

export default function StatsCard({ stats }) {
  const rate = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
  const items = [
    { label: 'משחקים', value: stats.played },
    { label: 'ניצחונות', value: `${stats.won} (${rate}%)` },
    { label: 'שיא זמן', value: stats.bestMs === null ? '—' : formatTime(stats.bestMs) },
    { label: 'רצף נוכחי', value: stats.streak },
    { label: 'רצף שיא', value: stats.bestStreak },
  ];
  return (
    <div className="fh-stats">
      <h3 className="fh-stats-title">📊 השיאים שלך ברמה הזו</h3>
      <div className="fh-stats-grid">
        {items.map(i => (
          <div key={i.label} className="fh-stat">
            <strong>{i.value}</strong>
            <span>{i.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

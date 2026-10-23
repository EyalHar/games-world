import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const games = [
  { path: '/associations', label: 'משחק האסוציאציות', emoji: '🧚' },
  { path: '/eretz-ir', label: 'ארץ עיר', emoji: '🌍' },
  { path: '/crossword', label: 'תשבץ אסוציאציות', emoji: '🧩' },
];

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-emoji">✨</span>
        <span className="sidebar-logo-text">עולם המשחקים</span>
      </div>

      <ul className="sidebar-menu">
        <li>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            <span className="sidebar-link-emoji">🏠</span>
            <span>דף הבית</span>
          </NavLink>
        </li>
        <li className="sidebar-section-title">משחקים</li>
        {games.map(g => (
          <li key={g.path}>
            <NavLink
              to={g.path}
              className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
            >
              <span className="sidebar-link-emoji">{g.emoji}</span>
              <span>{g.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <span>🌟 בהצלחה! 🌟</span>
      </div>
    </nav>
  );
}

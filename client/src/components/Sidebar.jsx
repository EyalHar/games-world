import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const sections = [
  {
    title: 'משחקים',
    games: [
      { path: '/associations', label: 'משחק האסוציאציות', emoji: '🧚' },
      { path: '/eretz-ir', label: 'ארץ עיר', emoji: '🌍' },
      { path: '/crossword', label: 'תשבץ אסוציאציות', emoji: '🧩' },
    ],
  },
  {
    title: 'משחקים נוסטלגיים',
    games: [
      { path: '/fish', label: 'דגים במחבוא', emoji: '🐠' },
    ],
  },
];

const linkClass = ({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link');

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-emoji">✨</span>
        <span className="sidebar-logo-text">עולם המשחקים</span>
      </div>

      <ul className="sidebar-menu">
        <li>
          <NavLink to="/" end className={linkClass}>
            <span className="sidebar-link-emoji">🏠</span>
            <span>דף הבית</span>
          </NavLink>
        </li>
        {sections.map(section => (
          <React.Fragment key={section.title}>
            <li className="sidebar-section-title">{section.title}</li>
            {section.games.map(g => (
              <li key={g.path}>
                <NavLink to={g.path} className={linkClass}>
                  <span className="sidebar-link-emoji">{g.emoji}</span>
                  <span>{g.label}</span>
                </NavLink>
              </li>
            ))}
          </React.Fragment>
        ))}
      </ul>

      <div className="sidebar-footer">
        <span>🌟 בהצלחה! 🌟</span>
      </div>
    </nav>
  );
}

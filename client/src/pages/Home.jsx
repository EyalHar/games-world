import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const GAMES = [
  {
    path: '/associations',
    emoji: '🧚',
    title: 'משחק האסוציאציות',
    desc: 'נחש את המילה הסודית לפי רמזים! גרור פיות ושדון למקומות הנכונים.',
    color: 'card-purple',
  },
  {
    path: '/eretz-ir',
    emoji: '🌍',
    title: 'ארץ עיר',
    desc: 'עוצרים אות וממלאים את הלוח הכי מהר! כל אחד מהמכשיר שלו, ושופט חכם בודק את התשובות.',
    color: 'card-teal',
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <div className="home-stars">
        {[...Array(20)].map((_, i) => (
          <span
            key={i}
            className="home-star"
            style={{
              top: `${Math.random() * 90}%`,
              left: `${Math.random() * 90}%`,
              animationDelay: `${Math.random() * 3}s`,
              fontSize: `${0.5 + Math.random() * 1}rem`,
            }}
          >★</span>
        ))}
      </div>

      <header className="home-header">
        <div className="home-title-emoji">🌟</div>
        <h1 className="home-title">עולם המשחקים</h1>
        <p className="home-subtitle">בחרו משחק ותהנו!</p>
      </header>

      <div className="home-games">
        {GAMES.map(g => (
          <button
            key={g.path}
            className={`home-game-card ${g.color}`}
            onClick={() => navigate(g.path)}
          >
            <span className="home-game-emoji">{g.emoji}</span>
            <h2 className="home-game-title">{g.title}</h2>
            <p className="home-game-desc">{g.desc}</p>
            <span className="home-game-btn">בואו נשחק! ▶</span>
          </button>
        ))}
      </div>
    </div>
  );
}

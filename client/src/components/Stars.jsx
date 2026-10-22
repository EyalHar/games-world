import React, { useMemo } from 'react';
import './Stars.css';

export default function Stars({ count = 18 }) {
  // Positions are memoized so the stars don't jump on every re-render.
  const stars = useMemo(() => [...Array(count)].map(() => ({
    top: `${5 + Math.random() * 88}%`,
    left: `${3 + Math.random() * 92}%`,
    animationDelay: `${Math.random() * 3}s`,
    fontSize: `${0.4 + Math.random() * 0.8}rem`,
  })), [count]);

  return (
    <div className="stars" aria-hidden>
      {stars.map((style, i) => <span key={i} className="stars-star" style={style}>✦</span>)}
    </div>
  );
}

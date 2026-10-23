import React, { useState, useEffect } from 'react';

const VISIBLE_MS = 3500;

export default function EventToast({ state }) {
  const { lastEvent, players, words } = state;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastEvent) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(t);
  }, [lastEvent]);

  if (!lastEvent || !visible) return null;
  const name = players.find(p => p.id === lastEvent.playerId)?.name ?? '';
  const word = words.find(w => w.id === lastEvent.wordId);

  const text = {
    placed: word && `✨ ${name} הניח/ה "${word.text}" וקיבל/ה ${word.points} נקודות!`,
    timeout: `⏱️ הזמן של ${name} נגמר`,
    pass: `🙅 ${name} ויתר/ה על התור`,
  }[lastEvent.type];

  return text ? <div className={`cw-toast ${lastEvent.type}`}>{text}</div> : null;
}

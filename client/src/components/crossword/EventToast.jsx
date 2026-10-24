import React, { useState, useEffect } from 'react';

const VISIBLE_MS = 3500;
const ERROR_VISIBLE_MS = 7000;

const BOT_ERRORS = {
  quota: 'מכסת הבקשות החינמית של Gemini נגמרה להיום',
  error: 'אין חיבור לשרת ה-AI כרגע',
};

export default function EventToast({ state }) {
  const { lastEvent, players, words } = state;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastEvent) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), lastEvent.type === 'botError' ? ERROR_VISIBLE_MS : VISIBLE_MS);
    return () => clearTimeout(t);
  }, [lastEvent]);

  if (!lastEvent || !visible) return null;
  const name = players.find(p => p.id === lastEvent.playerId)?.name ?? '';
  const word = words.find(w => w.id === lastEvent.wordId);

  const text = {
    placed: word && `✨ ${name} הניח/ה "${word.text}" וקיבל/ה ${word.points} נקודות!`,
    timeout: `⏱️ הזמן של ${name} נגמר`,
    pass: `🙅 ${name} ויתר/ה על התור`,
    botStuck: `🤖 ${name} לא מצא מילה שנכנסת ללוח, והתור עובר`,
    botError: `⚠️ ${name} לא הצליח לחשוב: ${BOT_ERRORS[lastEvent.reason]}. התור עובר`,
  }[lastEvent.type];

  return text ? <div className={`cw-toast ${lastEvent.type}`}>{text}</div> : null;
}

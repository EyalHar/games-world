import { useState, useEffect, useCallback, useRef } from 'react';
import { createGame, openCell, chordCell, toggleFlag } from '../utils/fish/engine';
import { findHint } from '../utils/fish/solver';
import { useSound } from './useSound';

const SETTINGS_KEY = 'fishHuntSettings';
const STATS_KEY = 'fishHuntStats';
const DEFAULT_SETTINGS = { level: 'easy', hearts: 3, noGuess: true };

function load(key, fallback) {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key)) };
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export const statsKey = ({ level, hearts }) => `${level}-${hearts}`;
const EMPTY_STATS = { played: 0, won: 0, bestMs: null, streak: 0, bestStreak: 0 };

// Records are kept per level and heart count; a game where a hint was used doesn't count for best time.
function recordResult(game) {
  const all = load(STATS_KEY, {});
  const key = statsKey({ level: game.level, hearts: game.maxHearts });
  const prev = { ...EMPTY_STATS, ...all[key] };
  const won = game.status === 'won';
  const ms = game.endedAt - game.startedAt;
  const newRecord = won && !game.hintsUsed && (prev.bestMs === null || ms < prev.bestMs);
  const streak = won ? prev.streak + 1 : 0;
  all[key] = {
    played: prev.played + 1,
    won: prev.won + (won ? 1 : 0),
    bestMs: newRecord ? ms : prev.bestMs,
    streak,
    bestStreak: Math.max(prev.bestStreak, streak),
  };
  save(STATS_KEY, all);
  return { newRecord, stats: all[key] };
}

export function useFishGame() {
  const { playClick, playSuccess, playWrong, playCelebration, playHint, playEncourage } = useSound();
  const [settings, setSettings] = useState(() => load(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [game, setGame] = useState(() => createGame(settings));
  const [hint, setHint] = useState(null);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(() => ({ ...EMPTY_STATS, ...load(STATS_KEY, {})[statsKey(settings)] }));
  const [now, setNow] = useState(Date.now());
  const recorded = useRef(false);

  useEffect(() => {
    if (game.status !== 'playing') return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [game.status]);

  useEffect(() => {
    const over = game.status === 'won' || game.status === 'lost';
    if (!over || recorded.current) return;
    recorded.current = true;
    const res = recordResult(game);
    setResult(res);
    setStats(res.stats);
    if (game.status === 'won') playCelebration();
    else playEncourage();
  }, [game, playCelebration, playEncourage]);

  const newGame = useCallback((next = settings) => {
    setSettings(next);
    save(SETTINGS_KEY, next);
    setGame(createGame(next));
    setHint(null);
    setResult(null);
    setStats({ ...EMPTY_STATS, ...load(STATS_KEY, {})[statsKey(next)] });
    recorded.current = false;
  }, [settings]);

  const changeSetting = (key, value) => newGame({ ...settings, [key]: value });

  // One entry point for a cell press: rod mode toggles a rod, an open number chords, anything else opens.
  // Computed from the latest state, so two quick taps in a row can't overwrite each other.
  const act = useCallback((idx, mode) => {
    setGame(prev => {
      const cell = prev.cells[idx];
      if (mode === 'flag') return toggleFlag(prev, idx);
      if (cell.open) return chordCell(prev, idx);
      return cell.flag ? prev : openCell(prev, idx);
    });
    setHint(null);
    if (mode === 'flag') playClick();
  }, [playClick]);

  // Sounds follow what a press actually opened.
  const lastReveal = useRef(null);
  useEffect(() => {
    const { reveal } = game;
    if (!reveal || reveal === lastReveal.current) return;
    lastReveal.current = reveal;
    if (reveal.hitFish) playWrong();
    else if (reveal.waves.size > 8) playSuccess();
    else playClick();
  }, [game, playClick, playSuccess, playWrong]);

  const askHint = () => {
    const h = findHint(game);
    setHint(h);
    playHint();
    if (['safe', 'fish', 'wrongFlag'].includes(h.kind)) setGame(g => ({ ...g, hintsUsed: g.hintsUsed + 1 }));
  };

  const elapsedMs = game.startedAt ? (game.endedAt || now) - game.startedAt : 0;

  return { settings, game, hint, result, stats, elapsedMs, act, newGame, changeSetting, askHint, closeHint: () => setHint(null) };
}

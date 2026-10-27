// Pure game logic for the fish-hunt (minesweeper) game. Cells are a flat array indexed r * cols + c.
import { isSolvable } from './solver';
import { neighbors } from './grid';

export const LEVELS = {
  easy: { rows: 8, cols: 8, fish: 8 },
  medium: { rows: 12, cols: 12, fish: 22 },
  hard: { rows: 16, cols: 16, fish: 40 },
  expert: { rows: 16, cols: 30, fish: 99 },
};

const GENERATION_BUDGET_MS = 1500;

export function createGame({ level, hearts, noGuess }) {
  const { rows, cols, fish } = LEVELS[level];
  return {
    level, rows, cols, fishCount: fish, noGuess,
    maxHearts: hearts,
    hearts,
    cells: Array.from({ length: rows * cols }, () => ({ fish: false, adj: 0, open: false, flag: false, escaped: false })),
    status: 'ready',
    startedAt: null,
    endedAt: null,
    hintsUsed: 0,
    reveal: null,
  };
}

function layFish(rows, cols, fishCount, safeIdx) {
  const total = rows * cols;
  const zone = new Set([safeIdx, ...neighbors(safeIdx, rows, cols)]);
  // The first click opens an area when the board has room for it; otherwise only that cell is safe.
  const forbidden = total - zone.size >= fishCount ? zone : new Set([safeIdx]);
  const pool = [];
  for (let i = 0; i < total; i++) if (!forbidden.has(i)) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const fish = new Set(pool.slice(0, fishCount));
  return Array.from({ length: total }, (_, i) => ({
    fish: fish.has(i),
    adj: neighbors(i, rows, cols).filter(n => fish.has(n)).length,
    open: false, flag: false, escaped: false,
  }));
}

// No-guess mode keeps drawing boards until the solver can clear one from the first click by logic alone.
export function generateCells({ rows, cols, fishCount, noGuess }, safeIdx) {
  const deadline = Date.now() + GENERATION_BUDGET_MS;
  let cells;
  do {
    cells = layFish(rows, cols, fishCount, safeIdx);
    if (!noGuess || isSolvable(cells, rows, cols, safeIdx)) return { cells, guaranteed: noGuess };
  } while (Date.now() < deadline);
  return { cells, guaranteed: false };
}

// Opens a cell; empty cells flood outward. Returns the opened indexes with their wave distance for animation.
function flood(cells, rows, cols, start) {
  const waves = new Map([[start, 0]]);
  const queue = [start];
  cells[start].open = true;
  while (queue.length) {
    const idx = queue.shift();
    if (cells[idx].adj !== 0 || cells[idx].fish) continue;
    neighbors(idx, rows, cols).forEach(n => {
      const cell = cells[n];
      if (cell.open || cell.flag || cell.fish) return;
      cell.open = true;
      waves.set(n, waves.get(idx) + 1);
      queue.push(n);
    });
  }
  return waves;
}

const cloneCells = cells => cells.map(c => ({ ...c }));

function finish(game, won) {
  const cells = game.cells.map(c => {
    if (won && c.fish) return { ...c, flag: true };
    if (!won && c.fish && !c.flag) return { ...c, open: true };
    return c;
  });
  return { ...game, cells, status: won ? 'won' : 'lost', endedAt: Date.now() };
}

const isCleared = cells => cells.every(c => c.fish || c.open);

// Opens a set of cells (one click or a chord). Hitting a fish costs a heart; the fish stays visible as "escaped".
function openCells(game, targets) {
  const cells = cloneCells(game.cells);
  const waves = new Map();
  let { hearts } = game;
  let hitFish = false;

  targets.forEach(idx => {
    const cell = cells[idx];
    if (cell.open || cell.flag) return;
    if (cell.fish) {
      cell.open = true;
      cell.escaped = true;
      hearts--;
      hitFish = true;
      return;
    }
    flood(cells, game.rows, game.cols, idx).forEach((wave, i) => waves.set(i, Math.min(wave, waves.get(i) ?? wave)));
  });

  const next = { ...game, cells, hearts, reveal: { waves, hitFish, at: Date.now() } };
  if (hearts <= 0) return finish(next, false);
  if (isCleared(cells)) return finish(next, true);
  return next;
}

export function openCell(game, idx) {
  if (game.status === 'won' || game.status === 'lost') return game;
  let current = game;
  if (game.status === 'ready') {
    const { cells, guaranteed } = generateCells(game, idx);
    current = { ...game, cells, guaranteed, status: 'playing', startedAt: Date.now() };
  }
  return openCells(current, [idx]);
}

// Chord: clicking an open number whose flags are all placed opens the rest of its neighbors.
export function chordCell(game, idx) {
  const cell = game.cells[idx];
  if (game.status !== 'playing' || !cell.open || cell.fish || !cell.adj) return game;
  const around = neighbors(idx, game.rows, game.cols);
  const marked = around.filter(n => game.cells[n].flag || game.cells[n].escaped).length;
  if (marked !== cell.adj) return game;
  return openCells(game, around.filter(n => !game.cells[n].open && !game.cells[n].flag));
}

export function toggleFlag(game, idx) {
  if (game.status !== 'playing' || game.cells[idx].open) return game;
  const cells = cloneCells(game.cells);
  cells[idx].flag = !cells[idx].flag;
  return { ...game, cells, reveal: null };
}

export const flagsPlaced = game => game.cells.filter(c => c.flag || c.escaped).length;

// Keep in sync with client/src/utils/crosswordRules.js (the client uses it for the live preview).
const { BOARD_SIZE, MIN_WORD_LENGTH } = require('./constants');

const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const DELTA = { h: [0, 1], v: [1, 0] };

const baseLetter = ch => FINALS[ch] || ch;
const wordKey = word => [...word].map(baseLetter).join('');

function normalizeWord(raw) {
  const cleaned = String(raw || '').replace(/[֑-ׇ]/g, '').trim();
  return /^[א-ת]+$/.test(cleaned) ? cleaned : null;
}

function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

const inBounds = (r, c) => r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE;
const occupied = (board, r, c) => inBounds(r, c) && Boolean(board[r][c]);

// Crossword rules: the word must pass through at least one existing letter, may not run along
// an existing word, and new letters may not touch other letters from the side.
function checkPlacement(board, words, { word, row, col, dir }) {
  const text = normalizeWord(word);
  if (!text) return { ok: false, error: 'אפשר לכתוב רק אותיות בעברית, בלי רווחים' };
  if (text.length < MIN_WORD_LENGTH) return { ok: false, error: 'המילה קצרה מדי' };
  if (!DELTA[dir]) return { ok: false, error: 'כיוון לא תקין' };
  if (words.some(w => wordKey(w.text) === wordKey(text))) return { ok: false, error: 'המילה הזו כבר על הלוח' };

  const [dr, dc] = DELTA[dir];
  const endR = row + dr * (text.length - 1);
  const endC = col + dc * (text.length - 1);
  if (!inBounds(row, col) || !inBounds(endR, endC)) return { ok: false, error: 'המילה יוצאת מהלוח' };
  if (occupied(board, row - dr, col - dc) || occupied(board, endR + dr, endC + dc)) {
    return { ok: false, error: 'המילה נוגעת באות אחרת בהמשך השורה' };
  }

  const cells = [];
  const crossed = new Set();
  for (let i = 0; i < text.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const ch = text[i];
    const cell = board[r][c];
    if (cell) {
      if (baseLetter(cell.ch) !== baseLetter(ch)) return { ok: false, error: `במשבצת הזו כבר כתוב ${cell.ch}`, at: { r, c } };
      if (cell.dirs.includes(dir)) return { ok: false, error: 'אי אפשר להניח מילה על מילה באותו כיוון', at: { r, c } };
      cell.wordIds.forEach(id => crossed.add(id));
      cells.push({ r, c, ch, isNew: false });
    } else {
      const sides = dir === 'h' ? [[r - 1, c], [r + 1, c]] : [[r, c - 1], [r, c + 1]];
      if (sides.some(([sr, sc]) => occupied(board, sr, sc))) {
        return { ok: false, error: 'המילה נוגעת במילה אחרת מהצד', at: { r, c } };
      }
      cells.push({ r, c, ch, isNew: true });
    }
  }

  if (!crossed.size) return { ok: false, error: 'המילה צריכה לעבור דרך אות שכבר על הלוח' };
  if (!cells.some(cell => cell.isNew)) return { ok: false, error: 'המילה צריכה להוסיף לפחות אות אחת חדשה' };
  return { ok: true, text, cells, crossedWordIds: [...crossed] };
}

function placeWord(board, word) {
  word.cells.forEach(({ r, c, ch }) => {
    if (!board[r][c]) board[r][c] = { ch, dirs: [], wordIds: [] };
    board[r][c].dirs.push(word.dir);
    board[r][c].wordIds.push(word.id);
  });
}

function placeFirstWord(board, text) {
  const row = Math.floor(BOARD_SIZE / 2) - 1;
  const col = Math.floor((BOARD_SIZE - text.length) / 2);
  const cells = [...text].map((ch, i) => ({ r: row, c: col + i, ch, isNew: true }));
  return { row, col, dir: 'h', cells };
}

// Every legal spot for `text`: anchored on each board letter it shares, in both directions.
function findPlacements(board, words, text) {
  const results = [];
  const seen = new Set();
  board.forEach((row, r) => row.forEach((cell, c) => {
    if (!cell) return;
    [...text].forEach((ch, i) => {
      if (baseLetter(ch) !== baseLetter(cell.ch)) return;
      Object.entries(DELTA).forEach(([dir, [dr, dc]]) => {
        const placement = { word: text, row: r - dr * i, col: c - dc * i, dir };
        const key = `${placement.row},${placement.col},${dir}`;
        if (seen.has(key)) return;
        seen.add(key);
        const check = checkPlacement(board, words, placement);
        if (check.ok) results.push({ ...placement, check });
      });
    });
  }));
  return results;
}

module.exports = { checkPlacement, findPlacements, placeWord, placeFirstWord, createBoard, normalizeWord };

// Mirrors server/crossword/rules.js so the board can preview a placement instantly; the server stays authoritative.
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const DELTA = { h: [0, 1], v: [1, 0] };

const baseLetter = ch => FINALS[ch] || ch;
const wordKey = word => [...word].map(baseLetter).join('');

export function normalizeWord(raw) {
  const cleaned = String(raw || '').replace(/[֑-ׇ]/g, '').trim();
  return /^[א-ת]+$/.test(cleaned) ? cleaned : null;
}

export function wordCells({ text, row, col, dir }) {
  const [dr, dc] = DELTA[dir];
  return [...text].map((ch, i) => ({ r: row + dr * i, c: col + dc * i, ch }));
}

export function buildBoard(words, size) {
  const board = Array.from({ length: size }, () => Array(size).fill(null));
  words.forEach(w => {
    wordCells(w).forEach(({ r, c, ch }) => {
      if (!board[r][c]) board[r][c] = { ch, dirs: [], wordIds: [] };
      board[r][c].dirs.push(w.dir);
      board[r][c].wordIds.push(w.id);
    });
  });
  return board;
}

export function checkPlacement(board, words, { word, row, col, dir }, minLength = 2) {
  const size = board.length;
  const inBounds = (r, c) => r >= 0 && c >= 0 && r < size && c < size;
  const occupied = (r, c) => inBounds(r, c) && Boolean(board[r][c]);

  const text = normalizeWord(word);
  if (!text) return { ok: false, error: 'אפשר לכתוב רק אותיות בעברית, בלי רווחים' };
  if (text.length < minLength) return { ok: false, error: 'המילה קצרה מדי' };
  if (words.some(w => wordKey(w.text) === wordKey(text))) return { ok: false, error: 'המילה הזו כבר על הלוח' };

  const [dr, dc] = DELTA[dir];
  const endR = row + dr * (text.length - 1);
  const endC = col + dc * (text.length - 1);
  if (!inBounds(row, col) || !inBounds(endR, endC)) return { ok: false, error: 'המילה יוצאת מהלוח' };
  if (occupied(row - dr, col - dc) || occupied(endR + dr, endC + dc)) {
    return { ok: false, error: 'המילה נוגעת באות אחרת בהמשך השורה' };
  }

  let crossings = 0;
  let newLetters = 0;
  for (let i = 0; i < text.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cell = board[r][c];
    if (cell) {
      if (baseLetter(cell.ch) !== baseLetter(text[i])) return { ok: false, error: `במשבצת הזו כבר כתוב ${cell.ch}`, at: { r, c } };
      if (cell.dirs.includes(dir)) return { ok: false, error: 'אי אפשר להניח מילה על מילה באותו כיוון', at: { r, c } };
      crossings++;
    } else {
      const sides = dir === 'h' ? [[r - 1, c], [r + 1, c]] : [[r, c - 1], [r, c + 1]];
      if (sides.some(([sr, sc]) => occupied(sr, sc))) return { ok: false, error: 'המילה נוגעת במילה אחרת מהצד', at: { r, c } };
      newLetters++;
    }
  }

  if (!crossings) return { ok: false, error: 'המילה צריכה לעבור דרך אות שכבר על הלוח' };
  if (!newLetters) return { ok: false, error: 'המילה צריכה להוסיף לפחות אות אחת חדשה' };
  return { ok: true, text };
}

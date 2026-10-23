import React, { useMemo } from 'react';
import { buildBoard, wordCells } from '../../utils/crosswordRules';

const key = (r, c) => `${r},${c}`;

function previewMap(preview, check, board) {
  const map = new Map();
  if (!preview?.text) return map;
  const size = board.length;
  wordCells(preview).forEach(({ r, c, ch }) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    const conflict = check && !check.ok && check.at && check.at.r === r && check.at.c === c;
    map.set(key(r, c), { ch, state: conflict ? 'bad' : board[r][c] ? 'cross' : 'new' });
  });
  return map;
}

export default function CrosswordBoard({
  words, size, colorOf, selected, dir, preview, check, highlightId, interactive, zoomed, onCellClick,
}) {
  const board = useMemo(() => buildBoard(words, size), [words, size]);
  const ownerOf = useMemo(() => new Map(words.map(w => [w.id, w.playerId])), [words]);
  const fresh = useMemo(() => {
    const w = words.find(x => x.id === highlightId);
    return new Set(w ? wordCells(w).map(({ r, c }) => key(r, c)) : []);
  }, [words, highlightId]);
  const ghosts = previewMap(preview, check, board);
  const previewInvalid = check && !check.ok;

  return (
    <div className={`cw-board-wrap ${zoomed ? 'zoomed' : ''}`}>
      <div className="cw-board" dir="rtl" style={{ '--cw-size': size }}>
        {board.map((row, r) => row.map((cell, c) => {
          const k = key(r, c);
          const ghost = ghosts.get(k);
          const owner = cell && ownerOf.get(cell.wordIds[0]);
          const classes = ['cw-cell'];
          if (cell) classes.push('filled', owner ? `p${colorOf(owner)}` : 'first');
          if (fresh.has(k)) classes.push('fresh');
          if (ghost) classes.push(`ghost-${ghost.state}`, previewInvalid ? 'ghost-invalid' : '');
          if (selected && selected.r === r && selected.c === c) classes.push('selected', `dir-${dir}`);
          return (
            <button
              key={k}
              className={classes.join(' ')}
              onClick={() => onCellClick?.(r, c)}
              disabled={!interactive}
              tabIndex={interactive ? 0 : -1}
              aria-label={cell ? cell.ch : `שורה ${r + 1} עמודה ${c + 1}`}
            >
              {ghost && !cell ? ghost.ch : cell?.ch}
            </button>
          );
        }))}
      </div>
    </div>
  );
}

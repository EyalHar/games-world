const tables = new Map();

// Neighbor lists per board size, computed once: the solver asks for them thousands of times per generated board.
export function neighborTable(rows, cols) {
  const key = `${rows}x${cols}`;
  if (!tables.has(key)) {
    tables.set(key, Array.from({ length: rows * cols }, (_, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      const out = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if ((dr || dc) && nr >= 0 && nc >= 0 && nr < rows && nc < cols) out.push(nr * cols + nc);
        }
      }
      return out;
    }));
  }
  return tables.get(key);
}

export const neighbors = (idx, rows, cols) => neighborTable(rows, cols)[idx];

import React, { useRef } from 'react';

const LONG_PRESS_MS = 450;
const WAVE_STEP_MS = 35;
const MAX_WAVE_DELAY_MS = 700;

function cellContent(cell, over) {
  if (cell.flag) return over && !cell.fish ? '❌' : '🎣';
  if (!cell.open) return '';
  if (cell.fish) return cell.escaped ? '🐟' : '🐠';
  return cell.adj || '';
}

function cellLabel(cell, idx, cols) {
  const where = `שורה ${Math.floor(idx / cols) + 1}, עמודה ${(idx % cols) + 1}`;
  if (cell.flag) return `${where}: חכה`;
  if (!cell.open) return `${where}: סגורה`;
  if (cell.fish) return `${where}: דג`;
  return `${where}: ${cell.adj ? `${cell.adj} דגים מסביב` : 'ריקה'}`;
}

export default function FishBoard({ game, hint, mode, onAct }) {
  const { cells, cols, status, reveal } = game;
  const over = status === 'won' || status === 'lost';
  const press = useRef({ timer: null, longPressed: false });
  const hinted = new Set(hint?.cells || []);
  const sources = new Set(hint?.sources || []);

  // A long press marks a rod on touch screens, where there is no right click.
  const startPress = idx => {
    press.current.longPressed = false;
    clearTimeout(press.current.timer);
    press.current.timer = setTimeout(() => {
      press.current.longPressed = true;
      onAct(idx, 'flag');
    }, LONG_PRESS_MS);
  };
  const endPress = () => clearTimeout(press.current.timer);

  const onClick = idx => {
    if (press.current.longPressed) {
      press.current.longPressed = false;
      return;
    }
    onAct(idx, mode);
  };

  return (
    <div className="fh-board-wrap">
      <div className={`fh-board ${over ? 'over' : ''}`} style={{ '--fh-cols': cols }} dir="ltr">
        {cells.map((cell, idx) => {
          const wave = reveal?.waves.get(idx);
          const classes = ['fh-cell', cell.open ? 'open' : 'closed'];
          if (cell.open && !cell.fish && cell.adj) classes.push(`n${cell.adj}`);
          if (cell.fish && cell.open) classes.push(cell.escaped ? 'escaped' : 'fish');
          if (cell.flag) classes.push('flagged');
          if (wave !== undefined) classes.push('just-opened');
          if (hinted.has(idx)) classes.push(`hint-${hint.kind}`);
          if (sources.has(idx)) classes.push('hint-source');
          return (
            <button
              key={idx}
              className={classes.join(' ')}
              style={wave !== undefined ? { animationDelay: `${Math.min(wave * WAVE_STEP_MS, MAX_WAVE_DELAY_MS)}ms` } : undefined}
              onClick={() => onClick(idx)}
              onContextMenu={e => { e.preventDefault(); onAct(idx, 'flag'); }}
              onPointerDown={e => e.pointerType === 'touch' && startPress(idx)}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              onPointerCancel={endPress}
              disabled={over}
              aria-label={cellLabel(cell, idx, cols)}
            >
              {cellContent(cell, over)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Logical solver for the fish-hunt board. It only uses what a careful player could know, with three rules:
//   single — one number on its own (all its fish found → the rest is safe; as many closed cells as fish → all fish)
//   pair   — two nearby numbers where one's closed cells all lie next to the other
//   count  — the total number of fish left against the closed cells left
import { neighborTable } from './grid';

// A "view" is what the solver may see: open[i], knownFish[i] and the numbers of open cells.
function constraintsOf(view) {
  const { cells, open, knownFish, table } = view;
  const list = [];
  for (let i = 0; i < cells.length; i++) {
    if (!open[i] || knownFish[i] || !cells[i].adj) continue;
    const unknown = [];
    let found = 0;
    table[i].forEach(n => {
      if (knownFish[n]) found++;
      else if (!open[n]) unknown.push(n);
    });
    if (unknown.length) list.push({ src: i, cells: unknown, need: cells[i].adj - found });
  }
  return list;
}

function singleDeductions(constraints) {
  const out = [];
  constraints.forEach(k => {
    if (k.need === 0) out.push({ kind: 'safe', rule: 'single', cells: k.cells, a: k });
    else if (k.need === k.cells.length) out.push({ kind: 'fish', rule: 'single', cells: k.cells, a: k });
  });
  return out;
}

function pairDeductions(constraints, cols) {
  const bySrc = new Map(constraints.map(k => [k.src, k]));
  const out = [];
  constraints.forEach(a => {
    const ar = Math.floor(a.src / cols);
    const ac = a.src % cols;
    const inA = new Set(a.cells);
    // Two numbers can only share closed cells when they are at most two steps apart.
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const c = ac + dc;
        if ((!dr && !dc) || c < 0 || c >= cols) continue;
        const b = bySrc.get((ar + dr) * cols + c);
        if (!b || b.cells.length <= a.cells.length) continue;
        if (!a.cells.every(x => b.cells.includes(x))) continue;
        const rest = b.cells.filter(x => !inA.has(x));
        const extra = b.need - a.need;
        if (extra === 0) out.push({ kind: 'safe', rule: 'pair', cells: rest, a, b });
        else if (extra === rest.length) out.push({ kind: 'fish', rule: 'pair', cells: rest, a, b });
      }
    }
  });
  return out;
}

function countDeductions(view) {
  const { cells, open, knownFish, fishCount } = view;
  const closed = [];
  let found = 0;
  for (let i = 0; i < cells.length; i++) {
    if (knownFish[i]) found++;
    else if (!open[i]) closed.push(i);
  }
  const left = fishCount - found;
  if (!closed.length) return [];
  if (left === 0) return [{ kind: 'safe', rule: 'count', cells: closed, left }];
  if (left === closed.length) return [{ kind: 'fish', rule: 'count', cells: closed, left }];
  return [];
}

// Cheapest rule first: the solver only reaches for a harder rule when the easier ones are stuck.
function deduce(view) {
  const constraints = constraintsOf(view);
  const single = singleDeductions(constraints);
  if (single.length) return single;
  const pair = pairDeductions(constraints, view.cols);
  if (pair.length) return pair;
  return countDeductions(view);
}

function openFrom(view, start) {
  const { cells, open, table } = view;
  const stack = [start];
  while (stack.length) {
    const i = stack.pop();
    if (open[i]) continue;
    open[i] = 1;
    if (cells[i].adj === 0) table[i].forEach(n => { if (!open[n] && !cells[n].fish) stack.push(n); });
  }
}

export function isSolvable(cells, rows, cols, startIdx) {
  const view = {
    cells, cols,
    table: neighborTable(rows, cols),
    open: new Uint8Array(cells.length),
    knownFish: new Uint8Array(cells.length),
    fishCount: cells.filter(c => c.fish).length,
  };
  openFrom(view, startIdx);
  for (;;) {
    const found = deduce(view);
    if (!found.length) break;
    found.forEach(d => d.cells.forEach(i => {
      if (d.kind === 'fish') view.knownFish[i] = 1;
      else if (!view.open[i]) openFrom(view, i);
    }));
  }
  return cells.every((c, i) => c.fish || view.open[i]);
}

// ─── hints ───────────────────────────────────────────────────────────────────

const fishWord = n => (n === 1 ? 'דג אחד' : `${n} דגים`);
const closedWord = n => (n === 1 ? 'משבצת סגורה אחת' : `${n} משבצות סגורות`);

function explain(d, cells) {
  const num = k => cells[k.src].adj;
  if (d.rule === 'single') {
    return d.kind === 'safe'
      ? `המספר ${num(d.a)} כבר נוגע בכל הדגים שלו, אז שאר המשבצות סביבו ריקות.`
      : `המספר ${num(d.a)} צריך עוד ${fishWord(d.a.need)}, ${d.a.cells.length === 1 ? 'ונשארה' : 'ונשארו'} לידו בדיוק ${closedWord(d.a.cells.length)}. ${d.a.cells.length === 1 ? 'לכן יש בה דג.' : 'לכן בכולן יש דגים.'}`;
  }
  if (d.rule === 'pair') {
    return d.kind === 'safe'
      ? `השוו בין שני המספרים המודגשים: כל המשבצות הסגורות של ${num(d.a)} נוגעות גם ב-${num(d.b)}, ושניהם צריכים אותו מספר דגים. לכן שאר המשבצות ליד ${num(d.b)} ריקות.`
      : `המספר ${num(d.b)} צריך עוד ${fishWord(d.b.need)}, אבל ליד ${num(d.a)} יכולים להיות רק ${fishWord(d.a.need)} מהם. לכן ${d.cells.length === 1 ? 'במשבצת הנוספת' : 'במשבצות הנוספות'} ליד ${num(d.b)} יש ${d.cells.length === 1 ? 'דג' : 'דגים'}.`;
  }
  return d.kind === 'safe'
    ? 'כל הדגים כבר נמצאו, אז כל המשבצות שנשארו ריקות.'
    : `נשארו בדיוק ${closedWord(d.cells.length)} ו-${fishWord(d.left)}, אז ${d.cells.length === 1 ? 'יש בה דג' : 'בכולן יש דגים'}.`;
}

const sourcesOf = d => [d.a?.src, d.b?.src].filter(s => s !== undefined);

// The next step for the player. Known fish = escaped fish + correctly placed rods, so a hint never builds on
// something the player can't see; a wrong rod is pointed out first, since it misleads every number around it.
export function findHint(game) {
  const { cells, rows, cols, status, fishCount } = game;
  if (status === 'ready') return { kind: 'start', cells: [], sources: [], text: 'לחצו על משבצת כלשהי. הלחיצה הראשונה תמיד בטוחה.' };

  const wrongRod = cells.findIndex(c => c.flag && !c.fish);
  if (wrongRod >= 0) {
    return { kind: 'wrongFlag', cells: [wrongRod], sources: [], text: 'החכה המסומנת לא במקום: אין שם דג. כדאי להוריד אותה.' };
  }

  const view = {
    cells, cols, fishCount,
    table: neighborTable(rows, cols),
    open: Uint8Array.from(cells, c => (c.open ? 1 : 0)),
    knownFish: Uint8Array.from(cells, c => (c.escaped || c.flag ? 1 : 0)),
  };
  const found = deduce(view);
  const pick = found.find(d => d.kind === 'safe') || found.find(d => d.kind === 'fish');
  if (!pick) return { kind: 'guess', cells: [], sources: [], text: 'אין כאן צעד בטוח בהיגיון בלבד, צריך לנחש. במצב "בלי ניחושים" זה לא קורה.' };
  return { kind: pick.kind, cells: pick.cells, sources: sourcesOf(pick), text: explain(pick, cells) };
}

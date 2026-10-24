const crypto = require('crypto');
const { OPTIONS, DEFAULT_SETTINGS, START_WORDS, SCORING, MAX_EXPLANATION_LENGTH, BOT } = require('./constants');
const { checkPlacement, placeWord, placeFirstWord, createBoard } = require('./rules');
const { judgeWord, isJudgeAvailable } = require('./judge');
const { findMove } = require('./bot');
const { createCode, passesThreshold, cleanName } = require('../shared/rooms');

const EMPTY_ROOM_TTL_MS = 30 * 60 * 1000;

const rooms = new Map();

// ─── room helpers ──────────────────────────────────────────────────────────

function createRoom(practice) {
  const room = {
    code: createCode(rooms),
    practice,
    hintsUsed: 0,
    hostId: null,
    players: [],
    devices: new Map(),
    settings: { ...DEFAULT_SETTINGS },
    phase: 'lobby',
    board: null,
    words: [],
    turn: null,
    failStreak: 0,
    endReason: null,
    lastEvent: null,
    timer: null,
    botTimer: null,
    cleanupTimer: null,
  };
  rooms.set(room.code, room);
  return room;
}

function deleteRoom(room) {
  clearTimeout(room.timer);
  clearTimeout(room.botTimer);
  clearTimeout(room.cleanupTimer);
  rooms.delete(room.code);
}

const isConnected = (room, player) => player.isBot || Boolean(room.devices.get(player.deviceId));
const connectedPlayers = room => room.players.filter(p => isConnected(room, p));
const connectedHumans = room => connectedPlayers(room).filter(p => !p.isBot);
const findPlayer = (room, id) => room.players.find(p => p.id === id);
const scoreOf = (room, pid) => room.words.reduce((sum, w) => sum + (w.playerId === pid ? w.points : 0), 0);

function ensureHost(room) {
  const host = findPlayer(room, room.hostId);
  if (host && isConnected(room, host)) return;
  const next = connectedHumans(room)[0] || (host ? null : room.players.find(p => !p.isBot));
  if (next) room.hostId = next.id;
}

function sanitizeSettings(current, input = {}) {
  const next = { ...current };
  Object.keys(OPTIONS).forEach(key => {
    if (OPTIONS[key].includes(input[key])) next[key] = input[key];
  });
  return next;
}

function remainingMs(turn) {
  if (!turn) return null;
  return turn.startedAt ? Math.max(0, turn.remainingMs - (Date.now() - turn.startedAt)) : turn.remainingMs;
}

function publicState(room, deviceId) {
  const { turn } = room;
  return {
    code: room.code,
    practice: room.practice,
    hintsUsed: room.hintsUsed,
    hostId: room.hostId,
    phase: room.phase,
    settings: room.settings,
    judgeAvailable: isJudgeAvailable(),
    myPlayerIds: room.players.filter(p => !p.isBot && p.deviceId === deviceId).map(p => p.id),
    players: room.players.map(p => ({
      id: p.id, name: p.name, isBot: Boolean(p.isBot), connected: isConnected(room, p), score: scoreOf(room, p.id),
    })),
    words: room.words.map(({ id, text, row, col, dir, playerId, points, breakdown, reason, relatedTo, explanation }) => ({
      id, text, row, col, dir, playerId, points, breakdown, reason, relatedTo, explanation,
    })),
    turn: turn && {
      playerId: turn.playerId,
      status: turn.status,
      remainingMs: remainingMs(turn),
      running: Boolean(turn.startedAt),
      attempt: turn.attempt && { text: turn.attempt.text, row: turn.attempt.row, col: turn.attempt.col, dir: turn.attempt.dir },
      lastRejection: turn.lastRejection,
      appealed: turn.appealed,
      vote: turn.vote,
    },
    failStreak: room.failStreak,
    endReason: room.endReason,
    lastEvent: room.lastEvent,
  };
}

// ─── game flow ─────────────────────────────────────────────────────────────

function createGame(nsp) {
  function broadcast(room) {
    room.devices.forEach((socketId, deviceId) => {
      if (socketId) nsp.to(socketId).emit('state', publicState(room, deviceId));
    });
  }

  function startGame(room) {
    const bank = START_WORDS[room.settings.level];
    const text = bank[Math.floor(Math.random() * bank.length)];
    room.board = createBoard();
    const first = { id: 'first', text, ...placeFirstWord(room.board, text), playerId: null, points: 0, reason: 'המילה הראשונה' };
    placeWord(room.board, first);
    room.words = [first];
    room.failStreak = 0;
    room.hintsUsed = 0;
    room.endReason = null;
    room.lastEvent = null;
    // A lone player outside practice gets the computer as an opponent (it needs the LLM to play).
    if (!room.practice && room.players.length === 1 && isJudgeAvailable()) {
      room.players.push({ id: `bot-${crypto.randomUUID()}`, name: BOT.name, isBot: true, deviceId: null });
    }
    room.phase = 'playing';
    const starter = connectedHumans(room)[0] || room.players[0];
    startTurn(room, starter.id);
  }

  function startTurn(room, playerId) {
    clearTimeout(room.timer);
    clearTimeout(room.botTimer);
    room.turn = {
      id: crypto.randomUUID(),
      playerId,
      status: 'thinking',
      remainingMs: room.practice ? null : room.settings.turnSeconds * 1000,
      startedAt: null,
      attempt: null,
      lastRejection: null,
      appealed: false,
      vote: null,
    };
    resumeTimer(room);
    // The bot plays against the same clock; a separate timer keeps its think delay from replacing the turn timer.
    if (findPlayer(room, playerId)?.isBot) {
      const turnId = room.turn.id;
      room.botTimer = setTimeout(() => runBotTurn(room, turnId), BOT.thinkMs);
    }
  }

  async function runBotTurn(room, turnId) {
    let move = null;
    let failure = null;
    try {
      move = await findMove({ board: room.board, words: room.words, level: room.settings.level, leniency: room.settings.leniency });
    } catch (err) {
      console.error('[crossword] bot failed:', err.message);
      failure = err.code === 'quota' ? 'quota' : 'error';
    }
    if (rooms.get(room.code) !== room || room.turn?.id !== turnId) return;

    if (move) {
      const { check } = move;
      room.turn.attempt = {
        text: check.text, row: move.row, col: move.col, dir: move.dir,
        cells: check.cells, crossedWordIds: check.crossedWordIds, explanation: '',
      };
      acceptAttempt(room, move);
    } else {
      // Tell the players why the computer skipped, so an AI outage doesn't look like the bot giving up.
      room.lastEvent = { type: failure ? 'botError' : 'botStuck', reason: failure, playerId: room.turn.playerId, at: Date.now() };
      endTurn(room, false, !failure);
    }
    broadcast(room);
  }

  function pauseTimer(room) {
    const { turn } = room;
    clearTimeout(room.timer);
    if (room.practice) return;
    turn.remainingMs = remainingMs(turn);
    turn.startedAt = null;
  }

  function resumeTimer(room) {
    const { turn } = room;
    if (room.practice) return;
    turn.startedAt = Date.now();
    const turnId = turn.id;
    room.timer = setTimeout(() => {
      if (room.turn?.id !== turnId || room.turn.status !== 'thinking') return;
      room.lastEvent = { type: 'timeout', playerId: room.turn.playerId, at: Date.now() };
      endTurn(room, false);
      broadcast(room);
    }, turn.remainingMs);
  }

  function nextPlayerId(room, afterId) {
    const order = room.players;
    const start = order.findIndex(p => p.id === afterId);
    for (let step = 1; step <= order.length; step++) {
      const candidate = order[(start + step + order.length) % order.length];
      if (candidate && isConnected(room, candidate)) return candidate.id;
    }
    return order[0]?.id ?? null;
  }

  // countsAsFail=false skips the turn without moving toward "everyone is stuck" (used for AI outages).
  function endTurn(room, placed, countsAsFail = true) {
    clearTimeout(room.timer);
    if (placed) room.failStreak = 0;
    else if (countsAsFail) room.failStreak++;
    if (room.failStreak >= Math.max(1, connectedPlayers(room).length)) return endGame(room, 'stuck');
    startTurn(room, nextPlayerId(room, room.turn.playerId));
  }

  function endGame(room, reason) {
    clearTimeout(room.timer);
    clearTimeout(room.botTimer);
    room.phase = 'gameOver';
    room.endReason = reason;
    room.turn = null;
  }

  function acceptAttempt(room, { reason, relatedTo, linkedToFirst }) {
    const { turn } = room;
    const { attempt } = turn;
    const breakdown = {
      letters: attempt.text.length * SCORING.perLetter,
      multiCross: attempt.crossedWordIds.length >= 2 ? SCORING.multiCrossBonus : 0,
      firstWord: linkedToFirst ? SCORING.firstWordBonus : 0,
    };
    const word = {
      id: crypto.randomUUID(),
      text: attempt.text,
      row: attempt.row,
      col: attempt.col,
      dir: attempt.dir,
      cells: attempt.cells,
      playerId: turn.playerId,
      explanation: attempt.explanation,
      reason,
      relatedTo,
      breakdown,
      points: breakdown.letters + breakdown.multiCross + breakdown.firstWord,
    };
    placeWord(room.board, word);
    room.words.push(word);
    room.lastEvent = { type: 'placed', playerId: turn.playerId, wordId: word.id, at: Date.now() };
    endTurn(room, true);
  }

  function rejectAttempt(room, reason) {
    const { turn } = room;
    turn.lastRejection = { text: turn.attempt.text, reason };
    turn.status = 'thinking';
    turn.vote = null;
    resumeTimer(room);
  }

  // kind 'appeal': the player asks to overturn the judge; 'manual': no judge available, players decide.
  function startVote(room, kind) {
    const { turn } = room;
    const voters = connectedHumans(room).map(p => p.id).filter(id => id !== turn.playerId);
    if (!voters.length) {
      if (kind === 'manual') acceptAttempt(room, { reason: '', relatedTo: '', linkedToFirst: false });
      return;
    }
    turn.status = 'voting';
    turn.vote = { kind, voters, votes: {} };
  }

  function resolveVote(room) {
    const { turn } = room;
    const { vote } = turn;
    const total = vote.voters.length;
    const yes = Object.values(vote.votes).filter(Boolean).length;
    const no = Object.keys(vote.votes).length - yes;
    const { voteThreshold } = room.settings;

    if (total && passesThreshold(yes, total, voteThreshold)) {
      acceptAttempt(room, {
        reason: vote.kind === 'appeal' ? 'התקבלה בערעור 🙌' : 'אושרה בהצבעה',
        relatedTo: '',
        linkedToFirst: false,
      });
    } else if (!total || !passesThreshold(total - no, total, voteThreshold)) {
      rejectAttempt(room, vote.kind === 'appeal'
        ? `הערעור נדחה. ${turn.lastRejection?.reason || ''}`.trim()
        : 'השחקנים לא אישרו את המילה');
      turn.appealed = true;
    }
  }

  async function judgeAttempt(room) {
    const { turn } = room;
    const turnId = turn.id;
    const { attempt } = turn;
    let verdict = null;

    if (isJudgeAvailable()) {
      try {
        verdict = await judgeWord({
          firstWord: room.words[0].text,
          boardWords: room.words.map(w => w.text),
          word: attempt.text,
          explanation: attempt.explanation,
          leniency: room.settings.leniency,
        });
      } catch (err) {
        console.error('[crossword] judge failed:', err.message);
      }
    }
    if (rooms.get(room.code) !== room || room.turn?.id !== turnId || turn.status !== 'checking') return;

    if (!verdict) startVote(room, 'manual');
    else if (verdict.isWord && verdict.associated) acceptAttempt(room, verdict);
    else rejectAttempt(room, verdict.reason || (verdict.isWord ? 'לא מצאנו קשר למילים שעל הלוח' : 'זו לא מילה מוכרת'));
    broadcast(room);
  }

  // ── membership ──────────────────────────────────────────────────────────

  function attach(socket, room, deviceId) {
    const previous = room.devices.get(deviceId);
    if (previous && previous !== socket.id) nsp.sockets.get(previous)?.disconnect(true);
    room.devices.set(deviceId, socket.id);
    socket.data.code = room.code;
    socket.data.deviceId = deviceId;
    clearTimeout(room.cleanupTimer);
    ensureHost(room);
  }

  function addPlayer(room, deviceId, name) {
    const player = { id: crypto.randomUUID(), name, deviceId };
    room.players.push(player);
    if (!room.hostId) room.hostId = player.id;
    return player;
  }

  function nameTaken(room, name) {
    return room.players.some(p => p.name === name);
  }

  // goneIds: players whose device left or disconnected; removed: true when they left the room for good.
  function afterPlayersGone(room, goneIds, removed) {
    if (!room.players.some(p => !p.isBot)) return deleteRoom(room);
    ensureHost(room);
    const { turn } = room;
    if (room.phase === 'playing' && turn) {
      if (removed && goneIds.includes(turn.playerId)) {
        startTurn(room, nextPlayerId(room, null));
      } else if (turn.status === 'voting') {
        turn.vote.voters = turn.vote.voters.filter(id => !goneIds.includes(id));
        goneIds.forEach(id => delete turn.vote.votes[id]);
        resolveVote(room);
      }
    }
    if (!connectedHumans(room).length) {
      room.cleanupTimer = setTimeout(() => deleteRoom(room), EMPTY_ROOM_TTL_MS);
    }
    broadcast(room);
  }

  // ── socket wiring ───────────────────────────────────────────────────────

  nsp.on('connection', socket => {
    const ctx = () => {
      const room = rooms.get(socket.data.code);
      const { deviceId } = socket.data;
      if (!room || room.devices.get(deviceId) !== socket.id) return null;
      return { room, deviceId, mine: room.players.filter(p => p.deviceId === deviceId) };
    };

    const on = (event, handler) => socket.on(event, (payload, ack) => {
      const done = typeof ack === 'function' ? ack : () => {};
      const c = ctx();
      if (!c) return done({ ok: false, error: 'לא נמצאת בחדר' });
      const error = handler(c, payload || {});
      if (error) return done({ ok: false, error });
      broadcast(c.room);
      done({ ok: true });
    });

    const isHost = c => c.mine.some(p => p.id === c.room.hostId);
    const ownsCurrentTurn = c => c.room.turn && c.mine.some(p => p.id === c.room.turn.playerId);

    socket.on('create', ({ name, practice } = {}, ack = () => {}) => {
      const n = cleanName(name);
      if (!n) return ack({ ok: false, error: 'צריך להקליד שם' });
      const room = createRoom(Boolean(practice));
      const deviceId = crypto.randomUUID();
      addPlayer(room, deviceId, n);
      attach(socket, room, deviceId);
      ack({ ok: true, code: room.code, deviceId });
      broadcast(room);
    });

    socket.on('join', ({ code, name } = {}, ack = () => {}) => {
      const room = rooms.get(String(code || '').trim());
      if (!room) return ack({ ok: false, error: 'לא מצאנו חדר עם הקוד הזה' });
      if (room.practice) return ack({ ok: false, error: 'זה חדר אימון לשחקן יחיד' });
      const n = cleanName(name);
      if (!n) return ack({ ok: false, error: 'צריך להקליד שם' });

      const deviceId = crypto.randomUUID();
      const existing = room.players.find(p => p.name === n);
      if (existing && isConnected(room, existing)) return ack({ ok: false, error: 'השם הזה כבר תפוס בחדר' });
      if (existing) existing.deviceId = deviceId;
      else if (room.phase !== 'lobby') return ack({ ok: false, error: 'המשחק כבר התחיל' });
      else addPlayer(room, deviceId, n);

      attach(socket, room, deviceId);
      ack({ ok: true, code: room.code, deviceId });
      broadcast(room);
    });

    socket.on('rejoin', ({ code, deviceId } = {}, ack = () => {}) => {
      const room = rooms.get(String(code || ''));
      if (!room || !room.players.some(p => p.deviceId === deviceId)) return ack({ ok: false });
      attach(socket, room, deviceId);
      ack({ ok: true, code: room.code, deviceId });
      broadcast(room);
    });

    socket.on('leave', () => {
      const c = ctx();
      if (!c) return;
      const removed = c.mine.map(p => p.id);
      c.room.players = c.room.players.filter(p => p.deviceId !== c.deviceId);
      c.room.devices.delete(c.deviceId);
      socket.data.code = null;
      afterPlayersGone(c.room, removed, true);
    });

    socket.on('disconnect', () => {
      const c = ctx();
      if (!c) return;
      c.room.devices.set(c.deviceId, null);
      afterPlayersGone(c.room, c.mine.map(p => p.id), false);
    });

    on('addLocalPlayer', (c, { name }) => {
      if (c.room.practice) return 'באימון משחק שחקן אחד';
      if (c.room.phase !== 'lobby') return 'אפשר להוסיף שחקנים רק לפני שהמשחק מתחיל';
      const n = cleanName(name);
      if (!n) return 'צריך להקליד שם';
      if (nameTaken(c.room, n)) return 'השם הזה כבר תפוס בחדר';
      addPlayer(c.room, c.deviceId, n);
    });

    on('removeLocalPlayer', (c, { playerId }) => {
      if (c.room.phase !== 'lobby') return 'אפשר להסיר שחקנים רק לפני שהמשחק מתחיל';
      if (!c.mine.some(p => p.id === playerId)) return 'השחקן לא במכשיר הזה';
      if (c.mine.length === 1) return 'זה השחקן האחרון במכשיר — אפשר לצאת מהחדר';
      c.room.players = c.room.players.filter(p => p.id !== playerId);
      ensureHost(c.room);
    });

    on('updateSettings', (c, { settings }) => {
      if (!isHost(c)) return 'רק מנהל החדר יכול לשנות הגדרות';
      if (c.room.phase !== 'lobby') return 'אפשר לשנות הגדרות רק לפני שהמשחק מתחיל';
      c.room.settings = sanitizeSettings(c.room.settings, settings);
    });

    on('startGame', c => {
      if (!isHost(c)) return 'רק מנהל החדר יכול להתחיל';
      if (c.room.phase !== 'lobby') return 'המשחק כבר התחיל';
      startGame(c.room);
    });

    on('submitWord', (c, { word, row, col, dir, explanation }) => {
      const { room } = c;
      const { turn } = room;
      if (room.phase !== 'playing' || !ownsCurrentTurn(c)) return 'זה לא התור שלך';
      if (turn.status !== 'thinking') return 'המילה הקודמת עדיין בבדיקה';
      if (turn.lastRejection && !room.settings.retry) return 'בהגדרות המשחק אין ניסיון נוסף';

      const check = checkPlacement(room.board, room.words, { word, row: Number(row), col: Number(col), dir });
      if (!check.ok) return check.error;

      pauseTimer(room);
      turn.status = 'checking';
      turn.lastRejection = null;
      turn.appealed = false;
      turn.attempt = {
        text: check.text,
        row: Number(row),
        col: Number(col),
        dir,
        cells: check.cells,
        crossedWordIds: check.crossedWordIds,
        explanation: String(explanation || '').trim().slice(0, MAX_EXPLANATION_LENGTH),
      };
      judgeAttempt(room);
    });

    on('appeal', c => {
      const { turn } = c.room;
      if (!ownsCurrentTurn(c) || turn.status !== 'thinking' || !turn.lastRejection) return 'אין מה לערער';
      if (turn.appealed) return 'כבר ערערת על המילה הזו';
      if (!connectedHumans(c.room).some(p => p.id !== turn.playerId)) return 'אין מי שיצביע';
      pauseTimer(c.room);
      turn.appealed = true;
      startVote(c.room, 'appeal');
    });

    on('vote', (c, { playerId, approve }) => {
      const { turn } = c.room;
      if (turn?.status !== 'voting') return 'אין הצבעה פתוחה';
      if (!c.mine.some(p => p.id === playerId)) return 'השחקן לא במכשיר הזה';
      if (!turn.vote.voters.includes(playerId)) return 'השחקן הזה לא משתתף בהצבעה';
      if (playerId in turn.vote.votes) return 'כבר הצבעת';
      turn.vote.votes[playerId] = Boolean(approve);
      resolveVote(c.room);
    });

    on('pass', c => {
      const { room } = c;
      if (room.phase !== 'playing' || !ownsCurrentTurn(c)) return 'זה לא התור שלך';
      if (room.turn.status !== 'thinking') return 'אי אפשר לוותר באמצע בדיקה';
      room.lastEvent = { type: 'pass', playerId: room.turn.playerId, at: Date.now() };
      endTurn(room, false);
    });

    on('endGame', c => {
      if (!isHost(c)) return 'רק מנהל החדר יכול לסיים';
      if (c.room.phase !== 'playing') return 'המשחק לא פעיל';
      endGame(c.room, 'host');
    });

    on('newGame', c => {
      if (!isHost(c)) return 'רק מנהל החדר יכול להתחיל משחק חדש';
      if (c.room.phase !== 'gameOver') return 'המשחק עדיין פעיל';
      Object.assign(c.room, { phase: 'lobby', board: null, words: [], turn: null, failStreak: 0, endReason: null, lastEvent: null });
      c.room.players = c.room.players.filter(p => !p.isBot);
    });

    // Practice only: the computer suggests a word that fits, using the same engine as the bot player.
    socket.on('hint', async (_, ack = () => {}) => {
      const c = ctx();
      if (!c) return ack({ ok: false, error: 'לא נמצאת בחדר' });
      const { room } = c;
      if (!room.practice || room.phase !== 'playing' || room.turn?.status !== 'thinking') return ack({ ok: false, error: 'אין רמזים עכשיו' });
      if (!isJudgeAvailable()) return ack({ ok: false, error: 'רמזים דורשים את השופט האוטומטי' });

      try {
        const move = await findMove({ board: room.board, words: room.words, level: room.settings.level, leniency: room.settings.leniency });
        if (!move) return ack({ ok: false, error: 'לא מצאתי מילה שנכנסת ללוח... אפשר לסיים את האימון' });
        room.hintsUsed++;
        broadcast(room);
        ack({ ok: true, hint: { word: move.check.text, row: move.row, col: move.col, dir: move.dir, relatedTo: move.relatedTo, reason: move.reason } });
      } catch (err) {
        console.error('[crossword] hint failed:', err.message);
        ack({
          ok: false,
          error: err.code === 'quota' ? 'מכסת הבקשות החינמית של Gemini נגמרה להיום, ולכן אין רמזים כרגע' : 'הרמז לא הצליח הפעם, נסו שוב',
        });
      }
    });
  });
}

module.exports = { createGame };

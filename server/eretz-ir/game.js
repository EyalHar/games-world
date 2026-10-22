const crypto = require('crypto');
const {
  ALL_LETTERS, HARD_LETTERS, CATEGORIES, OPTIONS, DEFAULT_SETTINGS,
  MAX_ANSWERS_PER_CATEGORY, MAX_ANSWER_LENGTH, MIN_CATEGORIES,
} = require('./constants');
const { checkAnswers, isCheckerAvailable } = require('./checker');
const { scoreRound } = require('./scoring');

const REVEAL_MS = 2500;
const COLLECT_TIMEOUT_MS = 2000;
const EMPTY_ROOM_TTL_MS = 30 * 60 * 1000;
const MAX_NAME_LENGTH = 16;

const rooms = new Map();
const CATEGORY_HINTS = new Map(CATEGORIES.map(c => [c.id, `${c.label} — ${c.llmHint}`]));

// ─── text helpers ──────────────────────────────────────────────────────────

function cleanText(s) {
  return String(s || '')
    .replace(/[֑-ׇ]/g, '')
    .replace(/['"׳״]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function startsWithLetter(text, letter) {
  const t = cleanText(text);
  return t[0] === letter || (t[0] === 'ה' && t[1] === letter);
}

function baseForm(text, letter) {
  const t = cleanText(text);
  return letter !== 'ה' && t[0] === 'ה' && t[1] === letter ? t.slice(1) : t;
}

// ─── sanitizing client input ───────────────────────────────────────────────

function sanitizeSettings(current, input = {}) {
  const next = { ...current };
  Object.keys(OPTIONS).forEach(key => {
    if (OPTIONS[key].includes(input[key])) next[key] = input[key];
  });
  if (Array.isArray(input.categories)) {
    const known = CATEGORIES.map(c => c.id).filter(id => input.categories.includes(id));
    if (known.length >= MIN_CATEGORIES) next.categories = known;
  }
  return next;
}

function sanitizeAnswers(input, categories) {
  const out = {};
  categories.forEach(catId => {
    const list = Array.isArray(input?.[catId]) ? input[catId] : [];
    out[catId] = list
      .map(s => String(s || '').trim().slice(0, MAX_ANSWER_LENGTH))
      .filter(Boolean)
      .slice(0, MAX_ANSWERS_PER_CATEGORY);
  });
  return out;
}

// ─── room helpers ──────────────────────────────────────────────────────────

function createCode() {
  let code;
  do code = String(1000 + Math.floor(Math.random() * 9000));
  while (rooms.has(code));
  return code;
}

function createRoom() {
  const room = {
    code: createCode(),
    hostId: null,
    players: [],
    settings: { ...DEFAULT_SETTINGS, categories: [...DEFAULT_SETTINGS.categories] },
    phase: 'lobby',
    usedLetters: [],
    round: null,
    results: null,
    disputes: [],
    history: [],
    phaseTimer: null,
    cleanupTimer: null,
  };
  rooms.set(room.code, room);
  return room;
}

function deleteRoom(room) {
  clearTimeout(room.phaseTimer);
  clearTimeout(room.cleanupTimer);
  rooms.delete(room.code);
}

const connectedPlayers = room => room.players.filter(p => p.connected);
const findPlayer = (room, id) => room.players.find(p => p.id === id);
const totalFor = (room, pid) => room.history.reduce((sum, h) => sum + (h.scores[pid] || 0), 0);

function ensureHost(room) {
  const host = findPlayer(room, room.hostId);
  if (host && host.connected) return;
  const next = connectedPlayers(room)[0];
  if (next) room.hostId = next.id;
  else if (!host) room.hostId = room.players[0]?.id ?? null;
}

function letterPool(room) {
  const unused = letters => letters.filter(l => !room.usedLetters.includes(l));
  const normal = ALL_LETTERS.filter(l => !HARD_LETTERS.includes(l));
  switch (room.settings.hardLetters) {
    case 'include': return unused(ALL_LETTERS);
    case 'exclude': return unused(normal);
    default: {
      const normalLeft = unused(normal);
      return normalLeft.length ? normalLeft : unused(HARD_LETTERS);
    }
  }
}

function pickStopper(room) {
  const connected = connectedPlayers(room);
  if (room.settings.stopper === 'host' || !connected.length) return room.hostId;
  return connected[(room.round.number - 1) % connected.length].id;
}

function publicState(room) {
  const { round, phase } = room;
  return {
    code: room.code,
    hostId: room.hostId,
    phase,
    settings: room.settings,
    checkerAvailable: isCheckerAvailable(),
    players: room.players.map(p => ({
      id: p.id, name: p.name, connected: p.connected, total: totalFor(room, p.id),
    })),
    round: round && {
      number: round.number,
      letter: phase === 'spinning' ? null : round.letter,
      pool: phase === 'spinning' ? letterPool(room) : null,
      isBonus: round.isBonus,
      bonusStart: round.bonusStart,
      stopperId: round.stopperId,
      remainingMs: phase === 'filling' ? Math.max(0, round.endsAt - Date.now()) : null,
      finishedBy: round.finishedBy,
    },
    results: room.results,
    disputes: room.disputes,
    history: room.history,
  };
}

// ─── game flow ─────────────────────────────────────────────────────────────

function createGame(io) {
  const broadcast = room => io.to(room.code).emit('state', publicState(room));

  function setPhase(room, phase) {
    clearTimeout(room.phaseTimer);
    room.phase = phase;
  }

  function startRound(room) {
    const pool = letterPool(room);
    if (!pool.length) return endGame(room);

    const isBonus = room.settings.hardLetters === 'later' && pool.every(l => HARD_LETTERS.includes(l));
    room.round = {
      number: room.history.length + 1,
      letter: null,
      isBonus,
      bonusStart: isBonus && !room.history.some(h => h.isBonus),
      stopperId: null,
      endsAt: null,
      finishedBy: null,
      answers: {},
      pendingFinal: new Set(),
    };
    room.round.stopperId = pickStopper(room);
    room.results = null;
    room.disputes = [];
    setPhase(room, 'spinning');
    broadcast(room);
  }

  function stopLetter(room, letter) {
    const pool = letterPool(room);
    room.round.letter = pool.includes(letter) ? letter : pool[Math.floor(Math.random() * pool.length)];
    room.usedLetters.push(room.round.letter);
    setPhase(room, 'reveal');
    room.phaseTimer = setTimeout(() => beginFilling(room), REVEAL_MS);
    broadcast(room);
  }

  function beginFilling(room) {
    const ms = room.settings.roundSeconds * 1000;
    setPhase(room, 'filling');
    room.round.endsAt = Date.now() + ms;
    room.phaseTimer = setTimeout(() => endFilling(room, null), ms);
    broadcast(room);
  }

  function endFilling(room, finishedBy) {
    if (room.phase !== 'filling') return;
    setPhase(room, 'collecting');
    room.round.finishedBy = finishedBy;
    room.round.pendingFinal = new Set(connectedPlayers(room).map(p => p.id));
    if (finishedBy) room.round.pendingFinal.delete(finishedBy);
    room.phaseTimer = setTimeout(() => runCheck(room), COLLECT_TIMEOUT_MS);
    broadcast(room);
    if (!room.round.pendingFinal.size) runCheck(room);
  }

  async function runCheck(room) {
    if (room.phase !== 'collecting') return;
    setPhase(room, 'checking');
    broadcast(room);

    const { letter, answers } = room.round;
    const byPlayer = {};
    const items = [];

    room.players.forEach(p => {
      byPlayer[p.id] = {};
      room.settings.categories.forEach(catId => {
        byPlayer[p.id][catId] = (answers[p.id]?.[catId] || []).map((text, idx) => {
          const answer = { text, valid: false, lemma: baseForm(text, letter), reason: '', points: 0, duplicate: false };
          if (startsWithLetter(text, letter)) {
            items.push({ id: `${p.id}|${catId}|${idx}`, categoryHint: CATEGORY_HINTS.get(catId), answer: text, ref: answer });
          } else {
            answer.reason = `לא מתחילה באות ${letter}`;
          }
          return answer;
        });
      });
    });

    let manualReason = null;
    if (items.length && !isCheckerAvailable()) manualReason = 'no-key';
    else if (items.length) {
      try {
        const verdicts = await checkAnswers({ letter, leniency: room.settings.leniency, items });
        items.forEach(({ id, ref }) => {
          const v = verdicts.get(id);
          ref.valid = v ? v.valid : true;
          if (v?.lemma) ref.lemma = cleanText(v.lemma);
          ref.reason = ref.valid ? '' : (v.reason || 'לא מתאימה לתחום');
        });
      } catch (err) {
        console.error('[eretz-ir] answer check failed:', err.message);
        manualReason = 'error';
      }
    }
    if (manualReason) items.forEach(({ ref }) => { ref.valid = true; });

    if (rooms.get(room.code) !== room || room.phase !== 'checking') return;
    room.results = { byPlayer, manual: Boolean(manualReason), manualReason };
    rescore(room);
    setPhase(room, 'review');
    broadcast(room);
  }

  function rescore(room) {
    const { round } = room;
    const scores = scoreRound({
      byPlayer: room.results.byPlayer,
      categories: room.settings.categories,
      scoring: room.settings.scoring,
      multiplier: round.isBonus ? 2 : 1,
    });
    const entry = { round: round.number, letter: round.letter, isBonus: round.isBonus, scores };
    const idx = room.history.findIndex(h => h.round === round.number);
    if (idx >= 0) room.history[idx] = entry;
    else room.history.push(entry);
  }

  function endGame(room) {
    setPhase(room, 'gameOver');
    broadcast(room);
  }

  // ── disputes (appeal = owner asks to accept, challenge = others ask to reject) ──

  function passesThreshold(yes, total, threshold) {
    if (threshold === 'unanimous') return yes === total;
    if (threshold === 'p65') return yes / total >= 0.65;
    return yes > total / 2;
  }

  function resolveDispute(room, dispute) {
    if (dispute.status !== 'open') return;
    const total = dispute.voters.length;
    const votes = Object.values(dispute.votes);
    const yes = votes.filter(Boolean).length;
    const no = votes.length - yes;
    const { voteThreshold } = room.settings;

    if (total && passesThreshold(yes, total, voteThreshold)) {
      dispute.status = 'accepted';
      const answer = room.results.byPlayer[dispute.playerId][dispute.catId][dispute.idx];
      answer.valid = dispute.kind === 'appeal';
      answer.reason = dispute.kind === 'appeal' ? '' : 'נפסלה בהצבעה';
      rescore(room);
    } else if (!total || !passesThreshold(total - no, total, voteThreshold)) {
      dispute.status = 'rejected';
    }
  }

  function dropVoter(room, playerId) {
    room.disputes.filter(d => d.status === 'open' && d.voters.includes(playerId)).forEach(d => {
      d.voters = d.voters.filter(id => id !== playerId);
      delete d.votes[playerId];
      resolveDispute(room, d);
    });
  }

  // ── membership ──────────────────────────────────────────────────────────

  function attach(socket, room, player) {
    player.socketId = socket.id;
    player.connected = true;
    socket.data.code = room.code;
    socket.data.playerId = player.id;
    socket.join(room.code);
    clearTimeout(room.cleanupTimer);
    ensureHost(room);
  }

  function handleGone(room, player, removed) {
    player.connected = false;
    player.socketId = null;
    if (removed) room.players = room.players.filter(p => p !== player);

    if (!room.players.length) return deleteRoom(room);

    ensureHost(room);
    if (room.phase === 'spinning' && room.round.stopperId === player.id) {
      room.round.stopperId = pickStopper(room);
    }
    if (room.phase === 'collecting') {
      room.round.pendingFinal.delete(player.id);
      if (!room.round.pendingFinal.size) runCheck(room);
    }
    if (room.phase === 'review') dropVoter(room, player.id);

    if (!connectedPlayers(room).length) {
      room.cleanupTimer = setTimeout(() => deleteRoom(room), EMPTY_ROOM_TTL_MS);
    }
    broadcast(room);
  }

  function validName(name) {
    const n = String(name || '').trim().slice(0, MAX_NAME_LENGTH);
    return n || null;
  }

  // ── socket wiring ───────────────────────────────────────────────────────

  io.on('connection', socket => {
    const ctx = () => {
      const room = rooms.get(socket.data.code);
      const player = room && findPlayer(room, socket.data.playerId);
      return player && player.socketId === socket.id ? { room, player } : null;
    };

    // Wraps handlers that require an active seat in a room; handlers return an error string or nothing.
    const on = (event, handler, { silent = false } = {}) => socket.on(event, (payload, ack) => {
      const done = typeof ack === 'function' ? ack : () => {};
      const c = ctx();
      if (!c) return done({ ok: false, error: 'לא נמצאת בחדר' });
      const error = handler(c.room, c.player, payload || {});
      if (error) return done({ ok: false, error });
      if (!silent) broadcast(c.room);
      done({ ok: true });
    });

    socket.on('create', ({ name } = {}, ack = () => {}) => {
      const n = validName(name);
      if (!n) return ack({ ok: false, error: 'צריך להקליד שם' });
      const room = createRoom();
      const player = { id: crypto.randomUUID(), name: n, socketId: null, connected: false };
      room.players.push(player);
      room.hostId = player.id;
      attach(socket, room, player);
      ack({ ok: true, code: room.code, playerId: player.id });
      broadcast(room);
    });

    socket.on('join', ({ code, name } = {}, ack = () => {}) => {
      const room = rooms.get(String(code || '').trim());
      if (!room) return ack({ ok: false, error: 'לא מצאנו חדר עם הקוד הזה' });
      const n = validName(name);
      if (!n) return ack({ ok: false, error: 'צריך להקליד שם' });

      let player = room.players.find(p => p.name === n);
      if (player && player.connected) return ack({ ok: false, error: 'השם הזה כבר תפוס בחדר' });
      if (!player) {
        player = { id: crypto.randomUUID(), name: n, socketId: null, connected: false };
        room.players.push(player);
      }
      attach(socket, room, player);
      ack({ ok: true, code: room.code, playerId: player.id });
      broadcast(room);
    });

    socket.on('rejoin', ({ code, playerId } = {}, ack = () => {}) => {
      const room = rooms.get(String(code || ''));
      const player = room && findPlayer(room, playerId);
      if (!player) return ack({ ok: false });
      if (player.socketId && player.socketId !== socket.id) {
        io.sockets.sockets.get(player.socketId)?.leave(room.code);
      }
      attach(socket, room, player);
      ack({ ok: true, code: room.code, playerId: player.id });
      broadcast(room);
    });

    socket.on('leave', () => {
      const c = ctx();
      if (!c) return;
      socket.leave(c.room.code);
      socket.data.code = null;
      handleGone(c.room, c.player, true);
    });

    socket.on('disconnect', () => {
      const c = ctx();
      if (c) handleGone(c.room, c.player, false);
    });

    on('updateSettings', (room, player, { settings }) => {
      if (player.id !== room.hostId) return 'רק מנהל החדר יכול לשנות הגדרות';
      if (room.phase !== 'lobby') return 'אפשר לשנות הגדרות רק לפני שהמשחק מתחיל';
      room.settings = sanitizeSettings(room.settings, settings);
    });

    on('startGame', (room, player) => {
      if (player.id !== room.hostId) return 'רק מנהל החדר יכול להתחיל';
      if (room.phase !== 'lobby') return 'המשחק כבר התחיל';
      startRound(room);
    });

    on('stopLetter', (room, player, { letter }) => {
      if (room.phase !== 'spinning') return 'האות כבר נבחרה';
      if (player.id !== room.round.stopperId) return 'זה לא התור שלך לעצור';
      stopLetter(room, letter);
    });

    on('answers', (room, player, { answers, final }) => {
      if (room.phase !== 'filling' && room.phase !== 'collecting') return 'הסיבוב נגמר';
      room.round.answers[player.id] = sanitizeAnswers(answers, room.settings.categories);
      if (room.phase === 'collecting' && final) {
        room.round.pendingFinal.delete(player.id);
        if (!room.round.pendingFinal.size) runCheck(room);
      }
    }, { silent: true });

    on('finish', (room, player, { answers }) => {
      if (room.phase !== 'filling') return 'הסיבוב כבר נגמר';
      const clean = sanitizeAnswers(answers, room.settings.categories);
      if (!room.settings.categories.every(catId => clean[catId].length)) return 'צריך למלא את כל הלוח';
      room.round.answers[player.id] = clean;
      endFilling(room, player.id);
    });

    on('openDispute', (room, player, { playerId, catId, idx }) => {
      if (room.phase !== 'review') return 'אפשר לערער רק בזמן הבדיקה';
      const answer = room.results.byPlayer[playerId]?.[catId]?.[idx];
      if (!answer) return 'התשובה לא נמצאה';
      if (!startsWithLetter(answer.text, room.round.letter)) return 'התשובה לא מתחילה באות הנכונה';
      const id = `${playerId}|${catId}|${idx}`;
      if (room.disputes.some(d => d.id === id)) return 'כבר הצבעתם על התשובה הזו';

      const kind = answer.valid ? 'challenge' : 'appeal';
      if (kind === 'appeal' && player.id !== playerId) return 'רק מי שכתב את התשובה יכול לערער';
      if (kind === 'challenge' && (!room.results.manual || player.id === playerId)) return 'אי אפשר לערער על התשובה הזו';

      const voters = connectedPlayers(room).map(p => p.id).filter(pid => pid !== playerId);
      if (!voters.length) return 'אין מי שיצביע';

      const dispute = { id, playerId, catId, idx, kind, initiatorId: player.id, voters, votes: {}, status: 'open' };
      if (kind === 'challenge') dispute.votes[player.id] = true;
      room.disputes.push(dispute);
      resolveDispute(room, dispute);
    });

    on('vote', (room, player, { disputeId, approve }) => {
      const dispute = room.disputes.find(d => d.id === disputeId);
      if (!dispute || dispute.status !== 'open') return 'ההצבעה כבר נסגרה';
      if (!dispute.voters.includes(player.id)) return 'את/ה לא משתתף/ת בהצבעה הזו';
      if (player.id in dispute.votes) return 'כבר הצבעת';
      dispute.votes[player.id] = Boolean(approve);
      resolveDispute(room, dispute);
    });

    on('nextRound', (room, player) => {
      if (player.id !== room.hostId) return 'רק מנהל החדר יכול להמשיך';
      if (room.phase !== 'review') return 'אי אפשר להמשיך עכשיו';
      if (room.disputes.some(d => d.status === 'open')) return 'יש הצבעות פתוחות';
      const { rounds } = room.settings;
      if (rounds !== 'all' && room.round.number >= rounds) endGame(room);
      else startRound(room);
    });

    on('endGame', (room, player) => {
      if (player.id !== room.hostId) return 'רק מנהל החדר יכול לסיים';
      if (room.phase === 'lobby' || room.phase === 'gameOver') return 'המשחק לא פעיל';
      endGame(room);
    });

    on('newGame', (room, player) => {
      if (player.id !== room.hostId) return 'רק מנהל החדר יכול להתחיל משחק חדש';
      if (room.phase !== 'gameOver') return 'המשחק עדיין פעיל';
      Object.assign(room, { usedLetters: [], round: null, results: null, disputes: [], history: [] });
      setPhase(room, 'lobby');
    });
  });
}

module.exports = { createGame };

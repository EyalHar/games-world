import React, { useState, useCallback } from 'react';
import { detectGender, tryAgain, encourage } from '../utils/genderDetection';
import { useSound } from '../hooks/useSound';
import './AssociationGame.css';

const API = `http://${window.location.hostname}:4403/api/game`;

const PRAISE_FEMALE = [
  'את מדהימה',
  'את מוכשרת',
  'את כוכבת אמיתית',
  'את גאונה',
  'יש לך ראש מבריק',
  'את חכמה גדולה',
  'את פשוט מצוינת',
  'איזו תשובה מבריקה',
  'את אלופה',
];

const PRAISE_MALE = [
  'אתה מדהים',
  'אתה מוכשר',
  'אתה כוכב אמיתי',
  'אתה גאון',
  'יש לך ראש מבריק',
  'אתה חכם גדול',
  'אתה פשוט מצוין',
  'איזו תשובה מבריקה',
  'אתה אלוף',
];

function randomPraise(gender) {
  const list = gender === 'female' ? PRAISE_FEMALE : PRAISE_MALE;
  return list[Math.floor(Math.random() * list.length)];
}

// ─── helpers ────────────────────────────────────────────────────────────────

function shuffleWords(puzzle) {
  const words = [
    { word: puzzle.associated[0], type: 'associated' },
    { word: puzzle.associated[1], type: 'associated' },
    { word: puzzle.unrelated,     type: 'unrelated'  },
  ];
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  return words;
}

function normalizeHebrew(s) {
  return (s || '').trim().replace(/[ְ-ׇ]/g, '');
}

// ─── sub-components ──────────────────────────────────────────────────────────

function Stars() {
  return (
    <div className="ag-stars" aria-hidden>
      {[...Array(18)].map((_, i) => (
        <span key={i} className="ag-star"
          style={{ top: `${5 + Math.random()*88}%`, left: `${3 + Math.random()*92}%`,
                   animationDelay: `${Math.random()*3}s`, fontSize: `${0.4+Math.random()*0.8}rem` }}>
          ✦
        </span>
      ))}
    </div>
  );
}

function ScoreBar({ score, level, playerName }) {
  return (
    <div className="ag-score-bar">
      <span className="ag-score">⭐ {score}</span>
      <span className="ag-player-name">{playerName}</span>
      <span className="ag-level">רמה {level}</span>
    </div>
  );
}

function HintModal({ hint, onClose }) {
  const [view, setView] = useState('text');
  return (
    <div className="ag-overlay" onClick={onClose}>
      <div className="ag-modal hint-modal" onClick={e => e.stopPropagation()}>
        <button className="ag-modal-close" onClick={onClose}>✕</button>
        <h3 className="ag-modal-title">💡 רמז</h3>

        <div className="hint-tabs">
          <button className={view==='text'?'active':''} onClick={()=>setView('text')}>📝 תיאור</button>
          <button className={view==='emojis'?'active':''} onClick={()=>setView('emojis')}>🖼️ תמונות</button>
        </div>

        {view === 'text' && (
          <p className="hint-text">{hint.text}</p>
        )}

        {view === 'emojis' && (
          <>
            <p className="hint-emojis-note">אחת מהתמונות האלה קשורה למילה הסודית 🔍</p>
            <div className="hint-emojis-grid">
              {hint.emojis.map((em, i) => (
                <div key={i} className="hint-emoji-card">{em}</div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CelebrationOverlay({ playerName, gender, score, gained, onNext, onRestart }) {
  const [praise] = useState(() => randomPraise(gender));
  return (
    <div className="ag-celebration">
      <Stars />
      <div className="celebration-content">
        <div className="celebration-emoji">🎉</div>
        <h2 className="celebration-title">
          כל הכבוד {playerName}! {praise}!
        </h2>
        <p className="celebration-score">+{gained} נקודות!</p>
        <p className="celebration-total">סה"כ: ⭐ {score}</p>
        <div className="celebration-btns">
          <button className="btn-primary" onClick={onNext}>משחק הבא ▶</button>
          <button className="btn-secondary" onClick={onRestart}>התחל מחדש 🔄</button>
        </div>
      </div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function AssociationGame() {
  const { playSuccess, playWrong, playCelebration, playClick, playHint, playEncourage } = useSound();

  // phases: mode-select | name-setup | gender-ask | level-select
  //         create-setup | handoff | guesser-name | guesser-gender-ask
  //         playing | check-result | guessing | celebrating
  const [phase, setPhase] = useState('mode-select');
  const [mode, setMode] = useState('computer'); // 'computer' | 'create'
  const [errorMsg, setErrorMsg] = useState('');

  // player info
  const [playerName, setPlayerName]   = useState('');
  const [playerGender, setPlayerGender] = useState('male');
  const [nameInput, setNameInput]     = useState('');

  // guesser (create mode only)
  const [guesserName, setGuesserName]     = useState('');
  const [guesserGender, setGuesserGender] = useState('male');
  const [guesserInput, setGuesserInput]   = useState('');

  // game state
  const [level, setLevel]           = useState(1);
  const [puzzles, setPuzzles]       = useState([]);
  const [puzzleIdx, setPuzzleIdx]   = useState(0);
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [shuffledWords, setShuffledWords] = useState([]);
  const [wordAssignments, setWordAssignments] = useState([null, null, null]); // 'fairy1'|'fairy2'|'demon'|null
  const [dragging, setDragging]     = useState(null); // { card, fromSlot }
  const [checkResult, setCheckResult] = useState(null); // null | array of true/false
  const [guess, setGuess]           = useState('');
  const [guessWrong, setGuessWrong] = useState(false);
  const [score, setScore]           = useState(0);
  const [gained, setGained]         = useState(0);
  const [hintsUsed, setHintsUsed]   = useState(0);
  const [showHint, setShowHint]     = useState(false);
  const [sortCorrect, setSortCorrect] = useState(false);
  const [checkAttempts, setCheckAttempts] = useState(0);

  // create mode puzzle
  const [createForm, setCreateForm] = useState({ word:'', assoc1:'', assoc2:'', unrelated:'', hint:'' });

  // ── helpers ──────────────────────────────────────────────────────────────

  const startPuzzle = useCallback((p) => {
    setCurrentPuzzle(p);
    setShuffledWords(shuffleWords(p));
    setWordAssignments([null, null, null]);
    setCheckResult(null);
    setSortCorrect(false);
    setGuess('');
    setGuessWrong(false);
    setHintsUsed(0);
    setCheckAttempts(0);
    setPhase('playing');
  }, []);

  const loadAndStart = useCallback(async (lvl) => {
    const url = `${API}/puzzles?level=${lvl}`;
    console.log('[DEBUG] fetching:', url);
    try {
      const res = await fetch(url);
      console.log('[DEBUG] response status:', res.status, res.ok);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log('[DEBUG] puzzles received:', data.length, data);
      if (!data.length) throw new Error('empty puzzle list');
      setPuzzles(data);
      setPuzzleIdx(0);
      startPuzzle(data[0]);
    } catch (err) {
      console.error('[DEBUG] loadAndStart error:', err);
      setPhase('error');
      setErrorMsg(`${err.message}\n\nURL שנוסה: ${url}\n\nודא שהשרת פועל:\n  cd server && npm run dev`);
    }
  }, [startPuzzle]);

  // ── phase handlers ────────────────────────────────────────────────────────

  const handleModeSelect = (m) => {
    playClick();
    setMode(m);
    setScore(0);
    setPhase('name-setup');
  };

  const handleNameSubmit = () => {
    const n = nameInput.trim();
    if (!n) return;
    const { gender, certain } = detectGender(n);
    setPlayerName(n);
    if (!certain) {
      setPhase('gender-ask');
    } else {
      setPlayerGender(gender);
      if (mode === 'computer') setPhase('level-select');
      else setPhase('create-setup');
    }
  };

  const handleGenderAnswer = (g) => {
    playClick();
    setPlayerGender(g);
    if (mode === 'computer') setPhase('level-select');
    else setPhase('create-setup');
  };

  const handleLevelSelect = (lvl) => {
    playClick();
    setLevel(lvl);
    loadAndStart(lvl);
  };

  const handleCreateSubmit = () => {
    const { word, assoc1, assoc2, unrelated } = createForm;
    if (!word.trim() || !assoc1.trim() || !assoc2.trim() || !unrelated.trim()) return;
    setPhase('handoff');
  };

  const handleHandoffContinue = () => {
    playClick();
    setPhase('guesser-name');
  };

  const handleGuesserNameSubmit = () => {
    const n = guesserInput.trim();
    if (!n) return;
    const { gender, certain } = detectGender(n);
    setGuesserName(n);
    if (!certain) setPhase('guesser-gender-ask');
    else { setGuesserGender(gender); launchCreateGame(); }
  };

  const handleGuesserGenderAnswer = (g) => {
    playClick();
    setGuesserGender(g);
    launchCreateGame();
  };

  const launchCreateGame = () => {
    const { word, assoc1, assoc2, unrelated, hint } = createForm;
    const puzzle = {
      id: 'custom',
      level: 1,
      word: word.trim(),
      associated: [assoc1.trim(), assoc2.trim()],
      unrelated: unrelated.trim(),
      hint: { text: hint.trim() || 'אין רמז – תחשוב טוב!', emojis: ['🌟','🎈','🐾','🌺','⚡','🍀','🎭','🌙','🔮','🎪'], answerEmoji: '🌟' },
    };
    // Swap player to guesser for playing phase
    setPlayerName(guesserName || playerName);
    setPlayerGender(guesserGender);
    setPuzzles([puzzle]);
    setPuzzleIdx(0);
    startPuzzle(puzzle);
  };

  // ── drag & drop ───────────────────────────────────────────────────────────

  const cardsInHand = ['fairy1', 'fairy2', 'demon'].filter(c =>
    !wordAssignments.includes(c)
  );

  const onDragStart = (card, fromSlot) => {
    setDragging({ card, fromSlot });
  };

  const onDrop = (toSlot) => {
    if (!dragging) return;
    const { card, fromSlot } = dragging;
    const next = [...wordAssignments];

    const displaced = typeof toSlot === 'number' ? next[toSlot] : null;

    if (typeof fromSlot === 'number') next[fromSlot] = null;

    if (typeof toSlot === 'number') {
      if (displaced && typeof fromSlot === 'number') next[fromSlot] = displaced;
      next[toSlot] = card;
    }

    setWordAssignments(next);
    setDragging(null);
    playClick();
  };

  const onDropHand = () => {
    if (!dragging) return;
    const { card, fromSlot } = dragging;
    if (typeof fromSlot === 'number') {
      const next = [...wordAssignments];
      next[fromSlot] = null;
      setWordAssignments(next);
    }
    setDragging(null);
  };

  // ── check sort ────────────────────────────────────────────────────────────

  const handleCheck = () => {
    const allAssigned = wordAssignments.every(a => a !== null);
    if (!allAssigned) return;

    const results = shuffledWords.map((w, i) => {
      const card = wordAssignments[i];
      if (w.type === 'associated') return card === 'fairy1' || card === 'fairy2';
      return card === 'demon';
    });

    setCheckResult(results);
    const allCorrect = results.every(Boolean);
    setCheckAttempts(a => a + 1);

    if (allCorrect) {
      setSortCorrect(true);
      playSuccess();
      setTimeout(() => setPhase('guessing'), 900);
    } else {
      playWrong();
    }
  };

  const handleGuessSubmit = () => {
    const norm = normalizeHebrew(guess);
    const target = normalizeHebrew(currentPuzzle.word);
    if (!norm) return;

    if (norm === target) {
      const pts = calcScore();
      setGained(pts);
      setScore(s => s + pts);
      playCelebration();
      setPhase('celebrating');
    } else {
      setGuessWrong(true);
      playEncourage();
      setTimeout(() => setGuessWrong(false), 1000);
    }
  };

  const calcScore = () => {
    let base = 20 - hintsUsed * 5;
    if (checkAttempts > 1) base -= (checkAttempts - 1) * 3;
    base += sortCorrect ? 10 : 0;
    return Math.max(base * level, 5);
  };

  const handleNextPuzzle = () => {
    playClick();
    if (mode === 'create') {
      setPhase('mode-select');
      return;
    }
    const next = puzzleIdx + 1;
    if (next >= puzzles.length) {
      loadAndStart(level);
    } else {
      setPuzzleIdx(next);
      startPuzzle(puzzles[next]);
    }
  };

  const handleRestart = () => {
    playClick();
    // איפוס מלא של כל השדות כדי שהשחקן/ית הבא/ה יתחילו מאפס
    setMode('computer');
    setPlayerName('');
    setPlayerGender('male');
    setNameInput('');
    setGuesserName('');
    setGuesserGender('male');
    setGuesserInput('');
    setLevel(1);
    setPuzzles([]);
    setPuzzleIdx(0);
    setCurrentPuzzle(null);
    setShuffledWords([]);
    setWordAssignments([null, null, null]);
    setCheckResult(null);
    setGuess('');
    setGuessWrong(false);
    setScore(0);
    setGained(0);
    setHintsUsed(0);
    setShowHint(false);
    setSortCorrect(false);
    setCheckAttempts(0);
    setCreateForm({ word:'', assoc1:'', assoc2:'', unrelated:'', hint:'' });
    setErrorMsg('');
    setPhase('mode-select');
  };

  const handleUseHint = () => {
    playHint();
    setHintsUsed(h => h + 1);
    setShowHint(true);
  };

  const activePlayer = mode === 'create' ? (guesserName || playerName) : playerName;
  const activeGender = mode === 'create' ? guesserGender : playerGender;

  // ── render phases ─────────────────────────────────────────────────────────

  if (phase === 'error') return (
    <div className="ag-page">
      <Stars />
      <div className="ag-center-card" style={{borderColor:'rgba(214,48,49,0.5)'}}>
        <div className="ag-game-icon">⚠️</div>
        <h2 className="ag-title" style={{fontSize:'1.4rem'}}>שגיאת חיבור לשרת</h2>
        <pre style={{
          background:'rgba(0,0,0,0.4)', color:'#ff7675', borderRadius:12,
          padding:'14px 16px', fontSize:'0.78rem', whiteSpace:'pre-wrap',
          wordBreak:'break-all', width:'100%', textAlign:'right', direction:'rtl'
        }}>{errorMsg}</pre>
        <p style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.5)'}}>
          פרטי ה-DEBUG מלאים נמצאים ב-Console של הדפדפן (F12)
        </p>
        <button className="btn-primary" onClick={() => { setPhase('mode-select'); setErrorMsg(''); }}>
          חזור לתפריט
        </button>
      </div>
    </div>
  );

  if (phase === 'mode-select') return (
    <div className="ag-page">
      <Stars />
      <div className="ag-center-card">
        <div className="ag-game-icon">🧚</div>
        <h1 className="ag-title">משחק האסוציאציות</h1>
        <p className="ag-subtitle">מה המילה הסודית?</p>
        <div className="ag-mode-btns">
          <button className="btn-mode" onClick={() => handleModeSelect('computer')}>
            <span className="btn-mode-emoji">💻</span>
            <span className="btn-mode-label">המחשב בוחר</span>
            <span className="btn-mode-desc">המחשב יבחר מילה ואתה תנחש</span>
          </button>
          <button className="btn-mode" onClick={() => handleModeSelect('create')}>
            <span className="btn-mode-emoji">✏️</span>
            <span className="btn-mode-label">אני יוצר</span>
            <span className="btn-mode-desc">בחר מילה בעצמך וחבר/ה ינחש</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (phase === 'name-setup') return (
    <div className="ag-page">
      <Stars />
      <div className="ag-center-card">
        <div className="ag-game-icon">👋</div>
        <h2 className="ag-title">מה שמך?</h2>
        <p className="ag-subtitle">
          {mode === 'create' ? 'שם מי שיוצר את החידה:' : 'הכנס/י את שמך:'}
        </p>
        <input
          className="ag-input"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
          placeholder="כתוב שם כאן..."
          autoFocus
        />
        <button className="btn-primary" onClick={handleNameSubmit} disabled={!nameInput.trim()}>
          המשך ▶
        </button>
      </div>
    </div>
  );

  if (phase === 'gender-ask') return (
    <div className="ag-page">
      <Stars />
      <div className="ag-center-card">
        <div className="ag-game-icon">🤔</div>
        <h2 className="ag-title">{nameInput} — בן או בת?</h2>
        <div className="ag-gender-btns">
          <button className="btn-gender" onClick={() => handleGenderAnswer('male')}>👦 בן</button>
          <button className="btn-gender" onClick={() => handleGenderAnswer('female')}>👧 בת</button>
        </div>
      </div>
    </div>
  );

  if (phase === 'level-select') return (
    <div className="ag-page">
      <Stars />
      <div className="ag-center-card">
        <div className="ag-game-icon">🏆</div>
        <h2 className="ag-title">שלום {playerName}!</h2>
        <p className="ag-subtitle">בחר/י רמת קושי:</p>
        <div className="ag-level-btns">
          {[
            { n:1, label:'קלה', emoji:'😊', desc:'חיות ועצמים פשוטים' },
            { n:2, label:'בינונית', emoji:'🤓', desc:'קצת יותר מאתגר' },
            { n:3, label:'קשה', emoji:'🔥', desc:'למומחים בלבד!' },
          ].map(l => (
            <button key={l.n} className="btn-level" onClick={() => handleLevelSelect(l.n)}>
              <span className="btn-level-emoji">{l.emoji}</span>
              <span className="btn-level-name">{l.label}</span>
              <span className="btn-level-desc">{l.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (phase === 'create-setup') return (
    <div className="ag-page">
      <Stars />
      <div className="ag-center-card wide">
        <div className="ag-game-icon">✏️</div>
        <h2 className="ag-title">יצירת חידה — {playerName}</h2>
        <p className="ag-subtitle">מלא/י את הפרטים (חבר/ה לא יראה מסך זה)</p>

        <div className="create-form">
          <label className="create-label">🔐 המילה הסודית שלך:</label>
          <input className="ag-input" placeholder="לדוגמה: כלב"
            value={createForm.word} onChange={e => setCreateForm(f=>({...f,word:e.target.value}))} />

          <label className="create-label">🧚 מילה קשורה #1:</label>
          <input className="ag-input" placeholder="לדוגמה: עצם"
            value={createForm.assoc1} onChange={e => setCreateForm(f=>({...f,assoc1:e.target.value}))} />

          <label className="create-label">🧚 מילה קשורה #2:</label>
          <input className="ag-input" placeholder="לדוגמה: נביחה"
            value={createForm.assoc2} onChange={e => setCreateForm(f=>({...f,assoc2:e.target.value}))} />

          <label className="create-label">👹 מילה שאינה קשורה:</label>
          <input className="ag-input" placeholder="לדוגמה: מאוורר"
            value={createForm.unrelated} onChange={e => setCreateForm(f=>({...f,unrelated:e.target.value}))} />

          <label className="create-label">💡 רמז (לא חובה):</label>
          <input className="ag-input" placeholder="תיאור שיעזור לנחש..."
            value={createForm.hint} onChange={e => setCreateForm(f=>({...f,hint:e.target.value}))} />
        </div>

        <button className="btn-primary"
          disabled={!createForm.word.trim()||!createForm.assoc1.trim()||!createForm.assoc2.trim()||!createForm.unrelated.trim()}
          onClick={handleCreateSubmit}>
          הבא ▶
        </button>
      </div>
    </div>
  );

  if (phase === 'handoff') return (
    <div className="ag-page">
      <Stars />
      <div className="ag-center-card">
        <div className="ag-game-icon" style={{fontSize:'3.5rem'}}>📱</div>
        <h2 className="ag-title">עכשיו מסור/י את המכשיר!</h2>
        <p className="ag-subtitle" style={{fontSize:'1.1rem',lineHeight:1.7}}>
          העבר/י את הטלפון/מחשב לחבר/ה שינחש את המילה שלך.
        </p>
        <button className="btn-primary" onClick={handleHandoffContinue}>המשך ▶</button>
      </div>
    </div>
  );

  if (phase === 'guesser-name') return (
    <div className="ag-page">
      <Stars />
      <div className="ag-center-card">
        <div className="ag-game-icon">👋</div>
        <h2 className="ag-title">שלום מנחש/ת!</h2>
        <p className="ag-subtitle">מה שמך?</p>
        <input className="ag-input" value={guesserInput}
          onChange={e => setGuesserInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGuesserNameSubmit()}
          placeholder="כתוב שם כאן..." autoFocus />
        <button className="btn-primary" onClick={handleGuesserNameSubmit} disabled={!guesserInput.trim()}>
          בואו נשחק! ▶
        </button>
      </div>
    </div>
  );

  if (phase === 'guesser-gender-ask') return (
    <div className="ag-page">
      <Stars />
      <div className="ag-center-card">
        <div className="ag-game-icon">🤔</div>
        <h2 className="ag-title">{guesserInput} — בן או בת?</h2>
        <div className="ag-gender-btns">
          <button className="btn-gender" onClick={() => handleGuesserGenderAnswer('male')}>👦 בן</button>
          <button className="btn-gender" onClick={() => handleGuesserGenderAnswer('female')}>👧 בת</button>
        </div>
      </div>
    </div>
  );

  if (phase === 'celebrating') return (
    <CelebrationOverlay
      playerName={activePlayer}
      gender={activeGender}
      score={score}
      gained={gained}
      onNext={handleNextPuzzle}
      onRestart={handleRestart}
    />
  );

  // ── playing / check-result / guessing ────────────────────────────────────

  if (!currentPuzzle) return null;

  const allAssigned = wordAssignments.every(a => a !== null);
  const isGuessing = phase === 'guessing';
  const isPlaying  = phase === 'playing';

  const cardLabel = { fairy1:'🧚', fairy2:'🧚', demon:'👹' };
  const cardClass = { fairy1:'card-fairy', fairy2:'card-fairy', demon:'card-demon' };

  return (
    <div className="ag-page game-active">
      <Stars />
      <ScoreBar score={score} level={level} playerName={activePlayer} />

      <div className="ag-game-area">
        <h2 className="ag-question">
          {isGuessing
            ? `${activeGender === 'female' ? 'כתבי' : 'כתוב'} את המילה הסודית:`
            : `${activeGender === 'female' ? 'גררי' : 'גרור'} את הקלפים למקומות הנכונים`
          }
        </h2>

        {/* Word cards */}
        <div className="ag-words-row">
          {shuffledWords.map((w, i) => {
            const assigned = wordAssignments[i];
            const result   = checkResult ? checkResult[i] : null;
            return (
              <div
                key={i}
                className={`ag-word-slot ${result===true?'slot-correct':''} ${result===false?'slot-wrong':''} ${dragging?'slot-droppable':''}`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); onDrop(i); }}
              >
                {/* assigned card on top of word */}
                {assigned && (
                  <div
                    className={`ag-card ${cardClass[assigned]} card-on-slot`}
                    draggable={isPlaying}
                    onDragStart={() => onDragStart(assigned, i)}
                  >
                    {cardLabel[assigned]}
                    {result === true  && <span className="slot-badge correct">✓</span>}
                    {result === false && <span className="slot-badge wrong">✗</span>}
                  </div>
                )}
                <div className="ag-word-text">{w.word}</div>
                {!assigned && <div className="slot-placeholder">הנח כאן</div>}
              </div>
            );
          })}
        </div>

        {/* Hand (unassigned cards) */}
        {isPlaying && (
          <div
            className="ag-hand"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); onDropHand(); }}
          >
            <p className="ag-hand-label">הקלפים שלך:</p>
            <div className="ag-hand-cards">
              {cardsInHand.map(c => (
                <div
                  key={c}
                  className={`ag-card ${cardClass[c]}`}
                  draggable
                  onDragStart={() => onDragStart(c, 'hand')}
                >
                  {cardLabel[c]}
                  <span className="card-name">{c.startsWith('fairy') ? 'פיה' : 'שדון'}</span>
                </div>
              ))}
              {cardsInHand.length === 0 && <span className="hand-empty">כל הקלפים מוצבים!</span>}
            </div>
          </div>
        )}

        {/* Check button */}
        {isPlaying && (
          <div className="ag-actions">
            {checkResult && !checkResult.every(Boolean) && (
              <p className="ag-feedback wrong">{tryAgain(activePlayer, activeGender)}</p>
            )}
            <button className="btn-primary" onClick={handleCheck} disabled={!allAssigned}>
              בדיקה ✔
            </button>
            <button className="btn-hint" onClick={handleUseHint} disabled={hintsUsed >= 2}>
              💡 רמז {hintsUsed > 0 ? `(${hintsUsed}/2)` : ''}
            </button>
          </div>
        )}

        {/* Guess phase */}
        {isGuessing && (
          <div className="ag-guess-area">
            <div className="ag-sort-success">✓ מצוין! {encourage(activePlayer, activeGender)}</div>
            <div className="ag-guess-row">
              <input
                className={`ag-input guess-input ${guessWrong ? 'shake' : ''}`}
                value={guess}
                onChange={e => setGuess(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGuessSubmit()}
                placeholder="מה המילה הסודית?"
                autoFocus
              />
              <button className="btn-primary" onClick={handleGuessSubmit} disabled={!guess.trim()}>
                שלח! 🎯
              </button>
            </div>
            {guessWrong && (
              <p className="ag-feedback wrong">{tryAgain(activePlayer, activeGender)}</p>
            )}
            <button className="btn-hint" onClick={handleUseHint} disabled={hintsUsed >= 2}>
              💡 רמז {hintsUsed > 0 ? `(${hintsUsed}/2)` : ''}
            </button>
          </div>
        )}
      </div>

      {showHint && currentPuzzle.hint && (
        <HintModal hint={currentPuzzle.hint} onClose={() => setShowHint(false)} />
      )}
    </div>
  );
}

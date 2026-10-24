const { generateJson } = require('../llm/gemini');
const { judgeWord } = require('./judge');
const { findPlacements, normalizeWord } = require('./rules');
const { SCORING } = require('./constants');

const SUGGESTION_COUNT = 15;
const MAX_JUDGED_CANDIDATES = 2;

const LEVEL_STYLE = {
  easy: 'מילים קצרות ופשוטות (2–4 אותיות) שילד בן 7 מכיר.',
  medium: 'מילים מוכרות באורך בינוני.',
  hard: 'מילים ארוכות ומעניינות יותר (5 אותיות ומעלה) שמראות חשיבה יצירתית.',
};

const SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          word: { type: 'string' },
          relatedTo: { type: 'string' },
          reason: { type: 'string' },
          linkedToFirst: { type: 'boolean' },
        },
        required: ['word', 'relatedTo', 'reason', 'linkedToFirst'],
      },
    },
  },
  required: ['suggestions'],
};

function buildPrompt({ firstWord, boardWords, level, avoid }) {
  const letters = [...new Set(boardWords.join(''))].join(' ');
  return `אתה משחק במשחק "תשבץ אסוציאציות" לילדים בעברית.
על הלוח המילים: ${JSON.stringify(boardWords)}. המילה הראשונה: "${firstWord}".

הצע ${SUGGESTION_COUNT} מילים חדשות. כל מילה:
- מילה אחת בעברית, בלי רווחים ובלי ניקוד, שלא נמצאת כבר על הלוח${avoid.length ? ` ושאינה אחת מאלה: ${JSON.stringify(avoid)}` : ''}.
- קשורה בבירור במשמעות לאחת המילים שעל הלוח (relatedTo — המילה מהלוח בדיוק כפי שהיא כתובה).
- מכילה לפחות אחת מהאותיות שכבר על הלוח: ${letters}.
- סגנון: ${LEVEL_STYLE[level]}

לכל מילה: reason — משפט קצר לילדים (עד 10 מילים) שמסביר את הקשר; linkedToFirst — האם היא קשורה ישירות גם ל"${firstWord}".`;
}

function estimatePoints(option) {
  return option.check.text.length * SCORING.perLetter
    + (option.check.crossedWordIds.length >= 2 ? SCORING.multiCrossBonus : 0)
    + (option.linkedToFirst ? SCORING.firstWordBonus : 0);
}

const shuffle = list => list
  .map(item => [Math.random(), item])
  .sort((a, b) => a[0] - b[0])
  .map(([, item]) => item);

// easy: 3–4 letter words first; medium: any order; hard: highest score first.
function rankOptions(options, level) {
  if (level === 'hard') return [...options].sort((a, b) => estimatePoints(b) - estimatePoints(a));
  if (level === 'easy') {
    const simple = o => o.check.text.length >= 3 && o.check.text.length <= 4;
    return [...shuffle(options.filter(simple)), ...shuffle(options.filter(o => !simple(o)))];
  }
  return shuffle(options);
}

// One placement per word, best-ranked first.
function distinctWords(ranked) {
  const seen = new Set();
  return ranked.filter(o => !seen.has(o.word) && seen.add(o.word));
}

// Asks the LLM for associated words, lets the board rules find where they fit, and runs the
// winners past the same judge the players face, so the computer can't sneak in weak links.
async function findMove({ board, words, level, leniency, avoid = [] }) {
  const boardWords = words.map(w => w.text);
  const { suggestions } = await generateJson({
    prompt: buildPrompt({ firstWord: words[0].text, boardWords, level, avoid }),
    schema: SCHEMA,
    tag: 'crossword-bot',
  });

  const options = [];
  const stats = { suggested: suggestions.length, offBoardLink: 0, noFit: 0, rejected: [] };
  suggestions.forEach(s => {
    const text = normalizeWord(s.word);
    if (!text || !boardWords.includes(s.relatedTo)) { stats.offBoardLink++; return; }
    const placements = findPlacements(board, words, text);
    if (!placements.length) stats.noFit++;
    placements.forEach(p => options.push({ ...p, ...s, word: text }));
  });

  const candidates = distinctWords(rankOptions(options, level)).slice(0, MAX_JUDGED_CANDIDATES);
  for (const candidate of candidates) {
    const verdict = await judgeWord({ firstWord: words[0].text, boardWords, word: candidate.word, explanation: candidate.reason, leniency });
    if (verdict.isWord && verdict.associated) {
      return { ...candidate, reason: verdict.reason, relatedTo: verdict.relatedTo, linkedToFirst: verdict.linkedToFirst };
    }
    stats.rejected.push(candidate.word);
  }
  console.info(`[crossword-bot] no move: ${JSON.stringify(stats)} suggestions=${JSON.stringify(suggestions.map(s => `${s.word}←${s.relatedTo}`))}`);
  return null;
}

module.exports = { findMove };

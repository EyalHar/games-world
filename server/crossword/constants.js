const BOARD_SIZE = 20;
const MIN_WORD_LENGTH = 2;
const MAX_EXPLANATION_LENGTH = 80;

const SCORING = {
  perLetter: 1,
  multiCrossBonus: 3,
  firstWordBonus: 3,
};

const OPTIONS = {
  level: ['easy', 'medium', 'hard'],
  turnSeconds: [30, 60, 90, 120],
  retry: [true, false],
  leniency: ['strict', 'medium', 'lenient'],
  voteThreshold: ['majority', 'p65', 'unanimous'],
};

const DEFAULT_SETTINGS = {
  level: 'easy',
  turnSeconds: 60,
  retry: true,
  leniency: 'medium',
  voteThreshold: 'majority',
};

// The level sets the topic of the first word (and how the computer player chooses its words).
const START_WORDS = {
  easy: [ // animals, home, food
    'כלב', 'חתול', 'פיל', 'אריה', 'קוף', 'ציפור', 'דג', 'פרפר', 'סוס', 'פרה', 'ארנב', 'צב',
    'בית', 'מטבח', 'מיטה', 'שולחן', 'כיסא', 'חלון', 'דלת', 'אמבטיה',
    'עוגה', 'שוקולד', 'גלידה', 'תפוח', 'בננה', 'פיצה', 'לחם', 'חלב', 'ביצה', 'מרק',
  ],
  medium: [ // nature, school, professions, transport
    'שמש', 'ירח', 'ים', 'יער', 'הר', 'נהר', 'גשם', 'שלג', 'פרח', 'מדבר', 'כוכב', 'חוף',
    'כיתה', 'מורה', 'ספר', 'מחברת', 'עיפרון', 'הפסקה', 'תיק',
    'רופא', 'שוטר', 'כבאי', 'טבח', 'נגר', 'טייס',
    'אוטובוס', 'רכבת', 'מטוס', 'סירה', 'אופניים', 'רקטה',
  ],
  hard: [ // abstract ideas
    'חופש', 'זמן', 'חלום', 'אומץ', 'שמחה', 'פחד', 'חברות', 'סוד', 'הצלחה', 'סקרנות',
    'זיכרון', 'דמיון', 'תקווה', 'שקט', 'אהבה', 'צדק', 'סבלנות', 'הפתעה', 'געגוע', 'כבוד',
  ],
};

const BOT = { name: '🤖 רובי', thinkMs: 1200 };

module.exports = {
  BOARD_SIZE, MIN_WORD_LENGTH, MAX_EXPLANATION_LENGTH, SCORING, OPTIONS, DEFAULT_SETTINGS, START_WORDS, BOT,
};

const BOARD_SIZE = 20;
const MIN_WORD_LENGTH = 2;
const MAX_EXPLANATION_LENGTH = 80;

const SCORING = {
  perLetter: 1,
  multiCrossBonus: 3,
  firstWordBonus: 3,
};

const OPTIONS = {
  turnSeconds: [30, 60, 90, 120],
  retry: [true, false],
  leniency: ['strict', 'medium', 'lenient'],
  voteThreshold: ['majority', 'p65', 'unanimous'],
};

const DEFAULT_SETTINGS = {
  turnSeconds: 60,
  retry: true,
  leniency: 'medium',
  voteThreshold: 'majority',
};

const START_WORDS = [
  'שמש', 'ירח', 'כוכב', 'חתול', 'כלב', 'פרפר', 'גינה', 'פרח', 'ספר', 'מורה',
  'כיתה', 'חורף', 'קיץ', 'גשם', 'שלג', 'ים', 'חוף', 'דג', 'סירה', 'אוטובוס',
  'רכבת', 'מטוס', 'מטבח', 'עוגה', 'שוקולד', 'גלידה', 'תפוח', 'בננה', 'יער', 'אריה',
  'פיל', 'קוף', 'ציפור', 'קן', 'בית', 'משפחה', 'סבתא', 'חבר', 'כדור', 'משחק',
  'מוזיקה', 'גיטרה', 'שיר', 'צבע', 'ציור', 'מחשב', 'טלפון', 'רופא', 'שוטר', 'כבאי',
  'אש', 'מים', 'נהר', 'הר', 'מדבר', 'גמל', 'חלל', 'רקטה', 'חג', 'מתנה',
  'בלון', 'ליצן', 'קרקס', 'דינוזאור', 'מלך', 'ארמון', 'פיה', 'קסם',
];

module.exports = {
  BOARD_SIZE, MIN_WORD_LENGTH, MAX_EXPLANATION_LENGTH, SCORING, OPTIONS, DEFAULT_SETTINGS, START_WORDS,
};

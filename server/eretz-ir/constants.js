const ALL_LETTERS = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'];

const HARD_LETTERS = ['ו','ז','ט','צ'];

const CATEGORIES = [
  { id: 'animal',     label: 'חי',            emoji: '🐾', isDefault: true,  llmHint: 'בעל חיים (כולל חרקים, דגים, ציפורים)' },
  { id: 'plant',      label: 'צומח',          emoji: '🌱', isDefault: true,  llmHint: 'צמח, עץ, פרח, פרי, ירק או תבלין' },
  { id: 'object',     label: 'דומם',          emoji: '🪨', isDefault: true,  llmHint: 'חפץ או דבר דומם שאינו חי ואינו צמח' },
  { id: 'country',    label: 'ארץ',           emoji: '🌍', isDefault: true,  llmHint: 'מדינה בעולם (שם מקובל בעברית)' },
  { id: 'city',       label: 'עיר',           emoji: '🏙️', isDefault: true,  llmHint: 'עיר, יישוב, קיבוץ או מושב בכל העולם' },
  { id: 'profession', label: 'מקצוע',         emoji: '👷', isDefault: true,  llmHint: 'מקצוע או עיסוק' },
  { id: 'boy',        label: 'ילד',           emoji: '👦', isDefault: true,  llmHint: 'שם פרטי של בן (שמות שמתאימים גם לבן וגם לבת מתקבלים)' },
  { id: 'girl',       label: 'ילדה',          emoji: '👧', isDefault: true,  llmHint: 'שם פרטי של בת (שמות שמתאימים גם לבן וגם לבת מתקבלים)' },
  { id: 'produce',    label: 'פרי או ירק',     emoji: '🍎', isDefault: false, llmHint: 'פרי או ירק' },
  { id: 'food',       label: 'מאכל',          emoji: '🍕', isDefault: false, llmHint: 'מאכל, מנה או משקה' },
  { id: 'color',      label: 'צבע',           emoji: '🎨', isDefault: false, llmHint: 'צבע' },
  { id: 'household',  label: 'חפץ בבית',      emoji: '🏠', isDefault: false, llmHint: 'חפץ שנמצא בדרך כלל בבית' },
  { id: 'vehicle',    label: 'כלי תחבורה',    emoji: '🚗', isDefault: false, llmHint: 'כלי תחבורה' },
  { id: 'sport',      label: 'ספורט או תחביב', emoji: '⚽', isDefault: false, llmHint: 'ענף ספורט או תחביב' },
  { id: 'instrument', label: 'כלי נגינה',     emoji: '🎵', isDefault: false, llmHint: 'כלי נגינה' },
  { id: 'character',  label: 'דמות מצוירת',   emoji: '🦸', isDefault: false, llmHint: 'דמות מסרט, סדרה, ספר או סרט מצויר' },
  { id: 'show',       label: 'סרט או סדרה',   emoji: '🎬', isDefault: false, llmHint: 'שם של סרט או סדרת טלוויזיה' },
  { id: 'celebrity',  label: 'מפורסם',        emoji: '⭐', isDefault: false, llmHint: 'אדם מפורסם אמיתי (לפי שם פרטי או שם משפחה)' },
  { id: 'nature',     label: 'נהר, הר או ים',  emoji: '🏔️', isDefault: false, llmHint: 'נהר, הר, ים, אגם או אוקיינוס' },
  { id: 'body',       label: 'איבר בגוף',     emoji: '🦴', isDefault: false, llmHint: 'איבר או חלק בגוף האדם' },
  { id: 'school',     label: 'בבית הספר',     emoji: '🏫', isDefault: false, llmHint: 'משהו שקשור לבית הספר (חפץ, מקצוע לימוד, מקום)' },
];

const OPTIONS = {
  roundSeconds: [60, 90, 120, 180],
  rounds: [5, 10, 15, 'all'],
  hardLetters: ['exclude', 'include', 'later'],
  leniency: ['strict', 'medium', 'lenient'],
  scoring: ['simple', 'classic'],
  voteThreshold: ['majority', 'p65', 'unanimous'],
  stopper: ['rotate', 'host'],
};

const DEFAULT_SETTINGS = {
  categories: CATEGORIES.filter(c => c.isDefault).map(c => c.id),
  roundSeconds: 90,
  rounds: 'all',
  hardLetters: 'later',
  leniency: 'medium',
  scoring: 'simple',
  voteThreshold: 'majority',
  stopper: 'rotate',
};

const MAX_ANSWERS_PER_CATEGORY = 5;
const MAX_ANSWER_LENGTH = 30;
const MIN_CATEGORIES = 3;

module.exports = {
  ALL_LETTERS,
  HARD_LETTERS,
  CATEGORIES,
  OPTIONS,
  DEFAULT_SETTINGS,
  MAX_ANSWERS_PER_CATEGORY,
  MAX_ANSWER_LENGTH,
  MIN_CATEGORIES,
};

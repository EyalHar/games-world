const { generateJson, isAvailable } = require('../llm/gemini');

const LENIENCY_RULES = {
  strict: 'המילה חייבת להיות כתובה בכתיב תקני.',
  medium: 'סלח על שגיאות כתיב קטנות (ו׳ או י׳ חסרה או מיותרת, א/ע, כ/ח, ת/ט, ס/ש, ק/כ).',
  lenient: 'השחקנים ילדים צעירים: קבל כל מילה שאפשר לזהות כשקוראים אותה בקול.',
};

const SCHEMA = {
  type: 'object',
  properties: {
    isWord: { type: 'boolean' },
    associated: { type: 'boolean' },
    relatedTo: { type: 'string' },
    linkedToFirst: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['isWord', 'associated', 'relatedTo', 'linkedToFirst', 'reason'],
};

function buildPrompt({ firstWord, boardWords, word, explanation, leniency }) {
  return `אתה שופט במשחק "תשבץ אסוציאציות" לילדים בעברית.
שחקן מניח על הלוח מילה חדשה, והיא חייבת להיות קשורה במשמעות (קשר אסוציאטיבי) לפחות למילה אחת שכבר על הלוח.

המילה הראשונה שהונחה: "${firstWord}"
כל המילים על הלוח: ${JSON.stringify(boardWords)}
המילה החדשה: "${word}"
${explanation ? `ההסבר של השחקן לקשר: "${explanation}"` : 'השחקן לא נתן הסבר.'}

קבע:
1. isWord — האם "${word}" היא מילה אמיתית בעברית (שם עצם, פועל, תואר, שם של מקום או אדם מפורסם). ${LENIENCY_RULES[leniency]}
2. associated — האם יש קשר אסוציאטיבי ברור במשמעות בין המילה החדשה לאחת המילים שעל הלוח. היו נדיבים: קשר שילד יכול להסביר בקלות מתקבל (למשל כלב–עצם, שמש–חוף, ספר–מורה). אותיות משותפות, צליל דומה, או מילה מהלוח שמסתתרת בתוך המילה החדשה הם לא קשר (למשל עצמאות–עצם או כלבו–כלב אינם קשורים).
3. relatedTo — המילה מהלוח שהכי קשורה למילה החדשה (בדיוק כפי שהיא כתובה ברשימה), או מחרוזת ריקה אם אין קשר.
4. linkedToFirst — האם המילה החדשה קשורה ישירות גם למילה הראשונה "${firstWord}".
5. reason — משפט קצר וידידותי לילדים (עד 12 מילים): אם התקבלה, מה הקשר (למשל "כלבים אוהבים לכרסם עצמות"); אם נפסלה, למה.`;
}

async function judgeWord(params, thinking = 'off') {
  return generateJson({ prompt: buildPrompt(params), schema: SCHEMA, thinking, tag: 'crossword' });
}

module.exports = { judgeWord, isJudgeAvailable: isAvailable };

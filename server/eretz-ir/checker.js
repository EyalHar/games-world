const { generateJson, isAvailable } = require('../llm/gemini');

const LENIENCY_RULES = {
  strict: 'קבל רק מילים בכתיב תקני. כל שגיאת כתיב פוסלת את התשובה.',
  medium: 'סלח על שגיאות כתיב קטנות: ו׳ או י׳ חסרה או מיותרת, והחלפות בין א/ע, כ/ח, ת/ט, ס/ש, ק/כ, ב/ו. מילה משובשת מעבר לזה נפסלת.',
  lenient: 'השחקנים ילדים צעירים. קבל כל מילה שאפשר לזהות כשקוראים אותה בקול, גם עם שגיאות כתיב רבות.',
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          valid: { type: 'boolean' },
          lemma: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['id', 'valid', 'lemma', 'reason'],
      },
    },
  },
  required: ['results'],
};

function buildPrompt({ letter, leniency, items }) {
  return `אתה שופט במשחק "ארץ עיר" לילדים בעברית. האות של הסיבוב: "${letter}".

לכל תשובה קבע:
1. valid — האם התשובה היא מילה או שם אמיתיים, מתאימה לתחום, ומתחילה באות "${letter}" (ה״א הידיעה בתחילת המילה לא נחשבת, אלא אם האות היא ה׳ והמילה עצמה מתחילה בה׳).
2. lemma — צורת הבסיס של התשובה: יחיד, בלי ה״א הידיעה, בכתיב תקני. כך "כלבים", "הכלב" ו"קלב" יקבלו כולן "כלב". זה משמש לזיהוי תשובות זהות.
3. reason — אם התשובה נפסלה: הסבר קצר וידידותי לילדים (עד 10 מילים) למה. אם התקבלה: מחרוזת ריקה.

כללי כתיב: ${LENIENCY_RULES[leniency]}
שגיאת כתיב באות הראשונה עצמה לעולם לא נסלחת: אם הכתיב הנכון של המילה מתחיל באות אחרת מ-"${letter}" (למשל "כנדה" שנכתבת נכון "קנדה"), התשובה נפסלת.

התשובות (JSON):
${JSON.stringify(items.map(i => ({ id: i.id, category: i.categoryHint, answer: i.answer })))}

החזר תוצאה לכל id.`;
}

async function checkAnswers({ letter, leniency, items }) {
  if (!items.length) return new Map();
  const { results } = await generateJson({
    prompt: buildPrompt({ letter, leniency, items }),
    schema: RESPONSE_SCHEMA,
    tag: 'eretz-ir',
  });
  return new Map(results.map(r => [r.id, r]));
}

module.exports = { checkAnswers, isCheckerAvailable: isAvailable };

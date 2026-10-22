const { GoogleGenAI } = require('@google/genai');

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const TIMEOUT_MS = 30000;

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

let client = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

function isCheckerAvailable() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function buildPrompt({ letter, leniency, items }) {
  return `אתה שופט במשחק "ארץ עיר" לילדים בעברית. האות של הסיבוב: "${letter}".

לכל תשובה קבע:
1. valid — האם התשובה היא מילה או שם אמיתיים, מתאימה לתחום, ומתחילה באות "${letter}" (ה״א הידיעה בתחילת המילה לא נחשבת, אלא אם האות היא ה׳ והמילה עצמה מתחילה בה׳).
2. lemma — צורת הבסיס של התשובה: יחיד, בלי ה״א הידיעה, בכתיב תקני. כך "כלבים", "הכלב" ו"קלב" יקבלו כולן "כלב". זה משמש לזיהוי תשובות זהות.
3. reason — אם התשובה נפסלה: הסבר קצר וידידותי לילדים (עד 10 מילים) למה. אם התקבלה: מחרוזת ריקה.

כללי כתיב: ${LENIENCY_RULES[leniency]}

התשובות (JSON):
${JSON.stringify(items.map(i => ({ id: i.id, category: i.categoryHint, answer: i.answer })))}

החזר תוצאה לכל id.`;
}

async function checkAnswers({ letter, leniency, items }) {
  const ai = getClient();
  if (!ai) throw new Error('GEMINI_API_KEY is not set');
  if (!items.length) return new Map();

  const request = ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt({ letter, leniency, items }),
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_SCHEMA,
      temperature: 0,
    },
  });

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Gemini request timed out')), TIMEOUT_MS);
  });

  try {
    const response = await Promise.race([request, timeout]);
    const { results } = JSON.parse(response.text);
    return new Map(results.map(r => [r.id, r]));
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { checkAnswers, isCheckerAvailable };

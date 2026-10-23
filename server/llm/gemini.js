const { GoogleGenAI } = require('@google/genai');

// Tried in order; the next model is used when one fails or is overloaded (common on the free tier).
const DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-2.5-flash'];
const PER_MODEL_TIMEOUT_MS = 15000;

let client = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

function isAvailable() {
  return Boolean(process.env.GEMINI_API_KEY);
}

const models = () => [...new Set([process.env.GEMINI_MODEL, ...DEFAULT_MODELS].filter(Boolean))];

// thinking: 'off' trades a little reasoning for 3–5x lower latency; 'low' keeps some for harder judgments.
function thinkingConfigFor(model, thinking) {
  if (model.startsWith('gemini-2.5')) return { thinkingBudget: thinking === 'off' ? 0 : 1024 };
  return { thinkingLevel: thinking === 'off' ? 'minimal' : 'low' };
}

async function generateWithTimeout(ai, model, request) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${model} timed out`)), PER_MODEL_TIMEOUT_MS);
  });
  try {
    return await Promise.race([ai.models.generateContent({ model, ...request }), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function generateJson({ prompt, schema, thinking = 'off', tag = 'llm' }) {
  const ai = getClient();
  if (!ai) throw new Error('GEMINI_API_KEY is not set');

  let lastError;
  for (const model of models()) {
    try {
      const response = await generateWithTimeout(ai, model, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
          temperature: 0,
          thinkingConfig: thinkingConfigFor(model, thinking),
        },
      });
      return JSON.parse(response.text);
    } catch (err) {
      console.warn(`[${tag}] ${model} failed: ${String(err.message).slice(0, 120)}`);
      lastError = err;
    }
  }
  throw lastError;
}

module.exports = { generateJson, isAvailable };

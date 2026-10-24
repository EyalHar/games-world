const { GoogleGenAI } = require('@google/genai');

// Tried in order; the next model is used when one fails or is overloaded (common on the free tier).
// Each model has its own free daily quota, so the chain also stretches how much can be played per day.
const DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
const PER_MODEL_TIMEOUT_MS = 15000;
const MAX_RETRY_WAIT_MS = 10000;
const DAILY_QUOTA_PAUSE_MS = 60 * 60 * 1000;

let client = null;
const exhaustedUntil = new Map();

class QuotaError extends Error {
  constructor() {
    super('Gemini free quota exhausted on every model');
    this.code = 'quota';
  }
}

// Reads Gemini's 429 details: which quota ran out (per minute / per day) and how long to wait.
function quotaInfo(err) {
  if (err.status !== 429) return null;
  const info = { daily: false, retryMs: null };
  try {
    (JSON.parse(err.message).error.details || []).forEach(d => {
      (d.violations || []).forEach(v => { if (/PerDay/i.test(v.quotaId)) info.daily = true; });
      if (d.retryDelay) info.retryMs = parseFloat(d.retryDelay) * 1000;
    });
  } catch {}
  return info;
}

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

async function callModel(ai, model, { prompt, schema, thinking }) {
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
}

async function generateJson({ prompt, schema, thinking = 'off', tag = 'llm' }) {
  const ai = getClient();
  if (!ai) throw new Error('GEMINI_API_KEY is not set');

  let lastError;
  let allQuota = true;
  for (const model of models()) {
    if (exhaustedUntil.get(model) > Date.now()) continue;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await callModel(ai, model, { prompt, schema, thinking });
      } catch (err) {
        lastError = err;
        const quota = quotaInfo(err);
        console.warn(`[${tag}] ${model} failed${quota ? ` (quota${quota.daily ? ', daily' : ''})` : ''}: ${String(err.message).slice(0, 120)}`);
        if (!quota) allQuota = false;
        if (quota?.daily) exhaustedUntil.set(model, Date.now() + DAILY_QUOTA_PAUSE_MS);
        const canWait = quota && !quota.daily && quota.retryMs && quota.retryMs <= MAX_RETRY_WAIT_MS;
        if (attempt === 1 && canWait) {
          await new Promise(r => setTimeout(r, quota.retryMs));
          continue;
        }
        break;
      }
    }
  }
  if (allQuota) throw new QuotaError();
  throw lastError;
}

module.exports = { generateJson, isAvailable };

const env = require('../config/env'); const AppError = require('../utils/AppError'); const logger = require('../lib/logger');
const parseJson = value => { try { const text = value.replace(/^```json\s*|```$/g, '').trim(); return JSON.parse(text); } catch { throw new AppError('The AI service returned invalid structured output', 502); } };
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function complete({ system, user, temperature = 0.3, maxTokens = 900, retries = 2, timeoutMs = env.NVIDIA_TIMEOUT_MS, traceId }) {
  if (!env.NVIDIA_API_KEY) throw new AppError('AI service is not configured. Set NVIDIA_API_KEY.', 503);
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const response = await fetch(`${env.NVIDIA_BASE_URL}/chat/completions`, { method: 'POST', signal: controller.signal, headers: { Authorization: `Bearer ${env.NVIDIA_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: env.NVIDIA_MODEL, temperature, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }) });
      if (response.ok) { const body = await response.json(); return body.choices?.[0]?.message?.content || ''; }
      const body = await response.text(); logger.warn({ traceId, attempt, status: response.status, body }, 'NVIDIA request failed'); if (![429, 500, 502, 503, 504].includes(response.status) || attempt === retries) throw new AppError('AI inference request failed', 502); await delay(250 * (2 ** attempt));
    }
  } catch (error) { if (error.name === 'AbortError') throw new AppError('AI inference timed out', 504); throw error; } finally { clearTimeout(timeout); }
}
async function structured(request) { return parseJson(await complete(request)); }
module.exports = { complete, structured };

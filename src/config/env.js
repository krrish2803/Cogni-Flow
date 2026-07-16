const { z } = require('zod');
require('dotenv').config();
const schema = z.object({
  PORT: z.coerce.number().default(4000), MONGODB_URI: z.string().min(1), JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'), REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().default(30),
  NVIDIA_API_KEY: z.string().optional(), NVIDIA_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
  NVIDIA_MODEL: z.string().default('meta/llama-3.1-8b-instruct'), NVIDIA_TUTOR_MAX_TOKENS: z.coerce.number().min(128).max(900).default(220), NVIDIA_TIMEOUT_MS: z.coerce.number().min(5000).max(120000).default(60000), CLIENT_URL: z.string().default('http://localhost:5173'),
  STRICT_TUTOR_MODE: z.enum(['true', 'false']).default('true')
});
module.exports = schema.parse(process.env);

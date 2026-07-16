const path = require('path'); const express = require('express'); const helmet = require('helmet'); const cors = require('cors'); const cookieParser = require('cookie-parser'); const rateLimit = require('express-rate-limit'); const pinoHttp = require('pino-http'); const crypto = require('crypto'); const env = require('./config/env'); const logger = require('./lib/logger'); const routes = require('./routes'); const errorHandler = require('./middleware/error'); const { protect, allow } = require('./middleware/auth'); const { success } = require('./utils/api'); const { recordResponse } = require('./services/platformMetrics.service');
const app = express(); app.set('trust proxy', 1); app.use((req, res, next) => { req.id = crypto.randomUUID(); const startedAt = process.hrtime.bigint(); res.on('finish', () => recordResponse({ path: req.path, method: req.method, statusCode: res.statusCode, durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6 })); next(); }); app.use(pinoHttp({ logger, genReqId: req => req.id })); app.use(helmet({ contentSecurityPolicy: { directives: { scriptSrc: ["'self'", "'unsafe-inline'"] } } })); app.use(cors({ origin: env.CLIENT_URL, credentials: true })); app.use(express.json({ limit: '1mb' })); app.use(cookieParser());
app.get('/health', (req, res) => success(res, { status: 'ok', service: 'socratic-scaffold-api' }));
app.get('/favicon.ico', (req, res) => {
  res.type('image/svg+xml');
  res.sendFile(path.resolve(__dirname, '..', 'public', 'favicon.svg'));
});
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: { message: 'Too many authentication attempts' } } }));
app.use(['/api/tutor', '/api/diagnosis', '/api/hints', '/api/actions', '/api/practice', '/api/mastery', '/api/explain-back', '/api/mistakes'], rateLimit({ windowMs: 15 * 60 * 1000, limit: 90, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: { message: 'AI request limit reached' } } }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: 'draft-8', legacyHeaders: false }), routes);
const adminDashboard = (req, res) => res.sendFile(path.resolve(__dirname, '..', 'admin-dashboard.html'));
app.get(['/admin/dashboard', '/admin-dashboard.html'], protect, allow('admin'), adminDashboard);
app.use(express.static(path.resolve(__dirname, '..'), { dotfiles: 'ignore', index: 'index.html' }));
app.use(errorHandler); module.exports = app;

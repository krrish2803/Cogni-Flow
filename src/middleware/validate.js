const AppError = require('../utils/AppError');
module.exports = schema => (req, res, next) => { const parsed = schema.safeParse({ body: req.body, params: req.params, query: req.query }); if (!parsed.success) return next(new AppError('Validation failed', 422, parsed.error.flatten())); req.body = parsed.data.body; req.params = parsed.data.params; req.query = parsed.data.query; next(); };

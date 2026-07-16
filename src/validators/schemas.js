const { z } = require('zod');
const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const envelope = body => z.object({ body, params: z.object({}).passthrough(), query: z.object({}).passthrough() });
const password = z.string().min(10).regex(/[A-Z]/, 'Include an uppercase letter').regex(/[a-z]/, 'Include a lowercase letter').regex(/\d/, 'Include a number');
const auth = {
  register: envelope(z.object({ name: z.string().min(2).max(80), email: z.string().email(), password, role: z.enum(['student', 'educator']).optional() })),
  login: envelope(z.object({ email: z.string().email(), password: z.string().min(1) })),
  changePassword: envelope(z.object({ currentPassword: z.string(), newPassword: password })),
  forgotPassword: envelope(z.object({ email: z.string().email() })),
  resetPassword: envelope(z.object({ token: z.string().min(20), newPassword: password }))
};
const conversation = {
  create: envelope(z.object({ title: z.string().max(120).optional(), subject: z.string().optional(), topic: z.string().optional(), language: z.enum(['javascript', 'python', 'other']).optional() })),
  message: envelope(z.object({ content: z.string().min(1).max(12000) })),
  id: z.object({ body: z.object({}).passthrough(), params: z.object({ id }), query: z.object({}).passthrough() })
};
module.exports = {
  id, envelope, auth, conversation,
  tutor: envelope(z.object({ conversationId: id, message: z.string().min(1).max(12000), strictness: z.number().min(1).max(5).optional() })),
  hint: envelope(z.object({ conversationId: id.optional(), question: z.string().min(1), context: z.string().optional().default(''), topic: z.string().optional(), level: z.number().int().min(1).max(5).default(1) })),
  adaptiveLadder: envelope(z.object({ conversationId: id, question: z.string().min(4).max(12000) })),
  conceptMap: envelope(z.object({ conversationId: id.optional(), masteredConcept: z.string().min(2).max(120), subject: z.string().default('coding') })),
  mistakePrediction: envelope(z.object({ nextTopic: z.string().min(2).max(160).optional(), conversationId: id.optional() })),
  explainBackEvaluation: envelope(z.object({ conversationId: id.optional(), concept: z.string().min(2).max(160), response: z.string().min(10).max(12000) })),
  action: envelope(z.object({ conversationId: id.optional(), actionType: z.enum(['explain', 'checkpoint', 'fix_code', 'write_code', 'choose_option', 'reflect']), task: z.string().min(1), response: z.string().min(1), rubric: z.string().optional(), concepts: z.array(z.string()).optional() })),
  practice: envelope(z.object({ conversationId: id.optional(), concept: z.string().min(1), difficulty: z.number().min(1).max(5).default(2), subject: z.string().default('coding') }))
};

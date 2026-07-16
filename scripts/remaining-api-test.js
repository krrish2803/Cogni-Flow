const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const env = require('../src/config/env');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const LearningState = require('../src/models/LearningState');
const { PracticeItem, PracticeSubmission, MasteryRecord, MistakePattern, TutorActionLog, ExplainBackRecord, RefreshToken } = require('../src/models/LearningRecords');

const stamp = Date.now();
const studentEmail = `qa.remaining.student.${stamp}@example.test`;
const adminEmail = `qa.remaining.admin.${stamp}@example.test`;
const originalPassword = 'QaRemainingPass123';
const changedPassword = 'QaChangedPass123';
const resetPassword = 'QaResetPass123';
const results = [];

function record(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`);
}

async function api(name, operation, expectedStatus) {
  const response = await operation();
  record(name, response.status === expectedStatus, `HTTP ${response.status}`);
  return response;
}

async function cleanup(emails) {
  const users = await User.find({ email: { $in: emails } }).select('_id');
  const userIds = users.map(user => user._id);
  const conversations = await Conversation.find({ userId: { $in: userIds } }).select('_id');
  const conversationIds = conversations.map(conversation => conversation._id);
  await Promise.all([
    PracticeSubmission.deleteMany({ userId: { $in: userIds } }),
    PracticeItem.deleteMany({ userId: { $in: userIds } }),
    MasteryRecord.deleteMany({ userId: { $in: userIds } }),
    MistakePattern.deleteMany({ userId: { $in: userIds } }),
    TutorActionLog.deleteMany({ userId: { $in: userIds } }),
    ExplainBackRecord.deleteMany({ userId: { $in: userIds } }),
    RefreshToken.deleteMany({ userId: { $in: userIds } }),
    LearningState.deleteMany({ userId: { $in: userIds } }),
    Conversation.deleteMany({ _id: { $in: conversationIds } }),
    User.deleteMany({ _id: { $in: userIds } })
  ]);
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  let studentToken;
  let activeToken;
  let conversationId;
  let practiceId;
  try {
    const invalidRegister = await api('registration validation rejects invalid email', () => request(app).post('/api/auth/register').send({ name: 'Invalid', email: 'not-an-email', password: 'short' }), 422);
    record('validation response is structured', Boolean(invalidRegister.body?.error?.message));

    const registration = await api('student registration', () => request(app).post('/api/auth/register').send({ name: 'Remaining API QA Student', email: studentEmail, password: originalPassword }), 201);
    studentToken = registration.body.data.token;
    activeToken = studentToken;

    await api('bad login rejected', () => request(app).post('/api/auth/login').send({ email: studentEmail, password: 'WrongPassword123' }), 401);
    await api('unauthenticated practice access rejected', () => request(app).get('/api/practice/history'), 401);
    await api('student access to admin users rejected', () => request(app).get('/api/users').set('Authorization', `Bearer ${studentToken}`), 403);

    const conversation = await api('create learning conversation', () => request(app).post('/api/conversations').set('Authorization', `Bearer ${studentToken}`).send({ title: 'QA recursion practice', subject: 'coding', topic: 'recursion', language: 'javascript' }), 201);
    conversationId = conversation.body.data.conversation._id;

    const practice = await api('practice generation', () => request(app).post('/api/practice/generate').set('Authorization', `Bearer ${studentToken}`).send({ conversationId, concept: 'recursion', difficulty: 1, subject: 'coding' }), 201);
    practiceId = practice.body.data.practice._id;
    record('practice includes prompt and rubric', Boolean(practice.body.data.practice.prompt && practice.body.data.practice.evaluationRubric));

    const submission = await api('practice submission evaluation', () => request(app).post(`/api/practice/${practiceId}/submit`).set('Authorization', `Bearer ${studentToken}`).send({ response: 'A recursive function solves a smaller version of the problem and stops at a base case.' }), 200);
    record('practice submission includes score', Number.isFinite(submission.body.data?.submission?.score));

    const history = await api('practice history', () => request(app).get('/api/practice/history').set('Authorization', `Bearer ${studentToken}`), 200);
    record('generated practice appears in history', history.body.data.practice.some(item => item._id === practiceId));

    const mastery = await api('mastery validation', () => request(app).post('/api/mastery/validate').set('Authorization', `Bearer ${studentToken}`).send({ conversationId, concept: 'recursion', task: 'Explain the base case in recursion.', response: 'The base case ends recursive calls, preventing infinite recursion once the simplest input is reached.' }), 200);
    record('mastery validation produces record', Boolean(mastery.body.data?.record?._id && mastery.body.data?.evaluation));

    const masteryHistory = await api('mastery history', () => request(app).get(`/api/mastery/${conversationId}`).set('Authorization', `Bearer ${studentToken}`), 200);
    record('mastery record persists', masteryHistory.body.data.records.length === 1);

    await api('change password rejects wrong current password', () => request(app).patch('/api/auth/change-password').set('Authorization', `Bearer ${studentToken}`).send({ currentPassword: 'WrongPassword123', newPassword: changedPassword }), 401);
    const changed = await api('change password', () => request(app).patch('/api/auth/change-password').set('Authorization', `Bearer ${studentToken}`).send({ currentPassword: originalPassword, newPassword: changedPassword }), 200);
    activeToken = changed.body.data.token;
    await api('login with changed password', () => request(app).post('/api/auth/login').send({ email: studentEmail, password: changedPassword }), 200);

    const forgot = await api('password recovery token request', () => request(app).post('/api/auth/forgot-password').send({ email: studentEmail }), 202);
    record('development recovery token returned', Boolean(forgot.body.data.resetToken));
    const reset = await api('password reset', () => request(app).post('/api/auth/reset-password').send({ token: forgot.body.data.resetToken, newPassword: resetPassword }), 200);
    activeToken = reset.body.data.token;
    await api('login with reset password', () => request(app).post('/api/auth/login').send({ email: studentEmail, password: resetPassword }), 200);
    await api('logout', () => request(app).post('/api/auth/logout').set('Authorization', `Bearer ${activeToken}`), 200);

    const admin = await User.create({ name: 'Remaining API QA Admin', email: adminEmail, password: originalPassword, role: 'admin' });
    const adminLogin = await api('admin login', () => request(app).post('/api/auth/login').send({ email: admin.email, password: originalPassword }), 200);
    const adminToken = adminLogin.body.data.token;
    const users = await api('admin-only users endpoint', () => request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`), 200);
    record('admin-only list includes student', users.body.data.users.some(user => user.email === studentEmail));

    await api('invalid practice id rejected', () => request(app).post('/api/practice/not-an-object-id/submit').set('Authorization', `Bearer ${activeToken}`).send({ response: 'test' }), 404);
    await api('unknown route returns not found', () => request(app).get('/api/not-a-route'), 404);
  } finally {
    await cleanup([studentEmail, adminEmail]);
    await mongoose.disconnect();
  }
  const failures = results.filter(result => !result.passed);
  console.log(`SUMMARY | ${results.length - failures.length}/${results.length} passed`);
  if (failures.length) process.exitCode = 1;
}

main().catch(async error => {
  console.error(error);
  try { await cleanup([studentEmail, adminEmail]); await mongoose.disconnect(); } catch (_) {}
  process.exitCode = 1;
});

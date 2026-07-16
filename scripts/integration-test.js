process.env.LOG_LEVEL = 'silent';
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const connect = require('../src/config/database');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const LearningState = require('../src/models/LearningState');
const records = require('../src/models/LearningRecords');

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const password = 'QaSecurePassword123';
const newPassword = 'QaUpdatedPassword456';
const emails = { student: `qa.full.student.${suffix}@example.test`, educator: `qa.full.educator.${suffix}@example.test`, admin: `qa.full.admin.${suffix}@example.test` };
const results = [];
let studentId; let educatorId; let adminId; let conversationId;

const hit = async (name, call) => {
  try {
    const response = await call();
    const passed = (response.status >= 200 && response.status < 300 && response.body.success !== false) || (name === 'invalid login rejection' && response.status === 401);
    results.push({ name, status: response.status, passed, detail: response.body?.error?.message });
    console.log(`${passed ? 'PASS' : 'FAIL'} | ${name} | ${response.status}${response.body?.error?.message ? ` | ${response.body.error.message}` : ''}`);
    return response;
  } catch (error) {
    results.push({ name, status: 'ERROR', passed: false, detail: error.message }); console.log(`FAIL | ${name} | ERROR | ${error.message}`);
    return null;
  }
};

async function cleanup() {
  const ids = [studentId, educatorId, adminId].filter(Boolean);
  if (!ids.length) return;
  await Promise.all([
    Conversation.deleteMany({ userId: { $in: ids } }), LearningState.deleteMany({ userId: { $in: ids } }), records.PracticeItem.deleteMany({ userId: { $in: ids } }), records.PracticeSubmission.deleteMany({ userId: { $in: ids } }), records.MasteryRecord.deleteMany({ userId: { $in: ids } }), records.MistakePattern.deleteMany({ userId: { $in: ids } }), records.TutorActionLog.deleteMany({ userId: { $in: ids } }), records.ExplainBackRecord.deleteMany({ userId: { $in: ids } }), records.RefreshToken.deleteMany({ userId: { $in: ids } }), User.deleteMany({ _id: { $in: ids } })
  ]);
}

(async () => {
  try {
    await connect();
    await hit('health check', () => request(app).get('/health'));
    const registered = await hit('student registration', () => request(app).post('/api/auth/register').send({ name: 'QA Student', email: emails.student, password }));
    studentId = registered?.body?.data?.user?._id; let studentToken = registered?.body?.data?.token;
    await hit('invalid login rejection', () => request(app).post('/api/auth/login').send({ email: emails.student, password: 'wrong-password' }));
    await hit('current user', () => request(app).get('/api/auth/me').set('Authorization', `Bearer ${studentToken}`));
    await hit('profile update', () => request(app).patch('/api/users/profile').set('Authorization', `Bearer ${studentToken}`).send({ currentLevel: 'intermediate', targetSubjects: ['coding'], onboardingCompleted: true }));
    const login = await hit('student login', () => request(app).post('/api/auth/login').send({ email: emails.student, password }));
    studentToken = login?.body?.data?.token || studentToken;
    const refreshCookie = login?.headers?.['set-cookie']?.find(cookie => cookie.startsWith('refreshToken='));
    await hit('refresh token rotation', () => request(app).post('/api/auth/refresh').set('Cookie', refreshCookie || ''));
    const forgot = await hit('forgot password token', () => request(app).post('/api/auth/forgot-password').send({ email: emails.student }));
    if (forgot?.body?.data?.resetToken) {
      const reset = await hit('password reset', () => request(app).post('/api/auth/reset-password').send({ token: forgot.body.data.resetToken, newPassword }));
      studentToken = reset?.body?.data?.token || studentToken;
    }
    const conversation = await hit('create conversation', () => request(app).post('/api/conversations').set('Authorization', `Bearer ${studentToken}`).send({ title: 'QA recursion session', subject: 'coding', topic: 'recursion', language: 'javascript' }));
    conversationId = conversation?.body?.data?.conversation?._id;
    await hit('list conversations', () => request(app).get('/api/conversations').set('Authorization', `Bearer ${studentToken}`));
    await hit('append conversation message', () => request(app).post(`/api/conversations/${conversationId}/message`).set('Authorization', `Bearer ${studentToken}`).send({ content: 'I think recursion keeps repeating forever.' }));
    await hit('conversation retrieval', () => request(app).get(`/api/conversations/${conversationId}`).set('Authorization', `Bearer ${studentToken}`));
    await hit('learning state', () => request(app).get('/api/learning-state/me').set('Authorization', `Bearer ${studentToken}`));
    await hit('learning state dashboard', () => request(app).get('/api/learning-state/dashboard/me').set('Authorization', `Bearer ${studentToken}`));
    await hit('knowledge diagnosis', () => request(app).post('/api/diagnosis/run').set('Authorization', `Bearer ${studentToken}`).send({ conversationId, message: 'I do not understand when recursion stops.', subject: 'coding' }));
    await hit('tutor response gating', () => request(app).post('/api/tutor/respond').set('Authorization', `Bearer ${studentToken}`).send({ conversationId, message: 'Give me the recursion solution immediately.', strictness: 4 }));
    await hit('hint generation', () => request(app).post('/api/hints/generate').set('Authorization', `Bearer ${studentToken}`).send({ conversationId, question: 'How does recursion stop?', context: 'JavaScript factorial', topic: 'recursion', level: 1 }));
    await hit('next hint level', () => request(app).post('/api/hints/next-level').set('Authorization', `Bearer ${studentToken}`).send({ conversationId, question: 'How does recursion stop?', context: 'JavaScript factorial', topic: 'recursion', level: 1 }));
    await hit('adaptive hint ladder', () => request(app).post('/api/learning/adaptive-hint-ladder').set('Authorization', `Bearer ${studentToken}`).send({ conversationId, question: 'I think a recursive function never returns.' }));
    await hit('action evaluation', () => request(app).post('/api/actions/submit').set('Authorization', `Bearer ${studentToken}`).send({ conversationId, actionType: 'explain', task: 'Explain the purpose of a base case.', response: 'A base case is the stopping condition that returns without another recursive call.', concepts: ['recursion'] }));
    await hit('practice generation', () => request(app).post('/api/practice/generate').set('Authorization', `Bearer ${studentToken}`).send({ conversationId, concept: 'recursion base case', difficulty: 2, subject: 'coding' }));
    const practice = await records.PracticeItem.findOne({ userId: studentId }).sort('-createdAt');
    if (practice) await hit('practice submission', () => request(app).post(`/api/practice/${practice._id}/submit`).set('Authorization', `Bearer ${studentToken}`).send({ response: 'if (n === 0) return 1;' }));
    else results.push({ name: 'practice submission', status: 'SKIPPED', passed: false, detail: 'Practice generation did not persist an item' });
    await hit('practice history', () => request(app).get('/api/practice/history').set('Authorization', `Bearer ${studentToken}`));
    await hit('mastery validation', () => request(app).post('/api/mastery/validate').set('Authorization', `Bearer ${studentToken}`).send({ conversationId, concept: 'recursion', task: 'Explain why factorial needs a base case.', response: 'The base case stops calls at zero and avoids infinite recursion.' }));
    await hit('mastery records', () => request(app).get(`/api/mastery/${conversationId}`).set('Authorization', `Bearer ${studentToken}`));
    await hit('explain-back rubric evaluation', () => request(app).post('/api/learning/evaluate-explain-back').set('Authorization', `Bearer ${studentToken}`).send({ conversationId, concept: 'Recursion', response: 'Recursion is when a function calls itself on a smaller problem. A base case stops it, such as returning one when factorial reaches zero.' }));
    await hit('legacy explain-back evaluation', () => request(app).post('/api/explain-back/evaluate').set('Authorization', `Bearer ${studentToken}`).send({ conversationId, concept: 'Recursion', response: 'A base case stops the function from calling itself forever.' }));
    await hit('concept map update', () => request(app).post('/api/learning/concept-map-update').set('Authorization', `Bearer ${studentToken}`).send({ conversationId, masteredConcept: 'Recursion', subject: 'coding' }));
    await hit('mistake prediction', () => request(app).post('/api/learning/predict-next-mistake').set('Authorization', `Bearer ${studentToken}`).send({ conversationId, nextTopic: 'recursive array traversal' }));
    await hit('mistake analysis', () => request(app).post('/api/mistakes/analyze').set('Authorization', `Bearer ${studentToken}`).send({}));
    await hit('mistake list', () => request(app).get('/api/mistakes/me').set('Authorization', `Bearer ${studentToken}`));
    const educator = await User.create({ name: 'QA Educator', email: emails.educator, password, role: 'educator' }); educatorId = educator._id;
    const admin = await User.create({ name: 'QA Admin', email: emails.admin, password, role: 'admin' }); adminId = admin._id;
    const educatorLogin = await hit('educator login', () => request(app).post('/api/auth/login').send({ email: emails.educator, password }));
    const educatorToken = educatorLogin?.body?.data?.token;
    const adminLogin = await hit('admin login', () => request(app).post('/api/auth/login').send({ email: emails.admin, password }));
    const adminToken = adminLogin?.body?.data?.token;
    await hit('educator student dashboard', () => request(app).get(`/api/dashboard/student/${studentId}`).set('Authorization', `Bearer ${educatorToken}`));
    await hit('educator conversation dashboard', () => request(app).get(`/api/dashboard/conversation/${conversationId}`).set('Authorization', `Bearer ${educatorToken}`));
    await hit('educator overview dashboard', () => request(app).get('/api/dashboard/overview').set('Authorization', `Bearer ${educatorToken}`));
    await hit('session replay analytics', () => request(app).get(`/api/analytics/session-replay/${conversationId}`).set('Authorization', `Bearer ${educatorToken}`));
    await hit('admin user list', () => request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`));
    await hit('admin user detail', () => request(app).get(`/api/users/${studentId}`).set('Authorization', `Bearer ${adminToken}`));
    await hit('student archive conversation', () => request(app).patch(`/api/conversations/${conversationId}/archive`).set('Authorization', `Bearer ${studentToken}`).send({}));
    await hit('student logout', () => request(app).post('/api/auth/logout').set('Authorization', `Bearer ${studentToken}`));
  } finally {
    await cleanup(); await mongoose.disconnect();
  }
  for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} | ${result.name} | ${result.status}${result.detail ? ` | ${result.detail}` : ''}`);
  const failures = results.filter(result => !result.passed); console.log(`SUMMARY | passed=${results.length - failures.length} failed=${failures.length} total=${results.length}`);
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(`HARNESS ERROR | ${error.message}`); process.exitCode = 1; });

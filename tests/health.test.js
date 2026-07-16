process.env.MONGODB_URI = 'mongodb://localhost:27017/socratic-scaffold-test';
process.env.JWT_SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';
const request = require('supertest'); const app = require('../src/app');
describe('health check', () => { it('returns service status', async () => { const response = await request(app).get('/health'); expect(response.status).toBe(200); expect(response.body.data.status).toBe('ok'); }); });

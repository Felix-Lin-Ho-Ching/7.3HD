
import request from 'supertest';
import app from '../src/app.js';

describe('App endpoints', () => {
  it('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('GET /api/version returns version', async () => {
    const res = await request(app).get('/api/version');
    expect(res.statusCode).toBe(200);
    expect(res.body.version).toBeDefined();
  });

  it('GET /metrics returns text/plain', async () => {
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
  });
});

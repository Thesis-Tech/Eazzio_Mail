import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('Inbound Mail Synchronization API Tests', () => {
  it('GET /v1/mail/inbound/status should return provider status and health', async () => {
    const res = await request(app).get('/v1/mail/inbound/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success');
    expect(res.body.data).toHaveProperty('provider');
  });

  it('GET /api/v1/mail/inbound/status should also support /api/v1 prefix', async () => {
    const res = await request(app).get('/api/v1/mail/inbound/status');
    expect(res.status).toBe(200);
    expect(res.body.data.provider).toBe('godaddy');
  });

  it('POST /v1/mail/inbound/sync should trigger synchronization and return execution metrics', async () => {
    const res = await request(app)
      .post('/v1/mail/inbound/sync')
      .send({ folder: 'INBOX', limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    if (res.body.data.status === 'BLOCKED') {
      expect(res.body.data).toHaveProperty('provider');
    } else {
      expect(res.body).toHaveProperty('success');
      expect(res.body.data).toHaveProperty('checked');
      expect(res.body.data).toHaveProperty('imported');
      expect(res.body.data).toHaveProperty('skipped');
      expect(res.body.data).toHaveProperty('failed');
    }
  });

  it('POST /v1/mail/inbound/test-inject should reject empty rawMime', async () => {
    const res = await request(app)
      .post('/v1/mail/inbound/test-inject')
      .send({ rawMime: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

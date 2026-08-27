import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { TokenService } from '@eazzio/identity';

describe('Auth Progressive API Endpoints (TASK-AUTH-UPGRADE)', () => {
  const validToken = TokenService.generateAccessToken({
    userId: 'usr-dev-101',
    sessionId: 'sess-dev-101',
    email: 'rahulkumar@eazzio.com',
  });

  describe('POST /v1/auth/identify', () => {
    it('should reject empty or missing identifier with 400 VALIDATION_ERROR', async () => {
      const res = await request(app).post('/v1/auth/identify').send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should identify username and normalize to @eazzio.com domain', async () => {
      const res = await request(app).post('/v1/auth/identify').send({ identifier: 'rahulkumar' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('rahulkumar@eazzio.com');
      expect(res.body.data.authMethods).toContain('password');
      expect(res.body.data.authMethods).toContain('otp');
      expect(res.body.data.authMethods).toContain('passkey');
    });

    it('should preserve full email addresses', async () => {
      const res = await request(app).post('/v1/auth/identify').send({ identifier: 'user@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('user@example.com');
    });
  });

  describe('POST /v1/auth/login', () => {
    it('should reject missing password with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/v1/auth/login')
        .send({ identifier: 'rahulkumar@eazzio.com' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should authenticate dev accounts and return session token', async () => {
      const res = await request(app)
        .post('/v1/auth/login')
        .send({ identifier: 'rahulkumar@eazzio.com', password: 'DevPassword123!' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('rahulkumar@eazzio.com');
    });
  });

  describe('POST /v1/auth/forgot-password', () => {
    it('should return safe generic confirmation without exposing account existence', async () => {
      const res = await request(app)
        .post('/v1/auth/forgot-password')
        .send({ identifier: 'nonexistent@eazzio.com' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('instructions have been sent');
    });
  });

  describe('POST /v1/auth/register', () => {
    const uniqueEmail = `test.reg.${Date.now()}@eazzio.com`;

    it('should reject missing or short password with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/v1/auth/register')
        .send({ email: 'newuser@eazzio.com', password: '123' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject empty identifier with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/v1/auth/register')
        .send({ email: '', password: 'ValidPassword123!' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should successfully register a new user and initialize session', async () => {
      const res = await request(app)
        .post('/v1/auth/register')
        .send({ email: uniqueEmail, password: 'SecurePassword123!', displayName: 'Test Register' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(uniqueEmail);
      expect(res.body.data.user.displayName).toBe('Test Register');
    });

    it('should reject duplicate registration with 409 ACCOUNT_EXISTS', async () => {
      const res = await request(app)
        .post('/v1/auth/register')
        .send({ email: uniqueEmail, password: 'SecurePassword123!', displayName: 'Duplicate User' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ACCOUNT_EXISTS');
    });
  });

  describe('GET /v1/auth/session', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/v1/auth/session');
      expect(res.status).toBe(401);
    });

    it('should return session data when authenticated', async () => {
      const res = await request(app)
        .get('/v1/auth/session')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('rahulkumar@eazzio.com');
    });
  });
});


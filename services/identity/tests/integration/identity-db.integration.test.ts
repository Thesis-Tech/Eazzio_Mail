import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgresAdapter, PostgresUserRepository } from '@eazzio/infra-adapters';
import {
  IdentityService,
  PostgresSessionRepository,
  PostgresMfaRepository,
  TokenService,
  TotpService,
} from '../../src/index.js';

describe('Database-Backed Identity & Authentication Integration Tests (TASK-007)', () => {
  const dbUrl =
    process.env.DATABASE_URL ||
    'postgresql://eazzio_user:eazzio_password@localhost:5432/eazzio_mail';
  let db: PostgresAdapter;

  let userRepo: PostgresUserRepository;
  let sessionRepo: PostgresSessionRepository;
  let mfaRepo: PostgresMfaRepository;
  let identityService: IdentityService;

  const testSuffix = Date.now().toString();
  let createdUserId: string;

  beforeAll(async () => {
    db = new PostgresAdapter(dbUrl);
    userRepo = new PostgresUserRepository(db);
    sessionRepo = new PostgresSessionRepository(db);
    mfaRepo = new PostgresMfaRepository(db);

    identityService = new IdentityService(userRepo, sessionRepo, mfaRepo);
  });

  afterAll(async () => {
    if (createdUserId) {
      await db.query('DELETE FROM mfa_totp_secrets WHERE user_id = $1', [createdUserId]);
      await db.query('DELETE FROM sessions WHERE user_id = $1', [createdUserId]);
      await db.query('DELETE FROM users WHERE id = $1', [createdUserId]);
    }
    await db.close();
  });

  it('should register a new user in PostgreSQL with Argon2id hash', async () => {
    const email = `test_identity_${testSuffix}@eazzio.com`;
    const password = 'secure_identity_password_123';

    const { user } = await identityService.registerUser({
      email,
      password,
      displayName: 'Identity Test User',
    });

    createdUserId = user.id;
    expect(user.id).toBeDefined();
    expect(user.email).toBe(email);
    expect(user.passwordHash).toContain('$argon2id$');

    // Verify stored in PostgreSQL
    const stored = await userRepo.findById(user.id);
    expect(stored).not.toBeNull();
    expect(stored?.email).toBe(email);
  });

  it('should reject registration if email already exists', async () => {
    const email = `test_identity_${testSuffix}@eazzio.com`;
    await expect(
      identityService.registerUser({
        email,
        password: 'secure_identity_password_123',
      }),
    ).rejects.toThrow('Email already registered');
  });

  it('should authenticate user and create persistent session record', async () => {
    const email = `test_identity_${testSuffix}@eazzio.com`;
    const password = 'secure_identity_password_123';

    // Failed attempt with wrong password
    await expect(
      identityService.login({
        email,
        password: 'wrong_password_123',
      }),
    ).rejects.toThrow('Invalid email or password');

    // Successful login
    const result = await identityService.login({
      email,
      password,
      deviceLabel: 'MacBook Pro Chrome',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Chrome',
    });

    expect(result.sessionToken).toBeDefined();
    expect(result.sessionId).toBeDefined();
    expect(result.mfaRequired).toBe(false);
    expect(result.userId).toBe(createdUserId);

    // Verify token payload
    const tokenPayload = TokenService.verifyAccessToken(result.sessionToken!);
    expect(tokenPayload.userId).toBe(createdUserId);
    expect(tokenPayload.sessionId).toBe(result.sessionId);

    // Verify session stored in PostgreSQL
    const session = await sessionRepo.findById(result.sessionId!);
    expect(session).not.toBeNull();
    expect(session?.userId).toBe(createdUserId);
    expect(session?.deviceLabel).toBe('MacBook Pro Chrome');
    expect(session?.revokedAt).toBeNull();
  });

  it('should support full TOTP MFA setup, verification, and authentication', async () => {
    const email = `test_identity_${testSuffix}@eazzio.com`;
    const password = 'secure_identity_password_123';

    // 1. Setup MFA
    const { secret, otpAuthUrl } = await identityService.setupMfa(createdUserId, email);
    expect(secret).toBeDefined();
    expect(otpAuthUrl).toContain('otpauth://totp/');

    // Verify secret stored in DB
    const storedSecret = await mfaRepo.getSecret(createdUserId);
    expect(storedSecret).toBe(secret);

    // 2. Generate valid TOTP code and enable MFA
    const validCode = TotpService.generateToken(secret);
    const enabled = await identityService.verifyAndEnableMfa(createdUserId, validCode);
    expect(enabled).toBe(true);

    const user = await userRepo.findById(createdUserId);
    expect(user?.mfaEnabled).toBe(true);

    // 3. Login without MFA code -> returns mfaRequired: true
    const loginWithoutMfa = await identityService.login({
      email,
      password,
    });
    expect(loginWithoutMfa.mfaRequired).toBe(true);
    expect(loginWithoutMfa.sessionToken).toBeUndefined();

    // 4. Login with valid MFA code -> succeeds and creates session
    const currentCode = TotpService.generateToken(secret);
    const loginWithMfa = await identityService.login({
      email,
      password,
      mfaCode: currentCode,
    });
    expect(loginWithMfa.mfaRequired).toBe(false);
    expect(loginWithMfa.sessionToken).toBeDefined();
  });

  it('should validate and revoke database sessions', async () => {
    const email = `test_identity_${testSuffix}@eazzio.com`;
    const password = 'secure_identity_password_123';
    const secret = (await mfaRepo.getSecret(createdUserId))!;
    const code = TotpService.generateToken(secret);

    const loginResult = await identityService.login({
      email,
      password,
      mfaCode: code,
    });

    const sessionId = loginResult.sessionId!;

    // Validate active session
    const validSession = await identityService.validateSession(sessionId);
    expect(validSession).not.toBeNull();
    expect(validSession?.id).toBe(sessionId);

    // Revoke session
    await identityService.revokeSession(sessionId);

    // Validate after revocation -> should return null
    const revokedSession = await identityService.validateSession(sessionId);
    expect(revokedSession).toBeNull();
  });
});

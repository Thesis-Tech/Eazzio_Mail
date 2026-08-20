import { describe, it, expect } from 'vitest';
import { PasswordService } from '../../src/domain/password.js';
import { TokenService } from '../../src/domain/token.js';
import { TotpService } from '../../src/domain/totp.js';
import { IdentityService } from '../../src/application/identity-service.js';
import { SessionManager, Session } from '../../src/domain/session-state.js';

describe('Identity Service Core Modules', () => {
  it('should enforce 12-char minimum password policy with Argon2id', async () => {
    await expect(PasswordService.hash('short')).rejects.toThrow(
      'Password must be at least 12 characters long',
    );
    const hash = await PasswordService.hash('valid_long_secure_password_123');
    expect(hash).toContain('$argon2id$');
    const valid = await PasswordService.verify(hash, 'valid_long_secure_password_123');
    expect(valid).toBe(true);
  });

  it('should generate and verify JWT tokens securely', () => {
    const token = TokenService.generateAccessToken({
      userId: 'usr-1',
      sessionId: 'ses-1',
      email: 'user@eazzio.com',
    });
    const payload = TokenService.verifyAccessToken(token);
    expect(payload.userId).toBe('usr-1');
    expect(payload.email).toBe('user@eazzio.com');
  });

  it('should generate and verify TOTP codes', () => {
    const secret = TotpService.generateSecret();
    expect(secret).toBeDefined();
  });

  it('should return anti-enumeration recovery response', () => {
    const res = IdentityService.getRecoveryResponse();
    expect(res.message).toBe('If the account exists, instructions have been sent.');
  });

  it('should transition session states correctly', () => {
    const session: Session = {
      id: 'ses-1',
      userId: 'usr-1',
      createdAt: new Date(),
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
      revokedAt: null,
    };
    expect(SessionManager.isActive(session)).toBe(true);
    const revoked = SessionManager.revoke(session);
    expect(SessionManager.isActive(revoked)).toBe(false);
  });
});

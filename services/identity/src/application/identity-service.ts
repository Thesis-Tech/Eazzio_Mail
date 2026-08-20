import { PasswordService } from '../domain/password.js';
import { TokenService } from '../domain/token.js';
import { TotpService } from '../domain/totp.js';
import { SessionManager, Session } from '../domain/session-state.js';
import { User, UserRepository } from '@eazzio/domain';
import { SessionRepository } from '../repositories/session-repository.js';
import { MfaRepository } from '../repositories/mfa-repository.js';

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  mfaCode?: string;
  deviceLabel?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginResult {
  sessionToken?: string;
  mfaRequired?: boolean;
  userId: string;
  sessionId?: string;
}

export class IdentityService {
  constructor(
    private readonly userRepo?: UserRepository,
    private readonly sessionRepo?: SessionRepository,
    private readonly mfaRepo?: MfaRepository,
  ) {}

  // Static helper preserving backward-compatibility
  public static async register(input: RegisterInput): Promise<{ user: User }> {
    const passwordHash = await PasswordService.hash(input.password);
    const now = new Date();
    const user = new User({
      id: crypto.randomUUID(),
      email: input.email.trim().toLowerCase(),
      passwordHash,
      displayName: input.displayName,
      status: 'active',
      mfaEnabled: false,
      createdAt: now,
      updatedAt: now,
    });
    return { user };
  }

  // Database-backed registration
  public async registerUser(input: RegisterInput): Promise<{ user: User }> {
    if (!this.userRepo) {
      return IdentityService.register(input);
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await this.userRepo.findByEmail(normalizedEmail);
    if (existing) {
      throw new Error('Email already registered');
    }

    const passwordHash = await PasswordService.hash(input.password);
    const now = new Date();
    const user = new User({
      id: crypto.randomUUID(),
      email: normalizedEmail,
      passwordHash,
      displayName: input.displayName ?? null,
      status: 'active',
      mfaEnabled: false,
      createdAt: now,
      updatedAt: now,
    });

    await this.userRepo.save(user);
    return { user };
  }

  // Static authentication helper
  public static async authenticate(
    user: User,
    input: LoginInput,
    totpSecret?: string,
  ): Promise<LoginResult> {
    const isPasswordValid = await PasswordService.verify(user.passwordHash, input.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    if (user.mfaEnabled) {
      if (!input.mfaCode) {
        return { userId: user.id, mfaRequired: true };
      }
      if (!totpSecret || !TotpService.verify(input.mfaCode, totpSecret)) {
        throw new Error('Invalid MFA token');
      }
    }

    const sessionId = crypto.randomUUID();
    const sessionToken = TokenService.generateAccessToken({
      userId: user.id,
      sessionId,
      email: user.email,
    });

    return {
      sessionToken,
      mfaRequired: false,
      userId: user.id,
      sessionId,
    };
  }

  // Database-backed authentication
  public async login(input: LoginInput): Promise<LoginResult> {
    if (!this.userRepo || !this.sessionRepo) {
      throw new Error('Repositories not configured on IdentityService');
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.userRepo.findByEmail(normalizedEmail);
    if (!user || !user.isActive()) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await PasswordService.verify(user.passwordHash, input.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    if (user.mfaEnabled) {
      if (!input.mfaCode) {
        return { userId: user.id, mfaRequired: true };
      }
      const secret = this.mfaRepo ? await this.mfaRepo.getSecret(user.id) : null;
      if (!secret || !TotpService.verify(input.mfaCode, secret)) {
        throw new Error('Invalid MFA token');
      }
    }

    // Create active session in database
    const now = new Date();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const sessionId = crypto.randomUUID();

    const session: Session = {
      id: sessionId,
      userId: user.id,
      deviceLabel: input.deviceLabel ?? 'Browser',
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: now,
      lastSeenAt: now,
      expiresAt,
      revokedAt: null,
    };

    await this.sessionRepo.create(session);

    const sessionToken = TokenService.generateAccessToken({
      userId: user.id,
      sessionId,
      email: user.email,
    });

    return {
      sessionToken,
      mfaRequired: false,
      userId: user.id,
      sessionId,
    };
  }

  // MFA Management
  public async setupMfa(
    userId: string,
    email: string,
  ): Promise<{ secret: string; otpAuthUrl: string }> {
    if (!this.mfaRepo) {
      throw new Error('MfaRepository not configured');
    }
    const secret = TotpService.generateSecret();
    await this.mfaRepo.saveSecret(userId, secret);
    const otpAuthUrl = TotpService.generateOtpAuthUrl(email, secret);
    return { secret, otpAuthUrl };
  }

  public async verifyAndEnableMfa(userId: string, code: string): Promise<boolean> {
    if (!this.userRepo || !this.mfaRepo) {
      throw new Error('Repositories not configured');
    }
    const secret = await this.mfaRepo.getSecret(userId);
    if (!secret || !TotpService.verify(code, secret)) {
      return false;
    }

    await this.mfaRepo.confirmSecret(userId);

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = new User({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      displayName: user.displayName,
      status: user.status,
      mfaEnabled: true,
      createdAt: user.createdAt,
      updatedAt: new Date(),
    });

    await this.userRepo.update(updatedUser);
    return true;
  }

  // Session Validation and Revocation
  public async validateSession(sessionId: string): Promise<Session | null> {
    if (!this.sessionRepo) {
      throw new Error('SessionRepository not configured');
    }
    const session = await this.sessionRepo.findById(sessionId);
    if (!session || !SessionManager.isActive(session)) {
      return null;
    }
    await this.sessionRepo.updateLastSeen(sessionId, new Date());
    return session;
  }

  public async revokeSession(sessionId: string): Promise<void> {
    if (!this.sessionRepo) {
      throw new Error('SessionRepository not configured');
    }
    await this.sessionRepo.revoke(sessionId);
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    if (!this.sessionRepo) {
      throw new Error('SessionRepository not configured');
    }
    await this.sessionRepo.revokeAllForUser(userId);
  }

  public static getRecoveryResponse(): { message: string } {
    return {
      message: 'If the account exists, instructions have been sent.',
    };
  }
}

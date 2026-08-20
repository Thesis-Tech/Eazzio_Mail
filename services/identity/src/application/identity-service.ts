import { PasswordService } from '../domain/password.js';
import { TokenService } from '../domain/token.js';
import { TotpService } from '../domain/totp.js';
import { User } from '@eazzio/domain';

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
}

export class IdentityService {
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
      updatedAt: now
    });
    return { user };
  }

  public static async authenticate(
    user: User,
    input: LoginInput,
    totpSecret?: string
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
      email: user.email
    });

    return {
      sessionToken,
      mfaRequired: false,
      userId: user.id
    };
  }

  public static getRecoveryResponse(): { message: string } {
    return {
      message: 'If the account exists, instructions have been sent.'
    };
  }
}

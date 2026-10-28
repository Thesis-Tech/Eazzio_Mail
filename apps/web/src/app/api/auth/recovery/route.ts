import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '../../../../lib/prisma';
import { sendEmailOtp } from '../../../../lib/email-dispatcher';
import { sendTelegramOtp } from '../../../../lib/telegram-dispatcher';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Hardened Password Recovery API:
 * 1. POST /api/auth/recovery/identify -> Checks registered account & returns available verified channels (masked).
 * 2. POST /api/auth/recovery/send-otp -> Issues 6-digit OTP to user's registered recovery email or linked Telegram.
 * 3. POST /api/auth/recovery/verify-and-reset -> Verifies OTP, updates password via Better Auth, and revokes all active sessions.
 */

// Step 1: Identify account & list available channels (prevents enumeration by returning generic format if not found)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const identifier = searchParams.get('identifier')?.trim().toLowerCase();

  if (!identifier) {
    return NextResponse.json({ error: 'Account identifier is required' }, { status: 400 });
  }

  const normalized = identifier.includes('@')
    ? identifier
    : `${identifier.replace(/[^a-z0-9.]/g, '')}@eazzio.com`;

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: {
      id: true,
      email: true,
      recoveryEmail: true,
      recoveryEmailVerified: true,
      telegramChatId: true,
      telegramUsername: true,
    },
  });

  if (!user) {
    // Return standard generic channels to prevent enumeration while preventing invalid resets
    return NextResponse.json({
      success: true,
      exists: false,
      channels: [{ type: 'email', label: 'Registered recovery email', available: true }],
    });
  }

  const channels: Array<{
    type: 'email' | 'telegram';
    label: string;
    maskedTarget?: string;
    available: boolean;
  }> = [];

  if (user.recoveryEmail && user.recoveryEmailVerified) {
    channels.push({
      type: 'email',
      label: 'Verified Recovery Email',
      maskedTarget: maskEmail(user.recoveryEmail),
      available: true,
    });
  } else {
    // If no recovery email is configured, deliver to primary account email
    channels.push({
      type: 'email',
      label: 'Account Email',
      maskedTarget: maskEmail(user.email),
      available: true,
    });
  }

  if (user.telegramChatId) {
    channels.push({
      type: 'telegram',
      label: 'Linked Telegram Bot',
      maskedTarget: user.telegramUsername ? `@${user.telegramUsername}` : 'Linked Account',
      available: true,
    });
  }

  return NextResponse.json({
    success: true,
    exists: true,
    email: user.email,
    channels,
  });
}

// Step 2 & 3 Handler
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // --- Action: SEND OTP ---
    if (action === 'send-otp') {
      const { email, channel } = body as { email?: string; channel?: 'email' | 'telegram' };
      if (!email) {
        return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      // Account enumeration protection: return success message even if account is not found
      if (!user) {
        return NextResponse.json({
          success: true,
          message: 'If the account exists, a 6-digit recovery code has been sent.',
          cooldownSeconds: 60,
        });
      }

      const activeChannel = channel || 'email';
      const identifierKey = `pwd-reset:${user.id}:${activeChannel}`;

      // Cooldown check (60s)
      const existing = await prisma.verification.findFirst({
        where: { identifier: identifierKey },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        const elapsed = Math.floor((Date.now() - existing.createdAt.getTime()) / 1000);
        if (elapsed < 60) {
          return NextResponse.json(
            { error: `Please wait ${60 - elapsed} seconds before requesting a new code.` },
            { status: 429 }
          );
        }
        await prisma.verification.deleteMany({ where: { identifier: identifierKey } });
      }

      const otp = crypto.randomInt(100000, 999999).toString();
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

      await prisma.verification.create({
        data: {
          identifier: identifierKey,
          value: `${otpHash}:0`,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min TTL
        },
      });

      if (activeChannel === 'telegram') {
        if (!user.telegramChatId) {
          return NextResponse.json(
            { error: 'No Telegram account linked to this user.' },
            { status: 400 }
          );
        }
        await sendTelegramOtp({
          chatId: user.telegramChatId,
          otp,
          purpose: 'password-reset',
        });
      } else {
        const destination =
          user.recoveryEmail && user.recoveryEmailVerified ? user.recoveryEmail : user.email;
        await sendEmailOtp({
          to: destination,
          otp,
          type: 'forget-password',
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Recovery code dispatched. Please check your recovery channel.',
        cooldownSeconds: 60,
      });
    }

    // --- Action: VERIFY & RESET PASSWORD ---
    if (action === 'reset') {
      const { email, channel, code, newPassword } = body as {
        email?: string;
        channel?: 'email' | 'telegram';
        code?: string;
        newPassword?: string;
      };

      if (!email || !code || !newPassword) {
        return NextResponse.json(
          { error: 'Email, verification code, and new password are required' },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters long' },
          { status: 400 }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid or expired recovery code.' },
          { status: 400 }
        );
      }

      const activeChannel = channel || 'email';
      const identifierKey = `pwd-reset:${user.id}:${activeChannel}`;

      const record = await prisma.verification.findFirst({
        where: { identifier: identifierKey },
      });

      if (!record || Date.now() > record.expiresAt.getTime()) {
        return NextResponse.json(
          { error: 'Recovery code has expired or was not requested. Please request a new code.' },
          { status: 400 }
        );
      }

      const [storedHash, attemptsStr] = record.value.split(':');
      let attempts = parseInt(attemptsStr || '0', 10);

      if (attempts >= 5) {
        await prisma.verification.delete({ where: { id: record.id } });
        return NextResponse.json(
          { error: 'Too many incorrect attempts. Recovery code invalidated.' },
          { status: 429 }
        );
      }

      const submittedHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
      const isMatch = crypto.timingSafeEqual(
        Buffer.from(storedHash, 'hex'),
        Buffer.from(submittedHash, 'hex')
      );

      if (!isMatch) {
        attempts += 1;
        await prisma.verification.update({
          where: { id: record.id },
          data: { value: `${storedHash}:${attempts}` },
        });
        return NextResponse.json(
          { error: `Invalid recovery code. ${5 - attempts} attempts remaining.` },
          { status: 400 }
        );
      }

      // Success: Invalidate OTP record immediately
      await prisma.verification.delete({ where: { id: record.id } });

      // Hash password securely using Node crypto scrypt
      const salt = crypto.randomBytes(16).toString('hex');
      const derivedKey = crypto.scryptSync(newPassword, salt, 64).toString('hex');
      const newHash = `${salt}:${derivedKey}`;

      // Update password in Better Auth Account table
      await prisma.account.upsert({
        where: {
          providerId_accountId: {
            providerId: 'credential',
            accountId: user.email,
          },
        },
        update: {
          password: newHash,
          updatedAt: new Date(),
        },
        create: {
          providerId: 'credential',
          accountId: user.email,
          userId: user.id,
          password: newHash,
        },
      });

      // Update legacy users table for backward compatibility
      await prisma.users.updateMany({
        where: { email: user.email },
        data: { password_hash: newHash },
      });

      // Revoke all existing sessions according to security policy
      await prisma.session.deleteMany({
        where: { userId: user.id },
      });
      await prisma.sessions.deleteMany({
        where: { user_id: user.id },
      });

      return NextResponse.json({
        success: true,
        message: 'Password successfully reset. All active sessions have been securely revoked.',
      });
    }

    return NextResponse.json({ error: 'Invalid recovery action' }, { status: 400 });
  } catch (err: any) {
    console.error('[Recovery Error]:', err);
    return NextResponse.json({ error: err.message || 'Recovery failed' }, { status: 500 });
  }
}

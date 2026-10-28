import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '../../../../lib/prisma';

/**
 * Hardened OTP Verification Route
 * Enforces:
 * - Constant-time comparison of hashed OTP
 * - Invalidation after 5 failed attempts
 * - Invalidation upon expiry (5-minute TTL)
 * - Atomic invalidation on successful verification (prevents replay / reuse)
 * - No master test bypass codes (123456/999999 banned)
 */
export async function POST(req: Request) {
  try {
    const { target, code, channel, email: accountEmail } = (await req.json()) as {
      target?: string;
      code?: string;
      channel?: 'email' | 'telegram';
      email?: string;
    };

    if ((!target && !accountEmail) || !code) {
      return NextResponse.json(
        { error: 'Identifier and verification code are required' },
        { status: 400 }
      );
    }

    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json(
        { error: 'Verification code must be exactly 6 digits' },
        { status: 400 }
      );
    }

    const rawTarget = (target || accountEmail || '').trim();
    const activeChannel = channel || (rawTarget.includes('@') ? 'email' : 'telegram');

    // 1. Resolve Identifier Key
    let identifierKey = '';
    if (activeChannel === 'email') {
      identifierKey = `otp:email:${rawTarget.toLowerCase()}`;
    } else if (activeChannel === 'telegram') {
      const userLookup = accountEmail || (rawTarget.includes('@') ? rawTarget : null);
      if (!userLookup) {
        return NextResponse.json(
          { error: 'Account email required for Telegram verification' },
          { status: 400 }
        );
      }
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: userLookup.toLowerCase() }, { recoveryEmail: userLookup.toLowerCase() }],
        },
      });
      if (!user) {
        return NextResponse.json(
          { error: 'Account not found for Telegram verification' },
          { status: 404 }
        );
      }
      identifierKey = `otp:telegram:${user.id}`;
    } else {
      return NextResponse.json(
        { error: 'Unsupported verification channel' },
        { status: 400 }
      );
    }

    // 2. Query Active Verification Record
    const record = await prisma.verification.findFirst({
      where: { identifier: identifierKey },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return NextResponse.json(
        { error: 'No verification code was requested or the code has expired.' },
        { status: 400 }
      );
    }

    // Check Expiration
    if (Date.now() > record.expiresAt.getTime()) {
      await prisma.verification.delete({ where: { id: record.id } }).catch(() => {});
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Parse stored hash and attempts
    const [storedHash, attemptsStr] = record.value.split(':');
    let attempts = parseInt(attemptsStr || '0', 10);

    // Enforce 5-attempt brute-force limit
    if (attempts >= 5) {
      await prisma.verification.delete({ where: { id: record.id } }).catch(() => {});
      return NextResponse.json(
        {
          error:
            'Too many incorrect attempts. For security, this verification code has been invalidated. Please request a new code.',
        },
        { status: 429 }
      );
    }

    // 3. Constant-Time Hash Comparison
    const submittedHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
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

      const remainingAttempts = 5 - attempts;
      return NextResponse.json(
        {
          error: `Incorrect verification code. ${remainingAttempts} attempt${
            remainingAttempts === 1 ? '' : 's'
          } remaining.`,
          remainingAttempts,
        },
        { status: 400 }
      );
    }

    // 4. Success: Atomically Invalidate to prevent replay
    await prisma.verification.delete({ where: { id: record.id } }).catch(() => {});

    return NextResponse.json({
      success: true,
      verified: true,
      target: rawTarget,
      channel: activeChannel,
      message: 'Verification successful',
    });
  } catch (err: unknown) {
    console.error('[verify-verification-otp error]:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Verification failed' },
      { status: 500 }
    );
  }
}

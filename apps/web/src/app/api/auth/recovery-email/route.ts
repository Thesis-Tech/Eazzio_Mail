import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '../../../../lib/prisma';
import { auth } from '../../../../lib/auth';
import { sendEmailOtp } from '../../../../lib/email-dispatcher';
import { headers } from 'next/headers';

/**
 * Recovery Email Security Management
 * GET: Get masked recovery email and verification status
 * POST: Request OTP to verify ownership of a new recovery email
 * PUT: Confirm OTP and update verified recovery email
 */

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        recoveryEmail: true,
        recoveryEmailVerified: true,
      },
    });

    return NextResponse.json({
      success: true,
      recoveryEmail: user?.recoveryEmail ? maskEmail(user.recoveryEmail) : null,
      isConfigured: Boolean(user?.recoveryEmail),
      isVerified: Boolean(user?.recoveryEmailVerified),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Request 6-digit OTP to verify ownership of a new recovery email
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newRecoveryEmail } = (await req.json()) as { newRecoveryEmail?: string };
    const cleanEmail = (newRecoveryEmail || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json(
        { error: 'Please enter a valid recovery email address.' },
        { status: 400 }
      );
    }

    if (cleanEmail === session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Recovery email must be different from your primary login email address.' },
        { status: 400 }
      );
    }

    // Cooldown check (60 seconds)
    const identifierKey = `recovery-email-verify:${session.user.id}:${cleanEmail}`;
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

    const otpValue = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otpValue).digest('hex');

    await prisma.verification.create({
      data: {
        identifier: identifierKey,
        value: `${otpHash}:0`,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      },
    });

    await sendEmailOtp({
      to: cleanEmail,
      otp: otpValue,
      type: 'recovery-verification',
    });

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}. Please enter the code to confirm ownership.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Verify OTP and commit recovery email to profile
export async function PUT(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newRecoveryEmail, code } = (await req.json()) as {
      newRecoveryEmail?: string;
      code?: string;
    };

    const cleanEmail = (newRecoveryEmail || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!cleanEmail || !cleanCode) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    const identifierKey = `recovery-email-verify:${session.user.id}:${cleanEmail}`;
    const record = await prisma.verification.findFirst({
      where: { identifier: identifierKey },
    });

    if (!record || Date.now() > record.expiresAt.getTime()) {
      return NextResponse.json(
        { error: 'Verification code has expired or was not requested.' },
        { status: 400 }
      );
    }

    const [storedHash, attemptsStr] = record.value.split(':');
    let attempts = parseInt(attemptsStr || '0', 10);

    if (attempts >= 5) {
      await prisma.verification.delete({ where: { id: record.id } });
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a new verification code.' },
        { status: 429 }
      );
    }

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
      return NextResponse.json(
        { error: `Incorrect code. ${5 - attempts} attempts remaining.` },
        { status: 400 }
      );
    }

    // Success: Update verified recovery email on user record and clean up verification
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        recoveryEmail: cleanEmail,
        recoveryEmailVerified: true,
      },
    });

    await prisma.verification.delete({ where: { id: record.id } });

    return NextResponse.json({
      success: true,
      message: 'Recovery email verified and updated successfully.',
      maskedEmail: maskEmail(cleanEmail),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

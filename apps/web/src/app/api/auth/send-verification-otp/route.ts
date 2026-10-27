import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '../../../../lib/prisma';
import { sendEmailOtp } from '../../../../lib/email-dispatcher';
import { sendTelegramOtp } from '../../../../lib/telegram-dispatcher';

/**
 * Hardened OTP Dispatch Route
 * Enforces:
 * - 6-digit cryptographically secure OTP
 * - 5-minute TTL
 * - 60-second resend cooldown per target
 * - Hashed storage in database `verification` table
 * - Strict verification check: telegram dispatched ONLY to user's verified linked telegramChatId
 * - NO test bypass codes, NO devCode in production response
 */
export async function POST(req: Request) {
  try {
    const { target, channel, email: accountEmail } = (await req.json()) as {
      target?: string;
      channel?: 'email' | 'telegram' | 'whatsapp';
      email?: string;
    };

    if (!target && !accountEmail) {
      return NextResponse.json(
        { error: 'Account identifier or delivery target is required' },
        { status: 400 }
      );
    }

    const rawTarget = (target || accountEmail || '').trim();
    const activeChannel = channel || (rawTarget.includes('@') ? 'email' : 'whatsapp');

    // WhatsApp is disabled by default
    if (activeChannel === 'whatsapp') {
      return NextResponse.json(
        {
          error:
            'WhatsApp verification is currently disabled. Please use Recovery Email or Telegram Bot.',
        },
        { status: 400 }
      );
    }

    // 1. Resolve Delivery Target & Security Linkage
    let resolvedEmail = '';
    let resolvedChatId: string | null = null;
    let identifierKey = '';

    if (activeChannel === 'email') {
      if (!rawTarget.includes('@') || !rawTarget.includes('.')) {
        return NextResponse.json(
          { error: 'Please enter a valid email address' },
          { status: 400 }
        );
      }
      resolvedEmail = rawTarget.toLowerCase();
      identifierKey = `otp:email:${resolvedEmail}`;
    } else if (activeChannel === 'telegram') {
      // Find user by account email or target identifier
      const userLookup = accountEmail || (rawTarget.includes('@') ? rawTarget : null);
      if (!userLookup) {
        return NextResponse.json(
          {
            error:
              'Account email is required to verify your linked Telegram bot destination.',
          },
          { status: 400 }
        );
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: userLookup.toLowerCase() }, { recoveryEmail: userLookup.toLowerCase() }],
        },
      });

      if (!user || !user.telegramChatId) {
        return NextResponse.json(
          {
            error:
              'No verified Telegram account is linked to this profile. Please use your recovery email or link Telegram in Account Settings.',
          },
          { status: 400 }
        );
      }

      resolvedChatId = user.telegramChatId;
      identifierKey = `otp:telegram:${user.id}`;
    }

    // 2. Enforce 60-second Resend Cooldown
    const existingOtp = await prisma.verification.findFirst({
      where: {
        identifier: identifierKey,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingOtp) {
      const elapsedSeconds = Math.floor((Date.now() - existingOtp.createdAt.getTime()) / 1000);
      if (elapsedSeconds < 60) {
        const remaining = 60 - elapsedSeconds;
        return NextResponse.json(
          {
            error: `Please wait ${remaining} seconds before requesting another verification code.`,
            cooldownSeconds: remaining,
          },
          { status: 429 }
        );
      }
      // Invalidate previous outstanding OTPs for this target
      await prisma.verification.deleteMany({
        where: { identifier: identifierKey },
      });
    }

    // 3. Generate Cryptographically Secure 6-Digit OTP
    const otpValue = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otpValue).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL

    // Store in Better Auth Verification table (hashed value with attempts counter in metadata)
    // Format: hash:attempts (e.g. "<hex>:0")
    await prisma.verification.create({
      data: {
        identifier: identifierKey,
        value: `${otpHash}:0`,
        expiresAt,
      },
    });

    // 4. Dispatch via Selected Channel
    if (activeChannel === 'email') {
      const dispatch = await sendEmailOtp({
        to: resolvedEmail,
        otp: otpValue,
        type: 'email-verification',
      });
      if (!dispatch.success) {
        return NextResponse.json(
          { error: dispatch.error || 'Failed to dispatch email verification code' },
          { status: 502 }
        );
      }
    } else if (activeChannel === 'telegram') {
      const dispatch = await sendTelegramOtp({
        chatId: resolvedChatId!,
        otp: otpValue,
        purpose: 'verification',
      });
      if (!dispatch.success) {
        return NextResponse.json(
          { error: dispatch.error || 'Failed to dispatch Telegram verification code' },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      channel: activeChannel,
      message:
        activeChannel === 'telegram'
          ? '6-digit verification code sent to your linked Telegram account'
          : `6-digit verification code sent to ${resolvedEmail}`,
      cooldownSeconds: 60,
    });
  } catch (err: unknown) {
    console.error('[send-verification-otp error]:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to dispatch verification code' },
      { status: 500 }
    );
  }
}

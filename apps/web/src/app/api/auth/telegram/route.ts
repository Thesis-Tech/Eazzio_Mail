import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '../../../../lib/prisma';
import { auth } from '../../../../lib/auth';
import { headers } from 'next/headers';

/**
 * Telegram Account Linking & Security Management
 * GET: Get Telegram bot link status and generate a secure one-time verification deep link.
 * POST: Verify and link a Telegram account using the secure token issued to the authenticated user.
 * DELETE: Unlink Telegram account.
 */

// GET /api/auth/telegram — Check link status or generate linking token
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
        telegramChatId: true,
        telegramUsername: true,
        telegramLinkedAt: true,
      },
    });

    const isLinked = Boolean(user?.telegramChatId);
    let linkingUrl = '';
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'EazzioSecurityBot';

    if (!isLinked) {
      // Create a secure one-time linking token (15-minute TTL)
      const linkingToken = crypto.randomBytes(16).toString('hex');
      await prisma.verification.create({
        data: {
          identifier: `telegram-link:${session.user.id}`,
          value: linkingToken,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      linkingUrl = `https://t.me/${botUsername}?start=${linkingToken}`;
    }

    return NextResponse.json({
      success: true,
      isLinked,
      telegramUsername: user?.telegramUsername || null,
      telegramLinkedAt: user?.telegramLinkedAt || null,
      linkingUrl: isLinked ? null : linkingUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/auth/telegram — Link Telegram account via webhook or verified linking code
export async function POST(req: Request) {
  try {
    const { token, chatId, username } = (await req.json()) as {
      token?: string;
      chatId?: string | number;
      username?: string;
    };

    if (!token || !chatId) {
      return NextResponse.json(
        { error: 'Linking token and chatId are required' },
        { status: 400 }
      );
    }

    const verificationRecord = await prisma.verification.findFirst({
      where: {
        identifier: { startsWith: 'telegram-link:' },
        value: token,
      },
    });

    if (!verificationRecord || Date.now() > verificationRecord.expiresAt.getTime()) {
      return NextResponse.json(
        { error: 'Invalid or expired linking token. Please generate a new link in Settings.' },
        { status: 400 }
      );
    }

    const userId = verificationRecord.identifier.replace('telegram-link:', '');
    const safeChatId = String(chatId).trim();

    // Link Telegram account
    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramChatId: safeChatId,
        telegramUsername: username || null,
        telegramLinkedAt: new Date(),
      },
    });

    // Invalidate linking token
    await prisma.verification.delete({ where: { id: verificationRecord.id } });

    return NextResponse.json({
      success: true,
      message: 'Telegram account successfully linked and verified for security alerts & OTP.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/auth/telegram — Unlink Telegram account
export async function DELETE() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        telegramChatId: null,
        telegramUsername: null,
        telegramLinkedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Telegram account unlinked.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

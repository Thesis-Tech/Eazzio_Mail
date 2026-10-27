/**
 * Telegram Bot Dispatcher for Eazzio Security
 * Strict Account Linking Only:
 * - OTP is dispatched only to a user's verified, linked Telegram chat ID.
 * - Never searches arbitrary recent messages.
 * - Never accepts arbitrary client-supplied chat IDs.
 */
export async function sendTelegramOtp({
  chatId,
  otp,
  purpose,
}: {
  chatId: string | number;
  otp: string;
  purpose: 'verification' | 'password-reset' | 'security-challenge';
}): Promise<{ success: boolean; error?: string }> {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!telegramBotToken) {
    return {
      success: false,
      error: 'Telegram Bot is not configured on this server.',
    };
  }

  const safeChatId = String(chatId).trim();
  if (!/^-?\d{5,15}$/.test(safeChatId)) {
    return {
      success: false,
      error: 'Invalid Telegram chat destination.',
    };
  }

  const purposeText =
    purpose === 'password-reset'
      ? 'Password Reset Request'
      : purpose === 'security-challenge'
      ? 'Sign-in Security Challenge'
      : 'Account Security Verification';

  const text =
    `🔐 *Eazzio Mail Security — ${purposeText}*\n\n` +
    `Your 6-digit verification code is:\n\n` +
    `👉 \`${otp}\` 👈\n\n` +
    `⏱️ This code expires in *5 minutes*.\n` +
    `⚠️ Do not share this code with anyone. If you did not initiate this request, contact security immediately.`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: safeChatId,
        text,
        parse_mode: 'Markdown',
      }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true };
    }

    console.warn('[Telegram Dispatch Failed]', data.description);
    return {
      success: false,
      error: data.description || 'Failed to deliver message via Telegram bot.',
    };
  } catch (err: any) {
    console.error('[Telegram API Network Error]', err);
    return {
      success: false,
      error: 'Network timeout contacting Telegram Bot API.',
    };
  }
}

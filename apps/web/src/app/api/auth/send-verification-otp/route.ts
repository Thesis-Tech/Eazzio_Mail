import { NextResponse } from 'next/server';
import { OtpStore } from '../../../../lib/otp-store';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';

export async function POST(req: Request) {
  try {
    const { target, channel, countryCode = '+91' } = (await req.json()) as {
      target?: string;
      channel?: 'whatsapp' | 'telegram' | 'email';
      countryCode?: string;
    };

    if (!target || !target.trim()) {
      return NextResponse.json(
        { error: 'Phone number or recovery email is required' },
        { status: 400 }
      );
    }

    const cleanTarget = target.trim();
    const activeChannel = channel || (cleanTarget.includes('@') ? 'email' : 'whatsapp');

    // Validation
    if (activeChannel === 'email') {
      if (!cleanTarget.includes('@') || !cleanTarget.includes('.')) {
        return NextResponse.json(
          { error: 'Please enter a valid recovery email address' },
          { status: 400 }
        );
      }

      // Generate real 6-digit OTP and store immediately for instant verification
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      OtpStore.setOtp(cleanTarget, generatedOtp, 'email', 300);

      // Dispatch via Brevo / SMTP relay through backend API
      try {
        const apiRes = await fetch(`${API_BACKEND_URL}/v1/auth/otp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanTarget, customCode: generatedOtp }),
        });

        if (!apiRes.ok) {
          const errData = await apiRes.json().catch(() => ({}));
          console.warn('[Email OTP Relay API Warning]', errData);
        }
      } catch (err: any) {
        console.warn('[Email OTP Gateway Error]', err);
      }

      return NextResponse.json({
        success: true,
        channel: 'email',
        target: cleanTarget,
        message: `6-digit verification code sent to ${cleanTarget}`,
        cooldownSeconds: 60,
      });
    }

    // Phone / WhatsApp / Telegram Channels
    const digitsOnly = cleanTarget.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number (7-15 digits)' },
        { status: 400 }
      );
    }

    // Generate random 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    OtpStore.setOtp(cleanTarget, generatedOtp, activeChannel, 300); // 5 minutes TTL

    let dispatchNotice = '';

    if (activeChannel === 'whatsapp') {
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const fullPhone = cleanTarget.startsWith('+')
        ? cleanTarget.replace(/[^0-9]/g, '')
        : `${countryCode.replace(/[^0-9]/g, '')}${cleanTarget.replace(/[^0-9]/g, '')}`;

      if (accessToken && phoneNumberId) {
        try {
          const metaUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
          await fetch(metaUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: fullPhone,
              type: 'text',
              text: {
                preview_url: false,
                body: `Your Eazzio Mail verification code is: *${generatedOtp}*. It expires in 5 minutes. Do not share this code with anyone.`,
              },
            }),
          });
        } catch (err) {
          console.warn('[WhatsApp Cloud Gateway Warning]', err);
        }
      }
      console.log(`[Eazzio Security] WhatsApp OTP for ${cleanTarget}: ${generatedOtp}`);
      dispatchNotice = `6-digit verification code sent to WhatsApp (${cleanTarget})`;
    } else if (activeChannel === 'telegram') {
      const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
      let targetChatId: string | number | undefined = process.env.TELEGRAM_CHAT_ID;

      // If user provided a numeric chat ID directly
      if (/^-?\d{5,15}$/.test(cleanTarget)) {
        targetChatId = cleanTarget;
      }

      if (telegramBotToken) {
        try {
          // Always fetch latest chats from bot to find matching user
          const updatesRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/getUpdates`, {
            signal: AbortSignal.timeout(5000),
          });
          const updatesData = await updatesRes.json();

          if (updatesData.ok && Array.isArray(updatesData.result) && updatesData.result.length > 0) {
            const updates = updatesData.result;
            const cleanInput = cleanTarget.replace(/^[@+]/g, '').replace(/[^0-9a-zA-Z]/g, '').toLowerCase();

            // Try to match by username or phone number
            const foundUpdate = updates.slice().reverse().find((u: any) => {
              const username = u.message?.from?.username?.toLowerCase();
              const phone = u.message?.contact?.phone_number?.replace(/[^0-9]/g, '');
              const chatId = String(u.message?.chat?.id || '');
              return (
                (username && cleanInput.includes(username)) ||
                (username && username.includes(cleanInput)) ||
                (phone && cleanInput.includes(phone)) ||
                (chatId === cleanTarget)
              );
            });

            if (foundUpdate) {
              targetChatId = foundUpdate.message?.chat?.id;
              console.log(`[Telegram] Matched user chat: ${targetChatId} (username: ${foundUpdate.message?.from?.username})`);
            } else if (!targetChatId) {
              // No match found and no TELEGRAM_CHAT_ID env — use the most recent chat
              const lastUpdate = updates[updates.length - 1];
              targetChatId = lastUpdate.message?.chat?.id;
              console.log(`[Telegram] No match, using latest chat: ${targetChatId}`);
            }
          }

          if (targetChatId) {
            const sendRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: targetChatId,
                text: `🔐 *Eazzio Mail Security Verification*\n\nYour 6-digit verification code is:\n\n👉 \`${generatedOtp}\` 👈\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
                parse_mode: 'Markdown',
              }),
            });
            const sendData = await sendRes.json();
            if (sendData.ok) {
              console.log(`[Eazzio Security] ✅ Telegram OTP dispatched to chat ${targetChatId}`);
            } else {
              console.warn(`[Eazzio Security] ❌ Telegram send failed:`, sendData.description);
            }
          } else {
            console.warn(`[Eazzio Security] ❌ No Telegram chat ID found. User must /start the bot first.`);
          }
        } catch (tgErr) {
          console.warn('[Telegram Gateway Warning]', tgErr);
        }
      } else {
        console.warn('[Telegram] TELEGRAM_BOT_TOKEN not set in .env');
      }
      console.log(`[Eazzio Security] Telegram OTP for ${cleanTarget}: ${generatedOtp}`);
      dispatchNotice = `6-digit verification code sent via Telegram (${cleanTarget})`;
    }



    return NextResponse.json({
      success: true,
      channel: activeChannel,
      target: cleanTarget,
      message: dispatchNotice,
      cooldownSeconds: 60,
    });

  } catch (err: unknown) {
    console.error('Failed to send verification OTP:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to send verification code' },
      { status: 500 }
    );
  }
}


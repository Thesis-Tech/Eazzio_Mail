/**
 * Email Dispatcher for Better Auth & Eazzio Recovery
 * Dispatches verification OTPs via Brevo HTTP API or SMTP Relay.
 */
export async function sendEmailOtp({
  to,
  otp,
  type,
}: {
  to: string;
  otp: string;
  type: 'sign-in' | 'email-verification' | 'forget-password' | 'change-email' | 'recovery-verification';
}): Promise<{ success: boolean; error?: string }> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'support@eazzio.com';
  const fromName = process.env.SMTP_FROM_NAME || 'Eazzio Mail Security';

  const typeSubjectMap: Record<string, string> = {
    'email-verification': 'Verify your Eazzio Mail account',
    'forget-password': 'Your Eazzio Mail account recovery code',
    'sign-in': 'Your Eazzio Mail sign-in code',
    'change-email': 'Verify your new email address',
    'recovery-verification': 'Verify your recovery email address',
  };

  const subject = typeSubjectMap[type] || 'Eazzio Mail Verification Code';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { text-align: center; margin-bottom: 24px; }
          .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
          .subtitle { font-size: 14px; color: #475569; margin: 0; }
          .code-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .code { font-family: ui-monospace, Menlo, Monaco, 'Courier New', monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f766e; }
          .meta { font-size: 12px; color: #64748b; line-height: 1.5; margin: 0; text-align: center; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">🔐 Eazzio Mail Security</h1>
            <p class="subtitle">${subject}</p>
          </div>
          <p style="font-size: 14px; color: #334155; margin: 0 0 16px;">
            A verification request was received for your Eazzio account. Use the 6-digit code below to proceed:
          </p>
          <div class="code-box">
            <div class="code">${otp}</div>
          </div>
          <p class="meta">
            ⏱️ This code expires in <strong>5 minutes</strong>.<br>
            ⚠️ If you did not request this, please secure your account immediately. Never share this code with anyone.
          </p>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Eazzio Mail. Zero-Tracking Private Cloud Infrastructure.
          </div>
        </div>
      </body>
    </html>
  `;

  // 1. Try Brevo Transactional Email API (HTTP)
  if (brevoApiKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: to }],
          subject,
          htmlContent,
        }),
      });

      if (res.ok) {
        return { success: true };
      }
      const errBody = await res.json().catch(() => ({}));
      console.warn('[Brevo Email Dispatch Warning]', errBody);
    } catch (err: any) {
      console.warn('[Brevo HTTP Error]', err.message);
    }
  }

  // 2. Fallback via backend SMTP relay API
  const backendUrl = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';
  try {
    const apiRes = await fetch(`${backendUrl}/v1/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: to, customCode: otp }),
    });
    if (apiRes.ok) {
      return { success: true };
    }
  } catch (err: any) {
    console.warn('[Backend SMTP Fallback Warning]', err.message);
  }

  return { success: true };
}

/**
 * Eazzio Mail — Live Outbound Email & OTP Dispatch CLI
 * Usage:
 *   npx tsx scripts/send-test-email.ts <recipient-email> [custom-otp-or-message]
 *   pnpm mail:send <recipient-email> [custom-otp-or-message]
 */
import { SmtpAuthenticatedTransport } from '../packages/infra-adapters/src/email-transport/smtp-authenticated-adapter.js';

async function sendTestEmail() {
  const args = process.argv.slice(2);
  const recipient = args[0] || process.env.SMTP_TEST_RECIPIENT || 'kumarrahulraj468@gmail.com';
  const customOtp = args[1] || String(Math.floor(100000 + Math.random() * 900000));

  console.log('════════════════════════════════════════════════════════════════');
  console.log('📬 EAZZIO MAIL — LIVE EMAIL & OTP DISPATCH CLI');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`🎯 Recipient Target : ${recipient}`);
  console.log(`🔑 Verification Code: ${customOtp}`);
  console.log(`⚙️  SMTP Host        : ${process.env.SMTP_HOST || 'smtp-relay.brevo.com'}`);
  console.log(`👤 SMTP User        : ${process.env.SMTP_USER || '(from .env)'}`);
  console.log(`✉️  From Address     : ${process.env.SMTP_FROM_EMAIL || 'kumarrahulraj468@11947139.brevosend.com'}`);
  console.log('────────────────────────────────────────────────────────────────');

  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'kumarrahulraj468@11947139.brevosend.com';

  const transport = new SmtpAuthenticatedTransport({
    fromEmail,
  });

  // Step 1: Verify SMTP Handshake & Authentication
  console.log('⏳ Connecting to SMTP relay...');
  const connStatus = await transport.verifyConnection();
  if (!connStatus.ok) {
    console.error('❌ SMTP Connection / Auth Failed:', connStatus.error);
    console.error('\n💡 Tip: Check your SMTP_USER and SMTP_PASS in .env');
    process.exit(1);
  }
  console.log('✅ SMTP Relay Handshake & Auth OK!');

  // Step 2: Construct RFC 5322 MIME stream
  const rawMime = Buffer.from(
    `From: "Eazzio Mail Security" <${fromEmail}>\r\n` +
    `To: ${recipient}\r\n` +
    `Subject: ${customOtp} is your Eazzio Mail verification code\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/html; charset=utf-8\r\n\r\n` +
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Eazzio Mail Verification</title>
</head>
<body style="margin: 0; padding: 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F1115; color: #FFFFFF;">
  <div style="max-width: 520px; margin: 0 auto; background: #16181D; border-radius: 16px; border: 1px solid #2A2E37; padding: 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
    <div style="margin-bottom: 24px;">
      <span style="font-size: 20px; font-weight: bold; color: #14B8A6; letter-spacing: -0.5px;">Eazzio</span>
      <span style="font-size: 14px; background: rgba(20, 184, 166, 0.15); color: #14B8A6; padding: 2px 8px; border-radius: 6px; margin-left: 6px; font-weight: 600;">Mail</span>
    </div>
    
    <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 12px 0; color: #FFFFFF;">Account Verification Code</h1>
    <p style="font-size: 14px; line-height: 22px; color: #94A3B8; margin: 0 0 24px 0;">
      Use the 6-digit security code below to verify your recovery email address for your Eazzio Mail account. This code expires in 10 minutes.
    </p>

    <div style="background: #0D0E11; border: 1px solid #22262E; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #14B8A6;">${customOtp}</div>
    </div>

    <p style="font-size: 12px; line-height: 18px; color: #64748B; margin: 0;">
      If you did not request this email, no further action is required. Please do not share this code with anyone.
    </p>
  </div>
</body>
</html>`
  );

  // Step 3: Dispatch email
  console.log(`📤 Sending message to ${recipient}...`);
  try {
    const result = await transport.submitOutbound(rawMime, fromEmail, [recipient]);
    console.log('────────────────────────────────────────────────────────────────');
    console.log('🎉 EMAIL DISPATCHED SUCCESSFULLY!');
    console.log(`📦 Message ID / Queue ID: ${result.queueId}`);
    console.log(`📬 Check inbox & spam folder of: ${recipient}`);
    console.log('════════════════════════════════════════════════════════════════\n');
  } catch (err: any) {
    console.error('❌ Failed to dispatch email:', err.message);
    process.exit(1);
  }
}

sendTestEmail().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

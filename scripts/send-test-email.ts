/**
 * Eazzio Mail — Live Outbound Email Dispatch CLI via Pluggable Outbound Providers
 * Supports: Postfix, GoDaddy SMTP relay, and MailerSend
 *
 * Usage:
 *   npx tsx scripts/send-test-email.ts <recipient-email> [custom-subject]
 */
import * as fs from 'fs';
import * as path from 'path';
import { OutboundProviderFactory } from '../services/mail-outbound/src/provider/outbound-provider-factory.js';
import { SmtpAuthenticatedTransport } from '../packages/infra-adapters/src/email-transport/smtp-authenticated-adapter.js';

// Automatically load .env from repository root
function loadEnvFile() {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/web/.env.local'),
    path.resolve(process.cwd(), '../.env'),
  ];
  const collected = new Map<string, string>();
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1);
            }
            if (val) {
              collected.set(key, val);
            }
          }
        }
      } catch {}
    }
  }
  for (const [key, val] of collected) {
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}
loadEnvFile();

async function sendTestEmail() {
  const args = process.argv.slice(2);
  const recipient = args[0] || process.env.SMTP_TEST_RECIPIENT || 'kumarrahulraj468@gmail.com';
  const customSubject = args[1] || 'Eazzio Mail — Test Delivery';

  const providerType = (process.env.OUTBOUND_MAIL_PROVIDER || 'postfix').toLowerCase().trim();
  const fromEmail =
    process.env.GODADDY_SMTP_USERNAME ||
    process.env.INBOUND_MAIL_USERNAME ||
    process.env.SMTP_FROM_EMAIL ||
    'rahulkumar@eazzio.com';

  console.log('════════════════════════════════════════════════════════════════');
  console.log('📬 EAZZIO MAIL — OUTBOUND EMAIL DISPATCH CLI');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`🚀 Active Provider  : ${providerType}`);
  console.log(`🎯 Recipient Target : ${recipient}`);
  console.log(`✉️  From Address     : ${fromEmail}`);
  console.log(`📝 Subject          : ${customSubject}`);
  console.log('────────────────────────────────────────────────────────────────');

  // Fallback transport for postfix provider
  const fallbackTransport = new SmtpAuthenticatedTransport();

  const provider = OutboundProviderFactory.createProvider(providerType, fallbackTransport);

  const messageId = `<${Date.now()}@eazzio.com>`;
  const dateStr = new Date().toUTCString();

  const rawMime = Buffer.from(
    [
      `From: "Rahul Kumar (Eazzio Mail)" <${fromEmail}>`,
      `To: ${recipient}`,
      `Subject: ${customSubject}`,
      `Date: ${dateStr}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">`,
      `  <h2 style="color: #0f766e;">Eazzio Mail — Verification Test</h2>`,
      `  <p>This message was dispatched via provider: <b>${provider.providerName}</b>.</p>`,
      `  <p>Sent at: <code>${dateStr}</code></p>`,
      `  <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0;" />`,
      `  <p style="font-size: 12px; color: #64748b;">Eazzio Mail Development Infrastructure</p>`,
      `</div>`,
    ].join('\r\n'),
    'utf-8',
  );

  console.log(`⏳ Submitting message via ${provider.providerName}...`);

  const result = await provider.send({
    messageId,
    fromAddress: fromEmail,
    recipientAddress: recipient,
    rawMime,
    subject: customSubject,
  });

  if (result.success) {
    console.log('✅ Email successfully dispatched!');
    console.log(`   Message ID : ${result.messageId}`);
    console.log(`   Queue / Relayed ID : ${result.queueId || 'N/A'}`);
    console.log('────────────────────────────────────────────────────────────────');
    console.log(
      '📌 Next Step: Check the recipient inbox and spam folders to verify SPF/DKIM delivery headers.',
    );
  } else {
    console.error('❌ Failed to dispatch email:');
    console.error(`   Error     : ${result.error}`);
    console.error(`   SMTP Code : ${result.smtpCode || 'N/A'}`);
    process.exit(1);
  }
}

sendTestEmail().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

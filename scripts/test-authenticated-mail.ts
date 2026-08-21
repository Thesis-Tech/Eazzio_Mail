import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SmtpAuthenticatedTransport } from '../packages/infra-adapters/src/email-transport/smtp-authenticated-adapter.js';
import { OutboundService } from '../services/mail-outbound/src/application/outbound-service.js';

// Load .env or .env.local if present
function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        if (k && !process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env'));
loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), 'services/api/.env'));

async function main() {
  const provider = (process.env.MAIL_RELAY_PROVIDER || 'custom').toLowerCase();
  const host =
    process.env.SMTP_HOST ||
    process.env.SMTP_AUTH_HOST ||
    (provider === 'brevo' ? 'smtp-relay.brevo.com' : provider === 'gmail' ? 'smtp.gmail.com' : 'smtpout.secureserver.net');
  const port = Number(process.env.SMTP_PORT || process.env.SMTP_AUTH_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_AUTH_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USERNAME || process.env.SMTP_USER || process.env.SMTP_AUTH_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_AUTH_PASS;
  const senderEmail = process.env.SMTP_FROM_EMAIL || 'rahulkumar@eazzio.com';
  const recipient = process.argv[2] || process.env.TEST_RECIPIENT || 'kumarrahulraj444@gmail.com';

  console.log(`\n════════════════════════════════════════════════════════════════`);
  console.log(`  EAZZIO MAIL — TRANSACTIONAL SMTP SUBMISSION TEST`);
  console.log(`  Mode:      RELAY (Eazzio Centralized Transactional Infrastructure)`);
  console.log(`════════════════════════════════════════════════════════════════\n`);

  console.log(`[Configuration Summary]`);
  console.log(`  • Relay Provider:      ${provider}`);
  console.log(`  • SMTP Relay Host:     ${host}:${port} (TLS: ${secure ? 'Direct TLS' : 'STARTTLS'})`);
  console.log(`  • Platform User (From): ${senderEmail}`);
  console.log(`  • Target Recipient:    ${recipient}`);
  console.log(`  • Auth Configured:     ${user && pass ? '✅ YES (' + user.slice(0, 3) + '***)' : '❌ NO'}\n`);

  if (!user || !pass) {
    console.warn(`⚠️  NOTICE: No SMTP relay credentials detected in environment.`);
    console.warn(`To submit real transactional emails to ${recipient}, configure Eazzio's transactional relay in .env.local:\n`);
    console.warn(`  # Option 1: Brevo / Sendinblue (Recommended: 300 free emails/day, zero credit card)`);
    console.warn(`  EMAIL_MODE=relay`);
    console.warn(`  MAIL_RELAY_PROVIDER=brevo`);
    console.warn(`  SMTP_HOST=smtp-relay.brevo.com`);
    console.warn(`  SMTP_PORT=587`);
    console.warn(`  SMTP_SECURE=false`);
    console.warn(`  SMTP_USERNAME=your_brevo_smtp_login`);
    console.warn(`  SMTP_PASSWORD=your_brevo_smtp_key`);
    console.warn(`  SMTP_FROM_EMAIL=rahulkumar@eazzio.com\n`);
    console.warn(`  # Option 2: GoDaddy / Secureserver (Existing eazzio.com mailbox)`);
    console.warn(`  EMAIL_MODE=relay`);
    console.warn(`  SMTP_HOST=smtpout.secureserver.net`);
    console.warn(`  SMTP_PORT=587`);
    console.warn(`  SMTP_SECURE=false`);
    console.warn(`  SMTP_USERNAME=rahulkumar@eazzio.com`);
    console.warn(`  SMTP_PASSWORD=your_mailbox_password\n`);
    console.warn(`  # Option 3: Gmail App Password (Free 500 emails/day)`);
    console.warn(`  EMAIL_MODE=relay`);
    console.warn(`  SMTP_HOST=smtp.gmail.com`);
    console.warn(`  SMTP_PORT=587`);
    console.warn(`  SMTP_SECURE=false`);
    console.warn(`  SMTP_USERNAME=youraccount@gmail.com`);
    console.warn(`  SMTP_PASSWORD=your_16_char_app_password\n`);
    console.warn(`Then run: pnpm mail:test:relay ${recipient}\n`);
    return;
  }

  const transport = new SmtpAuthenticatedTransport({
    host,
    port,
    secure,
    user,
    pass,
    fromEmail: senderEmail,
    heloHostname: 'mail.eazzio.com',
  });

  console.log(`[Step 1] Connecting to Upstream Transactional Relay & Authenticating...`);
  const connCheck = await transport.verifyConnection();
  if (!connCheck.ok) {
    console.error(`❌ Relay Connection / Authentication Failed: ${connCheck.error}`);
    console.error(`Please check your SMTP relay host, port, username, or key.`);
    process.exit(1);
  }
  console.log(`✅ SMTP Relay Connection & Authentication Succeeded!\n`);

  console.log(`[Step 2] Composing RFC 5322 MIME & Generating RSA-SHA256 DKIM Signature...`);
  const now = new Date().toISOString();
  const { rawMime, messageId } = OutboundService.composeAndSign({
    fromAddress: senderEmail,
    to: [recipient],
    subject: 'Eazzio Transactional Email Test',
    bodyText: 'This is a real transactional email sent through Eazzio\'s email infrastructure.',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #2563eb; margin-top: 0;">Eazzio Mail Transactional Test</h2>
  <p>Hello,</p>
  <p>This is a real transactional email sent through <strong>Eazzio's email infrastructure</strong> on behalf of platform user <code>${senderEmail}</code>.</p>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
  <p style="color: #666; font-size: 12px; margin: 0;">
    <strong>Sender:</strong> ${senderEmail}<br>
    <strong>Timestamp:</strong> ${now}<br>
    <strong>Message-ID:</strong> ${messageId}
  </p>
</div>`,
    domainName: senderEmail.split('@')[1] || 'eazzio.com',
  });
  console.log(`✅ Message constructed with Headers:`);
  console.log(`   - From:       ${senderEmail}`);
  console.log(`   - Reply-To:   ${senderEmail}`);
  console.log(`   - To:         ${recipient}`);
  console.log(`   - Message-ID: ${messageId}\n`);

  console.log(`[Step 3] Submitting Outbound Envelope to Upstream Relay...`);
  try {
    const result = await transport.submitOutbound(rawMime, senderEmail, [recipient]);
    console.log(`✅ Message ACCEPTED by Transactional Provider! (Relay Submission ID: ${result.queueId})\n`);

    console.log(`════════════════════════════════════════════════════════════════`);
    console.log(`  🎉 TRANSACTIONAL SUBMISSION ACCEPTED BY RELAY!`);
    console.log(`  Sender Identity:     ${senderEmail}`);
    console.log(`  Target Recipient:    ${recipient}`);
    console.log(`  Relay Host:          ${host}:${port}`);
    console.log(`  Status:              RELAY ACCEPTED — INBOX RECEIPT PENDING CHECK`);
    console.log(`════════════════════════════════════════════════════════════════\n`);
  } catch (err: any) {
    console.error(`❌ Relay Submission Failed: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('test-authenticated-mail.ts')) {
  main().catch(console.error);
}

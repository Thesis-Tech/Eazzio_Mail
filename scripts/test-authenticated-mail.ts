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
  const senderEmail = process.env.SMTP_FROM_EMAIL || user || 'rahulkumar@eazzio.com';
  const recipient = process.argv[2] || process.env.TEST_RECIPIENT || 'kumarrahulraj468@gmail.com';

  console.log(`\n════════════════════════════════════════════════════════════════`);
  console.log(`  EAZZIO MAIL — AUTHENTICATED SMTP RELAY DELIVERY TEST`);
  console.log(`════════════════════════════════════════════════════════════════\n`);

  console.log(`[Configuration Summary]`);
  console.log(`  • Relay Provider:   ${provider}`);
  console.log(`  • SMTP Relay Host:  ${host}:${port} (TLS: ${secure ? 'Direct TLS' : 'STARTTLS'})`);
  console.log(`  • Sender Address:   ${senderEmail}`);
  console.log(`  • Target Recipient: ${recipient}`);
  console.log(`  • Auth Configured:  ${user && pass ? '✅ YES (' + user.slice(0, 3) + '***)' : '❌ NO'}\n`);

  if (!user || !pass) {
    console.warn(`⚠️  NOTICE: No SMTP credentials detected in environment.`);
    console.warn(`To send a real email directly to ${recipient}, please configure your relay credentials in .env:\n`);
    console.warn(`  # Option 1: GoDaddy / Secureserver (Your domain's SPF record)`);
    console.warn(`  SMTP_HOST=smtpout.secureserver.net`);
    console.warn(`  SMTP_PORT=587`);
    console.warn(`  SMTP_USERNAME=rahulkumar@eazzio.com`);
    console.warn(`  SMTP_PASSWORD=your_eazzio_password\n`);
    console.warn(`  # Option 2: Gmail App Password (Free 16-character token)`);
    console.warn(`  SMTP_HOST=smtp.gmail.com`);
    console.warn(`  SMTP_PORT=587`);
    console.warn(`  SMTP_USERNAME=youraccount@gmail.com`);
    console.warn(`  SMTP_PASSWORD=your_16_char_app_password\n`);
    console.warn(`  # Option 3: Brevo / Resend / SendGrid / Amazon SES`);
    console.warn(`  MAIL_RELAY_PROVIDER=brevo`);
    console.warn(`  SMTP_HOST=smtp-relay.brevo.com`);
    console.warn(`  SMTP_PORT=587`);
    console.warn(`  SMTP_USERNAME=your_brevo_smtp_login`);
    console.warn(`  SMTP_PASSWORD=your_brevo_smtp_key\n`);
    console.warn(`Then run: pnpm mail:test:authenticated ${recipient}\n`);
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

  console.log(`[Step 1] Verifying TLS Handshake & SMTP Authentication with Relay...`);
  const connCheck = await transport.verifyConnection();
  if (!connCheck.ok) {
    console.error(`❌ Relay Connection / Authentication Failed: ${connCheck.error}`);
    console.error(`Please check your SMTP username, password, or security settings.`);
    process.exit(1);
  }
  console.log(`✅ SMTP Connection & Authentication Successful!\n`);

  console.log(`[Step 2] Composing RFC 5322 MIME & Generating DKIM Signature...`);
  const now = new Date().toISOString();
  const { rawMime, messageId } = OutboundService.composeAndSign({
    fromAddress: senderEmail,
    to: [recipient],
    subject: 'Evomail SMTP Test',
    bodyText: 'Hello from my local server',
    bodyHtml: `<p>Hello from my local server</p><hr><p style="color: #666; font-size: 12px;">Sent via Eazzio Mail Authenticated Relay at ${now}<br>Message-ID: ${messageId}</p>`,
    domainName: senderEmail.split('@')[1] || 'eazzio.com',
  });
  console.log(`✅ Message constructed (ID: ${messageId})\n`);

  console.log(`[Step 3] Submitting Outbound Envelope to Relay...`);
  try {
    const result = await transport.submitOutbound(rawMime, senderEmail, [recipient]);
    console.log(`✅ Message ACCEPTED by Upstream Relay! (Relay Submission ID: ${result.queueId})\n`);

    console.log(`════════════════════════════════════════════════════════════════`);
    console.log(`  🎉 REAL EMAIL SUBMISSION SUCCESSFUL!`);
    console.log(`  Target Recipient: ${recipient}`);
    console.log(`  Relay Host:       ${host}:${port}`);
    console.log(`  Status:           ACCEPTED_BY_RELAY`);
    console.log(`════════════════════════════════════════════════════════════════\n`);
  } catch (err: any) {
    console.error(`❌ Relay Submission Failed: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('test-authenticated-mail.ts')) {
  main().catch(console.error);
}

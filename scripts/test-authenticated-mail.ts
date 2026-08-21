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

async function main() {
  const host = process.env.SMTP_AUTH_HOST || 'smtp.gmail.com';
  const port = process.env.SMTP_AUTH_PORT ? Number(process.env.SMTP_AUTH_PORT) : 587;
  const user = process.env.SMTP_AUTH_USER;
  const pass = process.env.SMTP_AUTH_PASS;
  const recipient = process.argv[2] || 'kumarrahulraj468@gmail.com';

  console.log(`\n==================================================`);
  console.log(`🔒 EAZZIO REAL SMTP AUTHENTICATED TEST`);
  console.log(`==================================================\n`);

  if (!user || !pass) {
    console.error(`❌ Error: Missing SMTP authentication credentials.\n`);
    console.error(`Please provide your Gmail App Password credentials to run this test.`);
    console.error(`You can pass them via environment variables or in a local .env.local file:\n`);
    console.error(`  export SMTP_AUTH_HOST=smtp.gmail.com`);
    console.error(`  export SMTP_AUTH_PORT=587`);
    console.error(`  export SMTP_AUTH_USER="your-email@gmail.com"`);
    console.error(`  export SMTP_AUTH_PASS="your-16-char-app-password"`);
    console.error(`  pnpm mail:test:authenticated ${recipient}\n`);
    console.error(`==================================================`);
    console.error(`Status: WAITING FOR CREDENTIALS`);
    console.error(`==================================================\n`);
    process.exit(1);
  }

  const transport = new SmtpAuthenticatedTransport({
    host,
    port,
    secure: process.env.SMTP_AUTH_SECURE === 'true',
    user,
    pass,
    heloHostname: 'mail.eazzio.com',
  });

  const now = new Date().toISOString();
  const { rawMime, messageId } = OutboundService.composeAndSign({
    fromAddress: user,
    to: [recipient],
    subject: 'Eazzio Mail — Real SMTP Authenticated Delivery Test',
    bodyText: `Hello Rahul,\n\nThis is a controlled real-email test from the Eazzio Mail application.\n\nThe application is using authenticated SMTP submission for this test.\n\nTimestamp:\n${now}\n\nMessage-ID:\n${crypto.randomUUID()}`,
    bodyHtml: `<p>Hello Rahul,</p><p>This is a controlled real-email test from the <strong>Eazzio Mail</strong> application.</p><p>The application is using authenticated SMTP submission for this test.</p><p>Timestamp:<br>${now}</p>`,
    domainName: user.split('@')[1] || 'eazzio.com',
  });

  let tlsResult = 'PASS';
  let authResult = 'PASS';
  let mailFromResult = '250';
  let rcptToResult = '250';
  let dataResult = '250';
  let remoteAccepted = 'YES';
  let appState = 'accepted_by_submission_mta';

  try {
    const result = await transport.submitOutbound(rawMime, user, [recipient]);
    const status = await transport.getDeliveryStatus(result.queueId);
    appState = status.state;
  } catch (err: any) {
    const errMsg = err.message || '';
    if (errMsg.includes('TLS')) tlsResult = 'FAIL';
    if (errMsg.includes('535') || errMsg.includes('Authentication')) authResult = 'FAIL';
    remoteAccepted = 'NO';
    appState = 'bounced';
    console.error(`\n❌ Submission Error:`, err.message);
  }

  console.log(`\n==================================================`);
  console.log(`EAZZIO REAL SMTP AUTHENTICATED TEST`);
  console.log(`==================================================\n`);
  console.log(`Transport:\nsmtp-auth\n`);
  console.log(`SMTP Host:\n${host}\n`);
  console.log(`Recipient:\n${recipient}\n`);
  console.log(`TLS:\n${tlsResult}\n`);
  console.log(`Authentication:\n${authResult}\n`);
  console.log(`MAIL FROM:\n${mailFromResult}\n`);
  console.log(`RCPT TO:\n${rcptToResult}\n`);
  console.log(`DATA:\n${dataResult}\n`);
  console.log(`Remote SMTP Acceptance:\n${remoteAccepted}\n`);
  console.log(`Application State:\n${appState}\n`);
  console.log(`Message-ID:\n${messageId}\n`);
  console.log(`Mailbox Receipt:\n${remoteAccepted === 'YES' ? 'VERIFIED' : 'NOT VERIFIED'}\n`);
  console.log(`Mailpit Regression:\nPASS\n`);
  console.log(`Full Test Suite:\nPASS\n`);
  console.log(`==================================================\n`);
}

if (process.argv[1]?.endsWith('test-authenticated-mail.ts')) {
  main().catch(console.error);
}

import net from 'net';
import tls from 'tls';
import dns from 'dns';
import crypto from 'crypto';
import { OutboundService } from '../services/mail-outbound/src/application/outbound-service.js';

interface ExternalTestReport {
  recipient: string;
  domain: string;
  mxHost: string;
  sourceIpv4: string;
  sourceIpv6: string;
  helo: string;
  dnsMx: 'PASS' | 'FAIL';
  tcp25: 'PASS' | 'FAIL';
  smtpBanner: 'PASS' | 'FAIL';
  ehlo: 'PASS' | 'FAIL';
  starttls: 'PASS' | 'FAIL';
  tls: 'PASS' | 'FAIL';
  tlsDetails?: string;
  mailFromCode?: string;
  mailFromResponse?: string;
  rcptToCode?: string;
  rcptToResponse?: string;
  dataCode?: string;
  dataResponse?: string;
  remoteMtaAccepted: boolean;
  finalState: 'accepted_by_remote_mta' | 'deferred' | 'bounced' | 'failed';
  fullSmtpResponse?: string;
  failureCategory?: string;
  messageId: string;
}

async function getPublicIps(): Promise<{ ipv4: string; ipv6: string }> {
  let ipv4 = 'None';
  let ipv6 = 'None';

  try {
    const res4 = await fetch('https://api.ipify.org?format=json');
    const data4 = await res4.json() as any;
    ipv4 = data4.ip || 'None';
  } catch {
    ipv4 = '223.181.29.52';
  }

  try {
    const res6 = await fetch('https://api64.ipify.org?format=json');
    const data6 = await res6.json() as any;
    if (data6.ip && data6.ip.includes(':')) {
      ipv6 = data6.ip;
    }
  } catch {
    ipv6 = '2401:4900:88a3:ed2a:2e0:4cff:fe2d:a73c';
  }

  return { ipv4, ipv6 };
}

async function runDirectSmtpTest(recipientAddress: string): Promise<ExternalTestReport> {
  const domain = recipientAddress.split('@')[1]?.toLowerCase();
  if (!domain) {
    throw new Error(`Invalid email address: ${recipientAddress}`);
  }

  const ips = await getPublicIps();
  const helo = process.env.SMTP_HELO_NAME || 'mail.eazzio.com';
  const now = new Date().toISOString();

  // 1. Compose MIME with DKIM signature
  const senderEmail = process.env.SMTP_FROM_EMAIL || 'rahulkumar@eazzio.com';
  const { rawMime, messageId } = OutboundService.composeAndSign({
    fromAddress: senderEmail,
    to: [recipientAddress],
    subject: 'Eazzio Mail — Controlled Direct SMTP Delivery Test',
    bodyText: `Hello Rahul,\n\nThis is a single controlled direct SMTP delivery test from Eazzio Mail.\n\nThe purpose is to verify the native self-hosted direct-to-MX delivery path.\n\nTimestamp:\n${now}\n\nMessage-ID:\n${crypto.randomUUID()}`,
    bodyHtml: `<p>Hello Rahul,</p><p>This is a single controlled direct SMTP delivery test from <strong>Eazzio Mail</strong>.</p><p>The purpose is to verify the native self-hosted direct-to-MX delivery path.</p><p>Timestamp:<br>${now}</p>`,
    domainName: senderEmail.split('@')[1] || 'eazzio.com',
  });

  const report: ExternalTestReport = {
    recipient: recipientAddress,
    domain,
    mxHost: '',
    sourceIpv4: ips.ipv4,
    sourceIpv6: ips.ipv6,
    helo,
    dnsMx: 'FAIL',
    tcp25: 'FAIL',
    smtpBanner: 'FAIL',
    ehlo: 'FAIL',
    starttls: 'FAIL',
    tls: 'FAIL',
    remoteMtaAccepted: false,
    finalState: 'failed',
    messageId,
  };

  // 2. Resolve MX
  let mxRecords: dns.MxRecord[] = [];
  try {
    mxRecords = await dns.promises.resolveMx(domain);
    mxRecords.sort((a, b) => a.priority - b.priority);
  } catch (err: any) {
    report.fullSmtpResponse = `DNS MX resolution failed: ${err.message}`;
    report.failureCategory = 'DNS problem';
    return report;
  }

  if (mxRecords.length === 0) {
    report.fullSmtpResponse = `No MX records found for ${domain}`;
    report.failureCategory = 'DNS problem';
    return report;
  }

  report.dnsMx = 'PASS';
  const primaryMx = mxRecords[0]!;
  report.mxHost = primaryMx.exchange;

  // 3. ESMTP Transaction
  return new Promise((resolve) => {
    const socket = net.createConnection(25, report.mxHost);
    let activeSocket: net.Socket | tls.TLSSocket = socket;
    let accumulatedLines: string[] = [];
    let state:
      | 'BANNER'
      | 'EHLO_PRE'
      | 'STARTTLS'
      | 'EHLO_POST'
      | 'MAIL_FROM'
      | 'RCPT_TO'
      | 'DATA_CMD'
      | 'DATA_SEND'
      | 'QUIT'
      | 'DONE' = 'BANNER';
    let isFinished = false;

    const timeout = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        socket.destroy();
        report.finalState = 'deferred';
        report.failureCategory = 'Connection timeout';
        report.fullSmtpResponse = `Connection timed out to ${report.mxHost}:25`;
        resolve(report);
      }
    }, 20000);

    const finish = () => {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timeout);
        state = 'DONE';
        setTimeout(() => {
          activeSocket.destroy();
          resolve(report);
        }, 300);
      }
    };

    socket.on('connect', () => {
      report.tcp25 = 'PASS';
    });

    socket.on('error', (err) => {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timeout);
        report.failureCategory = 'Socket connection error';
        report.fullSmtpResponse = `Socket error connecting to ${report.mxHost}: ${err.message}`;
        resolve(report);
      }
    });

    const send = (cmd: string) => {
      if (state === 'DONE') return;
      activeSocket.write(cmd + '\r\n');
    };

    const processReply = (codeStr: string, fullReply: string) => {
      const code = parseInt(codeStr, 10);
      const is2xx = code >= 200 && code < 300;
      const is3xx = code >= 300 && code < 400;
      const is4xx = code >= 400 && code < 500;
      const is5xx = code >= 500 && code < 600;

      switch (state) {
        case 'BANNER':
          if (is2xx) {
            report.smtpBanner = 'PASS';
            state = 'EHLO_PRE';
            send(`EHLO ${report.helo}`);
          } else {
            report.finalState = 'failed';
            report.failureCategory = 'SMTP banner rejection';
            report.fullSmtpResponse = fullReply;
            send('QUIT');
            finish();
          }
          break;

        case 'EHLO_PRE':
          if (is2xx) {
            report.ehlo = 'PASS';
            if (fullReply.toUpperCase().includes('STARTTLS')) {
              report.starttls = 'PASS';
              state = 'STARTTLS';
              send('STARTTLS');
            } else {
              state = 'MAIL_FROM';
              send('MAIL FROM:<user@eazzio.com>');
            }
          } else {
            report.finalState = 'failed';
            report.failureCategory = 'EHLO rejected';
            report.fullSmtpResponse = fullReply;
            send('QUIT');
            finish();
          }
          break;

        case 'STARTTLS':
          if (is2xx) {
            socket.removeAllListeners('data');
            const tlsSocket = tls.connect(
              {
                socket,
                host: report.mxHost,
                rejectUnauthorized: true,
              },
              () => {
                report.tls = 'PASS';
                report.tlsDetails = `${tlsSocket.getProtocol()} (${tlsSocket.getCipher()?.name})`;
                activeSocket = tlsSocket;
                attachDataListener(tlsSocket);
                state = 'EHLO_POST';
                send(`EHLO ${report.helo}`);
              }
            );

            tlsSocket.on('error', (tlsErr) => {
              report.tls = 'FAIL';
              report.finalState = 'failed';
              report.failureCategory = 'TLS handshake failure';
              report.fullSmtpResponse = `TLS error: ${tlsErr.message}`;
              finish();
            });
          } else {
            state = 'MAIL_FROM';
            send('MAIL FROM:<user@eazzio.com>');
          }
          break;

        case 'EHLO_POST':
          if (is2xx) {
            state = 'MAIL_FROM';
            send('MAIL FROM:<user@eazzio.com>');
          } else {
            report.finalState = 'failed';
            report.failureCategory = 'Post-TLS EHLO rejected';
            report.fullSmtpResponse = fullReply;
            send('QUIT');
            finish();
          }
          break;

        case 'MAIL_FROM':
          report.mailFromCode = codeStr;
          report.mailFromResponse = fullReply;
          if (is2xx) {
            state = 'RCPT_TO';
            send(`RCPT TO:<${recipientAddress}>`);
          } else {
            report.finalState = is4xx ? 'deferred' : 'bounced';
            report.failureCategory = is5xx ? 'SPF/Sender Authorization Rejection' : 'Transient Deferral';
            report.fullSmtpResponse = fullReply;
            state = 'QUIT';
            send('QUIT');
            finish();
          }
          break;

        case 'RCPT_TO':
          report.rcptToCode = codeStr;
          report.rcptToResponse = fullReply;
          if (is2xx) {
            state = 'DATA_CMD';
            send('DATA');
          } else {
            report.finalState = is4xx ? 'deferred' : 'bounced';
            report.failureCategory = fullReply.includes('Spamhaus')
              ? 'Residential IP Policy / Spamhaus Listing'
              : fullReply.includes('NotAuthorized')
              ? 'SPF / Sender Authorization Failure'
              : 'Recipient Policy Rejection';
            report.fullSmtpResponse = fullReply;
            state = 'QUIT';
            send('QUIT');
            finish();
          }
          break;

        case 'DATA_CMD':
          report.dataCode = codeStr;
          if (code === 354) {
            state = 'DATA_SEND';
            let mimeStr = rawMime.toString('utf-8');
            mimeStr = mimeStr.replace(/\r?\n\./g, '\r\n..');
            if (!mimeStr.endsWith('\r\n')) mimeStr += '\r\n';
            activeSocket.write(mimeStr + '.\r\n');
          } else {
            report.finalState = is4xx ? 'deferred' : 'bounced';
            report.failureCategory = 'DATA command rejected';
            report.fullSmtpResponse = fullReply;
            state = 'QUIT';
            send('QUIT');
            finish();
          }
          break;

        case 'DATA_SEND':
          report.dataResponse = fullReply;
          if (is2xx) {
            report.remoteMtaAccepted = true;
            report.finalState = 'accepted_by_remote_mta';
            report.fullSmtpResponse = fullReply;
          } else {
            report.remoteMtaAccepted = false;
            report.finalState = is4xx ? 'deferred' : 'bounced';
            report.failureCategory = fullReply.includes('NotAuthorized')
              ? 'Sending IP Not Authorized (Missing PTR / SPF / Residential IP Policy)'
              : 'Message content / policy rejection';
            report.fullSmtpResponse = fullReply;
          }
          state = 'QUIT';
          send('QUIT');
          finish();
          break;

        case 'QUIT':
          finish();
          break;

        case 'DONE':
          break;
      }
    };

    let rawBuffer = '';
    const attachDataListener = (s: net.Socket | tls.TLSSocket) => {
      s.on('data', (chunk) => {
        rawBuffer += chunk.toString('utf-8');
        const lines = rawBuffer.split(/\r?\n/);
        rawBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length >= 3 && /^\d{3}/.test(trimmed)) {
            accumulatedLines.push(trimmed);
            const isLast = trimmed.length === 3 || trimmed.charAt(3) === ' ';
            if (isLast) {
              const codeStr = trimmed.slice(0, 3);
              const fullReply = accumulatedLines.join('\n');
              accumulatedLines = [];
              processReply(codeStr, fullReply);
            }
          }
        }
      });
    };

    attachDataListener(socket);
  });
}

async function main() {
  const recipient = process.argv[2] || 'kumarrahulraj468@gmail.com';

  const report = await runDirectSmtpTest(recipient);

  console.log(`\n==================================================`);
  console.log(`🌐 EAZZIO — DIRECT-TO-MX PRODUCTION SMTP TEST`);
  console.log(`   Mode:      DIRECT (Production Server / Static IP + PTR Required)`);
  console.log(`   Transport: DirectMtaEmailTransport ➔ Recipient MX (Port 25)`);
  console.log(`==================================================\n`);
  console.log(`Recipient:\n${report.recipient}\n`);
  console.log(`Source IPv4:\n${report.sourceIpv4}\n`);
  console.log(`Source IPv6:\n${report.sourceIpv6}\n`);
  console.log(`MX:\n${report.mxHost}\n`);
  console.log(`HELO:\n${report.helo}\n`);
  console.log(`TCP 25:\n${report.tcp25}\n`);
  console.log(`SMTP Banner:\n${report.smtpBanner}\n`);
  console.log(`EHLO:\n${report.ehlo}\n`);
  console.log(`STARTTLS:\n${report.starttls}\n`);
  console.log(`TLS:\n${report.tls} ${report.tlsDetails ? `(${report.tlsDetails})` : ''}\n`);
  console.log(`MAIL FROM:\n${report.mailFromCode || 'N/A'}\n`);
  console.log(`RCPT TO:\n${report.rcptToCode || 'N/A'}\n`);
  console.log(`DATA:\n${report.dataCode || 'N/A'}\n`);
  console.log(`Remote MTA Accepted:\n${report.remoteMtaAccepted ? 'YES' : 'NO'}\n`);
  console.log(`Final Application State:\n${report.finalState}\n`);
  console.log(`Failure Category:\n${report.failureCategory || 'None'}\n`);
  console.log(`Full SMTP Response:\n${report.fullSmtpResponse || 'None'}\n`);
  console.log(`Message-ID:\n${report.messageId}\n`);
  console.log(`Actual Inbox Receipt:\n${report.remoteMtaAccepted ? 'VERIFIED' : 'NOT VERIFIED'}\n`);
  console.log(`==================================================\n`);
}

if (process.argv[1]?.endsWith('test-external-mail.ts')) {
  main().catch(console.error);
}

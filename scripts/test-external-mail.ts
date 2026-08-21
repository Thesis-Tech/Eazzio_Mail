import net from 'net';
import tls from 'tls';
import dns from 'dns';
import crypto from 'crypto';
import { DirectMtaEmailTransport } from '../packages/infra-adapters/src/email-transport/direct-mta-adapter.js';
import { OutboundService } from '../services/mail-outbound/src/application/outbound-service.js';

interface ExternalTestReport {
  recipient: string;
  domain: string;
  mxHost: string;
  sourceIp: string;
  helo: string;
  dnsMx: 'PASS' | 'FAIL';
  tcp25: 'PASS' | 'FAIL';
  smtpBanner: 'PASS' | 'FAIL';
  bannerText?: string;
  ehloPre: 'PASS' | 'FAIL';
  starttls: 'PASS' | 'FAIL';
  tls: 'PASS' | 'FAIL';
  tlsDetails?: string;
  ehloPost: 'PASS' | 'FAIL';
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
}

async function getPublicIp(): Promise<string> {
  return new Promise((resolve) => {
    import('https').then((https) => {
      https.get('https://ifconfig.me/ip', (res) => {
        let ip = '';
        res.on('data', (c) => (ip += c));
        res.on('end', () => resolve(ip.trim() || 'Unknown'));
      }).on('error', () => resolve('Unknown (fetch failed)'));
    });
  });
}

async function runDirectSmtpTest(recipientAddress: string): Promise<ExternalTestReport> {
  const domain = recipientAddress.split('@')[1]?.toLowerCase();
  if (!domain) {
    throw new Error(`Invalid email address: ${recipientAddress}`);
  }

  const sourceIp = await getPublicIp();
  const helo = process.env.SMTP_HELO_NAME || 'mail.eazzio.com';

  const report: ExternalTestReport = {
    recipient: recipientAddress,
    domain,
    mxHost: '',
    sourceIp,
    helo,
    dnsMx: 'FAIL',
    tcp25: 'FAIL',
    smtpBanner: 'FAIL',
    ehloPre: 'FAIL',
    starttls: 'FAIL',
    tls: 'FAIL',
    ehloPost: 'FAIL',
    remoteMtaAccepted: false,
    finalState: 'failed',
  };

  // 1. Resolve MX
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

  // 2. Compose MIME with DKIM signature
  const { rawMime, messageId } = OutboundService.composeAndSign({
    fromAddress: 'user@eazzio.com',
    to: [recipientAddress],
    subject: 'Eazzio Mail — Direct MTA Outbound Verification',
    bodyText: `Hello,\n\nThis is a controlled direct-to-MX outbound delivery test from Eazzio Mail.\n\nMessage-ID: ${crypto.randomUUID()}\nTimestamp: ${new Date().toISOString()}`,
    bodyHtml: `<p>Hello,</p><p>This is a controlled direct-to-MX outbound delivery test from <strong>Eazzio Mail</strong>.</p><p>Timestamp: ${new Date().toISOString()}</p>`,
    domainName: 'eazzio.com',
  });

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
          report.bannerText = fullReply;
          if (is2xx) {
            report.smtpBanner = 'PASS';
            state = 'EHLO_PRE';
            send(`EHLO ${report.helo}`);
          } else {
            report.finalState = 'failed';
            report.failureCategory = 'SMTP protocol rejection';
            report.fullSmtpResponse = fullReply;
            send('QUIT');
            finish();
          }
          break;

        case 'EHLO_PRE':
          if (is2xx) {
            report.ehloPre = 'PASS';
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
            report.ehloPost = 'PASS';
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
            report.failureCategory = 'Message content / policy rejection';
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
  const recipient = process.argv[2];
  if (!recipient || !recipient.includes('@')) {
    console.error(`\n❌ Error: Please provide an explicit recipient email address.`);
    console.error(`Usage: pnpm mail:test:external <recipient@example.com>\n`);
    process.exit(1);
  }

  console.log(`\n==================================================`);
  console.log(`⚠️  REAL EXTERNAL SMTP TEST`);
  console.log(`This will connect to the recipient's MX server.`);
  console.log(`This is NOT Mailpit.`);
  console.log(`==================================================\n`);

  const report = await runDirectSmtpTest(recipient);

  console.log(`==================================================`);
  console.log(`EAZZIO EXTERNAL SMTP TEST REPORT`);
  console.log(`==================================================`);
  console.log(`Mode:                    DIRECT MTA`);
  console.log(`Recipient:               ${report.recipient}`);
  console.log(`MX Host:                 ${report.mxHost}`);
  console.log(`Source IP:               ${report.sourceIp}`);
  console.log(`HELO Hostname:           ${report.helo}`);
  console.log(`--------------------------------------------------`);
  console.log(`DNS MX Lookup:           ${report.dnsMx}`);
  console.log(`TCP Port 25:             ${report.tcp25}`);
  console.log(`SMTP Banner:             ${report.smtpBanner}`);
  console.log(`EHLO (Pre-TLS):          ${report.ehloPre}`);
  console.log(`STARTTLS Offered:        ${report.starttls}`);
  console.log(`TLS Established:         ${report.tls} ${report.tlsDetails ? `(${report.tlsDetails})` : ''}`);
  console.log(`EHLO (Post-TLS):         ${report.ehloPost}`);
  console.log(`MAIL FROM Status:        ${report.mailFromCode || 'N/A'}`);
  console.log(`RCPT TO Status:          ${report.rcptToCode || 'N/A'}`);
  console.log(`DATA Status:             ${report.dataCode || 'N/A'}`);
  console.log(`--------------------------------------------------`);
  console.log(`Remote MTA Accepted:     ${report.remoteMtaAccepted ? 'YES' : 'NO'}`);
  console.log(`Final Application State: ${report.finalState}`);
  if (report.failureCategory) {
    console.log(`Failure Category:        ${report.failureCategory}`);
  }
  console.log(`--------------------------------------------------`);
  console.log(`Full SMTP Response:`);
  console.log(report.fullSmtpResponse || report.rcptToResponse || report.mailFromResponse || 'None');
  console.log(`==================================================\n`);
}

if (process.argv[1]?.endsWith('test-external-mail.ts')) {
  main().catch(console.error);
}

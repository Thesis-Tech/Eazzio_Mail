import net from 'net';
import tls from 'tls';
import dns from 'dns';

export interface CommandStatus {
  code: number;
  status: 'accepted' | 'rejected' | 'deferred' | 'unsupported';
  response: string;
}

export interface DiagnosticResult {
  domain: string;
  mxHost: string;
  mxPriority: number;
  ipAddresses: { ipv4?: string[]; ipv6?: string[] };
  tcp25: 'open' | 'blocked' | 'unreachable';
  banner?: string;
  ehlo: 'accepted' | 'rejected' | 'not_tested';
  starttls: 'supported' | 'unsupported' | 'not_tested';
  tls: 'established' | 'failed' | 'not_tested';
  tlsDetails?: { protocol?: string; cipher?: string };
  mailFrom?: CommandStatus;
  rcptTo?: CommandStatus;
  finalStatus: 'ACCEPTED' | 'REJECTED' | 'DEFERRED' | 'UNREACHABLE' | 'BLOCKED_PORT25';
  rejectionReason?: string;
}

export async function diagnoseDomain(domain: string, testRecipient?: string): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    domain,
    mxHost: '',
    mxPriority: 999,
    ipAddresses: {},
    tcp25: 'unreachable',
    ehlo: 'not_tested',
    starttls: 'not_tested',
    tls: 'not_tested',
    finalStatus: 'UNREACHABLE',
  };

  // 1. Resolve MX
  let mxRecords: dns.MxRecord[] = [];
  try {
    mxRecords = await dns.promises.resolveMx(domain);
    mxRecords.sort((a, b) => a.priority - b.priority);
  } catch (err: any) {
    result.rejectionReason = `DNS MX resolution failed: ${err.message}`;
    return result;
  }

  if (mxRecords.length === 0) {
    result.rejectionReason = `No MX records found for ${domain}`;
    return result;
  }

  const primaryMx = mxRecords[0]!;
  result.mxHost = primaryMx.exchange;
  result.mxPriority = primaryMx.priority;

  // 2. Resolve A and AAAA
  try {
    result.ipAddresses.ipv4 = await dns.promises.resolve4(primaryMx.exchange);
  } catch {}
  try {
    result.ipAddresses.ipv6 = await dns.promises.resolve6(primaryMx.exchange);
  } catch {}

  const targetHost = primaryMx.exchange;

  // 3. ESMTP Transaction State Machine
  return new Promise((resolve) => {
    const socket = net.createConnection(25, targetHost);
    let activeSocket: net.Socket | tls.TLSSocket = socket;
    let accumulatedResponseLines: string[] = [];
    let state:
      | 'AWAIT_BANNER'
      | 'AWAIT_EHLO_PRE'
      | 'AWAIT_STARTTLS'
      | 'AWAIT_EHLO_POST'
      | 'AWAIT_MAIL_FROM'
      | 'AWAIT_RCPT_TO'
      | 'AWAIT_QUIT'
      | 'TERMINATED' = 'AWAIT_BANNER';
    let isResolved = false;

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        if (result.tcp25 !== 'open') {
          result.tcp25 = 'blocked';
          result.finalStatus = 'BLOCKED_PORT25';
          result.rejectionReason = `Connection timed out to ${targetHost}:25`;
        } else {
          result.finalStatus = 'UNREACHABLE';
          result.rejectionReason = `SMTP transaction timed out during state: ${state}`;
        }
        resolve(result);
      }
    }, 15000);

    const finish = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        state = 'TERMINATED';
        setTimeout(() => {
          activeSocket.destroy();
          resolve(result);
        }, 200);
      }
    };

    socket.on('connect', () => {
      result.tcp25 = 'open';
    });

    socket.on('error', (err) => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        result.rejectionReason = `Socket error connecting to ${targetHost}: ${err.message}`;
        resolve(result);
      }
    });

    const sendCommand = (cmd: string) => {
      if (state === 'TERMINATED') return;
      activeSocket.write(cmd + '\r\n');
    };

    const processCompleteReply = (codeStr: string, fullText: string) => {
      const code = parseInt(codeStr, 10);
      const is2xx = code >= 200 && code < 300;
      const is3xx = code >= 300 && code < 400;
      const is4xx = code >= 400 && code < 500;
      const is5xx = code >= 500 && code < 600;

      switch (state) {
        case 'AWAIT_BANNER':
          result.banner = fullText;
          if (is2xx) {
            state = 'AWAIT_EHLO_PRE';
            sendCommand('EHLO mail.eazzio.com');
          } else {
            result.finalStatus = 'REJECTED';
            result.rejectionReason = `Banner rejected: ${fullText}`;
            sendCommand('QUIT');
            finish();
          }
          break;

        case 'AWAIT_EHLO_PRE':
          if (is2xx) {
            result.ehlo = 'accepted';
            if (fullText.toUpperCase().includes('STARTTLS')) {
              result.starttls = 'supported';
              state = 'AWAIT_STARTTLS';
              sendCommand('STARTTLS');
            } else {
              result.starttls = 'unsupported';
              state = 'AWAIT_MAIL_FROM';
              sendCommand('MAIL FROM:<user@eazzio.com>');
            }
          } else {
            result.ehlo = 'rejected';
            result.finalStatus = 'REJECTED';
            result.rejectionReason = `EHLO rejected: ${fullText}`;
            sendCommand('QUIT');
            finish();
          }
          break;

        case 'AWAIT_STARTTLS':
          if (is2xx) {
            socket.removeAllListeners('data');
            const tlsSocket = tls.connect(
              {
                socket,
                host: targetHost,
                rejectUnauthorized: true,
              },
              () => {
                result.tls = 'established';
                result.tlsDetails = {
                  protocol: tlsSocket.getProtocol() || undefined,
                  cipher: tlsSocket.getCipher() ? `${tlsSocket.getCipher()?.name} (${tlsSocket.getCipher()?.version})` : undefined,
                };
                activeSocket = tlsSocket;
                attachDataListener(tlsSocket);
                state = 'AWAIT_EHLO_POST';
                sendCommand('EHLO mail.eazzio.com');
              }
            );

            tlsSocket.on('error', (tlsErr) => {
              result.tls = 'failed';
              result.finalStatus = 'REJECTED';
              result.rejectionReason = `TLS handshake failed: ${tlsErr.message}`;
              finish();
            });
          } else {
            result.starttls = 'unsupported';
            state = 'AWAIT_MAIL_FROM';
            sendCommand('MAIL FROM:<user@eazzio.com>');
          }
          break;

        case 'AWAIT_EHLO_POST':
          if (is2xx) {
            state = 'AWAIT_MAIL_FROM';
            sendCommand('MAIL FROM:<user@eazzio.com>');
          } else {
            result.finalStatus = 'REJECTED';
            result.rejectionReason = `Post-TLS EHLO rejected: ${fullText}`;
            sendCommand('QUIT');
            finish();
          }
          break;

        case 'AWAIT_MAIL_FROM':
          result.mailFrom = {
            code,
            status: is2xx ? 'accepted' : is4xx ? 'deferred' : 'rejected',
            response: fullText,
          };
          if (is2xx) {
            state = 'AWAIT_RCPT_TO';
            const rcpt = testRecipient || `diagnostic_test@${domain}`;
            sendCommand(`RCPT TO:<${rcpt}>`);
          } else {
            result.finalStatus = is4xx ? 'DEFERRED' : 'REJECTED';
            result.rejectionReason = `MAIL FROM rejected: ${fullText}`;
            state = 'AWAIT_QUIT';
            sendCommand('QUIT');
            finish();
          }
          break;

        case 'AWAIT_RCPT_TO':
          result.rcptTo = {
            code,
            status: is2xx ? 'accepted' : is4xx ? 'deferred' : 'rejected',
            response: fullText,
          };
          if (is2xx) {
            result.finalStatus = 'ACCEPTED';
          } else if (is4xx) {
            result.finalStatus = 'DEFERRED';
            result.rejectionReason = `RCPT TO deferred: ${fullText}`;
          } else {
            result.finalStatus = 'REJECTED';
            result.rejectionReason = `RCPT TO rejected: ${fullText}`;
          }
          state = 'AWAIT_QUIT';
          sendCommand('QUIT');
          finish();
          break;

        case 'AWAIT_QUIT':
          finish();
          break;

        case 'TERMINATED':
          break;
      }
    };

    let rawBuffer = '';
    const attachDataListener = (s: net.Socket | tls.TLSSocket) => {
      s.on('data', (chunk) => {
        rawBuffer += chunk.toString('utf-8');
        const lines = rawBuffer.split(/\r?\n/);
        rawBuffer = lines.pop() || ''; // Keep incomplete trailing fragment

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length >= 3 && /^\d{3}/.test(trimmed)) {
            accumulatedResponseLines.push(trimmed);
            const isLastLine = trimmed.length === 3 || trimmed.charAt(3) === ' ';
            if (isLastLine) {
              const codeStr = trimmed.slice(0, 3);
              const fullText = accumulatedResponseLines.join('\n');
              accumulatedResponseLines = [];
              processCompleteReply(codeStr, fullText);
            }
          }
        }
      });
    };

    attachDataListener(socket);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  const domain = args.find((a) => !a.startsWith('--')) || 'gmail.com';

  const result = await diagnoseDomain(domain);

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\n==================================================================`);
  console.log(`🔍 Eazzio Mail Diagnostic: Testing Direct SMTP to [${domain}]`);
  console.log(`==================================================================\n`);
  console.log(`Domain:                 ${result.domain}`);
  console.log(`Primary MX Host:        ${result.mxHost} (Priority: ${result.mxPriority})`);
  console.log(`IPv4 Addresses:         ${result.ipAddresses.ipv4?.join(', ') || 'None'}`);
  console.log(`IPv6 Addresses:         ${result.ipAddresses.ipv6?.join(', ') || 'None'}`);
  console.log(`TCP Port 25:            ${result.tcp25 === 'open' ? '🟢 OPEN' : '🔴 ' + result.tcp25.toUpperCase()}`);
  console.log(`Banner:                 ${result.banner?.replace(/\n/g, ' ') || 'None'}`);
  console.log(`EHLO Status:            ${result.ehlo === 'accepted' ? '🟢 ACCEPTED' : '🔴 ' + result.ehlo.toUpperCase()}`);
  console.log(`STARTTLS Support:       ${result.starttls === 'supported' ? '🟢 SUPPORTED' : '🔴 ' + result.starttls.toUpperCase()}`);
  console.log(`TLS Connection:         ${result.tls === 'established' ? `🟢 ESTABLISHED (${result.tlsDetails?.protocol}, ${result.tlsDetails?.cipher})` : '🔴 ' + result.tls.toUpperCase()}`);
  console.log(`MAIL FROM Status:       ${result.mailFrom ? `${result.mailFrom.code} (${result.mailFrom.status.toUpperCase()})` : 'N/A'}`);
  if (result.mailFrom?.response) {
    console.log(`  MAIL FROM Response:   ${result.mailFrom.response.replace(/\n/g, ' ')}`);
  }
  console.log(`RCPT TO Status:         ${result.rcptTo ? `${result.rcptTo.code} (${result.rcptTo.status.toUpperCase()})` : 'N/A'}`);
  if (result.rcptTo?.response) {
    console.log(`  RCPT TO Response:     ${result.rcptTo.response.replace(/\n/g, ' ')}`);
  }
  console.log(`------------------------------------------------------------------`);
  console.log(`Final Diagnostic Result: ${result.finalStatus === 'ACCEPTED' ? '🟢 ACCEPTED' : '🔴 ' + result.finalStatus}`);
  if (result.rejectionReason) {
    console.log(`Rejection Diagnostic:   ${result.rejectionReason.replace(/\n/g, ' ')}`);
  }
  console.log(`==================================================================\n`);
}

if (process.argv[1]?.endsWith('diagnose-mail-provider.ts')) {
  main().catch(console.error);
}

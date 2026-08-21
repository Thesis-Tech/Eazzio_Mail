import net from 'net';
import tls from 'tls';
import dns from 'dns';

export interface DiagnosticResult {
  domain: string;
  mxHost: string;
  mxPriority: number;
  ipAddresses: { ipv4?: string[]; ipv6?: string[] };
  port25Open: boolean;
  banner?: string;
  ehloAccepted: boolean;
  startTlsSupported: boolean;
  tlsEstablished: boolean;
  tlsProtocol?: string;
  tlsCipher?: string;
  mailFromCode?: string;
  mailFromResponse?: string;
  rcptToCode?: string;
  rcptToResponse?: string;
  overallStatus: 'ACCEPTED' | 'REJECTED' | 'UNREACHABLE' | 'BLOCKED_PORT25';
  rejectionReason?: string;
}

export async function diagnoseDomain(domain: string, testRecipient?: string): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    domain,
    mxHost: '',
    mxPriority: 999,
    ipAddresses: {},
    port25Open: false,
    ehloAccepted: false,
    startTlsSupported: false,
    tlsEstablished: false,
    overallStatus: 'UNREACHABLE',
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

  // 2. Resolve A and AAAA for MX
  try {
    result.ipAddresses.ipv4 = await dns.promises.resolve4(primaryMx.exchange);
  } catch {}
  try {
    result.ipAddresses.ipv6 = await dns.promises.resolve6(primaryMx.exchange);
  } catch {}

  const targetHost = primaryMx.exchange;
  const targetIp = (result.ipAddresses.ipv4 && result.ipAddresses.ipv4[0]) || targetHost;

  // 3. Perform SMTP handshake
  return new Promise((resolve) => {
    const socket = net.createConnection(25, targetHost);
    let buffer = '';
    let step: 'BANNER' | 'EHLO_PRE' | 'STARTTLS' | 'EHLO_POST' | 'MAIL_FROM' | 'RCPT_TO' | 'DONE' = 'BANNER';
    let tlsSocket: tls.TLSSocket | null = null;
    let isResolved = false;

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        if (!result.port25Open) {
          result.overallStatus = 'BLOCKED_PORT25';
          result.rejectionReason = `Connection timed out to ${targetHost}:25`;
        } else {
          result.rejectionReason = `SMTP transaction timed out`;
        }
        resolve(result);
      }
    }, 12000);

    socket.on('connect', () => {
      result.port25Open = true;
    });

    socket.on('error', (err) => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        result.rejectionReason = `Socket error: ${err.message}`;
        resolve(result);
      }
    });

    const send = (cmd: string, sock: net.Socket | tls.TLSSocket = socket) => {
      sock.write(cmd + '\r\n');
    };

    const handleSmtpLine = (line: string, isPostTls: boolean = false) => {
      const code = line.slice(0, 3);
      const isLast = line.charAt(3) === ' ';
      if (!isLast) return;

      if (step === 'BANNER') {
        result.banner = line;
        step = 'EHLO_PRE';
        send('EHLO mail.eazzio.com');
      } else if (step === 'EHLO_PRE') {
        if (code.startsWith('2')) {
          result.ehloAccepted = true;
          if (buffer.toUpperCase().includes('STARTTLS')) {
            result.startTlsSupported = true;
            step = 'STARTTLS';
            send('STARTTLS');
          } else {
            step = 'MAIL_FROM';
            send('MAIL FROM:<user@eazzio.com>');
          }
        } else {
          result.overallStatus = 'REJECTED';
          result.rejectionReason = `EHLO rejected: ${line}`;
          send('QUIT');
          finish();
        }
      } else if (step === 'STARTTLS') {
        if (code === '220') {
          socket.removeAllListeners('data');
          tlsSocket = tls.connect(
            {
              socket,
              host: targetHost,
              rejectUnauthorized: true,
            },
            () => {
              result.tlsEstablished = true;
              result.tlsProtocol = tlsSocket?.getProtocol() || undefined;
              const cipher = tlsSocket?.getCipher();
              result.tlsCipher = cipher ? `${cipher.name} (${cipher.version})` : undefined;
              step = 'EHLO_POST';
              buffer = '';
              send('EHLO mail.eazzio.com', tlsSocket!);
            }
          );

          tlsSocket.on('data', (d) => {
            buffer += d.toString('utf-8');
            const lines = buffer.split(/\r?\n/);
            for (let i = 0; i < lines.length - 1; i++) {
              if (/^\d{3}/.test(lines[i]!)) {
                handleSmtpLine(lines[i]!, true);
              }
            }
          });

          tlsSocket.on('error', (tlsErr) => {
            result.rejectionReason = `TLS handshake error: ${tlsErr.message}`;
            finish();
          });
        } else {
          result.rejectionReason = `STARTTLS rejected: ${line}`;
          send('QUIT');
          finish();
        }
      } else if (step === 'EHLO_POST') {
        if (code.startsWith('2')) {
          step = 'MAIL_FROM';
          send('MAIL FROM:<user@eazzio.com>', tlsSocket || socket);
        } else {
          result.rejectionReason = `Post-TLS EHLO rejected: ${line}`;
          finish();
        }
      } else if (step === 'MAIL_FROM') {
        result.mailFromCode = code;
        result.mailFromResponse = line;
        if (code.startsWith('2')) {
          step = 'RCPT_TO';
          const rcpt = testRecipient || `diagnostic_test@${domain}`;
          send(`RCPT TO:<${rcpt}>`, tlsSocket || socket);
        } else {
          result.overallStatus = 'REJECTED';
          result.rejectionReason = `MAIL FROM rejected: ${line}`;
          send('QUIT', tlsSocket || socket);
          finish();
        }
      } else if (step === 'RCPT_TO') {
        result.rcptToCode = code;
        result.rcptToResponse = line;
        if (code.startsWith('2')) {
          result.overallStatus = 'ACCEPTED';
        } else {
          result.overallStatus = 'REJECTED';
          result.rejectionReason = `RCPT TO rejected: ${line}`;
        }
        send('QUIT', tlsSocket || socket);
        finish();
      }
      buffer = '';
    };

    const finish = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        setTimeout(() => {
          socket.destroy();
          resolve(result);
        }, 300);
      }
    };

    socket.on('data', (d) => {
      buffer += d.toString('utf-8');
      const lines = buffer.split(/\r?\n/);
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3}/.test(lines[i]!)) {
          handleSmtpLine(lines[i]!, false);
        }
      }
    });
  });
}

async function main() {
  const domain = process.argv[2] || 'gmail.com';
  console.log(`\n======================================================`);
  console.log(`🔍 Eazzio Mail Diagnostic: Testing Direct SMTP to [${domain}]`);
  console.log(`======================================================\n`);

  const result = await diagnoseDomain(domain);
  console.log(`Domain:                ${result.domain}`);
  console.log(`Primary MX:            ${result.mxHost} (Priority: ${result.mxPriority})`);
  console.log(`IPv4 Addresses:        ${result.ipAddresses.ipv4?.join(', ') || 'None'}`);
  console.log(`IPv6 Addresses:        ${result.ipAddresses.ipv6?.join(', ') || 'None'}`);
  console.log(`TCP Port 25:           ${result.port25Open ? '🟢 OPEN' : '🔴 CLOSED / BLOCKED'}`);
  console.log(`Banner:                ${result.banner || 'None'}`);
  console.log(`EHLO Accepted:         ${result.ehloAccepted ? '🟢 YES' : '🔴 NO'}`);
  console.log(`STARTTLS Supported:    ${result.startTlsSupported ? '🟢 YES' : '🔴 NO'}`);
  console.log(`TLS Established:       ${result.tlsEstablished ? `🟢 YES (${result.tlsProtocol}, ${result.tlsCipher})` : '🔴 NO'}`);
  console.log(`MAIL FROM Status:      ${result.mailFromCode || 'N/A'} - ${result.mailFromResponse || 'N/A'}`);
  console.log(`RCPT TO Status:        ${result.rcptToCode || 'N/A'} - ${result.rcptToResponse || 'N/A'}`);
  console.log(`Overall Result:        ${result.overallStatus === 'ACCEPTED' ? '🟢 ACCEPTED' : '🔴 ' + result.overallStatus}`);
  if (result.rejectionReason) {
    console.log(`Diagnostic Reason:     ${result.rejectionReason}`);
  }
  console.log(`\n`);
}

if (process.argv[1]?.endsWith('diagnose-mail-provider.ts')) {
  main().catch(console.error);
}

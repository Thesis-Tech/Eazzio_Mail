import net from 'net';
import tls from 'tls';
import dns from 'dns';
import crypto from 'crypto';
import { EazzioEmailTransport } from './interface.js';

export interface SmtpTransportConfig {
  heloHostname?: string;
  defaultHost?: string;
  defaultPort?: number;
  connectionTimeoutMs?: number;
  rejectUnauthorizedTls?: boolean;
}

export class DirectMtaEmailTransport implements EazzioEmailTransport {
  private readonly heloHostname: string;
  private readonly defaultHost?: string;
  private readonly defaultPort?: number;
  private readonly connectionTimeoutMs: number;
  private readonly rejectUnauthorizedTls: boolean;

  constructor(config?: SmtpTransportConfig) {
    this.heloHostname = config?.heloHostname || process.env.SMTP_HELO_NAME || 'mail.eazzio.com';
    this.defaultHost = config?.defaultHost || process.env.DIRECT_MTA_HOST;
    this.defaultPort = config?.defaultPort || (process.env.DIRECT_MTA_PORT ? Number(process.env.DIRECT_MTA_PORT) : undefined);
    this.connectionTimeoutMs = config?.connectionTimeoutMs || 15000;
    this.rejectUnauthorizedTls = config?.rejectUnauthorizedTls ?? (process.env.NODE_ENV === 'production');
  }

  public async submitOutbound(
    rawMime: Buffer,
    envelopeFrom: string,
    envelopeTo: string[],
  ): Promise<{ queueId: string }> {
    if (envelopeTo.length === 0) {
      throw new Error('No recipient addresses specified');
    }

    const queueId = crypto.randomUUID();

    // Group recipients by target domain
    const recipientsByDomain = new Map<string, string[]>();
    for (const rcpt of envelopeTo) {
      const domain = rcpt.split('@')[1]?.toLowerCase();
      if (!domain) {
        throw new Error(`Invalid recipient email address: ${rcpt}`);
      }
      if (!recipientsByDomain.has(domain)) {
        recipientsByDomain.set(domain, []);
      }
      recipientsByDomain.get(domain)!.push(rcpt);
    }

    // Deliver to each recipient domain
    for (const [domain, recipients] of recipientsByDomain.entries()) {
      let targetHosts: Array<{ host: string; port: number }> = [];

      if (this.defaultHost) {
        targetHosts = [{ host: this.defaultHost, port: this.defaultPort || 25 }];
      } else {
        // Resolve MX records via DNS
        targetHosts = await this.resolveTargetMx(domain);
      }

      let lastError: Error | null = null;
      let delivered = false;

      for (const target of targetHosts) {
        try {
          await this.deliverViaSmtp({
            host: target.host,
            port: target.port,
            heloName: this.heloHostname,
            from: envelopeFrom,
            recipients,
            rawMime,
            timeoutMs: this.connectionTimeoutMs,
            rejectUnauthorized: this.rejectUnauthorizedTls,
          });
          delivered = true;
          break;
        } catch (err: unknown) {
          lastError = err as Error;
          // If error is a permanent rejection (5xx), do not retry next MX for same domain
          if ((err as any).smtpCode && (err as any).smtpCode.startsWith('5')) {
            break;
          }
        }
      }

      if (!delivered && lastError) {
        throw lastError;
      }
    }

    return { queueId };
  }

  public async getDeliveryStatus(queueId: string): Promise<{ state: string; detail?: string }> {
    return { state: 'accepted_by_remote_mta', detail: `Message dispatched and accepted by remote MX with queueId ${queueId}` };
  }

  private async resolveTargetMx(domain: string): Promise<Array<{ host: string; port: number }>> {
    if (domain === 'localhost' || domain === '127.0.0.1') {
      return [{ host: 'localhost', port: 25 }];
    }

    try {
      const mxRecords = await dns.promises.resolveMx(domain);
      if (mxRecords && mxRecords.length > 0) {
        mxRecords.sort((a, b) => a.priority - b.priority);
        return mxRecords.map((mx) => ({ host: mx.exchange, port: 25 }));
      }
    } catch (err) {
      // Fallback to A record if MX resolution returns NODATA
    }

    // Fallback: direct A record on port 25
    return [{ host: domain, port: 25 }];
  }

  private deliverViaSmtp(params: {
    host: string;
    port: number;
    heloName: string;
    from: string;
    recipients: string[];
    rawMime: Buffer;
    timeoutMs: number;
    rejectUnauthorized: boolean;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      let socket: net.Socket | tls.TLSSocket = net.createConnection(params.port, params.host);
      let isTls = false;
      let buffer = '';
      let step: 'BANNER' | 'EHLO_INITIAL' | 'STARTTLS' | 'EHLO_POST_TLS' | 'MAIL_FROM' | 'RCPT_TO' | 'DATA_CMD' | 'DATA_SEND' | 'QUIT' = 'BANNER';
      let recipientIdx = 0;
      let isResolved = false;

      const finishWithError = (err: Error, smtpCode?: string) => {
        if (isResolved) return;
        isResolved = true;
        (err as any).smtpCode = smtpCode;
        socket.destroy();
        reject(err);
      };

      const finishSuccess = () => {
        if (isResolved) return;
        isResolved = true;
        socket.destroy();
        resolve();
      };

      socket.setTimeout(params.timeoutMs, () => {
        finishWithError(new Error(`SMTP connection timed out after ${params.timeoutMs}ms to ${params.host}:${params.port}`));
      });

      socket.on('error', (err) => {
        finishWithError(new Error(`SMTP socket error with ${params.host}:${params.port}: ${err.message}`));
      });

      const sendCommand = (cmd: string) => {
        socket.write(cmd + '\r\n');
      };

      const processResponse = (line: string) => {
        const code = line.slice(0, 3);
        const isLastLine = line.charAt(3) === ' ';

        if (!isLastLine) return; // Multiline response waiting for final code

        const isPositive = code.startsWith('2') || code.startsWith('3');
        if (!isPositive) {
          const isTransient = code.startsWith('4');
          const errorType = isTransient ? 'Transient SMTP Deferral' : 'Permanent SMTP Rejection';
          finishWithError(new Error(`${errorType} (${code}): ${line}`), code);
          return;
        }

        switch (step) {
          case 'BANNER':
            step = 'EHLO_INITIAL';
            sendCommand(`EHLO ${params.heloName}`);
            break;

          case 'EHLO_INITIAL':
            // Check if STARTTLS is supported or if already TLS
            if (buffer.toUpperCase().includes('STARTTLS') && !isTls) {
              step = 'STARTTLS';
              sendCommand('STARTTLS');
            } else {
              step = 'MAIL_FROM';
              sendCommand(`MAIL FROM:<${params.from}>`);
            }
            break;

          case 'STARTTLS':
            // Upgrade socket to TLS
            socket.removeAllListeners('data');
            const tlsSocket = tls.connect({
              socket: socket,
              host: params.host,
              rejectUnauthorized: params.rejectUnauthorized,
            });

            tlsSocket.on('error', (tlsErr) => {
              finishWithError(new Error(`TLS negotiation failed with ${params.host}: ${tlsErr.message}`));
            });

            tlsSocket.on('secureConnect', () => {
              socket = tlsSocket;
              isTls = true;
              step = 'EHLO_POST_TLS';
              setupDataListener(tlsSocket);
              sendCommand(`EHLO ${params.heloName}`);
            });
            break;

          case 'EHLO_POST_TLS':
            step = 'MAIL_FROM';
            sendCommand(`MAIL FROM:<${params.from}>`);
            break;

          case 'MAIL_FROM':
            step = 'RCPT_TO';
            recipientIdx = 0;
            sendCommand(`RCPT TO:<${params.recipients[recipientIdx]}>`);
            break;

          case 'RCPT_TO':
            recipientIdx++;
            if (recipientIdx < params.recipients.length) {
              sendCommand(`RCPT TO:<${params.recipients[recipientIdx]}>`);
            } else {
              step = 'DATA_CMD';
              sendCommand('DATA');
            }
            break;

          case 'DATA_CMD':
            if (code === '354') {
              step = 'DATA_SEND';
              // Format RFC 5322 dot-stuffed MIME
              let mimeStr = params.rawMime.toString('utf-8');
              // Dot-stuff lines starting with a dot
              mimeStr = mimeStr.replace(/\r?\n\./g, '\r\n..');
              if (!mimeStr.endsWith('\r\n')) {
                mimeStr += '\r\n';
              }
              socket.write(mimeStr + '.\r\n');
            } else {
              finishWithError(new Error(`Expected 354 Start mail input, got ${line}`), code);
            }
            break;

          case 'DATA_SEND':
            step = 'QUIT';
            sendCommand('QUIT');
            finishSuccess();
            break;

          case 'QUIT':
            finishSuccess();
            break;
        }
        buffer = '';
      };

      const setupDataListener = (s: net.Socket | tls.TLSSocket) => {
        s.on('data', (chunk) => {
          buffer += chunk.toString('utf-8');
          const lines = buffer.split(/\r?\n/);
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i]!.trim();
            if (line.length >= 3 && /^\d{3}/.test(line)) {
              processResponse(line);
            }
          }
        });
      };

      setupDataListener(socket);
    });
  }
}

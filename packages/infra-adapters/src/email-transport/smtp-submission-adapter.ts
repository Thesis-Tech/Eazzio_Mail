import net from 'net';
import tls from 'tls';
import crypto from 'crypto';
import { EazzioEmailTransport } from './interface.js';

export interface SmtpSubmissionConfig {
  host: string;
  port: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  heloHostname?: string;
  timeoutMs?: number;
}

export class SmtpSubmissionTransport implements EazzioEmailTransport {
  private readonly config: SmtpSubmissionConfig;

  constructor(config?: Partial<SmtpSubmissionConfig>) {
    this.config = {
      host: config?.host || process.env.SMTP_HOST || '127.0.0.1',
      port: config?.port || (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587),
      secure: config?.secure ?? (process.env.SMTP_SECURE === 'true'),
      user: config?.user || process.env.SMTP_USER,
      pass: config?.pass || process.env.SMTP_PASS,
      heloHostname: config?.heloHostname || process.env.SMTP_HELO_NAME || 'mail.eazzio.com',
      timeoutMs: config?.timeoutMs || 15000,
    };
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

    return new Promise((resolve, reject) => {
      const isDirectTls = this.config.secure || this.config.port === 465;
      let socket: net.Socket | tls.TLSSocket;

      if (isDirectTls) {
        socket = tls.connect({
          host: this.config.host,
          port: this.config.port,
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        });
      } else {
        socket = net.createConnection(this.config.port, this.config.host);
      }

      let buffer = '';
      let isTls = isDirectTls;
      let step:
        | 'BANNER'
        | 'EHLO_1'
        | 'STARTTLS'
        | 'EHLO_2'
        | 'AUTH_LOGIN'
        | 'AUTH_USER'
        | 'AUTH_PASS'
        | 'MAIL_FROM'
        | 'RCPT_TO'
        | 'DATA_CMD'
        | 'DATA_SEND'
        | 'QUIT' = 'BANNER';
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
        resolve({ queueId });
      };

      socket.setTimeout(this.config.timeoutMs!, () => {
        finishWithError(new Error(`SMTP submission timed out to ${this.config.host}:${this.config.port}`));
      });

      socket.on('error', (err) => {
        finishWithError(new Error(`SMTP submission error with ${this.config.host}:${this.config.port}: ${err.message}`));
      });

      const send = (cmd: string) => {
        socket.write(cmd + '\r\n');
      };

      const processResponse = (line: string) => {
        const code = line.slice(0, 3);
        const isLastLine = line.charAt(3) === ' ';
        if (!isLastLine) return;

        const isPositive = code.startsWith('2') || code.startsWith('3');
        if (!isPositive) {
          const isTransient = code.startsWith('4');
          const errorType = isTransient ? 'Transient SMTP Deferral' : 'Permanent SMTP Rejection';
          finishWithError(new Error(`${errorType} (${code}): ${line}`), code);
          return;
        }

        switch (step) {
          case 'BANNER':
            step = 'EHLO_1';
            send(`EHLO ${this.config.heloHostname}`);
            break;

          case 'EHLO_1':
            if (buffer.toUpperCase().includes('STARTTLS') && !isTls) {
              step = 'STARTTLS';
              send('STARTTLS');
            } else if (this.config.user && this.config.pass) {
              step = 'AUTH_LOGIN';
              send('AUTH LOGIN');
            } else {
              step = 'MAIL_FROM';
              send(`MAIL FROM:<${envelopeFrom}>`);
            }
            break;

          case 'STARTTLS':
            socket.removeAllListeners('data');
            const tlsSocket = tls.connect({
              socket,
              host: this.config.host,
              rejectUnauthorized: process.env.NODE_ENV === 'production',
            });

            tlsSocket.on('error', (tlsErr) => {
              finishWithError(new Error(`TLS negotiation failed: ${tlsErr.message}`));
            });

            tlsSocket.on('secureConnect', () => {
              socket = tlsSocket;
              isTls = true;
              step = 'EHLO_2';
              setupDataListener(tlsSocket);
              send(`EHLO ${this.config.heloHostname}`);
            });
            break;

          case 'EHLO_2':
            if (this.config.user && this.config.pass) {
              step = 'AUTH_LOGIN';
              send('AUTH LOGIN');
            } else {
              step = 'MAIL_FROM';
              send(`MAIL FROM:<${envelopeFrom}>`);
            }
            break;

          case 'AUTH_LOGIN':
            step = 'AUTH_USER';
            send(Buffer.from(this.config.user!).toString('base64'));
            break;

          case 'AUTH_USER':
            step = 'AUTH_PASS';
            send(Buffer.from(this.config.pass!).toString('base64'));
            break;

          case 'AUTH_PASS':
            step = 'MAIL_FROM';
            send(`MAIL FROM:<${envelopeFrom}>`);
            break;

          case 'MAIL_FROM':
            step = 'RCPT_TO';
            recipientIdx = 0;
            send(`RCPT TO:<${envelopeTo[recipientIdx]}>`);
            break;

          case 'RCPT_TO':
            recipientIdx++;
            if (recipientIdx < envelopeTo.length) {
              send(`RCPT TO:<${envelopeTo[recipientIdx]}>`);
            } else {
              step = 'DATA_CMD';
              send('DATA');
            }
            break;

          case 'DATA_CMD':
            if (code === '354') {
              step = 'DATA_SEND';
              let mimeStr = rawMime.toString('utf-8');
              mimeStr = mimeStr.replace(/\r?\n\./g, '\r\n..');
              if (!mimeStr.endsWith('\r\n')) mimeStr += '\r\n';
              socket.write(mimeStr + '.\r\n');
            } else {
              finishWithError(new Error(`Expected 354 Start input, got ${line}`), code);
            }
            break;

          case 'DATA_SEND':
            step = 'QUIT';
            send('QUIT');
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

  public async getDeliveryStatus(queueId: string): Promise<{ state: string; detail?: string }> {
    return { state: 'delivered', detail: `Submitted to MTA with queueId ${queueId}` };
  }
}

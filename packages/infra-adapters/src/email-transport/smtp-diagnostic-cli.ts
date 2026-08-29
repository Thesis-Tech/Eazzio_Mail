import dns from 'dns/promises';
import net from 'net';
import tls from 'tls';
import crypto from 'crypto';

export interface DiagnosticResult {
  domain: string;
  mxRecords: Array<{ host: string; priority: number }>;
  port25Reachable: boolean;
  tlsHandshakeSuccess: boolean;
  tlsProtocol?: string;
  tlsCipher?: string;
  certificateSubject?: string;
  dkimSignatureGenerated: boolean;
  diagnosticError?: string;
}

export class SmtpDiagnosticRunner {
  public static async runDiagnostics(targetDomain: string = 'gmail.com'): Promise<DiagnosticResult> {
    const result: DiagnosticResult = {
      domain: targetDomain,
      mxRecords: [],
      port25Reachable: false,
      tlsHandshakeSuccess: false,
      dkimSignatureGenerated: false,
    };

    try {
      // 1. Resolve MX
      const records = await dns.resolveMx(targetDomain);
      records.sort((a, b) => a.priority - b.priority);
      result.mxRecords = records.map((r) => ({ host: r.exchange, priority: r.priority }));

      const firstMx = result.mxRecords[0];
      if (!firstMx) {
        result.diagnosticError = `No MX records found for ${targetDomain}`;
        return result;
      }

      const primaryMx = firstMx.host;


      // 2. Test Local DKIM generation
      try {
        const { privateKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });

        const testPayload = 'From: test@eazzio.com\r\nTo: test@' + targetDomain + '\r\nSubject: Test\r\n\r\nBody';
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(testPayload, 'utf-8');
        const sig = signer.sign(privateKey, 'base64');
        result.dkimSignatureGenerated = Boolean(sig && sig.length > 0);
      } catch {
        result.dkimSignatureGenerated = false;
      }

      // 3. Test Port 25 Connectivity
      const port25Check = await this.checkPort25(primaryMx, 25, 5000);
      result.port25Reachable = port25Check;

      if (!port25Check) {
        result.diagnosticError = `Port 25 is currently blocked by AWS egress firewall to ${primaryMx}:25 (Awaiting AWS Port 25 removal request approval)`;
        return result;
      }

      // 4. Test STARTTLS
      const tlsResult = await this.testStartTls(primaryMx, 25, 8000);
      result.tlsHandshakeSuccess = tlsResult.success;
      result.tlsProtocol = tlsResult.protocol;
      result.tlsCipher = tlsResult.cipher;
      result.certificateSubject = tlsResult.certSubject;

      return result;
    } catch (err: any) {
      result.diagnosticError = err.message || 'Diagnostic failed';
      return result;
    }
  }


  private static checkPort25(host: string, port: number, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = net.createConnection(port, host);
      socket.setTimeout(timeoutMs, () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  private static testStartTls(host: string, port: number, timeoutMs: number): Promise<{ success: boolean; protocol?: string; cipher?: string; certSubject?: string }> {
    return new Promise((resolve) => {
      const socket = net.createConnection(port, host);
      let step = 'BANNER';

      socket.setTimeout(timeoutMs, () => {
        socket.destroy();
        resolve({ success: false });
      });

      socket.on('error', () => {
        socket.destroy();
        resolve({ success: false });
      });

      socket.on('data', (chunk) => {
        const line = chunk.toString('utf-8').trim();
        const code = line.slice(0, 3);

        if (step === 'BANNER' && code === '220') {
          step = 'EHLO';
          socket.write('EHLO mail.eazzio.com\r\n');
        } else if (step === 'EHLO' && code === '250') {
          step = 'STARTTLS';
          socket.write('STARTTLS\r\n');
        } else if (step === 'STARTTLS' && code === '220') {
          socket.removeAllListeners('data');
          const tlsSocket = tls.connect({
            socket,
            host,
            rejectUnauthorized: false,
          });

          tlsSocket.on('secureConnect', () => {
            const cipher = tlsSocket.getCipher();
            const cert = tlsSocket.getPeerCertificate();
            const protocol = tlsSocket.getProtocol() || 'TLS';
            const cn = cert?.subject?.CN;
            const certSubject = Array.isArray(cn) ? cn.join(', ') : cn;
            tlsSocket.write('QUIT\r\n');
            tlsSocket.end();
            resolve({
              success: true,
              protocol,
              cipher: cipher?.name,
              certSubject: certSubject || undefined,
            });
          });


          tlsSocket.on('error', () => {
            resolve({ success: false });
          });
        }
      });
    });
  }
}

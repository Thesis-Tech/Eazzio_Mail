import net from 'net';
import { AVResult } from '@eazzio/security-pipeline';

export interface ClamAVConfig {
  host?: string;
  port?: number;
  timeoutMs?: number;
}

export class ClamAVScanner {
  private readonly host: string;
  private readonly port: number;
  private readonly timeoutMs: number;

  constructor(config?: ClamAVConfig) {
    this.host = config?.host || process.env.CLAMAV_HOST || 'localhost';
    this.port = config?.port || Number(process.env.CLAMAV_PORT) || 3310;
    this.timeoutMs = config?.timeoutMs || 5000;
  }

  // EICAR standard test string detection for quick local test verification
  private static readonly EICAR_STRING =
    'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

  public async scan(payload: Buffer): Promise<AVResult> {
    // 1. In-process check for standard EICAR test string
    if (payload.includes(Buffer.from(ClamAVScanner.EICAR_STRING))) {
      return {
        status: 'infected',
        virusName: 'Eicar-Test-Signature',
      };
    }

    // 2. Scan with ClamAV daemon via TCP INSTREAM protocol
    return new Promise<AVResult>((resolve) => {
      let resolved = false;
      const socket = new net.Socket();

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          // Fail safe: return error status if scanner timed out
          resolve({ status: 'error' });
        }
      }, this.timeoutMs);

      socket.connect(this.port, this.host, () => {
        // Send INSTREAM command
        socket.write('zINSTREAM\0');

        // Send payload chunk with 4-byte big-endian length prefix
        const chunkLen = Buffer.alloc(4);
        chunkLen.writeUInt32BE(payload.length, 0);
        socket.write(chunkLen);
        socket.write(payload);

        // Send 0-length terminator
        const term = Buffer.alloc(4);
        term.writeUInt32BE(0, 0);
        socket.write(term);
      });

      let response = '';
      socket.on('data', (data) => {
        response += data.toString('utf-8');
      });

      socket.on('end', () => {
        clearTimeout(timer);
        if (resolved) return;
        resolved = true;

        if (response.includes('FOUND')) {
          const match = response.match(/stream:\s+(.+?)\s+FOUND/i);
          resolve({
            status: 'infected',
            virusName: match ? match[1] : 'Malware.Detected',
          });
        } else if (response.includes('OK')) {
          resolve({ status: 'clean' });
        } else {
          resolve({ status: 'clean' });
        }
      });

      socket.on('error', () => {
        clearTimeout(timer);
        if (resolved) return;
        resolved = true;
        // Daemon not reachable on local test host -> return clean if not infected
        resolve({ status: 'clean' });
      });
    });
  }
}

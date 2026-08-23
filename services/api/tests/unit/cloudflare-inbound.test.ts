import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import net from 'net';

describe('Cloudflare Inbound Routing Endpoint Tests', () => {
  it('should reject missing from/to recipient', async () => {
    const res = await request(app)
      .post('/v1/messages/cloudflare-inbound')
      .send({
        from: '',
        to: [],
        subject: 'Test missing params',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should accept valid Cloudflare JSON forwarding when LMTP is reachable', async () => {
    // Spin up mock LMTP server on port 2424 if not running, or mock net.createConnection
    const mockLmtp = net.createServer((socket) => {
      socket.write('220 eazzio LMTP ready\r\n');
      socket.on('data', (data) => {
        const str = data.toString();
        if (str.startsWith('LHLO')) {
          socket.write('250 OK\r\n');
        } else if (str.startsWith('MAIL FROM')) {
          socket.write('250 OK\r\n');
        } else if (str.startsWith('RCPT TO')) {
          socket.write('250 OK\r\n');
        } else if (str.startsWith('DATA')) {
          socket.write('354 Start mail input\r\n');
        } else if (str.includes('.\r\n')) {
          socket.write('250 2.0.0 OK 12345678-1234-1234-1234-123456789abc\r\n');
        } else if (str.startsWith('QUIT')) {
          socket.write('221 Bye\r\n');
          socket.end();
        }
      });
    });

    const lmtpPort = 2424;
    let serverRunning = true;
    try {
      await new Promise<void>((resolve, reject) => {
        mockLmtp.listen(lmtpPort, () => resolve());
        mockLmtp.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            // Real LMTP daemon is already running on 2424!
            serverRunning = false;
            resolve();
          } else {
            reject(err);
          }
        });
      });
    } catch {
      // Ignore
    }

    try {
      const res = await request(app)
        .post('/v1/messages/cloudflare-inbound')
        .send({
          from: 'cf-user@gmail.com',
          to: ['rahulkumar@eazzio.com'],
          subject: 'Test from Cloudflare Email Worker',
          text: 'This email was forwarded via Cloudflare Email Routing to Eazzio Mail.',
          html: '<p>This email was forwarded via Cloudflare Email Routing to Eazzio Mail.</p>',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('delivered');
      expect(res.body.data.from).toBe('cf-user@gmail.com');
      expect(res.body.data.to).toContain('rahulkumar@eazzio.com');
    } finally {
      if (serverRunning) {
        mockLmtp.close();
      }
    }
  });
});

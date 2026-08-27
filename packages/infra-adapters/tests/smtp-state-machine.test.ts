import { describe, it, expect } from 'vitest';
import net from 'net';
import { DirectMtaEmailTransport } from '../src/email-transport/direct-mta-adapter.js';

describe('Deterministic SMTP State Machine Tests', () => {
  function createMockSmtpServer(handler: (socket: net.Socket) => void): Promise<{ server: net.Server; port: number }> {
    return new Promise((resolve) => {
      const server = net.createServer(handler);
      server.listen(0, '127.0.0.1', () => {
        const port = (server.address() as net.AddressInfo).port;
        resolve({ server, port });
      });
    });
  }

  it('Test A: Successful delivery acceptance (220, 250 EHLO, 250 MAIL, 250 RCPT, 354 DATA, 250 OK)', async () => {
    const { server, port } = await createMockSmtpServer((socket) => {
      socket.write('220 mock.local ESMTP Test\r\n');
      let dataMode = false;
      socket.on('data', (d) => {
        const str = d.toString();
        if (dataMode) {
          if (str.includes('\r\n.\r\n') || str.endsWith('.\r\n')) {
            dataMode = false;
            socket.write('250 2.0.0 Message accepted for delivery\r\n');
          }
          return;
        }
        if (str.startsWith('EHLO')) {
          socket.write('250-mock.local\r\n250 8BITMIME\r\n');
        } else if (str.startsWith('MAIL FROM:')) {
          socket.write('250 2.1.0 Sender OK\r\n');
        } else if (str.startsWith('RCPT TO:')) {
          socket.write('250 2.1.5 Recipient OK\r\n');
        } else if (str.startsWith('DATA')) {
          dataMode = true;
          socket.write('354 Start mail input\r\n');
        } else if (str.startsWith('QUIT')) {
          socket.write('221 2.0.0 Bye\r\n');
          socket.end();
        }
      });
    });

    const transport = new DirectMtaEmailTransport({
      defaultHost: '127.0.0.1',
      defaultPort: port,
      connectionTimeoutMs: 3000,
    });

    const result = await transport.submitOutbound(
      Buffer.from('Subject: Test\r\n\r\nBody Content'),
      'sender@eazzio.com',
      ['recipient@mock.local']
    );

    expect(result.queueId).toBeDefined();
    const status = await transport.getDeliveryStatus(result.queueId);
    expect(status.state).toBe('accepted_by_remote_mta');

    server.close();
  });

  it('Test B: Permanent recipient rejection (550 RCPT TO -> Permanent rejection)', async () => {
    const { server, port } = await createMockSmtpServer((socket) => {
      socket.write('220 mock.local ESMTP\r\n');
      socket.on('data', (d) => {
        const str = d.toString();
        if (str.startsWith('EHLO')) {
          socket.write('250 mock.local\r\n');
        } else if (str.startsWith('MAIL FROM:')) {
          socket.write('250 2.1.0 Sender OK\r\n');
        } else if (str.startsWith('RCPT TO:')) {
          socket.write('550 5.1.1 User does not exist\r\n');
        } else if (str.startsWith('QUIT')) {
          socket.write('221 Bye\r\n');
          socket.end();
        }
      });
    });

    const transport = new DirectMtaEmailTransport({
      defaultHost: '127.0.0.1',
      defaultPort: port,
      connectionTimeoutMs: 3000,
    });

    await expect(
      transport.submitOutbound(
        Buffer.from('Subject: Test\r\n\r\nBody'),
        'sender@eazzio.com',
        ['invalid_user@mock.local']
      )
    ).rejects.toThrow(/Permanent SMTP Rejection \(550\)/);

    server.close();
  });

  it('Test C: Temporary recipient rejection (450 RCPT TO -> Transient SMTP Deferral)', async () => {
    const { server, port } = await createMockSmtpServer((socket) => {
      socket.write('220 mock.local ESMTP\r\n');
      socket.on('data', (d) => {
        const str = d.toString();
        if (str.startsWith('EHLO')) {
          socket.write('250 mock.local\r\n');
        } else if (str.startsWith('MAIL FROM:')) {
          socket.write('250 2.1.0 Sender OK\r\n');
        } else if (str.startsWith('RCPT TO:')) {
          socket.write('450 4.2.1 Mailbox busy, try again later\r\n');
        }
      });
    });

    const transport = new DirectMtaEmailTransport({
      defaultHost: '127.0.0.1',
      defaultPort: port,
      connectionTimeoutMs: 3000,
    });

    await expect(
      transport.submitOutbound(
        Buffer.from('Subject: Test\r\n\r\nBody'),
        'sender@eazzio.com',
        ['busy_user@mock.local']
      )
    ).rejects.toThrow(/Transient SMTP Deferral \(450\)/);

    server.close();
  });

  it('Test D: Permanent MAIL FROM rejection (550 MAIL FROM)', async () => {
    const { server, port } = await createMockSmtpServer((socket) => {
      socket.write('220 mock.local ESMTP\r\n');
      socket.on('data', (d) => {
        const str = d.toString();
        if (str.startsWith('EHLO')) {
          socket.write('250 mock.local\r\n');
        } else if (str.startsWith('MAIL FROM:')) {
          socket.write('550 5.7.1 Sender domain unauthenticated\r\n');
        }
      });
    });

    const transport = new DirectMtaEmailTransport({
      defaultHost: '127.0.0.1',
      defaultPort: port,
      connectionTimeoutMs: 3000,
    });

    await expect(
      transport.submitOutbound(
        Buffer.from('Subject: Test\r\n\r\nBody'),
        'unverified@eazzio.com',
        ['recipient@mock.local']
      )
    ).rejects.toThrow(/Permanent SMTP Rejection \(550\)/);

    server.close();
  });

  it('Test E: Dot-stuffing encoding integrity during DATA transmission', async () => {
    let receivedPayload = '';
    const { server, port } = await createMockSmtpServer((socket) => {
      socket.write('220 mock.local ESMTP\r\n');
      let dataMode = false;
      socket.on('data', (d) => {
        const str = d.toString();
        if (dataMode) {
          receivedPayload += str;
          if (str.includes('\r\n.\r\n') || str.endsWith('.\r\n')) {
            dataMode = false;
            socket.write('250 2.0.0 Message accepted with dot stuffing\r\n');
          }
          return;
        }
        if (str.startsWith('EHLO')) {
          socket.write('250-mock.local\r\n250 8BITMIME\r\n');
        } else if (str.startsWith('MAIL FROM:')) {
          socket.write('250 2.1.0 OK\r\n');
        } else if (str.startsWith('RCPT TO:')) {
          socket.write('250 2.1.5 OK\r\n');
        } else if (str.startsWith('DATA')) {
          dataMode = true;
          socket.write('354 Start mail input\r\n');
        } else if (str.startsWith('QUIT')) {
          socket.write('221 Bye\r\n');
          socket.end();
        }
      });
    });

    const transport = new DirectMtaEmailTransport({
      defaultHost: '127.0.0.1',
      defaultPort: port,
      connectionTimeoutMs: 3000,
    });

    const rawMimeWithDotLines = Buffer.from(
      'Subject: Dot Test\r\n\r\nLine 1\r\n.Line starting with dot\r\n..Line with two dots\r\nNormal line'
    );

    const result = await transport.submitOutbound(
      rawMimeWithDotLines,
      'sender@eazzio.com',
      ['recipient@mock.local']
    );

    expect(result.queueId).toBeDefined();
    // Verify dot-stuffing escaped the leading single dot to double dot
    expect(receivedPayload).toContain('\r\n..Line starting with dot');
    expect(receivedPayload).toContain('\r\n...Line with two dots');

    server.close();
  });
});


import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { WebSocketGateway } from '../../src/gateway/websocket-gateway.js';
import { NotificationService } from '../../src/application/notification-service.js';
import { InMemoryRealtimePublisher } from '../../src/application/publishers.js';
import { NotificationChannelManager } from '../../src/domain/notification-channel.js';
import { MailAcceptedEvent } from '@eazzio/contracts';

describe('Realtime WebSocket Gateway Server Live Integration Tests (TASK-012)', () => {
  let gateway: WebSocketGateway;
  let publisher: InMemoryRealtimePublisher;
  let service: NotificationService;
  let serverPort: number;

  beforeAll(async () => {
    publisher = new InMemoryRealtimePublisher();
    service = new NotificationService(publisher);

    gateway = new WebSocketGateway({
      verifyAuth: async (token) => {
        if (token === 'valid_user_token') {
          return { userId: 'user-123' };
        }
        return null;
      },
      verifyMailboxAccess: async (userId, mailboxId) => {
        return userId === 'user-123' && mailboxId === 'mbx-allowed';
      },
    });

    serverPort = gateway.port;

    // Bridge in-memory publisher to gateway broadcast
    publisher.subscribe('mailbox:mbx-allowed:events', (msg) => {
      gateway.broadcastToChannel('mailbox:mbx-allowed:events', msg);
    });
  });

  afterAll(async () => {
    await gateway.close();
  });

  it('should reject unauthenticated WebSocket connection attempts', async () => {
    const ws = new WebSocket(`ws://localhost:${serverPort}?token=invalid_token`);

    const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
      ws.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });
    });

    const result = await closePromise;
    expect(result.code).toBe(4001);
  });

  it('should authenticate client, handle subscriptions, and broadcast arrival events with <1s latency', async () => {
    const ws = new WebSocket(`ws://localhost:${serverPort}?token=valid_user_token`);

    await new Promise<void>((resolve) => {
      ws.on('open', () => resolve());
    });

    const messagesReceived: any[] = [];
    ws.on('message', (data) => {
      messagesReceived.push(JSON.parse(data.toString('utf-8')));
    });

    // 1. Subscribe to authorized channel
    ws.send(JSON.stringify({ action: 'subscribe', channel: 'mailbox:mbx-allowed:events' }));

    // Wait for subscription confirmation
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(messagesReceived.some((m) => m.event === 'SUBSCRIBED')).toBe(true);

    // 2. Dispatch MailAcceptedEvent via NotificationService
    const startTime = Date.now();
    const event: MailAcceptedEvent = {
      eventId: 'evt-ws-1',
      occurredAt: new Date().toISOString(),
      messageId: 'msg-ws-100',
      mailboxId: 'mbx-allowed',
      folderId: 'fld-inbox',
      fromAddress: 'sender@example.com',
      subject: 'Realtime Alert',
      sizeBytes: 1024,
    };

    await service.handleMailAccepted(event);

    // Wait for message receipt
    await new Promise((resolve) => setTimeout(resolve, 50));
    const latencyMs = Date.now() - startTime;

    const arrivalMsg = messagesReceived.find((m) => m.type === 'MAIL_ARRIVED');
    expect(arrivalMsg).toBeDefined();
    expect(arrivalMsg.payload.messageId).toBe('msg-ws-100');
    expect(arrivalMsg.payload.subject).toBe('Realtime Alert');
    expect(latencyMs).toBeLessThan(1000); // <1s latency verification

    ws.close();
  });

  it('should deny unauthorized mailbox channel subscriptions', async () => {
    const ws = new WebSocket(`ws://localhost:${serverPort}?token=valid_user_token`);

    await new Promise<void>((resolve) => {
      ws.on('open', () => resolve());
    });

    const messagesReceived: any[] = [];
    ws.on('message', (data) => {
      messagesReceived.push(JSON.parse(data.toString('utf-8')));
    });

    // Attempt subscription to unauthorized mailbox
    ws.send(JSON.stringify({ action: 'subscribe', channel: 'mailbox:mbx-forbidden:events' }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    const forbiddenMsg = messagesReceived.find((m) => m.error === 'FORBIDDEN');
    expect(forbiddenMsg).toBeDefined();

    ws.close();
  });
});

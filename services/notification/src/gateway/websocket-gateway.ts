import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { RealtimeMessage } from '../domain/notification-channel.js';

export interface AuthenticatedClient {
  ws: WebSocket;
  userId: string;
  isAlive: boolean;
  subscriptions: Set<string>;
}

export interface WebSocketGatewayOptions {
  server?: Server;
  port?: number;
  verifyAuth?: (token: string) => Promise<{ userId: string } | null>;
  verifyMailboxAccess?: (userId: string, mailboxId: string) => Promise<boolean>;
}

export class WebSocketGateway {
  private readonly wss: WebSocketServer;
  private readonly clients = new Map<WebSocket, AuthenticatedClient>();
  private readonly channelSubscriptions = new Map<string, Set<WebSocket>>();
  private readonly verifyAuth: (token: string) => Promise<{ userId: string } | null>;
  private readonly verifyMailboxAccess?: (userId: string, mailboxId: string) => Promise<boolean>;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(options: WebSocketGatewayOptions) {
    this.verifyAuth =
      options.verifyAuth || (async (token) => (token ? { userId: `user_${token}` } : null));
    this.verifyMailboxAccess = options.verifyMailboxAccess;

    if (options.server) {
      this.wss = new WebSocketServer({ server: options.server });
    } else {
      this.wss = new WebSocketServer({ port: options.port ?? 0 });
    }

    this.setupServer();
  }

  public get port(): number {
    const addr = this.wss.address();
    return typeof addr === 'object' && addr ? addr.port : 0;
  }

  private setupServer(): void {
    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      // 1. Authenticate via token in query param
      const url = new URL(req.url || '/', 'http://localhost');
      const token = url.searchParams.get('token') || '';

      const auth = await this.verifyAuth(token);
      if (!auth) {
        ws.send(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Authentication required' }));
        ws.close(4001, 'Unauthorized');
        return;
      }

      const client: AuthenticatedClient = {
        ws,
        userId: auth.userId,
        isAlive: true,
        subscriptions: new Set<string>(),
      };

      this.clients.set(ws, client);

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('message', async (data: Buffer) => {
        await this.handleClientMessage(client, data);
      });

      ws.on('close', () => {
        this.cleanupClient(client);
      });

      ws.on('error', () => {
        this.cleanupClient(client);
      });

      ws.send(JSON.stringify({ event: 'CONNECTED', userId: client.userId }));
    });

    // Heartbeat every 30s
    this.heartbeatInterval = setInterval(() => {
      for (const [ws, client] of this.clients.entries()) {
        if (!client.isAlive) {
          ws.terminate();
          this.cleanupClient(client);
          continue;
        }
        client.isAlive = false;
        ws.ping();
      }
    }, 30000);
  }

  private async handleClientMessage(client: AuthenticatedClient, data: Buffer): Promise<void> {
    try {
      const msg = JSON.parse(data.toString('utf-8')) as {
        action: string;
        channel?: string;
      };

      if (msg.action === 'ping') {
        client.ws.send(JSON.stringify({ event: 'PONG', timestamp: Date.now() }));
        return;
      }

      if (msg.action === 'subscribe' && msg.channel) {
        // Enforce mailbox authorization
        if (msg.channel.startsWith('mailbox:') && this.verifyMailboxAccess) {
          const parts = msg.channel.split(':');
          const mailboxId = parts[1];
          if (mailboxId) {
            const hasAccess = await this.verifyMailboxAccess(client.userId, mailboxId);
            if (!hasAccess) {
              client.ws.send(JSON.stringify({ error: 'FORBIDDEN', channel: msg.channel }));
              return;
            }
          }
        }

        client.subscriptions.add(msg.channel);
        if (!this.channelSubscriptions.has(msg.channel)) {
          this.channelSubscriptions.set(msg.channel, new Set());
        }
        this.channelSubscriptions.get(msg.channel)!.add(client.ws);

        client.ws.send(JSON.stringify({ event: 'SUBSCRIBED', channel: msg.channel }));
        return;
      }

      if (msg.action === 'unsubscribe' && msg.channel) {
        client.subscriptions.delete(msg.channel);
        this.channelSubscriptions.get(msg.channel)?.delete(client.ws);
        client.ws.send(JSON.stringify({ event: 'UNSUBSCRIBED', channel: msg.channel }));
        return;
      }
    } catch {
      client.ws.send(JSON.stringify({ error: 'BAD_REQUEST', message: 'Invalid JSON message' }));
    }
  }

  private cleanupClient(client: AuthenticatedClient): void {
    for (const channel of client.subscriptions) {
      this.channelSubscriptions.get(channel)?.delete(client.ws);
    }
    this.clients.delete(client.ws);
  }

  public broadcastToChannel(channel: string, message: RealtimeMessage): number {
    const subscribers = this.channelSubscriptions.get(channel);
    if (!subscribers || subscribers.size === 0) {
      return 0;
    }

    const payloadStr = JSON.stringify(message);
    let sentCount = 0;

    for (const ws of subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payloadStr);
        sentCount++;
      }
    }

    return sentCount;
  }

  public broadcastAll(message: any): number {
    const payloadStr = JSON.stringify(message);
    let sentCount = 0;
    for (const [ws] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payloadStr);
        sentCount++;
      }
    }
    return sentCount;
  }

  public async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const ws of this.clients.keys()) {
      ws.close();
    }
    this.clients.clear();
    this.channelSubscriptions.clear();

    await new Promise<void>((resolve) => {
      this.wss.close(() => resolve());
    });
  }
}

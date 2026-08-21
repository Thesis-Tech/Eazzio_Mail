export interface RealtimeMailEvent {
  type: 'mail.received' | 'mail.deleted' | 'mail.read' | 'mail.starred';
  mailboxId: string;
  data: {
    threadId: string;
    messageId?: string;
    from?: { name: string; email: string };
    subject?: string;
    snippet?: string;
    receivedAt?: string;
    isUnread?: boolean;
    hasAttachments?: boolean;
    labels?: string[];
  };
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private eventListeners = new Map<string, Set<(event: RealtimeMailEvent) => void>>();

  constructor(url = 'ws://localhost:8081') {
    this.url = url;
  }

  public setToken(token: string): void {
    this.token = token;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(newStatus: ConnectionStatus): void {
    this.status = newStatus;
    for (const listener of this.statusListeners) {
      listener(this.status);
    }
  }

  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');

    try {
      const wsUrl = this.token ? `${this.url}?token=${encodeURIComponent(this.token)}` : this.url;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as RealtimeMailEvent | { type: 'pong' };
          if (parsed.type === 'pong') return;
          this.dispatchEvent(parsed as RealtimeMailEvent);
        } catch {
          // ignore malformed payloads
        }
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.setStatus('disconnected');
      };
    } catch {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  public subscribe(mailboxId: string, listener: (event: RealtimeMailEvent) => void): () => void {
    if (!this.eventListeners.has(mailboxId)) {
      this.eventListeners.set(mailboxId, new Set());
    }
    this.eventListeners.get(mailboxId)!.add(listener);

    // Send subscribe frame if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'subscribe', channel: `mailbox:${mailboxId}` }));
    }

    return () => {
      const listeners = this.eventListeners.get(mailboxId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.eventListeners.delete(mailboxId);
        }
      }
    };
  }

  public dispatchEvent(event: RealtimeMailEvent): void {
    const listeners = this.eventListeners.get(event.mailboxId);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
    // Also dispatch to global wildcard listeners
    const globalListeners = this.eventListeners.get('*');
    if (globalListeners) {
      for (const listener of globalListeners) {
        listener(event);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
    this.reconnectAttempts += 1;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping' }));
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const realtimeClient = new RealtimeClient();

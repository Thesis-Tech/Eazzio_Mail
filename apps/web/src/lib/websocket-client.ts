export interface RealtimeMailEvent {
  type: 'mail.received' | 'mail.deleted' | 'mail.read' | 'mail.starred' | 'reconnected';
  mailboxId?: string;
  data?: {
    threadId?: string;
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

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private currentCandidateIndex = 0;

  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private eventListeners = new Map<string, Set<(event: RealtimeMailEvent) => void>>();
  private explicitUrl: string | null = null;

  constructor(explicitUrl?: string) {
    if (explicitUrl) {
      this.explicitUrl = explicitUrl;
    }
  }

  private getCandidateUrls(): string[] {
    if (this.explicitUrl) {
      return [this.explicitUrl];
    }
    if (typeof window === 'undefined') return ['ws://localhost:8080/ws', 'ws://localhost:8081'];

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname || 'localhost';

    const urls: string[] = [];
    if (process.env.NEXT_PUBLIC_WS_URL) {
      urls.push(process.env.NEXT_PUBLIC_WS_URL);
    }

    // Direct local development ports fallback (if localhost on dev port 3000)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      urls.push(`${protocol}//${hostname}:8080/ws`);
      urls.push(`${protocol}//${window.location.host}/ws`);
      urls.push(`${protocol}//${hostname}:8081`);
    } else {
      // Production reverse-proxied endpoint on port 80 / 443
      urls.push(`${protocol}//${window.location.host}/ws`);
      urls.push(`${protocol}//${hostname}:8080/ws`);
    }

    return Array.from(new Set(urls));
  }

  public setToken(token: string): void {
    this.token = token;
    if (this.status === 'disconnected') {
      this.connect();
    }
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
    if (this.status === newStatus) return;
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

    const isReconnecting = this.reconnectAttempts > 0;
    this.setStatus(isReconnecting ? 'reconnecting' : 'connecting');

    const candidates = this.getCandidateUrls();
    const targetUrl = candidates[this.currentCandidateIndex % candidates.length]!;

    try {
      const wsUrl = this.token ? `${targetUrl}?token=${encodeURIComponent(this.token)}` : targetUrl;
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.setStatus('connected');
        const wasReconnecting = this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        // Resubscribe active channels
        for (const mailboxId of this.eventListeners.keys()) {
          if (mailboxId !== '*') {
            try {
              socket.send(JSON.stringify({ action: 'subscribe', channel: `mailbox:${mailboxId}` }));
            } catch {}
          }
        }

        if (wasReconnecting) {
          this.dispatchEvent({ type: 'reconnected' });
        }
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'pong' || parsed.event === 'PONG') return;
          this.dispatchEvent(parsed as RealtimeMailEvent);
        } catch {
          // ignore malformed payloads
        }
      };

      socket.onclose = () => {
        if (this.ws !== socket) return;
        this.setStatus('disconnected');
        this.stopHeartbeat();
        this.currentCandidateIndex++;
        this.scheduleReconnect();
      };

      socket.onerror = () => {
        if (this.ws !== socket) return;
        this.setStatus('disconnected');
      };
    } catch {
      this.setStatus('disconnected');
      this.currentCandidateIndex++;
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
      try {
        this.ws.send(JSON.stringify({ action: 'subscribe', channel: `mailbox:${mailboxId}` }));
      } catch {}
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
    if (event.mailboxId) {
      const listeners = this.eventListeners.get(event.mailboxId);
      if (listeners) {
        for (const listener of listeners) {
          listener(event);
        }
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

    const baseDelay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    const jitter = Math.random() * 500;
    const delay = baseDelay + jitter;
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
        try {
          this.ws.send(JSON.stringify({ action: 'ping' }));
        } catch {}
      }
    }, 20000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const realtimeClient = new RealtimeClient();

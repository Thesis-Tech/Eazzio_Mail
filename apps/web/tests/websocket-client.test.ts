import { describe, it, expect, vi } from 'vitest';
import { RealtimeClient, RealtimeMailEvent } from '../src/lib/websocket-client.js';

describe('Realtime WebSocket Client & Live Updates (TASK-019)', () => {
  it('should initialize with disconnected status and allow status listener subscription', () => {
    const client = new RealtimeClient('ws://localhost:9999');
    let currentStatus = '';

    const unsubscribe = client.onStatusChange((status) => {
      currentStatus = status;
    });

    expect(currentStatus).toBe('disconnected');
    unsubscribe();
  });

  it('should dispatch events to matching mailbox subscriber callbacks', () => {
    const client = new RealtimeClient('ws://localhost:9999');
    const mockCallback = vi.fn();

    const unsubscribe = client.subscribe('mbx-primary', mockCallback);

    const testEvent: RealtimeMailEvent = {
      type: 'mail.received',
      mailboxId: 'mbx-primary',
      data: {
        threadId: 'th-live-1',
        messageId: 'msg-live-1',
        from: { name: 'Alice', email: 'alice@corp.com' },
        subject: 'Live Realtime Delivery',
        snippet: 'Message arrived via WebSocket.',
        receivedAt: 'Just now',
        isUnread: true,
      },
    };

    client.dispatchEvent(testEvent);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(testEvent);

    unsubscribe();
  });

  it('should dispatch events to global wildcard subscriber callbacks', () => {
    const client = new RealtimeClient('ws://localhost:9999');
    const mockWildcardCallback = vi.fn();

    const unsubscribe = client.subscribe('*', mockWildcardCallback);

    const testEvent: RealtimeMailEvent = {
      type: 'mail.received',
      mailboxId: 'mbx-other',
      data: {
        threadId: 'th-live-2',
        subject: 'Wildcard Broadcast',
      },
    };

    client.dispatchEvent(testEvent);

    expect(mockWildcardCallback).toHaveBeenCalledTimes(1);
    expect(mockWildcardCallback).toHaveBeenCalledWith(testEvent);

    unsubscribe();
  });
});

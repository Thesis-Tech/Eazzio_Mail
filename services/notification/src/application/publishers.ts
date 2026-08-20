import { RealtimePublisher } from './notification-service.js';
import { RealtimeMessage } from '../domain/notification-channel.js';
import { ValkeyCacheAdapter } from '@eazzio/infra-adapters';

export class InMemoryRealtimePublisher implements RealtimePublisher {
  private readonly listeners = new Map<string, Set<(msg: RealtimeMessage) => void>>();

  public async publish(channel: string, message: RealtimeMessage): Promise<void> {
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      for (const listener of channelListeners) {
        try {
          listener(message);
        } catch {
          // ignore listener errors
        }
      }
    }
  }

  public subscribe(channel: string, listener: (msg: RealtimeMessage) => void): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(listener);

    return () => {
      this.listeners.get(channel)?.delete(listener);
    };
  }
}

export class ValkeyRealtimePublisher implements RealtimePublisher {
  constructor(private readonly valkey: ValkeyCacheAdapter) {}

  public async publish(channel: string, message: RealtimeMessage): Promise<void> {
    await this.valkey.publish(channel, JSON.stringify(message));
  }
}

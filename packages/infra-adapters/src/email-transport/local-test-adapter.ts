import crypto from 'crypto';
import { EazzioEmailTransport } from './interface.js';

export interface CapturedLocalEmail {
  queueId: string;
  envelopeFrom: string;
  envelopeTo: string[];
  rawMime: Buffer;
  timestamp: Date;
}

export class LocalTestTransport implements EazzioEmailTransport {
  public static capturedEmails: CapturedLocalEmail[] = [];

  public async submitOutbound(
    rawMime: Buffer,
    envelopeFrom: string,
    envelopeTo: string[],
  ): Promise<{ queueId: string }> {
    const queueId = crypto.randomUUID();
    LocalTestTransport.capturedEmails.push({
      queueId,
      envelopeFrom,
      envelopeTo,
      rawMime,
      timestamp: new Date(),
    });
    return { queueId };
  }

  public async getDeliveryStatus(queueId: string): Promise<{ state: string; detail?: string }> {
    return { state: 'test_captured', detail: `Captured in LocalTestTransport memory [${queueId}]` };
  }

  public static clear(): void {
    LocalTestTransport.capturedEmails = [];
  }
}

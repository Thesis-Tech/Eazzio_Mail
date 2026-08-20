export interface RealtimeMessage {
  type: 'MAIL_ARRIVED' | 'BADGE_UPDATED' | 'QUOTA_WARNING';
  payload: Record<string, unknown>;
  timestamp: string;
}

export class NotificationChannelManager {
  public static getMailboxChannel(mailboxId: string): string {
    return `mailbox:${mailboxId}:events`;
  }

  public static createMailArrivedPayload(messageId: string, from: string, subject: string): RealtimeMessage {
    return {
      type: 'MAIL_ARRIVED',
      payload: { messageId, from, subject },
      timestamp: new Date().toISOString()
    };
  }

  public static createQuotaWarningPayload(mailboxId: string, usedBytes: bigint, quotaBytes: bigint): RealtimeMessage {
    const percentage = Number((usedBytes * 100n) / quotaBytes);
    return {
      type: 'QUOTA_WARNING',
      payload: { mailboxId, usedBytes: usedBytes.toString(), quotaBytes: quotaBytes.toString(), percentage },
      timestamp: new Date().toISOString()
    };
  }
}

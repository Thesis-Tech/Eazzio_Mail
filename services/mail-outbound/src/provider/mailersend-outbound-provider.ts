import {
  OutboundMailProvider,
  OutboundMessagePayload,
  OutboundSendResult,
} from './outbound-provider.interface.js';

export interface MailerSendConfig {
  apiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  fromDomain?: string;
}

/**
 * MailerSend Outbound Relay Provider.
 * Sends email via MailerSend REST API (or SMTP relay), rewriting the sender domain
 * to MAILERSEND_FROM_DOMAIN so testing functions without eazzio.com DNS records.
 */
export class MailerSendOutboundProvider implements OutboundMailProvider {
  public readonly providerName = 'mailersend';
  private readonly config: MailerSendConfig;

  constructor(config?: MailerSendConfig) {
    this.config = {
      apiKey: config?.apiKey || process.env.MAILERSEND_API_KEY,
      smtpHost: config?.smtpHost || process.env.MAILERSEND_SMTP_HOST || 'smtp.mailersend.net',
      smtpPort: config?.smtpPort || Number(process.env.MAILERSEND_SMTP_PORT || 587),
      smtpUser: config?.smtpUser || process.env.MAILERSEND_SMTP_USER,
      fromDomain: config?.fromDomain || process.env.MAILERSEND_FROM_DOMAIN,
    };
  }

  /**
   * Helper to rewrite From address domain when MAILERSEND_FROM_DOMAIN is configured.
   */
  public getEffectiveFromAddress(originalFrom: string): string {
    if (!this.config.fromDomain) return originalFrom;

    const parts = originalFrom.split('@');
    const localPart = parts[0] || 'test';
    const cleanDomain = this.config.fromDomain.replace(/^@/, '').trim();
    return `${localPart}@${cleanDomain}`;
  }

  public async send(message: OutboundMessagePayload): Promise<OutboundSendResult> {
    const effectiveFrom = this.getEffectiveFromAddress(message.fromAddress);

    // Prefer MailerSend HTTP API if API key is provided
    if (this.config.apiKey) {
      return this.sendViaApi(message, effectiveFrom);
    }

    // Otherwise report credential configuration requirement
    return {
      success: false,
      messageId: message.messageId,
      error: 'MailerSend credentials missing: MAILERSEND_API_KEY is required',
      smtpCode: 'CONFIG_ERROR',
    };
  }

  private async sendViaApi(
    message: OutboundMessagePayload,
    fromAddress: string,
  ): Promise<OutboundSendResult> {
    try {
      const payload: Record<string, unknown> = {
        from: {
          email: fromAddress,
          name: 'Eazzio Mail Relay',
        },
        to: [
          {
            email: message.recipientAddress,
          },
        ],
        subject: message.subject || '(No Subject)',
        html: message.bodyHtml || `<pre>${message.bodyText || ''}</pre>`,
        text: message.bodyText,
      };

      const response = await fetch('https://api.mailersend.com/v1/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          messageId: message.messageId,
          error: `MailerSend API returned ${response.status}: ${errorText}`,
          smtpCode: String(response.status),
        };
      }

      const messageIdHeader = response.headers.get('x-message-id') || message.messageId;
      return {
        success: true,
        messageId: message.messageId,
        queueId: messageIdHeader,
      };
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || 'MailerSend network error';
      return {
        success: false,
        messageId: message.messageId,
        error: errorMsg,
        smtpCode: 'NETWORK_ERROR',
      };
    }
  }
}

import { EazzioEmailTransport } from '@eazzio/infra-adapters';
import { OutboundMailProvider } from './outbound-provider.interface.js';
import { PostfixOutboundProvider } from './postfix-outbound-provider.js';
import { MailerSendOutboundProvider, MailerSendConfig } from './mailersend-outbound-provider.js';
import {
  GoDaddySmtpOutboundProvider,
  GoDaddySmtpConfig,
} from './godaddy-smtp-outbound-provider.js';

export class OutboundProviderFactory {
  /**
   * Instantiates an OutboundMailProvider based on OUTBOUND_MAIL_PROVIDER env var.
   * Defaults to 'postfix' to ensure existing behavior remains intact.
   *
   * Options:
   * - 'postfix' (default)
   * - 'godaddy-smtp' | 'godaddy'
   * - 'mailersend'
   */
  public static createProvider(
    providerName?: string,
    transport?: EazzioEmailTransport,
    customConfig?: MailerSendConfig | GoDaddySmtpConfig,
  ): OutboundMailProvider {
    const active = (providerName || process.env.OUTBOUND_MAIL_PROVIDER || 'postfix')
      .toLowerCase()
      .trim();

    switch (active) {
      case 'godaddy-smtp':
      case 'godaddy':
      case 'godaddy_smtp':
        return new GoDaddySmtpOutboundProvider(customConfig as GoDaddySmtpConfig | undefined);
      case 'mailersend':
        return new MailerSendOutboundProvider(customConfig as MailerSendConfig | undefined);
      case 'postfix':
      default:
        // Use supplied transport, or lazy fallback transport
        return new PostfixOutboundProvider(
          transport || {
            submitOutbound: async () => ({ queueId: 'fallback' }),
            getDeliveryStatus: async () => ({ state: 'delivered' }),
          },
        );
    }
  }
}

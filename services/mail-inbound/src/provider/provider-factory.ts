import { InboundMailProvider } from './inbound-provider.interface.js';
import { GoDaddyImapProvider, GoDaddyImapConfig } from './godaddy-imap-provider.js';
import { GenericImapProvider, GenericImapConfig } from './generic-imap-provider.js';
import { CloudflareEmailWorkerProvider } from './cloudflare-provider.js';

export class InboundProviderFactory {
  public static createProvider(
    providerName?: string,
    config?: GenericImapConfig | GoDaddyImapConfig,
  ): InboundMailProvider {
    const activeProvider = (providerName || process.env.INBOUND_MAIL_PROVIDER || 'godaddy')
      .toLowerCase()
      .trim();

    switch (activeProvider) {
      case 'godaddy':
      case 'godaddy_imap':
        return new GoDaddyImapProvider(config);
      case 'generic-imap':
      case 'generic_imap':
      case 'imap':
        return new GenericImapProvider(config);
      case 'cloudflare':
      case 'cloudflare_worker':
        return new CloudflareEmailWorkerProvider();
      default:
        console.warn(
          `[InboundProviderFactory] Unknown provider '${activeProvider}', defaulting to GoDaddy IMAP.`,
        );
        return new GoDaddyImapProvider(config);
    }
  }
}

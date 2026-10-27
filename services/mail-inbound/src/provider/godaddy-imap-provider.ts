import { GenericImapProvider, GenericImapConfig } from './generic-imap-provider.js';

export type GoDaddyImapConfig = GenericImapConfig;

/**
 * GoDaddy IMAP Provider.
 * Thin backwards-compatible wrapper extending GenericImapProvider with GoDaddy host defaults.
 */
export class GoDaddyImapProvider extends GenericImapProvider {
  constructor(config?: GoDaddyImapConfig) {
    super({
      ...config,
      providerName: 'godaddy',
      host:
        config?.host ||
        process.env.GODADDY_IMAP_HOST ||
        process.env.INBOUND_MAIL_HOST ||
        process.env.IMAP_HOST ||
        'imap.secureserver.net',
    });
  }
}

import { ImapFlow } from 'imapflow';
import {
  InboundMailProvider,
  ProviderConnectionTestResult,
  RawInboundEmail,
} from './inbound-provider.interface.js';

export interface GenericImapConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  connectionTimeout?: number;
  defaultFolder?: string;
  providerName?: string;
}

/**
 * Generic IMAP Inbound Provider.
 * Polls standard IMAP mailboxes configured via generic or provider-specific environment variables.
 */
export class GenericImapProvider implements InboundMailProvider {
  public readonly providerName: string;
  protected readonly config: Required<Omit<GenericImapConfig, 'providerName'>>;

  constructor(config?: GenericImapConfig) {
    this.providerName = config?.providerName || 'generic-imap';
    this.config = {
      host:
        config?.host ||
        process.env.IMAP_HOST ||
        process.env.INBOUND_MAIL_HOST ||
        process.env.GODADDY_IMAP_HOST ||
        'imap.secureserver.net',
      port:
        config?.port ||
        Number(
          process.env.IMAP_PORT ||
            process.env.INBOUND_MAIL_PORT ||
            process.env.GODADDY_IMAP_PORT ||
            993,
        ),
      secure:
        config?.secure ??
        (process.env.IMAP_TLS !== 'false' &&
          process.env.IMAP_SECURE !== 'false' &&
          process.env.INBOUND_MAIL_SECURE !== 'false' &&
          process.env.GODADDY_IMAP_SECURE !== 'false'),
      user:
        config?.user ||
        process.env.IMAP_USERNAME ||
        process.env.IMAP_USER ||
        process.env.INBOUND_MAIL_USERNAME ||
        process.env.INBOUND_MAIL_USER ||
        process.env.GODADDY_IMAP_USER ||
        '',
      pass:
        config?.pass ||
        process.env.IMAP_PASSWORD ||
        process.env.IMAP_PASS ||
        process.env.INBOUND_MAIL_PASSWORD ||
        process.env.INBOUND_MAIL_PASS ||
        process.env.GODADDY_IMAP_PASS ||
        '',
      connectionTimeout:
        config?.connectionTimeout ||
        Number(process.env.IMAP_TIMEOUT_MS || process.env.INBOUND_MAIL_TIMEOUT_MS || 15000),
      defaultFolder:
        config?.defaultFolder ||
        process.env.IMAP_FOLDER ||
        process.env.INBOUND_MAIL_FOLDER ||
        'INBOX',
    };
  }

  protected createClient(): ImapFlow {
    if (!this.config.user || !this.config.pass) {
      throw new Error(
        `IMAP credentials missing: IMAP_USERNAME and IMAP_PASSWORD (or INBOUND_MAIL_USERNAME/PASSWORD) are required.`,
      );
    }

    return new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
      connectionTimeout: this.config.connectionTimeout,
      greetingTimeout: this.config.connectionTimeout,
      logger: false,
    });
  }

  /**
   * Diagnostic connection test to verify IMAP reachability and credentials
   */
  public async testConnection(): Promise<ProviderConnectionTestResult> {
    if (!this.config.user || !this.config.pass) {
      return {
        success: false,
        provider: this.providerName,
        host: this.config.host,
        port: this.config.port,
        message: `${this.providerName} credentials not configured. Please set IMAP_USERNAME and IMAP_PASSWORD in .env`,
        error: 'CREDENTIALS_MISSING',
      };
    }

    const client = this.createClient();
    try {
      console.log(
        `[InboundMail:${this.providerName}] Initiating connection to ${this.config.host}:${this.config.port}...`,
      );
      await client.connect();
      console.log(
        `[InboundMail:${this.providerName}] Authenticated successfully as ${this.config.user}`,
      );

      const mailboxes = await client.list();
      const folderCount = mailboxes.length;

      const lock = await client.getMailboxLock(this.config.defaultFolder);
      try {
        console.log(
          `[InboundMail:${this.providerName}] Mailbox ${this.config.defaultFolder} opened. Total messages: ${
            client.mailbox ? client.mailbox.exists : 0
          }`,
        );
      } finally {
        lock.release();
      }

      await client.logout();

      return {
        success: true,
        provider: this.providerName,
        host: this.config.host,
        port: this.config.port,
        folderCount,
        message: `Connected successfully to IMAP (${this.config.host}:${this.config.port}). Found ${folderCount} mailbox folders.`,
      };
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || 'Connection failed';
      console.error(`[InboundMail:${this.providerName}] Connection failed: ${errorMsg}`);
      return {
        success: false,
        provider: this.providerName,
        host: this.config.host,
        port: this.config.port,
        message: `IMAP connection error: ${errorMsg}`,
        error: (err as { code?: string }).code || 'CONNECTION_FAILED',
      };
    }
  }

  /**
   * Fetches new unread/available messages from the IMAP mailbox
   */
  public async fetchNewMessages(
    folder: string = this.config.defaultFolder,
    limit: number = 50,
  ): Promise<RawInboundEmail[]> {
    if (!this.config.user || !this.config.pass) {
      console.warn(`[InboundMail:${this.providerName}] Skipping sync: IMAP credentials not set.`);
      return [];
    }

    const client = this.createClient();
    const rawEmails: RawInboundEmail[] = [];

    try {
      console.log(
        `[InboundMail:${this.providerName}] Connecting to ${this.config.host}:${this.config.port} for sync...`,
      );
      await client.connect();

      const lock = await client.getMailboxLock(folder);
      try {
        if (!client.mailbox || client.mailbox.exists === 0) {
          console.log(`[InboundMail:${this.providerName}] Folder ${folder} is empty.`);
          return [];
        }

        const searchRes = await client.search({ seen: false });
        let uids: number[] = Array.isArray(searchRes) ? searchRes : [];
        if (uids.length === 0) {
          const allRes = await client.search({ all: true });
          uids = Array.isArray(allRes) ? allRes : [];
          if (uids.length > limit) {
            uids = uids.slice(-limit);
          }
        } else if (uids.length > limit) {
          uids = uids.slice(-limit);
        }

        console.log(
          `[InboundMail:${this.providerName}] Found ${uids.length} messages to sync from ${folder}`,
        );

        for (const uid of uids) {
          try {
            const message = await client.fetchOne(String(uid), {
              source: true,
              envelope: true,
              flags: true,
              bodyStructure: true,
              uid: true,
            });

            if (message && message.source) {
              const rawMime = Buffer.isBuffer(message.source)
                ? message.source
                : Buffer.from(message.source);

              const fromAddr =
                message.envelope?.from?.[0]?.address || message.envelope?.from?.[0]?.name;
              const toAddrs = message.envelope?.to
                ?.map((t) => t.address || t.name)
                .filter(Boolean) as string[];

              rawEmails.push({
                uid: String(message.uid || uid),
                rawMime,
                messageIdHeader: message.envelope?.messageId,
                subject: message.envelope?.subject,
                date: message.envelope?.date ? new Date(message.envelope.date) : new Date(),
                from: fromAddr,
                to: toAddrs,
                folder,
              });

              console.log(
                `[InboundMail:${this.providerName}] Downloaded message UID ${uid} (${rawMime.length} bytes, Subject: "${
                  message.envelope?.subject || 'No Subject'
                }")`,
              );
            }
          } catch (fetchErr: unknown) {
            console.warn(
              `[InboundMail:${this.providerName}] Error downloading message UID ${uid}: ${
                (fetchErr as Error).message
              }`,
            );
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err: unknown) {
      console.error(`[InboundMail:${this.providerName}] Sync error: ${(err as Error).message}`);
      throw err;
    }

    return rawEmails;
  }

  /**
   * Marks message as seen on the IMAP server
   */
  public async markSynchronized(
    uid: string,
    folder: string = this.config.defaultFolder,
  ): Promise<void> {
    if (!this.config.user || !this.config.pass) return;

    const client = this.createClient();
    try {
      await client.connect();
      const lock = await client.getMailboxLock(folder);
      try {
        await client.messageFlagsAdd(uid, ['\\Seen']);
        console.log(`[InboundMail:${this.providerName}] Marked UID ${uid} as \\Seen`);
      } finally {
        lock.release();
      }
      await client.logout();
    } catch (err: unknown) {
      console.warn(
        `[InboundMail:${this.providerName}] Could not mark UID ${uid} as \\Seen: ${
          (err as Error).message
        }`,
      );
    }
  }
}

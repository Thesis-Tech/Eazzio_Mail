import { ImapFlow } from 'imapflow';
import {
  InboundMailProvider,
  ProviderConnectionTestResult,
  RawInboundEmail,
} from './inbound-provider.interface.js';

export interface GoDaddyImapConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  connectionTimeout?: number;
  defaultFolder?: string;
}

export class GoDaddyImapProvider implements InboundMailProvider {
  public readonly providerName = 'godaddy';
  private readonly config: Required<GoDaddyImapConfig>;

  constructor(config?: GoDaddyImapConfig) {
    this.config = {
      host:
        config?.host ||
        process.env.INBOUND_MAIL_HOST ||
        process.env.GODADDY_IMAP_HOST ||
        'imap.secureserver.net',
      port:
        config?.port ||
        Number(process.env.INBOUND_MAIL_PORT || process.env.GODADDY_IMAP_PORT || 993),
      secure:
        config?.secure ??
        (process.env.INBOUND_MAIL_SECURE !== 'false' &&
          process.env.GODADDY_IMAP_SECURE !== 'false'),
      user:
        config?.user ||
        process.env.INBOUND_MAIL_USERNAME ||
        process.env.INBOUND_MAIL_USER ||
        process.env.GODADDY_IMAP_USER ||
        '',
      pass:
        config?.pass ||
        process.env.INBOUND_MAIL_PASSWORD ||
        process.env.INBOUND_MAIL_PASS ||
        process.env.GODADDY_IMAP_PASS ||
        '',
      connectionTimeout:
        config?.connectionTimeout ||
        Number(process.env.INBOUND_MAIL_TIMEOUT_MS || 15000),
      defaultFolder:
        config?.defaultFolder ||
        process.env.INBOUND_MAIL_FOLDER ||
        'INBOX',
    };
  }

  private createClient(): ImapFlow {
    if (!this.config.user || !this.config.pass) {
      throw new Error(
        'GoDaddy IMAP credentials missing: INBOUND_MAIL_USERNAME and INBOUND_MAIL_PASSWORD are required.'
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
      logger: false, // Prevent imapflow from logging credentials or private mail streams to console
    });
  }

  /**
   * Diagnostic connection test to verify GoDaddy IMAP reachability and credentials
   */
  public async testConnection(): Promise<ProviderConnectionTestResult> {
    if (!this.config.user || !this.config.pass) {
      return {
        success: false,
        provider: this.providerName,
        host: this.config.host,
        port: this.config.port,
        message: 'GoDaddy IMAP credentials not configured. Please set INBOUND_MAIL_USERNAME and INBOUND_MAIL_PASSWORD in .env',
        error: 'CREDENTIALS_MISSING',
      };
    }

    const client = this.createClient();
    try {
      console.log(`[InboundMail:GoDaddy] Initiating TLS connection to ${this.config.host}:${this.config.port}...`);
      await client.connect();
      console.log(`[InboundMail:GoDaddy] Authenticated successfully as ${this.config.user}`);

      const mailboxes = await client.list();
      const folderCount = mailboxes.length;

      // Select INBOX to verify access
      const lock = await client.getMailboxLock(this.config.defaultFolder);
      try {
        console.log(`[InboundMail:GoDaddy] Mailbox ${this.config.defaultFolder} opened. Total messages: ${client.mailbox ? client.mailbox.exists : 0}`);
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
        message: `Connected successfully to GoDaddy IMAP (${this.config.host}:${this.config.port}). Found ${folderCount} mailbox folders.`,
      };
    } catch (err: any) {
      console.error(`[InboundMail:GoDaddy] Connection failed: ${err.message}`);
      return {
        success: false,
        provider: this.providerName,
        host: this.config.host,
        port: this.config.port,
        message: `GoDaddy IMAP connection error: ${err.message}`,
        error: err.code || 'CONNECTION_FAILED',
      };
    }
  }

  /**
   * Fetches new unread/available messages from the GoDaddy mailbox
   */
  public async fetchNewMessages(
    folder: string = this.config.defaultFolder,
    limit: number = 50
  ): Promise<RawInboundEmail[]> {
    if (!this.config.user || !this.config.pass) {
      console.warn('[InboundMail:GoDaddy] Skipping sync: GoDaddy IMAP credentials not set.');
      return [];
    }

    const client = this.createClient();
    const rawEmails: RawInboundEmail[] = [];

    try {
      console.log(`[InboundMail:GoDaddy] Connecting to ${this.config.host}:${this.config.port} for sync...`);
      await client.connect();

      const lock = await client.getMailboxLock(folder);
      try {
        if (!client.mailbox || client.mailbox.exists === 0) {
          console.log(`[InboundMail:GoDaddy] Folder ${folder} is empty.`);
          return [];
        }

        // Search for unseen messages first, or latest messages if none marked unseen
        const searchRes = await client.search({ seen: false });
        let uids: number[] = Array.isArray(searchRes) ? searchRes : [];
        if (uids.length === 0) {
          // If no unseen, check latest messages up to limit
          const allRes = await client.search({ all: true });
          uids = Array.isArray(allRes) ? allRes : [];
          if (uids.length > limit) {
            uids = uids.slice(-limit);
          }
        } else if (uids.length > limit) {
          uids = uids.slice(-limit);
        }

        console.log(`[InboundMail:GoDaddy] Found ${uids.length} messages to sync from ${folder}`);

        for (const uid of uids) {
          try {
            // Fetch raw RFC 822 source
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

              const fromAddr = message.envelope?.from?.[0]?.address || message.envelope?.from?.[0]?.name;
              const toAddrs = message.envelope?.to?.map((t) => t.address || t.name).filter(Boolean) as string[];

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

              console.log(`[InboundMail:GoDaddy] Downloaded message UID ${uid} (${rawMime.length} bytes, Subject: "${message.envelope?.subject || 'No Subject'}")`);
            }
          } catch (fetchErr: any) {
            console.warn(`[InboundMail:GoDaddy] Error downloading message UID ${uid}: ${fetchErr.message}`);
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err: any) {
      console.error(`[InboundMail:GoDaddy] Sync error: ${err.message}`);
      throw err;
    }

    return rawEmails;
  }

  /**
   * Marks message as seen on the GoDaddy IMAP server
   */
  public async markSynchronized(uid: string, folder: string = this.config.defaultFolder): Promise<void> {
    if (!this.config.user || !this.config.pass) return;

    const client = this.createClient();
    try {
      await client.connect();
      const lock = await client.getMailboxLock(folder);
      try {
        await client.messageFlagsAdd(uid, ['\\Seen']);
        console.log(`[InboundMail:GoDaddy] Marked UID ${uid} as \\Seen`);
      } finally {
        lock.release();
      }
      await client.logout();
    } catch (err: any) {
      console.warn(`[InboundMail:GoDaddy] Could not mark UID ${uid} as \\Seen: ${err.message}`);
    }
  }
}

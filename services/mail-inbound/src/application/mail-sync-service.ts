import { InboundMailProvider } from '../provider/inbound-provider.interface.js';
import { InboundProviderFactory } from '../provider/provider-factory.js';
import { InboundPipeline, InboundProcessInput, InboundProcessResult } from './inbound-pipeline.js';
import { InboundEnvelope } from '../domain/envelope.js';
import { MimeParser } from '../domain/mime-parser.js';

export interface MailSyncResult {
  success: boolean;
  provider: string;
  folder: string;
  checked: number;
  imported: number;
  skipped: number;
  failed: number;
  errors?: string[];
  message?: string;
}

export class MailSyncService {
  private readonly provider: InboundMailProvider;
  private isSyncing = false;

  constructor(
    private readonly pipeline: InboundPipeline,
    provider?: InboundMailProvider
  ) {
    this.provider = provider || InboundProviderFactory.createProvider();
  }

  public getProvider(): InboundMailProvider {
    return this.provider;
  }

  /**
   * Executes synchronization cycle from the inbound provider into the Eazzio pipeline & database
   */
  public async sync(folder: string = 'INBOX', limit: number = 50): Promise<MailSyncResult> {
    if (this.isSyncing) {
      return {
        success: true,
        provider: this.provider.providerName,
        folder,
        checked: 0,
        imported: 0,
        skipped: 0,
        failed: 0,
        message: 'Sync already in progress. Skipped duplicate trigger.',
      };
    }

    this.isSyncing = true;
    const errors: string[] = [];
    let checkedCount = 0;
    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    console.log(`\n🔄 [MailSync] Starting inbound synchronization [Provider: ${this.provider.providerName}, Folder: ${folder}]...`);

    try {
      const messages = await this.provider.fetchNewMessages(folder, limit);
      checkedCount = messages.length;
      console.log(`📥 [MailSync] Retrieved ${checkedCount} raw messages from ${this.provider.providerName}`);

      for (const email of messages) {
        try {
          // Parse header details for the envelope
          const parsed = await MimeParser.parse(email.rawMime);
          const fromAddress = email.from || parsed.from || 'unknown@sender.com';
          const toAddresses = (email.to && email.to.length > 0)
            ? email.to
            : (parsed.to.length > 0 ? parsed.to : ['rahulkumar@eazzio.com']);

          const envelope = new InboundEnvelope({
            envelopeFrom: fromAddress,
            envelopeTo: toAddresses,
            clientIp: '127.0.0.1',
            sizeBytes: email.rawMime.length,
          });

          const fromDomain = (fromAddress.includes('@')
            ? fromAddress.split('@')[1]
            : 'secureserver.net') || 'secureserver.net';

          const processInput: InboundProcessInput = {
            envelope,
            rawMime: email.rawMime,
            authResults: {
              spf: 'pass',
              dkim: 'pass',
              dmarc: 'pass',
              fromDomain,
            },
          };

          const result: InboundProcessResult = await this.pipeline.process(processInput);

          if (result.status === 'ACCEPTED') {
            if (result.duplicate) {
              skippedCount++;
              console.log(`⏩ [MailSync] Skipped duplicate message [UID: ${email.uid}, MessageId: ${result.messageId}]`);
            } else {
              importedCount++;
              console.log(`✅ [MailSync] Imported message [UID: ${email.uid}, MessageId: ${result.messageId}, Subject: "${parsed.subject || 'No Subject'}"]`);
              await this.provider.markSynchronized(email.uid, folder);
            }
          } else if (result.status === 'REJECTED') {
            failedCount++;
            const reason = result.event.reasonDetail || 'Rejected by policy';
            errors.push(`UID ${email.uid}: ${reason}`);
            console.warn(`⚠️ [MailSync] Rejected message [UID: ${email.uid}]: ${reason}`);
          } else {
            // QUARANTINED
            importedCount++;
            console.log(`🛡️ [MailSync] Quarantined message [UID: ${email.uid}, MessageId: ${result.messageId}]`);
            await this.provider.markSynchronized(email.uid, folder);
          }
        } catch (msgErr: any) {
          failedCount++;
          const errDetail = `UID ${email.uid} processing failed: ${msgErr.message}`;
          errors.push(errDetail);
          console.error(`❌ [MailSync] ${errDetail}`);
        }
      }

      console.log(`🏁 [MailSync] Sync finished: ${checkedCount} checked, ${importedCount} imported, ${skippedCount} skipped, ${failedCount} failed.`);

      return {
        success: true,
        provider: this.provider.providerName,
        folder,
        checked: checkedCount,
        imported: importedCount,
        skipped: skippedCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (syncErr: any) {
      console.error(`❌ [MailSync] Synchronization aborted: ${syncErr.message}`);
      return {
        success: false,
        provider: this.provider.providerName,
        folder,
        checked: checkedCount,
        imported: importedCount,
        skipped: skippedCount,
        failed: failedCount,
        errors: [syncErr.message],
        message: `Sync failed: ${syncErr.message}`,
      };
    } finally {
      this.isSyncing = false;
    }
  }
}

import { MailAcceptedEvent } from '@eazzio/contracts';
import { SearchDocument, SearchDocumentProjector } from '../domain/search-document.js';

export interface SearchWriterAdapter {
  indexDocument(doc: SearchDocument): Promise<{ indexed: boolean; documentId: string }>;
  deleteDocument?(messageId: string): Promise<void>;
}

export class IndexerService {
  constructor(private readonly searchWriter: SearchWriterAdapter) {}

  public async handleMailAccepted(
    event: MailAcceptedEvent,
    bodyText?: string,
  ): Promise<{ indexed: boolean; documentId: string }> {
    const doc = SearchDocumentProjector.project({
      messageId: event.messageId,
      mailboxId: event.mailboxId,
      folderId: event.folderId,
      fromAddress: event.fromAddress,
      subject: event.subject,
      bodyText,
      sizeBytes: event.sizeBytes,
      occurredAt: event.occurredAt,
    });

    return await this.searchWriter.indexDocument(doc);
  }

  public async handleMessageDeleted(messageId: string): Promise<void> {
    if (this.searchWriter.deleteDocument) {
      await this.searchWriter.deleteDocument(messageId);
    }
  }
}

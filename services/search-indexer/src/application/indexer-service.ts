import { MailAcceptedEvent } from '@eazzio/contracts';
import { SearchDocument, SearchDocumentProjector } from '../domain/search-document.js';

export interface SearchWriterAdapter {
  indexDocument(doc: SearchDocument): Promise<{ indexed: boolean; documentId: string }>;
}

export class IndexerService {
  constructor(private readonly searchWriter: SearchWriterAdapter) {}

  public async handleMailAccepted(event: MailAcceptedEvent): Promise<{ indexed: boolean; documentId: string }> {
    const doc = SearchDocumentProjector.project({
      messageId: event.messageId,
      mailboxId: event.mailboxId,
      folderId: event.folderId,
      fromAddress: event.fromAddress,
      subject: event.subject,
      sizeBytes: event.sizeBytes,
      occurredAt: event.occurredAt
    });

    return await this.searchWriter.indexDocument(doc);
  }
}

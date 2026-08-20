import { describe, it, expect } from 'vitest';
import { SearchDocumentProjector } from '../../src/domain/search-document.js';
import { IndexerService } from '../../src/application/indexer-service.js';
import { MailAcceptedEvent } from '@eazzio/contracts';

describe('Search Indexer Service (Single Writer)', () => {
  it('should project MailAccepted event into standard SearchDocument', () => {
    const doc = SearchDocumentProjector.project({
      messageId: 'msg-1',
      mailboxId: 'mbx-1',
      folderId: 'fld-inbox',
      fromAddress: 'sender@example.com',
      subject: 'Important quarterly results',
      bodyText: 'Please find attached the financial results for Q3.',
      sizeBytes: 2048,
      occurredAt: new Date().toISOString(),
    });

    expect(doc.id).toBe('msg-1');
    expect(doc.subject).toBe('Important quarterly results');
    expect(doc.snippet).toContain('financial results');
  });

  it('should process MailAcceptedEvent and invoke search writer', async () => {
    const indexedDocs: any[] = [];
    const mockWriter = {
      indexDocument: async (doc: any) => {
        indexedDocs.push(doc);
        return { indexed: true, documentId: doc.id };
      },
    };

    const indexer = new IndexerService(mockWriter);
    const event: MailAcceptedEvent = {
      eventId: 'evt-100',
      occurredAt: new Date().toISOString(),
      messageId: 'msg-100',
      mailboxId: 'mbx-1',
      folderId: 'fld-inbox',
      fromAddress: 'alice@example.com',
      subject: 'Hello Search',
      sizeBytes: 500,
    };

    const res = await indexer.handleMailAccepted(event);
    expect(res.indexed).toBe(true);
    expect(indexedDocs.length).toBe(1);
    expect(indexedDocs[0].id).toBe('msg-100');
  });
});

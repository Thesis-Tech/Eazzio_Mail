import { OpenSearchAdapter } from '@eazzio/infra-adapters';
import { SearchWriterAdapter } from './indexer-service.js';
import { SearchDocument } from '../domain/search-document.js';

export interface OpenSearchWriterConfig {
  indexName?: string;
  nodeUrl?: string;
}

export class OpenSearchWriterAdapter implements SearchWriterAdapter {
  private readonly indexName: string;
  private readonly opensearch: OpenSearchAdapter;

  constructor(opensearchOrConfig?: OpenSearchAdapter | OpenSearchWriterConfig) {
    if (opensearchOrConfig instanceof OpenSearchAdapter) {
      this.opensearch = opensearchOrConfig;
      this.indexName = 'messages';
    } else {
      this.indexName = opensearchOrConfig?.indexName || 'messages';
      this.opensearch = new OpenSearchAdapter({
        node: opensearchOrConfig?.nodeUrl || process.env.OPENSEARCH_URL || 'http://localhost:9200',
      });
    }
  }

  public async initIndex(): Promise<void> {
    await this.opensearch.createIndexIfNotExists(this.indexName, {
      properties: {
        mailbox_id: { type: 'keyword' },
        folder_id: { type: 'keyword' },
        from_address: { type: 'keyword' },
        to_addresses: { type: 'keyword' },
        subject: { type: 'text' },
        body: { type: 'text' },
        snippet: { type: 'text' },
        has_attachments: { type: 'boolean' },
        received_at: { type: 'date' },
        size_bytes: { type: 'integer' },
      },
    });
  }

  public async indexDocument(
    doc: SearchDocument,
  ): Promise<{ indexed: boolean; documentId: string }> {
    await this.initIndex();

    const payload: Record<string, unknown> = {
      mailbox_id: doc.mailboxId,
      folder_id: doc.folderId,
      from_address: doc.fromAddress,
      to_addresses: doc.toAddresses,
      subject: doc.subject,
      body: doc.bodyText,
      snippet: doc.snippet || doc.bodyText.slice(0, 160),
      has_attachments: doc.hasAttachments,
      received_at: doc.receivedAt,
      size_bytes: doc.sizeBytes,
    };

    await this.opensearch.indexDocument(this.indexName, doc.id, payload);
    return { indexed: true, documentId: doc.id };
  }

  public async deleteDocument(messageId: string): Promise<void> {
    await this.opensearch.deleteDocument(this.indexName, messageId);
  }

  public async close(): Promise<void> {
    await this.opensearch.close();
  }
}

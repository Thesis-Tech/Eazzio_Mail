import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OpenSearchAdapter } from '@eazzio/infra-adapters';
import { IndexerService } from '../../src/application/indexer-service.js';
import { OpenSearchWriterAdapter } from '../../src/application/opensearch-writer-adapter.js';
import { MailAcceptedEvent } from '@eazzio/contracts';

describe('Search Indexer Live OpenSearch Integration Tests (TASK-011)', () => {
  const nodeUrl = process.env.OPENSEARCH_URL || 'http://localhost:9200';
  const testIndex = `test_indexer_${Date.now()}`;
  let opensearch: OpenSearchAdapter;
  let writer: OpenSearchWriterAdapter;
  let indexer: IndexerService;

  const testSuffix = Date.now().toString();
  const mailboxId = `mbx_${testSuffix}`;
  const messageId = `msg_idx_${testSuffix}`;

  let isOpenSearchAvailable = false;

  beforeAll(async () => {
    opensearch = new OpenSearchAdapter(nodeUrl);
    writer = new OpenSearchWriterAdapter({
      indexName: testIndex,
      nodeUrl,
    });
    indexer = new IndexerService(writer);

    try {
      isOpenSearchAvailable = await opensearch.healthCheck();
    } catch (_) {
      isOpenSearchAvailable = false;
    }
  });

  afterAll(async () => {
    if (isOpenSearchAvailable) {
      try {
        await opensearch.deleteIndex(testIndex);
      } catch (_) {}
    }
    await writer.close();
    await opensearch.close();
  });

  it('should consume MailAcceptedEvent and index document into OpenSearch', async () => {
    if (!isOpenSearchAvailable) return;
    const event: MailAcceptedEvent = {
      eventId: `evt_${testSuffix}`,
      occurredAt: new Date().toISOString(),
      messageId,
      mailboxId,
      folderId: 'fld-inbox',
      fromAddress: 'finance@corporate.com',
      subject: 'Annual Budget Forecast and Strategy',
      sizeBytes: 4096,
    };

    const bodyText = 'Please review the executive budget forecast attached for Q1 through Q4.';

    const res = await indexer.handleMailAccepted(event, bodyText);
    expect(res.indexed).toBe(true);
    expect(res.documentId).toBe(messageId);

    // Search OpenSearch to verify document is present
    const searchRes = await opensearch.search(testIndex, {
      query: {
        bool: {
          must: [{ term: { mailbox_id: mailboxId } }, { match: { body: 'executive' } }],
        },
      },
    });

    expect(searchRes.total).toBe(1);
    expect(searchRes.hits.length).toBe(1);
    expect(searchRes.hits[0]?.id).toBe(messageId);
    expect((searchRes.hits[0]?.source as { subject: string }).subject).toBe(
      'Annual Budget Forecast and Strategy',
    );
  });

  it('should remove document from OpenSearch index on message deletion', async () => {
    if (!isOpenSearchAvailable) return;
    await indexer.handleMessageDeleted(messageId);

    const searchRes = await opensearch.search(testIndex, {
      query: {
        term: { _id: messageId },
      },
    });

    expect(searchRes.total).toBe(0);
  });
});

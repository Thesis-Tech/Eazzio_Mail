import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OpenSearchAdapter } from '../src/search/opensearch-adapter/opensearch-adapter.js';

describe('OpenSearchAdapter Integration Tests (TASK-005)', () => {
  let search: OpenSearchAdapter;
  const testIndex = `messages_test_${Date.now()}`;

  beforeAll(async () => {
    search = new OpenSearchAdapter({
      node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
    });

    await search.createIndexIfNotExists(testIndex, {
      properties: {
        mailbox_id: { type: 'keyword' },
        subject: { type: 'text' },
        snippet: { type: 'text' },
        body: { type: 'text' },
        from: { type: 'keyword' },
      },
    });
  });

  afterAll(async () => {
    await search.deleteIndex(testIndex);
    await search.close();
  });

  it('should pass healthCheck', async () => {
    const isHealthy = await search.healthCheck();
    expect(isHealthy).toBe(true);
  });

  it('should index and search documents by full-text query', async () => {
    const docId1 = 'msg-doc-1';
    const docId2 = 'msg-doc-2';

    await search.indexDocument(testIndex, docId1, {
      mailbox_id: 'mailbox-123',
      subject: 'Quarterly Financial Summary and Tax Audit',
      snippet: 'Please review the Q4 numbers attached...',
      body: 'All earnings reports and balance sheets are reconciled.',
      from: 'cfo@company.com',
    });

    await search.indexDocument(testIndex, docId2, {
      mailbox_id: 'mailbox-123',
      subject: 'Team Lunch Friday',
      snippet: 'Pizza or sushi this week?',
      body: 'Let me know your dietary restrictions by Thursday afternoon.',
      from: 'hr@company.com',
    });

    // Search for financial query
    const res = await search.search(testIndex, {
      query: {
        bool: {
          must: [{ match: { body: 'reconciled' } }, { term: { mailbox_id: 'mailbox-123' } }],
        },
      },
    });

    expect(res.total).toBe(1);
    expect(res.hits.length).toBe(1);
    expect(res.hits[0]?.id).toBe(docId1);
    expect((res.hits[0]?.source as { subject: string }).subject).toBe(
      'Quarterly Financial Summary and Tax Audit',
    );
  });

  it('should delete documents successfully', async () => {
    const docId = 'msg-doc-to-delete';
    await search.indexDocument(testIndex, docId, {
      mailbox_id: 'mailbox-456',
      subject: 'Temporary Notice',
    });

    // Delete document
    await search.deleteDocument(testIndex, docId);

    // Search for deleted doc
    const res = await search.search(testIndex, {
      query: {
        term: { _id: docId },
      },
    });

    expect(res.total).toBe(0);
  });
});

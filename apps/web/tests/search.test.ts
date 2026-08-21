import { describe, it, expect } from 'vitest';
import { parseSearchQuery } from '../src/components/search/SearchBar.js';
import { ThreadSummary } from '../src/types/mail.js';

describe('Search Bar & Typeahead Query Parser (TASK-018)', () => {
  it('should parse syntax tokens: from, subject, and text terms', () => {
    const query = 'from:alice@corp.com subject:launch release notes';
    const parsed = parseSearchQuery(query);

    expect(parsed.from).toBe('alice@corp.com');
    expect(parsed.subject).toBe('launch');
    expect(parsed.textTerms).toEqual(['release', 'notes']);
  });

  it('should parse boolean flags: has:attachment, is:unread, is:starred', () => {
    const query = 'has:attachment is:unread is:starred urgent';
    const parsed = parseSearchQuery(query);

    expect(parsed.hasAttachment).toBe(true);
    expect(parsed.isUnread).toBe(true);
    expect(parsed.isStarred).toBe(true);
    expect(parsed.textTerms).toEqual(['urgent']);
  });

  it('should filter threads accurately based on parsed query', () => {
    const threads: ThreadSummary[] = [
      {
        id: 'th-1',
        mailboxId: 'mbx-1',
        subject: 'Q3 Security Audit',
        snippet: 'Audit report is attached.',
        sender: { name: 'SecOps', email: 'security@eazzio.com' },
        lastMessageAt: '10:00 AM',
        messageCount: 2,
        isUnread: true,
        isStarred: false,
        hasAttachments: true,
        labels: ['Security'],
      },
      {
        id: 'th-2',
        mailboxId: 'mbx-1',
        subject: 'Valkey Cache Optimization',
        snippet: 'Cache memory reduced by 40%.',
        sender: { name: 'DevOps', email: 'devops@eazzio.com' },
        lastMessageAt: 'Yesterday',
        messageCount: 1,
        isUnread: false,
        isStarred: true,
        hasAttachments: false,
        labels: ['Infra'],
      },
    ];

    // 1. Filter by from:
    const fromFilter = parseSearchQuery('from:security@eazzio.com');
    const fromResults = threads.filter(
      (t) => t.sender.email.toLowerCase().includes(fromFilter.from!)
    );
    expect(fromResults.length).toBe(1);
    expect(fromResults[0]?.id).toBe('th-1');

    // 2. Filter by has:attachment
    const attFilter = parseSearchQuery('has:attachment');
    const attResults = threads.filter((t) =>
      attFilter.hasAttachment ? t.hasAttachments : true
    );
    expect(attResults.length).toBe(1);
    expect(attResults[0]?.id).toBe('th-1');

    // 3. Filter by is:starred
    const starFilter = parseSearchQuery('is:starred');
    const starResults = threads.filter((t) =>
      starFilter.isStarred ? t.isStarred : true
    );
    expect(starResults.length).toBe(1);
    expect(starResults[0]?.id).toBe('th-2');
  });
});

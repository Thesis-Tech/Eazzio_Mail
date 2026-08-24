import { describe, it, expect, vi } from 'vitest';
import {
  GoDaddyImapProvider,
  CloudflareEmailWorkerProvider,
  InboundProviderFactory,
  MailSyncService,
  InboundPipeline,
  InboundMailProvider,
  RawInboundEmail,
} from '../../src/index.js';

describe('Inbound Mail Provider Abstraction & GoDaddy IMAP Tests', () => {
  it('should instantiate GoDaddyImapProvider via InboundProviderFactory by default', () => {
    const provider = InboundProviderFactory.createProvider('godaddy');
    expect(provider).toBeInstanceOf(GoDaddyImapProvider);
    expect(provider.providerName).toBe('godaddy');
  });

  it('should instantiate CloudflareEmailWorkerProvider when requested for future migration', () => {
    const provider = InboundProviderFactory.createProvider('cloudflare');
    expect(provider).toBeInstanceOf(CloudflareEmailWorkerProvider);
    expect(provider.providerName).toBe('cloudflare');
  });

  it('should return safe diagnostic failure when GoDaddy credentials are not configured', async () => {
    const provider = new GoDaddyImapProvider({ user: '', pass: '' });
    const result = await provider.testConnection();
    expect(result.success).toBe(false);
    expect(result.provider).toBe('godaddy');
    expect(result.error).toBe('CREDENTIALS_MISSING');
    expect(result.message).toContain('credentials not configured');
  });

  it('should safely return empty array and log warning if fetchNewMessages is called without credentials', async () => {
    const provider = new GoDaddyImapProvider({ user: '', pass: '' });
    const messages = await provider.fetchNewMessages('INBOX', 10);
    expect(messages).toEqual([]);
  });
});

describe('MailSyncService Synchronization & Duplicate Protection', () => {
  it('should process new emails and report accurate metrics', async () => {
    const mockMime = Buffer.from(
      `From: "Sender" <alice@example.com>\r\n` +
      `To: <rahulkumar@eazzio.com>\r\n` +
      `Subject: Test Inbound Sync\r\n` +
      `Message-ID: <unique-sync-001@example.com>\r\n` +
      `Date: Mon, 24 Aug 2026 10:00:00 +0000\r\n\r\n` +
      `Hello Eazzio, this is a test inbound email.`
    );

    const mockEmails: RawInboundEmail[] = [
      {
        uid: '101',
        rawMime: mockMime,
        from: 'alice@example.com',
        to: ['rahulkumar@eazzio.com'],
        subject: 'Test Inbound Sync',
      },
    ];

    const markSynchronizedSpy = vi.fn().mockResolvedValue(undefined);

    const mockProvider: InboundMailProvider = {
      providerName: 'godaddy',
      testConnection: vi.fn().mockResolvedValue({ success: true, message: 'OK', provider: 'godaddy' }),
      fetchNewMessages: vi.fn().mockResolvedValue(mockEmails),
      markSynchronized: markSynchronizedSpy,
    };

    const mockPipelineProcess = vi.fn().mockResolvedValue({
      status: 'ACCEPTED',
      messageId: 'msg-uuid-1',
      duplicate: false,
      event: { eventId: 'evt-1' },
    });

    const mockPipeline = {
      process: mockPipelineProcess,
    } as unknown as InboundPipeline;

    const syncService = new MailSyncService(mockPipeline, mockProvider);
    const syncResult = await syncService.sync('INBOX', 50);

    expect(syncResult.success).toBe(true);
    expect(syncResult.checked).toBe(1);
    expect(syncResult.imported).toBe(1);
    expect(syncResult.skipped).toBe(0);
    expect(syncResult.failed).toBe(0);
    expect(markSynchronizedSpy).toHaveBeenCalledWith('101', 'INBOX');
  });

  it('should skip duplicate emails without re-importing', async () => {
    const mockMime = Buffer.from(
      `From: "Sender" <alice@example.com>\r\n` +
      `To: <rahulkumar@eazzio.com>\r\n` +
      `Subject: Test Duplicate Sync\r\n` +
      `Message-ID: <duplicate-sync-001@example.com>\r\n\r\n` +
      `Duplicate content.`
    );

    const mockEmails: RawInboundEmail[] = [
      {
        uid: '102',
        rawMime: mockMime,
        from: 'alice@example.com',
        to: ['rahulkumar@eazzio.com'],
      },
    ];

    const markSynchronizedSpy = vi.fn().mockResolvedValue(undefined);

    const mockProvider: InboundMailProvider = {
      providerName: 'godaddy',
      testConnection: vi.fn().mockResolvedValue({ success: true, message: 'OK', provider: 'godaddy' }),
      fetchNewMessages: vi.fn().mockResolvedValue(mockEmails),
      markSynchronized: markSynchronizedSpy,
    };

    const mockPipelineProcess = vi.fn().mockResolvedValue({
      status: 'ACCEPTED',
      messageId: 'msg-uuid-existing',
      duplicate: true,
      event: { eventId: 'evt-dup' },
    });

    const mockPipeline = {
      process: mockPipelineProcess,
    } as unknown as InboundPipeline;

    const syncService = new MailSyncService(mockPipeline, mockProvider);
    const syncResult = await syncService.sync('INBOX', 50);

    expect(syncResult.success).toBe(true);
    expect(syncResult.checked).toBe(1);
    expect(syncResult.imported).toBe(0);
    expect(syncResult.skipped).toBe(1);
    expect(syncResult.failed).toBe(0);
    expect(markSynchronizedSpy).not.toHaveBeenCalled();
  });
});

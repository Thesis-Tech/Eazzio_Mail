import { Router, Request, Response, NextFunction } from 'express';
import {
  InboundPipeline,
  InboundProviderFactory,
  MailSyncService,
} from '@eazzio/mail-inbound';
import {
  PostgresDomainRepository,
  PostgresMailboxRepository,
  PostgresFolderRepository,
  PostgresMessageRepository,
  PostgresThreadRepository,
  PostgresFilterRepository,
  PostgresLabelRepository,
  EazzioStorage,
  MemoryStorageAdapter,
} from '@eazzio/infra-adapters';
import { defaultDb } from '../../config/index.js';

export const mailSyncRouter: Router = Router();

// Instantiate domain repositories for the pipeline
const domainRepo = new PostgresDomainRepository(defaultDb);
const mailboxRepo = new PostgresMailboxRepository(defaultDb);
const folderRepo = new PostgresFolderRepository(defaultDb);
const messageRepo = new PostgresMessageRepository(defaultDb);
const threadRepo = new PostgresThreadRepository(defaultDb);
const filterRepo = new PostgresFilterRepository(defaultDb);
const labelRepo = new PostgresLabelRepository(defaultDb);
const storage: EazzioStorage = new MemoryStorageAdapter();

const pipeline = new InboundPipeline(
  domainRepo,
  mailboxRepo,
  folderRepo,
  messageRepo,
  threadRepo,
  storage,
  undefined, // Rspamd
  undefined, // ClamAV
  filterRepo,
  labelRepo
);

const provider = InboundProviderFactory.createProvider();
const syncService = new MailSyncService(pipeline, provider);

// 1. GET /v1/mail/inbound/status — Test provider connectivity and return diagnostic status
mailSyncRouter.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const testResult = await provider.testConnection();
    res.json({
      success: testResult.success,
      data: testResult,
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST /v1/mail/inbound/sync — Trigger manual inbound synchronization
mailSyncRouter.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const folder = (req.body?.folder as string) || 'INBOX';
    const limit = Number(req.body?.limit || 50);

    const result = await syncService.sync(folder, limit);

    res.json({
      success: result.success,
      data: {
        provider: result.provider,
        folder: result.folder,
        checked: result.checked,
        imported: result.imported,
        skipped: result.skipped,
        failed: result.failed,
        errors: result.errors,
        message: result.message,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 3. POST /v1/mail/inbound/test-inject — Ingest test MIME RFC 822 for verification loops
mailSyncRouter.post('/test-inject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rawMime, from, to } = req.body;
    if (!rawMime) {
      res.status(400).json({ success: false, error: { message: 'rawMime string or buffer is required' } });
      return;
    }

    const rawBuffer = Buffer.isBuffer(rawMime) ? rawMime : Buffer.from(rawMime, 'utf-8');
    const fromAddr = from || 'test-sender@external.com';
    const toAddrs = Array.isArray(to) ? to : [to || 'rahulkumar@eazzio.com'];

    const envelope = {
      from: { value: fromAddr },
      to: toAddrs.map((addr: string) => ({ value: addr })),
      mailFrom: fromAddr,
      rcptTo: toAddrs,
      props: {
        envelopeFrom: fromAddr,
        envelopeTo: toAddrs,
        clientIp: '127.0.0.1',
        sizeBytes: rawBuffer.length,
      },
    } as any;

    const processResult = await pipeline.process({
      envelope,
      rawMime: rawBuffer,
      authResults: {
        spf: 'pass',
        dkim: 'pass',
        dmarc: 'pass',
        fromDomain: fromAddr.split('@')[1] || 'external.com',
      },
    });

    res.json({
      success: true,
      data: {
        status: processResult.status,
        messageId: (processResult as any).messageId,
        duplicate: (processResult as any).duplicate || false,
      },
    });
  } catch (err) {
    next(err);
  }
});

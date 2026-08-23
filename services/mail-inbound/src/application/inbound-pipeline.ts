import { InboundEnvelope } from '../domain/envelope.js';
import { MimeParser, ParsedMimeMessage } from '../domain/mime-parser.js';
import { InboundRouter } from '../domain/routing.js';
import { RspamdScanner } from '../security/rspamd-scanner.js';
import { ClamAVScanner } from '../security/clamav-scanner.js';
import { decide, AuthResults, AVResult, SpamRuleResult } from '@eazzio/security-pipeline';
import { MailAcceptedEvent, MailRejectedEvent, MailQuarantinedEvent } from '@eazzio/contracts';
import {
  Message,
  Thread,
  FolderRepository,
  MessageRepository,
  ThreadRepository,
  DomainRepository,
  MailboxRepository,
} from '@eazzio/domain';
import { EazzioStorage } from '@eazzio/infra-adapters';
import crypto from 'crypto';

export interface InboundProcessInput {
  envelope: InboundEnvelope;
  rawMime: Buffer;
  authResults: AuthResults;
  spamRuleResult?: SpamRuleResult;
  spamStatisticalScore?: number;
  avResult?: AVResult;
  domainDmarcPolicy?: 'none' | 'quarantine' | 'reject';
  targetMailboxId?: string;
  defaultFolderId?: string;
}

export type InboundProcessResult =
  | { status: 'ACCEPTED'; event: MailAcceptedEvent; messageId: string; duplicate?: boolean }
  | { status: 'QUARANTINED'; event: MailQuarantinedEvent; messageId: string }
  | { status: 'REJECTED'; event: MailRejectedEvent };

export class InboundPipeline {
  constructor(
    private readonly domainRepo?: DomainRepository,
    private readonly mailboxRepo?: MailboxRepository,
    private readonly folderRepo?: FolderRepository,
    private readonly messageRepo?: MessageRepository,
    private readonly threadRepo?: ThreadRepository,
    private readonly storage?: EazzioStorage,
    private readonly rspamdScanner?: RspamdScanner,
    private readonly clamavScanner?: ClamAVScanner,
  ) {}

  public async process(input: InboundProcessInput): Promise<InboundProcessResult> {
    const recipientAddr = input.envelope.to[0]?.value || '';
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Recipient & Domain Routing Resolution (if repositories available)
    let mailboxId = input.targetMailboxId;
    let folderId = input.defaultFolderId;

    if (this.domainRepo && this.mailboxRepo && !mailboxId) {
      const router = new InboundRouter(this.domainRepo, this.mailboxRepo);
      const route = await router.resolveRecipient(recipientAddr);
      if (!route) {
        const event: MailRejectedEvent = {
          eventId: crypto.randomUUID(),
          occurredAt: nowIso,
          envelopeFrom: input.envelope.from.value,
          envelopeTo: recipientAddr,
          reasonCode: 'INVALID_RECIPIENT' as any,
          reasonDetail: `Recipient domain or mailbox ${recipientAddr} not found or unverified`,
        };
        return { status: 'REJECTED', event };
      }
      mailboxId = route.mailbox.id;
    }

    // 2. Parse MIME structure
    const parsed: ParsedMimeMessage = await MimeParser.parse(input.rawMime);

    // 3. Security Scanners (Rspamd & ClamAV)
    const avResult: AVResult =
      input.avResult ??
      (this.clamavScanner ? await this.clamavScanner.scan(input.rawMime) : { status: 'clean' });

    const spamRuleResult: SpamRuleResult =
      input.spamRuleResult ??
      (this.rspamdScanner
        ? await this.rspamdScanner.scan(input.rawMime, input.envelope.props.clientIp, parsed.from)
        : { score: 0, matchedRules: [] });

    const spamStatisticalScore = input.spamStatisticalScore ?? 0.0;

    // 4. Deterministic Security Decision Gate
    const decision = decide({
      authResults: input.authResults,
      spamRuleResult,
      spamStatisticalScore,
      avResult,
      domainDmarcPolicy: input.domainDmarcPolicy,
    });

    if (decision.action === 'REJECT') {
      const event: MailRejectedEvent = {
        eventId: crypto.randomUUID(),
        occurredAt: nowIso,
        envelopeFrom: input.envelope.from.value,
        envelopeTo: recipientAddr,
        reasonCode: (decision.reasonCode as any) || 'POLICY_REJECT',
        reasonDetail: `Message rejected by security pipeline: ${decision.reasonCode || 'policy violation'}`,
      };
      return { status: 'REJECTED', event };
    }

    const effectiveMailboxId = mailboxId || 'default-mailbox';

    // 5. Idempotency Check: Avoid duplicate deliveries
    if (this.messageRepo && effectiveMailboxId) {
      const existing = await this.messageRepo.findByMessageIdHeader(
        effectiveMailboxId,
        parsed.messageIdHeader,
      );
      if (existing) {
        const event: MailAcceptedEvent = {
          eventId: crypto.randomUUID(),
          occurredAt: nowIso,
          messageId: existing.id,
          mailboxId: effectiveMailboxId,
          folderId: existing.folderId,
          fromAddress: existing.fromAddress,
          subject: existing.subject || '',
          sizeBytes: existing.sizeBytes,
        };
        return { status: 'ACCEPTED', event, messageId: existing.id, duplicate: true };
      }
    }

    const messageId = crypto.randomUUID();

    // 6. Object Storage: Raw MIME & Attachments via EazzioStorage
    const rawObjectKey = `mailboxes/${effectiveMailboxId}/messages/${messageId}/raw.eml`;
    if (this.storage) {
      await this.storage.put(rawObjectKey, input.rawMime, 'message/rfc822');

      for (const att of parsed.attachments) {
        const attKey = `mailboxes/${effectiveMailboxId}/messages/${messageId}/attachments/${att.sha256}_${att.filename}`;
        await this.storage.put(attKey, att.data, att.contentType);
      }
    }

    // 7. Folder & Thread Resolution
    if (this.folderRepo && effectiveMailboxId && !folderId) {
      const folders = await this.folderRepo.findByMailboxId(effectiveMailboxId);
      const targetKind = decision.action === 'QUARANTINE' ? 'spam' : 'inbox';
      const targetFolder = folders.find((f) => f.kind === targetKind) || folders[0];
      folderId = targetFolder ? targetFolder.id : undefined;
    }

    const effectiveFolderId =
      folderId || (decision.action === 'QUARANTINE' ? 'fld-spam' : 'fld-inbox');

    let threadId: string = crypto.randomUUID();
    if (this.threadRepo && effectiveMailboxId) {
      const normalizedSubject = (parsed.subject || '')
        .replace(/^(Re|Fwd|Fw):\s*/i, '')
        .trim()
        .toLowerCase();

      const newThread = new Thread({
        id: threadId,
        mailboxId: effectiveMailboxId,
        subjectNormalized: normalizedSubject,
        lastMessageAt: now,
        messageCount: 1,
      });
      await this.threadRepo.save(newThread);
    }

    // 8. Database Persistence via MessageRepository
    if (this.messageRepo && effectiveMailboxId) {
      const message = new Message({
        id: messageId,
        mailboxId: effectiveMailboxId,
        folderId: effectiveFolderId,
        threadId,
        messageIdHeader: parsed.messageIdHeader,
        inReplyTo: parsed.inReplyTo,
        referencesHeader: parsed.referencesHeader,
        fromAddress: input.envelope.from.value,
        subject: parsed.subject,
        snippet: parsed.bodyText.slice(0, 200).replace(/\s+/g, ' ').trim(),
        bodyText: parsed.bodyText || '',
        bodyHtml: parsed.bodyHtml || null,
        sizeBytes: input.rawMime.length,
        rawObjectKey,
        isRead: false,
        isStarred: false,
        isImportant: false,
        spamScore: decision.spamScore,
        authResults: input.authResults as unknown as Record<string, unknown>,
        direction: 'inbound',
        deliveryState: 'delivered',
        receivedAt: now,
      });

      await this.messageRepo.save(message);
    }

    // 9. Emit Quarantined or Accepted Event
    if (decision.action === 'QUARANTINE') {
      const event: MailQuarantinedEvent = {
        eventId: crypto.randomUUID(),
        occurredAt: nowIso,
        messageId,
        mailboxId: effectiveMailboxId,
        spamScore: decision.spamScore,
        reasonCode: decision.reasonCode || 'HIGH_SPAM_SCORE',
      };
      return { status: 'QUARANTINED', event, messageId };
    }

    const event: MailAcceptedEvent = {
      eventId: crypto.randomUUID(),
      occurredAt: nowIso,
      messageId,
      mailboxId: effectiveMailboxId,
      folderId: effectiveFolderId,
      fromAddress: input.envelope.from.value,
      subject: parsed.subject,
      sizeBytes: input.rawMime.length,
    };

    return { status: 'ACCEPTED', event, messageId };
  }
}

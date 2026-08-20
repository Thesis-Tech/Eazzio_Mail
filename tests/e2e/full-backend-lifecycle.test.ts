import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { PasswordService, TokenService, IdentityService } from '@eazzio/identity';
import { DomainVerifier, AdminService } from '@eazzio/admin-service';
import { InboundPipeline } from '@eazzio/mail-inbound';
import { OutboundService } from '@eazzio/mail-outbound';
import { SearchDocumentProjector } from '@eazzio/search-indexer';
import { NotificationChannelManager } from '@eazzio/notification';

describe('Eazzio Mail Full Backend Lifecycle Integration (Phase 4.K/4.L)', () => {
  it('should execute complete end-to-end backend flow seamlessly', async () => {
    // 1. Identity & Auth
    const { user } = await IdentityService.register({
      email: 'alex@eazzio.com',
      password: 'SuperSecurePassword123!',
      displayName: 'Alex'
    });
    expect(user.email).toBe('alex@eazzio.com');

    const authResult = await IdentityService.authenticate(user, {
      email: 'alex@eazzio.com',
      password: 'SuperSecurePassword123!'
    });
    expect(authResult.sessionToken).toBeDefined();

    // 2. Admin Domain 4-Check Verification
    const domainVerification = AdminService.verifyDomain({
      domainId: 'dom-1',
      domainName: 'eazzio.com',
      dnsRecords: { mx: true, spf: true, dkim: true, dmarc: true }
    });
    expect(domainVerification.isFullyVerified).toBe(true);

    // 3. Inbound Mail Ingestion & Deterministic Security Gate
    const rawInboundMime = Buffer.from(
      'From: partner@external.com\nTo: alex@eazzio.com\nSubject: Q3 Partnership Update\n\nHello Alex, partnership looks great!',
      'utf-8'
    );

    const inboundResult = await InboundPipeline.process({
      envelope: {
        from: { value: 'partner@external.com' } as any,
        to: [{ value: 'alex@eazzio.com' }] as any,
        props: {} as any
      },
      rawMime: rawInboundMime,
      authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass', fromDomain: 'external.com' },
      spamRuleResult: { score: 0.02, matchedRules: [] },
      spamStatisticalScore: 0.01,
      avResult: { status: 'clean' },
      targetMailboxId: 'mbx-alex',
      defaultFolderId: 'fld-inbox'
    });

    expect(inboundResult.status).toBe('ACCEPTED');
    const acceptedEvent = (inboundResult as any).event;

    // 4. Search Projection (Single-Writer)
    const searchDoc = SearchDocumentProjector.project({
      messageId: acceptedEvent.messageId,
      mailboxId: acceptedEvent.mailboxId,
      folderId: acceptedEvent.folderId,
      fromAddress: acceptedEvent.fromAddress,
      subject: acceptedEvent.subject,
      bodyText: 'Hello Alex, partnership looks great!',
      sizeBytes: acceptedEvent.sizeBytes,
      occurredAt: acceptedEvent.occurredAt
    });
    expect(searchDoc.id).toBe(acceptedEvent.messageId);
    expect(searchDoc.snippet).toContain('partnership looks great');

    // 5. Realtime Notification Channel Dispatch
    const notificationChannel = NotificationChannelManager.getMailboxChannel(acceptedEvent.mailboxId);
    const notificationMsg = NotificationChannelManager.createMailArrivedPayload(
      acceptedEvent.messageId,
      acceptedEvent.fromAddress,
      acceptedEvent.subject
    );
    expect(notificationChannel).toBe('mailbox:mbx-alex:events');
    expect(notificationMsg.type).toBe('MAIL_ARRIVED');

    // 6. Outbound Composition & DKIM Key Signing
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const { rawMime: outboundMime, messageId: outboundMsgId } = OutboundService.composeAndSign({
      fromAddress: 'alex@eazzio.com',
      to: ['partner@external.com'],
      subject: 'Re: Q3 Partnership Update',
      bodyText: 'Confirmed. Thanks!',
      domainName: 'eazzio.com',
      dkimSelector: 'default',
      dkimPrivateKeyPem: privateKey,
      idempotencyKey: 'idemp-tx-1'
    });

    expect(outboundMime.toString('utf-8')).toContain('DKIM-Signature:');
    expect(outboundMsgId).toContain('@eazzio.com>');

    // 7. Outbound Delivery State Completion
    const deliveryAttempt = OutboundService.handleDeliveryAttempt({
      outboundQueueId: 'queue-tx-1',
      messageId: outboundMsgId,
      recipientAddress: 'partner@external.com',
      currentAttempts: 0,
      success: true
    });
    expect(deliveryAttempt.state).toBe('delivered');
    expect(deliveryAttempt.event?.recipientAddress).toBe('partner@external.com');
  });
});

import { InboundEnvelope } from '../domain/envelope.js';
import { MimeParser } from '../domain/mime-parser.js';
import { decide, AuthResults, AVResult, SpamRuleResult } from '@eazzio/security-pipeline';
import { MailAcceptedEvent, MailRejectedEvent, MailQuarantinedEvent } from '@eazzio/contracts';

export interface InboundProcessInput {
  envelope: InboundEnvelope;
  rawMime: Buffer;
  authResults: AuthResults;
  spamRuleResult: SpamRuleResult;
  spamStatisticalScore: number;
  avResult: AVResult;
  domainDmarcPolicy?: 'none' | 'quarantine' | 'reject';
  targetMailboxId: string;
  defaultFolderId: string;
}

export type InboundProcessResult =
  | { status: 'ACCEPTED'; event: MailAcceptedEvent; messageId: string }
  | { status: 'QUARANTINED'; event: MailQuarantinedEvent; messageId: string }
  | { status: 'REJECTED'; event: MailRejectedEvent };

export class InboundPipeline {
  public static async process(input: InboundProcessInput): Promise<InboundProcessResult> {
    // 1. Run deterministic security pipeline gate
    const decision = decide({
      authResults: input.authResults,
      spamRuleResult: input.spamRuleResult,
      spamStatisticalScore: input.spamStatisticalScore,
      avResult: input.avResult,
      domainDmarcPolicy: input.domainDmarcPolicy
    });

    const now = new Date().toISOString();

    if (decision.action === 'REJECT') {
      const event: MailRejectedEvent = {
        eventId: crypto.randomUUID(),
        occurredAt: now,
        envelopeFrom: input.envelope.from.value,
        envelopeTo: input.envelope.to[0]?.value || '',
        reasonCode: (decision.reasonCode as any) || 'POLICY_REJECT',
        reasonDetail: `Message rejected by inbound security pipeline (score: ${decision.spamScore})`
      };
      return { status: 'REJECTED', event };
    }

    // 2. Parse MIME structure
    const parsed = MimeParser.parse(input.rawMime);
    const messageId = crypto.randomUUID();

    if (decision.action === 'QUARANTINE') {
      const event: MailQuarantinedEvent = {
        eventId: crypto.randomUUID(),
        occurredAt: now,
        messageId,
        mailboxId: input.targetMailboxId,
        spamScore: decision.spamScore,
        reasonCode: decision.reasonCode || 'HIGH_SPAM_SCORE'
      };
      return { status: 'QUARANTINED', event, messageId };
    }

    // 3. Accepted path
    const event: MailAcceptedEvent = {
      eventId: crypto.randomUUID(),
      occurredAt: now,
      messageId,
      mailboxId: input.targetMailboxId,
      folderId: input.defaultFolderId,
      fromAddress: input.envelope.from.value,
      subject: parsed.subject,
      sizeBytes: input.rawMime.length
    };

    return { status: 'ACCEPTED', event, messageId };
  }
}

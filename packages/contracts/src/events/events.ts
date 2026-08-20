export interface MailAcceptedEvent {
  eventId: string;
  occurredAt: string;
  messageId: string;
  mailboxId: string;
  folderId: string;
  fromAddress: string;
  subject: string;
  sizeBytes: number;
}

export interface MailRejectedEvent {
  eventId: string;
  occurredAt: string;
  envelopeFrom: string;
  envelopeTo: string;
  reasonCode: 'SPF_FAIL' | 'DKIM_FAIL' | 'DMARC_REJECT' | 'MALWARE_DETECTED' | 'RATE_LIMITED' | 'POLICY_REJECT';
  reasonDetail: string;
}

export interface MailQuarantinedEvent {
  eventId: string;
  occurredAt: string;
  messageId: string;
  mailboxId: string;
  spamScore: number;
  reasonCode: string;
}

export interface MailDeliveredEvent {
  eventId: string;
  occurredAt: string;
  outboundQueueId: string;
  messageId: string;
  recipientAddress: string;
}

export interface MailBouncedEvent {
  eventId: string;
  occurredAt: string;
  outboundQueueId: string;
  messageId: string;
  recipientAddress: string;
  bounceType: 'permanent' | 'transient_exhausted';
  smtpCode?: string;
}

export interface DomainVerifiedEvent {
  eventId: string;
  occurredAt: string;
  domainId: string;
  domainName: string;
}

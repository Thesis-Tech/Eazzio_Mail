export interface OutboundMessagePayload {
  messageId: string;
  fromAddress: string;
  recipientAddress: string;
  rawMime: Buffer;
  subject?: string | null;
  bodyHtml?: string | null;
  bodyText?: string | null;
}

export interface OutboundSendResult {
  success: boolean;
  messageId: string;
  queueId?: string;
  error?: string;
  smtpCode?: string;
}

export interface OutboundMailProvider {
  readonly providerName: string;
  send(message: OutboundMessagePayload): Promise<OutboundSendResult>;
}

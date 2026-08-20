export interface SearchDocument {
  id: string; // messageId
  mailboxId: string;
  folderId: string;
  fromAddress: string;
  toAddresses: string[];
  subject: string;
  bodyText: string;
  snippet?: string;
  hasAttachments: boolean;
  receivedAt: string;
  sizeBytes: number;
}

export class SearchDocumentProjector {
  public static project(params: {
    messageId: string;
    mailboxId: string;
    folderId: string;
    fromAddress: string;
    toAddresses?: string[];
    subject: string;
    bodyText?: string;
    sizeBytes: number;
    occurredAt: string;
  }): SearchDocument {
    const body = params.bodyText || '';
    const snippet = body.slice(0, 160).replace(/\s+/g, ' ').trim();

    return {
      id: params.messageId,
      mailboxId: params.mailboxId,
      folderId: params.folderId,
      fromAddress: params.fromAddress,
      toAddresses: params.toAddresses || [],
      subject: params.subject,
      bodyText: body,
      snippet,
      hasAttachments: false,
      receivedAt: params.occurredAt,
      sizeBytes: params.sizeBytes,
    };
  }
}

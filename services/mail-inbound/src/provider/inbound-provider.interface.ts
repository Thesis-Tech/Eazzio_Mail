export interface InboundMessageSummary {
  uid: string;
  messageIdHeader?: string;
  subject?: string;
  date?: Date;
  from?: string;
  to?: string[];
  size?: number;
  flags?: Set<string>;
}

export interface RawInboundEmail {
  uid: string;
  rawMime: Buffer;
  messageIdHeader?: string;
  from?: string;
  to?: string[];
  subject?: string;
  date?: Date;
  folder?: string;
}

export interface ProviderConnectionTestResult {
  success: boolean;
  message: string;
  provider: string;
  host?: string;
  port?: number;
  folderCount?: number;
  error?: string;
}

export interface InboundMailProvider {
  readonly providerName: string;
  testConnection(): Promise<ProviderConnectionTestResult>;
  fetchNewMessages(folder?: string, limit?: number): Promise<RawInboundEmail[]>;
  markSynchronized(uid: string, folder?: string): Promise<void>;
}

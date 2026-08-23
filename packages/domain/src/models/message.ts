export interface MessageProps {
  id: string;
  mailboxId: string;
  folderId: string;
  threadId?: string | null;
  messageIdHeader: string;
  inReplyTo?: string | null;
  referencesHeader?: string | null;
  fromAddress: string;
  subject?: string | null;
  snippet?: string | null;
  bodyText?: string | null;
  bodyHtml?: string | null;
  sizeBytes: number;
  rawObjectKey: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  spamScore?: number | null;
  authResults?: Record<string, unknown> | null;
  direction: 'inbound' | 'outbound';
  deliveryState?: 'queued' | 'sending' | 'delivered' | 'retrying' | 'bounced' | null;
  receivedAt: Date;
}

export class Message {
  constructor(private readonly props: MessageProps) {}

  public get id(): string { return this.props.id; }
  public get mailboxId(): string { return this.props.mailboxId; }
  public get folderId(): string { return this.props.folderId; }
  public get threadId(): string | null | undefined { return this.props.threadId; }
  public get messageIdHeader(): string { return this.props.messageIdHeader; }
  public get inReplyTo(): string | null | undefined { return this.props.inReplyTo; }
  public get referencesHeader(): string | null | undefined { return this.props.referencesHeader; }
  public get fromAddress(): string { return this.props.fromAddress; }
  public get subject(): string | null | undefined { return this.props.subject; }
  public get snippet(): string | null | undefined { return this.props.snippet; }
  public get bodyText(): string | null | undefined { return this.props.bodyText; }
  public get bodyHtml(): string | null | undefined { return this.props.bodyHtml; }
  public get sizeBytes(): number { return this.props.sizeBytes; }
  public get rawObjectKey(): string { return this.props.rawObjectKey; }
  public get isRead(): boolean { return this.props.isRead; }
  public get isStarred(): boolean { return this.props.isStarred; }
  public get isImportant(): boolean { return this.props.isImportant; }
  public get spamScore(): number | null | undefined { return this.props.spamScore; }
  public get authResults(): Record<string, unknown> | null | undefined { return this.props.authResults; }
  public get direction(): 'inbound' | 'outbound' { return this.props.direction; }
  public get deliveryState(): 'queued' | 'sending' | 'delivered' | 'retrying' | 'bounced' | null | undefined { return this.props.deliveryState; }
  public get receivedAt(): Date { return this.props.receivedAt; }
}

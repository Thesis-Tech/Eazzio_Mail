export interface ThreadProps {
  id: string;
  mailboxId: string;
  subjectNormalized?: string | null;
  lastMessageAt: Date;
  messageCount: number;
}

export class Thread {
  constructor(private readonly props: ThreadProps) {}

  public get id(): string { return this.props.id; }
  public get mailboxId(): string { return this.props.mailboxId; }
  public get subjectNormalized(): string | null | undefined { return this.props.subjectNormalized; }
  public get lastMessageAt(): Date { return this.props.lastMessageAt; }
  public get messageCount(): number { return this.props.messageCount; }
}

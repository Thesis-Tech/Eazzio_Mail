export interface MailboxProps {
  id: string;
  ownerUserId: string;
  domainId?: string | null;
  address: string;
  quotaBytes: bigint;
  usedBytes: bigint;
  createdAt: Date;
}

export class Mailbox {
  constructor(private readonly props: MailboxProps) {}

  public get id(): string { return this.props.id; }
  public get ownerUserId(): string { return this.props.ownerUserId; }
  public get domainId(): string | null | undefined { return this.props.domainId; }
  public get address(): string { return this.props.address; }
  public get quotaBytes(): bigint { return this.props.quotaBytes; }
  public get usedBytes(): bigint { return this.props.usedBytes; }
  public get createdAt(): Date { return this.props.createdAt; }
}

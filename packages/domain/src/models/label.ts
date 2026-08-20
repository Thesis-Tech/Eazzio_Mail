export interface LabelProps {
  id: string;
  mailboxId: string;
  name: string;
  color?: string | null;
}

export class Label {
  constructor(private readonly props: LabelProps) {}

  public get id(): string { return this.props.id; }
  public get mailboxId(): string { return this.props.mailboxId; }
  public get name(): string { return this.props.name; }
  public get color(): string | null | undefined { return this.props.color; }
}

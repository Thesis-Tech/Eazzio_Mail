export interface OrganizationProps {
  id: string;
  name: string;
  policy: Record<string, unknown>;
  createdAt: Date;
}

export class Organization {
  constructor(private readonly props: OrganizationProps) {}

  public get id(): string { return this.props.id; }
  public get name(): string { return this.props.name; }
  public get policy(): Record<string, unknown> { return this.props.policy; }
  public get createdAt(): Date { return this.props.createdAt; }
}

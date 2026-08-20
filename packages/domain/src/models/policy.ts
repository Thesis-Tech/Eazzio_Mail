export interface PolicyProps {
  id: string;
  scopeType: 'platform' | 'organization' | 'domain';
  scopeId?: string | null;
  policyType: 'password' | 'mfa' | 'retention' | 'sending_limit';
  rules: Record<string, unknown>;
  createdAt: Date;
}

export class Policy {
  constructor(private readonly props: PolicyProps) {}

  public get id(): string { return this.props.id; }
  public get scopeType(): 'platform' | 'organization' | 'domain' { return this.props.scopeType; }
  public get scopeId(): string | null | undefined { return this.props.scopeId; }
  public get policyType(): 'password' | 'mfa' | 'retention' | 'sending_limit' { return this.props.policyType; }
  public get rules(): Record<string, unknown> { return this.props.rules; }
  public get createdAt(): Date { return this.props.createdAt; }
}

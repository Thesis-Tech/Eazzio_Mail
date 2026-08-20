export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  displayName?: string | null;
  status: 'active' | 'suspended' | 'deleted';
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  constructor(private readonly props: UserProps) {}

  public get id(): string { return this.props.id; }
  public get email(): string { return this.props.email; }
  public get passwordHash(): string { return this.props.passwordHash; }
  public get displayName(): string | null | undefined { return this.props.displayName; }
  public get status(): 'active' | 'suspended' | 'deleted' { return this.props.status; }
  public get mfaEnabled(): boolean { return this.props.mfaEnabled; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }

  public isActive(): boolean { return this.props.status === 'active'; }
}

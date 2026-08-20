export interface DomainProps {
  id: string;
  organizationId?: string | null;
  domainName: string;
  verificationStatus: 'pending' | 'partially_verified' | 'verified' | 'failed';
  mxVerified: boolean;
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  dkimPrivateKeyRef?: string | null;
  createdAt: Date;
  activatedAt?: Date | null;
}

export class Domain {
  constructor(private readonly props: DomainProps) {}

  public get id(): string { return this.props.id; }
  public get organizationId(): string | null | undefined { return this.props.organizationId; }
  public get domainName(): string { return this.props.domainName; }
  public get verificationStatus(): 'pending' | 'partially_verified' | 'verified' | 'failed' { return this.props.verificationStatus; }
  public get mxVerified(): boolean { return this.props.mxVerified; }
  public get spfVerified(): boolean { return this.props.spfVerified; }
  public get dkimVerified(): boolean { return this.props.dkimVerified; }
  public get dmarcVerified(): boolean { return this.props.dmarcVerified; }
  public get dkimPrivateKeyRef(): string | null | undefined { return this.props.dkimPrivateKeyRef; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get activatedAt(): Date | null | undefined { return this.props.activatedAt; }

  public isFullyVerified(): boolean {
    return this.props.mxVerified && this.props.spfVerified && this.props.dkimVerified && this.props.dmarcVerified;
  }
}

export interface FolderProps {
  id: string;
  mailboxId: string;
  parentFolderId?: string | null;
  name: string;
  kind: 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'archive' | 'custom';
}

export class Folder {
  constructor(private readonly props: FolderProps) {}

  public get id(): string { return this.props.id; }
  public get mailboxId(): string { return this.props.mailboxId; }
  public get parentFolderId(): string | null | undefined { return this.props.parentFolderId; }
  public get name(): string { return this.props.name; }
  public get kind(): 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'archive' | 'custom' { return this.props.kind; }
}

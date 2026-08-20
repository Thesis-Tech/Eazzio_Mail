import { FolderRepository, Folder } from '@eazzio/domain';
import { EazzioDatabase } from '../database/interface.js';

interface FolderRow {
  id: string;
  mailbox_id: string;
  parent_folder_id: string | null;
  name: string;
  kind: 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'archive' | 'custom';
}

export class PostgresFolderRepository implements FolderRepository {
  constructor(private readonly db: EazzioDatabase) {}

  private mapRowToFolder(row: FolderRow): Folder {
    return new Folder({
      id: row.id,
      mailboxId: row.mailbox_id,
      parentFolderId: row.parent_folder_id,
      name: row.name,
      kind: row.kind,
    });
  }

  public async findById(id: string): Promise<Folder | null> {
    const rows = await this.db.query<FolderRow>(
      'SELECT id, mailbox_id, parent_folder_id, name, kind FROM folders WHERE id = $1',
      [id],
    );
    return rows[0] ? this.mapRowToFolder(rows[0]) : null;
  }

  public async findByMailboxId(mailboxId: string): Promise<Folder[]> {
    const rows = await this.db.query<FolderRow>(
      'SELECT id, mailbox_id, parent_folder_id, name, kind FROM folders WHERE mailbox_id = $1 ORDER BY name ASC',
      [mailboxId],
    );
    return rows.map((row) => this.mapRowToFolder(row));
  }

  public async save(folder: Folder): Promise<void> {
    await this.db.query(
      `INSERT INTO folders (id, mailbox_id, parent_folder_id, name, kind)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         parent_folder_id = EXCLUDED.parent_folder_id,
         name = EXCLUDED.name,
         kind = EXCLUDED.kind`,
      [folder.id, folder.mailboxId, folder.parentFolderId ?? null, folder.name, folder.kind],
    );
  }

  public async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM folders WHERE id = $1', [id]);
  }
}

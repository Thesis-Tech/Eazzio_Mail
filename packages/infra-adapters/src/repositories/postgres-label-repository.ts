import { LabelRepository, Label } from '@eazzio/domain';
import { EazzioDatabase } from '../database/interface.js';

interface LabelRow {
  id: string;
  mailbox_id: string;
  name: string;
  color: string | null;
}

export class PostgresLabelRepository implements LabelRepository {
  constructor(private readonly db: EazzioDatabase) {}

  private mapRowToLabel(row: LabelRow): Label {
    return new Label({
      id: row.id,
      mailboxId: row.mailbox_id,
      name: row.name,
      color: row.color,
    });
  }

  public async findById(id: string): Promise<Label | null> {
    const rows = await this.db.query<LabelRow>(
      'SELECT id, mailbox_id, name, color FROM labels WHERE id = $1',
      [id],
    );
    return rows[0] ? this.mapRowToLabel(rows[0]) : null;
  }

  public async findByMailboxId(mailboxId: string): Promise<Label[]> {
    const rows = await this.db.query<LabelRow>(
      'SELECT id, mailbox_id, name, color FROM labels WHERE mailbox_id = $1 ORDER BY name ASC',
      [mailboxId],
    );
    return rows.map((row) => this.mapRowToLabel(row));
  }

  public async save(label: Label): Promise<void> {
    await this.db.query(
      `INSERT INTO labels (id, mailbox_id, name, color)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         color = EXCLUDED.color`,
      [label.id, label.mailboxId, label.name, label.color ?? null],
    );
  }

  public async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM labels WHERE id = $1', [id]);
  }
}

import { FilterRepository, Filter, FilterCondition, FilterAction } from '@eazzio/domain';
import { EazzioDatabase } from '../database/interface.js';

interface FilterRow {
  id: string;
  mailbox_id: string;
  conditions: FilterCondition[] | string;
  actions: FilterAction[] | string;
  is_enabled: boolean;
  priority: number;
}

export class PostgresFilterRepository implements FilterRepository {
  constructor(private readonly db: EazzioDatabase) {}

  private mapRowToFilter(row: FilterRow): Filter {
    const conditions = typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions;
    const actions = typeof row.actions === 'string' ? JSON.parse(row.actions) : row.actions;

    return new Filter({
      id: row.id,
      mailboxId: row.mailbox_id,
      conditions: conditions || [],
      actions: actions || [],
      isEnabled: Boolean(row.is_enabled),
      priority: Number(row.priority || 0),
    });
  }

  public async findById(id: string): Promise<Filter | null> {
    const rows = await this.db.query<FilterRow>(
      'SELECT id, mailbox_id, conditions, actions, is_enabled, priority FROM filters WHERE id = $1',
      [id],
    );
    return rows[0] ? this.mapRowToFilter(rows[0]) : null;
  }

  public async findByMailboxId(mailboxId: string): Promise<Filter[]> {
    const rows = await this.db.query<FilterRow>(
      'SELECT id, mailbox_id, conditions, actions, is_enabled, priority FROM filters WHERE mailbox_id = $1 ORDER BY priority DESC, id ASC',
      [mailboxId],
    );
    return rows.map((row) => this.mapRowToFilter(row));
  }

  public async save(filter: Filter): Promise<void> {
    await this.db.query(
      `INSERT INTO filters (id, mailbox_id, conditions, actions, is_enabled, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         conditions = EXCLUDED.conditions,
         actions = EXCLUDED.actions,
         is_enabled = EXCLUDED.is_enabled,
         priority = EXCLUDED.priority`,
      [
        filter.id,
        filter.mailboxId,
        JSON.stringify(filter.conditions),
        JSON.stringify(filter.actions),
        filter.isEnabled,
        filter.priority,
      ],
    );
  }

  public async updateEnabled(id: string, isEnabled: boolean): Promise<void> {
    await this.db.query('UPDATE filters SET is_enabled = $2 WHERE id = $1', [id, isEnabled]);
  }

  public async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM filters WHERE id = $1', [id]);
  }
}

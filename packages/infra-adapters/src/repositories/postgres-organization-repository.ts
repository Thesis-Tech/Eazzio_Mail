import { OrganizationRepository, Organization } from '@eazzio/domain';
import { EazzioDatabase } from '../database/interface.js';

interface OrganizationRow {
  id: string;
  name: string;
  policy: Record<string, unknown>;
  created_at: Date | string;
}

export class PostgresOrganizationRepository implements OrganizationRepository {
  constructor(private readonly db: EazzioDatabase) {}

  private mapRowToOrganization(row: OrganizationRow): Organization {
    return new Organization({
      id: row.id,
      name: row.name,
      policy: row.policy,
      createdAt: new Date(row.created_at),
    });
  }

  public async findById(id: string): Promise<Organization | null> {
    const rows = await this.db.query<OrganizationRow>(
      'SELECT id, name, policy, created_at FROM organizations WHERE id = $1',
      [id],
    );
    return rows[0] ? this.mapRowToOrganization(rows[0]) : null;
  }

  public async save(org: Organization): Promise<void> {
    await this.db.query(
      `INSERT INTO organizations (id, name, policy, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         policy = EXCLUDED.policy`,
      [org.id, org.name, JSON.stringify(org.policy), org.createdAt],
    );
  }
}

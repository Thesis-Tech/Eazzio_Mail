import { DomainRepository, Domain } from '@eazzio/domain';
import { EazzioDatabase } from '../database/interface.js';

interface DomainRow {
  id: string;
  organization_id: string | null;
  domain_name: string;
  verification_status: 'pending' | 'partially_verified' | 'verified' | 'failed';
  mx_verified: boolean;
  spf_verified: boolean;
  dkim_verified: boolean;
  dmarc_verified: boolean;
  dkim_private_key_ref: string | null;
  created_at: Date | string;
  activated_at: Date | string | null;
}

export class PostgresDomainRepository implements DomainRepository {
  constructor(private readonly db: EazzioDatabase) {}

  private mapRowToDomain(row: DomainRow): Domain {
    return new Domain({
      id: row.id,
      organizationId: row.organization_id,
      domainName: row.domain_name,
      verificationStatus: row.verification_status,
      mxVerified: Boolean(row.mx_verified),
      spfVerified: Boolean(row.spf_verified),
      dkimVerified: Boolean(row.dkim_verified),
      dmarcVerified: Boolean(row.dmarc_verified),
      dkimPrivateKeyRef: row.dkim_private_key_ref,
      createdAt: new Date(row.created_at),
      activatedAt: row.activated_at ? new Date(row.activated_at) : null,
    });
  }

  public async findById(id: string): Promise<Domain | null> {
    const rows = await this.db.query<DomainRow>(
      `SELECT id, organization_id, domain_name, verification_status, mx_verified,
              spf_verified, dkim_verified, dmarc_verified, dkim_private_key_ref,
              created_at, activated_at
       FROM domains
       WHERE id = $1`,
      [id],
    );
    return rows[0] ? this.mapRowToDomain(rows[0]) : null;
  }

  public async findByName(domainName: string): Promise<Domain | null> {
    const rows = await this.db.query<DomainRow>(
      `SELECT id, organization_id, domain_name, verification_status, mx_verified,
              spf_verified, dkim_verified, dmarc_verified, dkim_private_key_ref,
              created_at, activated_at
       FROM domains
       WHERE LOWER(domain_name) = LOWER($1)`,
      [domainName],
    );
    return rows[0] ? this.mapRowToDomain(rows[0]) : null;
  }

  public async findByOrganizationId(organizationId: string): Promise<Domain[]> {
    const rows = await this.db.query<DomainRow>(
      `SELECT id, organization_id, domain_name, verification_status, mx_verified,
              spf_verified, dkim_verified, dmarc_verified, dkim_private_key_ref,
              created_at, activated_at
       FROM domains
       WHERE organization_id = $1
       ORDER BY created_at ASC`,
      [organizationId],
    );
    return rows.map((row) => this.mapRowToDomain(row));
  }

  public async save(domain: Domain): Promise<void> {
    await this.db.query(
      `INSERT INTO domains (
         id, organization_id, domain_name, verification_status, mx_verified,
         spf_verified, dkim_verified, dmarc_verified, dkim_private_key_ref,
         created_at, activated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
       ) ON CONFLICT (id) DO UPDATE SET
         organization_id = EXCLUDED.organization_id,
         domain_name = EXCLUDED.domain_name,
         verification_status = EXCLUDED.verification_status,
         mx_verified = EXCLUDED.mx_verified,
         spf_verified = EXCLUDED.spf_verified,
         dkim_verified = EXCLUDED.dkim_verified,
         dmarc_verified = EXCLUDED.dmarc_verified,
         dkim_private_key_ref = EXCLUDED.dkim_private_key_ref,
         activated_at = EXCLUDED.activated_at`,
      [
        domain.id,
        domain.organizationId ?? null,
        domain.domainName,
        domain.verificationStatus,
        domain.mxVerified,
        domain.spfVerified,
        domain.dkimVerified,
        domain.dmarcVerified,
        domain.dkimPrivateKeyRef ?? null,
        domain.createdAt,
        domain.activatedAt ?? null,
      ],
    );
  }

  public async updateVerificationStatus(
    domainId: string,
    status: {
      mxVerified: boolean;
      spfVerified: boolean;
      dkimVerified: boolean;
      dmarcVerified: boolean;
      verificationStatus: 'pending' | 'partially_verified' | 'verified' | 'failed';
      activatedAt?: Date | null;
    },
  ): Promise<void> {
    const updates: string[] = [
      'mx_verified = $2',
      'spf_verified = $3',
      'dkim_verified = $4',
      'dmarc_verified = $5',
      'verification_status = $6',
    ];
    const params: unknown[] = [
      domainId,
      status.mxVerified,
      status.spfVerified,
      status.dkimVerified,
      status.dmarcVerified,
      status.verificationStatus,
    ];

    if (status.activatedAt !== undefined) {
      params.push(status.activatedAt);
      updates.push(`activated_at = $${params.length}`);
    }

    await this.db.query(`UPDATE domains SET ${updates.join(', ')} WHERE id = $1`, params);
  }
}

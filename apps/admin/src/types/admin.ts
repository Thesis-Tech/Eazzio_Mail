export type AdminRole = 'PlatformAdmin' | 'OrgAdmin' | 'User';

export interface AdminUser {
  userId: string;
  email: string;
  displayName: string;
  role: AdminRole;
  organizationId?: string;
  organizationName?: string;
  isMfaEnabled?: boolean;
}

export interface AdminSession {
  token: string;
  user: AdminUser;
  expiresAt: number;
}

export interface TenantOrganization {
  id: string;
  name: string;
  domain: string;
  totalMailboxes: number;
  maxMailboxes: number;
  storageUsedBytes: bigint;
  storageQuotaBytes: bigint;
  status: 'active' | 'suspended' | 'provisioning';
  createdAt: string;
}

export interface DomainDnsRecord {
  type: 'MX' | 'TXT' | 'CNAME' | 'A';
  name: string;
  value: string;
  status: 'verified' | 'pending' | 'failed';
  lastCheckedAt?: string;
}

export interface ManagedDomain {
  id: string;
  organizationId: string;
  domainName: string;
  verificationStatus: 'verified' | 'pending' | 'failed';
  isPrimary: boolean;
  mxVerified: boolean;
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorUserId: string;
  actorEmail: string;
  actorRole: AdminRole;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  status: 'success' | 'failure';
  details?: Record<string, any>;
}

export interface AdminMailbox {
  id: string;
  userId: string;
  displayName: string;
  address: string;
  domain: string;
  department?: string;
  quotaBytes: number;
  usedBytes: number;
  status: 'active' | 'suspended' | 'disabled';
  isMfaEnabled?: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

'use client';

import React, { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { AuditLogEntry } from '../../types/admin';
import {
  FileText,
  Search,
  Filter,
  Download,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  ChevronDown,
  ChevronUp,
  Code,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

const mockLogs: AuditLogEntry[] = [
  {
    id: 'aud-101',
    timestamp: '2026-08-21T14:45:10Z',
    actorUserId: 'usr-admin-1',
    actorEmail: 'admin@eazzio.com',
    actorRole: 'PlatformAdmin',
    action: 'policy.update',
    resourceType: 'SecurityPolicy',
    resourceId: 'org-eazzio',
    ipAddress: '192.168.1.100',
    status: 'success',
    details: { changes: { requireMfa: true, strictDkimAlignment: true } },
  },
  {
    id: 'aud-102',
    timestamp: '2026-08-21T14:30:25Z',
    actorUserId: 'usr-admin-1',
    actorEmail: 'admin@eazzio.com',
    actorRole: 'PlatformAdmin',
    action: 'mailbox.create',
    resourceType: 'Mailbox',
    resourceId: 'alex@eazzio.com',
    ipAddress: '192.168.1.100',
    status: 'success',
    details: { quotaBytes: 5368709120, department: 'Engineering' },
  },
  {
    id: 'aud-103',
    timestamp: '2026-08-21T14:15:00Z',
    actorUserId: 'usr-admin-1',
    actorEmail: 'admin@eazzio.com',
    actorRole: 'PlatformAdmin',
    action: 'domain.verify',
    resourceType: 'Domain',
    resourceId: 'eazzio.com',
    ipAddress: '192.168.1.100',
    status: 'success',
    details: { mx: true, spf: true, dkim: true, dmarc: true },
  },
  {
    id: 'aud-104',
    timestamp: '2026-08-21T13:50:42Z',
    actorUserId: 'usr-spoof-attacker',
    actorEmail: 'attacker@external.net',
    actorRole: 'User',
    action: 'auth.spoof_blocked',
    resourceType: 'Mailbox',
    resourceId: 'ceo@eazzio.com',
    ipAddress: '203.0.113.45',
    status: 'failure',
    details: { reason: 'Unauthorized sender identity verification rejection' },
  },
  {
    id: 'aud-105',
    timestamp: '2026-08-21T12:20:18Z',
    actorUserId: 'usr-org-2',
    actorEmail: 'admin@acmecorp.com',
    actorRole: 'OrgAdmin',
    action: 'mailbox.quota_update',
    resourceType: 'Mailbox',
    resourceId: 'devops@acmecorp.com',
    ipAddress: '198.51.100.22',
    status: 'success',
    details: { oldQuota: 5368709120, newQuota: 10737418240 },
  },
  {
    id: 'aud-106',
    timestamp: '2026-08-21T10:05:00Z',
    actorUserId: 'usr-admin-1',
    actorEmail: 'admin@eazzio.com',
    actorRole: 'PlatformAdmin',
    action: 'auth.login_2fa',
    resourceType: 'Session',
    resourceId: 'sess-84920',
    ipAddress: '192.168.1.100',
    status: 'success',
    details: { method: 'TOTP_AUTHENTICATOR' },
  },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(mockLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = logs.filter((l) => {
    if (actionFilter !== 'ALL' && !l.action.startsWith(actionFilter)) return false;
    if (statusFilter !== 'ALL' && l.status !== statusFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.actorEmail.toLowerCase().includes(q) ||
        l.resourceId.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.ipAddress.includes(q)
      );
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'ActorEmail', 'ActorRole', 'Action', 'ResourceType', 'ResourceId', 'IPAddress', 'Status'];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.actorEmail,
      l.actorRole,
      l.action,
      l.resourceType,
      l.resourceId,
      l.ipAddress,
      l.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `eazzio_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto" data-testid="admin-audit-logs-page">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Immutable Administrative Audit Logs</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Cryptographically timestamped audit trail of administrative actions, domain updates, and security events.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1C1F26] border border-[#2A2E37] hover:bg-[#2A2E37] text-white text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
            data-testid="export-audit-csv-btn"
          >
            <Download className="w-4 h-4 text-[#2D5BFF]" />
            <span>Export Audit Trail (CSV)</span>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 bg-[#16181D] border border-[#2A2E37] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative flex items-center w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3" />
            <input
              type="text"
              placeholder="Search by actor, IP, action, resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121418] border border-[#2A2E37] rounded-xl pl-9 pr-3 py-2 text-white outline-none focus:border-[#2D5BFF]"
              data-testid="audit-search-input"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-[#121418] border border-[#2A2E37] rounded-xl px-3 py-2 text-slate-300 outline-none focus:border-[#2D5BFF]"
              data-testid="audit-action-filter"
            >
              <option value="ALL">All Actions</option>
              <option value="auth">Auth & Security</option>
              <option value="mailbox">Mailbox Provisioning</option>
              <option value="domain">Domain Verification</option>
              <option value="policy">Policy Updates</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#121418] border border-[#2A2E37] rounded-xl px-3 py-2 text-slate-300 outline-none focus:border-[#2D5BFF]"
              data-testid="audit-status-filter"
            >
              <option value="ALL">All Outcomes</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILURE">Blocked / Failure</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-[#16181D] border border-[#2A2E37] rounded-2xl overflow-hidden shadow-xl" data-testid="audit-logs-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-[#121418] border-b border-[#2A2E37]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp (UTC)</th>
                  <th className="py-3 px-4 font-semibold">Actor Email</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold">Resource Target</th>
                  <th className="py-3 px-4 font-semibold">IP Address</th>
                  <th className="py-3 px-4 font-semibold">Outcome</th>
                  <th className="py-3 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2E37]/60 font-mono text-[11px]">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-[#1C1F26]/50 transition-colors" data-testid={`audit-row-${log.id}`}>
                        <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                          {log.timestamp.replace('T', ' ').replace('Z', '')}
                        </td>
                        <td className="py-3 px-4 font-sans text-white font-medium">{log.actorEmail}</td>
                        <td className="py-3 px-4 font-sans text-slate-300">
                          <span className="px-2 py-0.5 rounded-md bg-[#1C1F26] border border-[#2A2E37] text-[10px] font-bold">
                            {log.actorRole}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#2D5BFF] font-semibold">{log.action}</td>
                        <td className="py-3 px-4 text-slate-300">{log.resourceId}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono">{log.ipAddress}</td>
                        <td className="py-3 px-4 font-sans">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              log.status === 'success'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/15 text-red-400 border border-red-500/30'
                            }`}
                            data-testid={`audit-status-${log.id}`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1 rounded text-slate-400 hover:text-white"
                            title="Inspect Payload"
                            data-testid={`expand-details-${log.id}`}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON Detail Payload */}
                      {isExpanded && (
                        <tr className="bg-[#121418]/80 font-mono text-[10px]">
                          <td colSpan={8} className="p-4 px-6 text-slate-300">
                            <div className="flex items-center gap-2 mb-2 text-[#2D5BFF] font-bold font-sans text-xs">
                              <Code className="w-3.5 h-3.5" />
                              <span>Audit Event Metadata & Payload</span>
                            </div>
                            <pre className="p-3 bg-[#0F1115] border border-[#2A2E37] rounded-xl text-emerald-400 overflow-x-auto">
                              {JSON.stringify(log.details || {}, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

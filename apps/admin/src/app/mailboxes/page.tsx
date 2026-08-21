'use client';

import React, { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { CreateMailboxModal } from '../../components/mailboxes/CreateMailboxModal';
import { EditQuotaModal } from '../../components/mailboxes/EditQuotaModal';
import { AdminMailbox } from '../../types/admin';
import {
  Users,
  Plus,
  HardDrive,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  MoreVertical,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Key,
  ShieldAlert,
  HardDriveDownload,
} from 'lucide-react';

const initialMailboxes: AdminMailbox[] = [
  {
    id: 'mbx-1',
    userId: 'usr-1',
    displayName: 'Rahul Kumar',
    address: 'rahul@eazzio.com',
    domain: 'eazzio.com',
    department: 'Leadership',
    quotaBytes: 25 * 1024 * 1024 * 1024,
    usedBytes: 1.2 * 1024 * 1024 * 1024,
    status: 'active',
    isMfaEnabled: true,
    createdAt: '2026-08-01T00:00:00Z',
    lastLoginAt: '10 mins ago',
  },
  {
    id: 'mbx-2',
    userId: 'usr-2',
    displayName: 'Priya Sharma',
    address: 'priya@eazzio.com',
    domain: 'eazzio.com',
    department: 'Operations',
    quotaBytes: 5 * 1024 * 1024 * 1024,
    usedBytes: 512 * 1024 * 1024,
    status: 'active',
    isMfaEnabled: true,
    createdAt: '2026-08-10T12:00:00Z',
    lastLoginAt: 'Yesterday',
  },
  {
    id: 'mbx-3',
    userId: 'usr-3',
    displayName: 'Executive Desk',
    address: 'ceo@eazzio.com',
    domain: 'eazzio.com',
    department: 'Leadership',
    quotaBytes: 50 * 1024 * 1024 * 1024,
    usedBytes: 4.8 * 1024 * 1024 * 1024,
    status: 'active',
    isMfaEnabled: true,
    createdAt: '2026-08-15T08:00:00Z',
    lastLoginAt: '1 hour ago',
  },
  {
    id: 'mbx-4',
    userId: 'usr-4',
    displayName: 'Security Operations',
    address: 'security@eazzio.com',
    domain: 'eazzio.com',
    department: 'Engineering',
    quotaBytes: 15 * 1024 * 1024 * 1024,
    usedBytes: 12.4 * 1024 * 1024 * 1024,
    status: 'active',
    isMfaEnabled: true,
    createdAt: '2026-08-18T14:20:00Z',
    lastLoginAt: '3 hours ago',
  },
  {
    id: 'mbx-5',
    userId: 'usr-5',
    displayName: 'DevOps Automated Relay',
    address: 'devops@eazzio.com',
    domain: 'eazzio.com',
    department: 'Engineering',
    quotaBytes: 10 * 1024 * 1024 * 1024,
    usedBytes: 8.9 * 1024 * 1024 * 1024,
    status: 'suspended',
    isMfaEnabled: false,
    createdAt: '2026-08-19T09:10:00Z',
    lastLoginAt: '3 days ago',
  },
];

const availableDomains = ['eazzio.com', 'acmecorp.com', 'apexfintech.io'];

export default function MailboxesPage() {
  const [mailboxes, setMailboxes] = useState<AdminMailbox[]>(initialMailboxes);
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMailbox, setEditingMailbox] = useState<AdminMailbox | null>(null);

  const handleCreateMailbox = (newMailbox: AdminMailbox) => {
    setMailboxes([newMailbox, ...mailboxes]);
  };

  const handleUpdateMailbox = (updated: AdminMailbox) => {
    setMailboxes(mailboxes.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleToggleStatus = (id: string) => {
    setMailboxes(
      mailboxes.map((m) => {
        if (m.id !== id) return m;
        const newStatus = m.status === 'active' ? 'suspended' : 'active';
        return { ...m, status: newStatus };
      })
    );
  };

  const handleDeleteMailbox = (id: string) => {
    if (confirm('Are you sure you want to delete this mailbox? All mail messages and stored data will be purged.')) {
      setMailboxes(mailboxes.filter((m) => m.id !== id));
    }
  };

  const filteredMailboxes = mailboxes.filter((m) => {
    if (domainFilter !== 'ALL' && m.domain !== domainFilter) return false;
    if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.displayName.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q) ||
        (m.department && m.department.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalAllocatedBytes = mailboxes.reduce((acc, m) => acc + m.quotaBytes, 0);
  const totalUsedBytes = mailboxes.reduce((acc, m) => acc + m.usedBytes, 0);
  const totalAllocatedGB = (totalAllocatedBytes / (1024 * 1024 * 1024)).toFixed(1);
  const totalUsedGB = (totalUsedBytes / (1024 * 1024 * 1024)).toFixed(1);
  const activeCount = mailboxes.filter((m) => m.status === 'active').length;
  const highUsageCount = mailboxes.filter((m) => m.usedBytes / m.quotaBytes > 0.8).length;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto" data-testid="admin-mailboxes-page">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Mailbox Provisioning & Storage Quotas</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage organization mailboxes, assign custom domain email identities, and adjust storage allocations.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2D5BFF] hover:bg-[#1E48E0] text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all self-start sm:self-auto"
            data-testid="create-mailbox-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Mailbox</span>
          </button>
        </div>

        {/* Telemetry Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-[#16181D] border border-[#2A2E37] rounded-2xl flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Mailboxes</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold text-white font-mono">{mailboxes.length}</span>
              <span className="text-[11px] text-emerald-400 font-semibold">{activeCount} Active</span>
            </div>
          </div>

          <div className="p-4 bg-[#16181D] border border-[#2A2E37] rounded-2xl flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">Storage Utilized</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold text-white font-mono">{totalUsedGB} GB</span>
              <span className="text-[11px] text-slate-400 font-mono">of {totalAllocatedGB} GB</span>
            </div>
          </div>

          <div className="p-4 bg-[#16181D] border border-[#2A2E37] rounded-2xl flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">High Usage Quota Alerts</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-xl font-bold font-mono ${highUsageCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {highUsageCount}
              </span>
              <span className="text-[11px] text-slate-400">&gt;80% capacity</span>
            </div>
          </div>

          <div className="p-4 bg-[#16181D] border border-[#2A2E37] rounded-2xl flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">MFA Enforced Rate</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold text-white font-mono">
                {Math.round((mailboxes.filter((m) => m.isMfaEnabled).length / mailboxes.length) * 100)}%
              </span>
              <span className="text-[11px] text-purple-400 font-semibold">Protected</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 bg-[#16181D] border border-[#2A2E37] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative flex items-center w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3" />
            <input
              type="text"
              placeholder="Search by name, address, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121418] border border-[#2A2E37] rounded-xl pl-9 pr-3 py-2 text-white outline-none focus:border-[#2D5BFF]"
              data-testid="mailbox-search-input"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="bg-[#121418] border border-[#2A2E37] rounded-xl px-3 py-2 text-slate-300 outline-none focus:border-[#2D5BFF]"
              data-testid="domain-filter-select"
            >
              <option value="ALL">All Domains</option>
              {availableDomains.map((dom) => (
                <option key={dom} value={dom}>
                  @{dom}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#121418] border border-[#2A2E37] rounded-xl px-3 py-2 text-slate-300 outline-none focus:border-[#2D5BFF]"
              data-testid="status-filter-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        {/* Mailboxes Data Table */}
        <div className="bg-[#16181D] border border-[#2A2E37] rounded-2xl overflow-hidden shadow-xl" data-testid="mailboxes-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-[#121418] border-b border-[#2A2E37]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Mailbox User</th>
                  <th className="py-3 px-4 font-semibold">Address</th>
                  <th className="py-3 px-4 font-semibold">Department</th>
                  <th className="py-3 px-4 font-semibold">Storage Quota Usage</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2E37]/60">
                {filteredMailboxes.map((mbx) => {
                  const usedMB = (mbx.usedBytes / (1024 * 1024)).toFixed(0);
                  const quotaGB = (mbx.quotaBytes / (1024 * 1024 * 1024)).toFixed(0);
                  const usagePercent = Math.min(100, Math.round((mbx.usedBytes / mbx.quotaBytes) * 100)) || 0;

                  return (
                    <tr key={mbx.id} className="hover:bg-[#1C1F26]/50 transition-colors" data-testid={`mailbox-row-${mbx.id}`}>
                      {/* Name & Avatar */}
                      <td className="py-3 px-4 font-medium text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#2D5BFF]/20 text-[#2D5BFF] flex items-center justify-center font-bold text-[11px]">
                            {mbx.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span>{mbx.displayName}</span>
                            {mbx.isMfaEnabled && (
                              <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded font-bold bg-purple-500/20 text-purple-300">
                                2FA
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-3 px-4 font-mono text-slate-300 font-semibold">{mbx.address}</td>

                      {/* Department */}
                      <td className="py-3 px-4 text-slate-400">
                        <span className="px-2 py-0.5 rounded-md bg-[#1C1F26] border border-[#2A2E37] text-[11px]">
                          {mbx.department || 'General'}
                        </span>
                      </td>

                      {/* Quota Progress Bar */}
                      <td className="py-3 px-4">
                        <div className="w-44 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>{usedMB} MB</span>
                            <span>{quotaGB} GB ({usagePercent}%)</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#121418] overflow-hidden border border-[#2A2E37]">
                            <div
                              className={`h-full transition-all ${
                                usagePercent > 85
                                  ? 'bg-red-500'
                                  : usagePercent > 60
                                  ? 'bg-amber-500'
                                  : 'bg-[#2D5BFF]'
                              }`}
                              style={{ width: `${Math.max(4, usagePercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            mbx.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : mbx.status === 'suspended'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30'
                          }`}
                          data-testid={`status-badge-${mbx.id}`}
                        >
                          {mbx.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingMailbox(mbx)}
                            className="p-1.5 rounded-lg bg-[#1C1F26] border border-[#2A2E37] text-slate-300 hover:text-white hover:border-slate-500 transition-all"
                            title="Edit Storage Quota & Settings"
                            data-testid={`edit-mailbox-${mbx.id}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(mbx.id)}
                            className="p-1.5 rounded-lg bg-[#1C1F26] border border-[#2A2E37] text-slate-300 hover:text-amber-400 hover:border-amber-500 transition-all"
                            title={mbx.status === 'active' ? 'Suspend Mailbox' : 'Activate Mailbox'}
                            data-testid={`toggle-status-${mbx.id}`}
                          >
                            {mbx.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleDeleteMailbox(mbx.id)}
                            className="p-1.5 rounded-lg bg-[#1C1F26] border border-[#2A2E37] text-slate-400 hover:text-red-400 hover:border-red-500 transition-all"
                            title="Purge Mailbox"
                            data-testid={`delete-mailbox-${mbx.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Mailbox Modal */}
        <CreateMailboxModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          availableDomains={availableDomains}
          onCreateMailbox={handleCreateMailbox}
        />

        {/* Edit Quota Modal */}
        <EditQuotaModal
          mailbox={editingMailbox}
          isOpen={Boolean(editingMailbox)}
          onClose={() => setEditingMailbox(null)}
          onUpdateMailbox={handleUpdateMailbox}
        />
      </div>
    </AdminLayout>
  );
}

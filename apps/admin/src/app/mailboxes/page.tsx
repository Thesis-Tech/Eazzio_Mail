'use client';

import React from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Users, Plus, HardDrive, Shield } from 'lucide-react';

export default function MailboxesPage() {
  const mailboxes = [
    { email: 'rahul@eazzio.com', user: 'Rahul Kumar', role: 'CTO', used: '240 MB / 5 GB', status: 'active' },
    { email: 'priya@eazzio.com', user: 'Priya Sharma', role: 'Operations', used: '512 MB / 5 GB', status: 'active' },
    { email: 'ceo@eazzio.com', user: 'Executive Desk', role: 'Leadership', used: '1.2 GB / 25 GB', status: 'active' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto" data-testid="admin-mailboxes-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Mailbox Provisioning & Quotas</h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage user addresses, storage allocations, and mailbox states.</p>
          </div>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2D5BFF] hover:bg-[#1E48E0] text-white text-xs font-semibold shadow-md transition-all">
            <Plus className="w-4 h-4" />
            <span>Create Mailbox</span>
          </button>
        </div>

        <div className="p-5 bg-[#16181D] border border-[#2A2E37] rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-[#2A2E37]">
              <tr>
                <th className="pb-3 font-semibold">Address</th>
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold">Quota Usage</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2E37]/60">
              {mailboxes.map((m) => (
                <tr key={m.email} className="hover:bg-[#1C1F26]/50">
                  <td className="py-3 font-semibold text-white">{m.email}</td>
                  <td className="py-3 text-slate-300">{m.user}</td>
                  <td className="py-3 text-slate-400">{m.role}</td>
                  <td className="py-3 text-slate-400">{m.used}</td>
                  <td className="py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 uppercase">
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

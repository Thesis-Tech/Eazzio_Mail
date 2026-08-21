'use client';

import React from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { FileText, ShieldCheck, Download } from 'lucide-react';

export default function AuditLogsPage() {
  const logs = [
    { id: 'aud-1', time: '2026-08-21 14:12:00', actor: 'admin@eazzio.com', role: 'PlatformAdmin', action: 'domain.verify', target: 'eazzio.com', status: 'SUCCESS' },
    { id: 'aud-2', time: '2026-08-21 14:05:30', actor: 'admin@eazzio.com', role: 'PlatformAdmin', action: 'mailbox.create', target: 'priya@eazzio.com', status: 'SUCCESS' },
    { id: 'aud-3', time: '2026-08-21 13:58:10', actor: 'user@external.com', role: 'User', action: 'auth.spoof_attempt', target: 'ceo@eazzio.com', status: 'BLOCKED' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto" data-testid="admin-audit-logs-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Immutable Administrative Audit Logs</h1>
            <p className="text-xs text-slate-400 mt-0.5">Tamper-evident logs of administrative actions, domain updates, and security events.</p>
          </div>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1C1F26] border border-[#2A2E37] hover:bg-[#2A2E37] text-white text-xs font-semibold transition-all">
            <Download className="w-4 h-4 text-[#2D5BFF]" />
            <span>Export Audit Trail (CSV)</span>
          </button>
        </div>

        <div className="p-5 bg-[#16181D] border border-[#2A2E37] rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-[#2A2E37]">
              <tr>
                <th className="pb-3 font-semibold">Timestamp (UTC)</th>
                <th className="pb-3 font-semibold">Actor Email</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold">Action</th>
                <th className="pb-3 font-semibold">Target</th>
                <th className="pb-3 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2E37]/60 font-mono text-[11px]">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-[#1C1F26]/50">
                  <td className="py-3 text-slate-400">{l.time}</td>
                  <td className="py-3 text-white font-sans">{l.actor}</td>
                  <td className="py-3 text-slate-300 font-sans">{l.role}</td>
                  <td className="py-3 text-[#2D5BFF]">{l.action}</td>
                  <td className="py-3 text-slate-300">{l.target}</td>
                  <td className="py-3 font-sans">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      l.status === 'SUCCESS' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                      {l.status}
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

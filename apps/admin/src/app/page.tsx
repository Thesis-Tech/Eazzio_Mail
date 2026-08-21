'use client';

import React from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Globe, Users, HardDrive, ShieldCheck, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const stats = [
    { title: 'Verified Domains', value: '4 / 4', icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10', href: '/domains' },
    { title: 'Provisioned Mailboxes', value: '248', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10', href: '/mailboxes' },
    { title: 'Total Storage Used', value: '1.24 TB / 10 TB', icon: HardDrive, color: 'text-amber-400', bg: 'bg-amber-500/10', href: '/mailboxes' },
    { title: 'Security & Antivirus', value: '100% Clean', icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-500/10', href: '/security' },
  ];

  const recentDomains = [
    { domain: 'eazzio.com', org: 'Eazzio Internal', mx: true, spf: true, dkim: true, dmarc: true, status: 'verified' },
    { domain: 'acmecorp.com', org: 'Acme Industries', mx: true, spf: true, dkim: true, dmarc: true, status: 'verified' },
    { domain: 'apexfintech.io', org: 'Apex Technologies', mx: true, spf: true, dkim: false, dmarc: true, status: 'pending' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto" data-testid="admin-dashboard-overview">
        {/* Page Header */}
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">System & Organization Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-tenant mail routing, domain verification, and security telemetry.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.title}
                href={s.href}
                className="p-4 bg-[#16181D] border border-[#2A2E37] rounded-2xl flex flex-col justify-between hover:border-[#2D5BFF]/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">{s.title}</span>
                  <div className={`p-2 rounded-xl ${s.bg} ${s.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-lg font-bold text-white tracking-tight">{s.value}</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-[#2D5BFF] transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Domain 4-Check Status Quick View */}
        <div className="p-5 bg-[#16181D] border border-[#2A2E37] rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Domain DNS 4-Check Verification</h2>
              <p className="text-xs text-slate-400">Status of MX, SPF, DKIM, and DMARC across tenant domains</p>
            </div>
            <Link
              href="/domains"
              className="text-xs font-semibold text-[#2D5BFF] hover:underline flex items-center gap-1"
            >
              <span>Manage all domains</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-[#2A2E37]">
                <tr>
                  <th className="pb-2.5 font-semibold">Domain</th>
                  <th className="pb-2.5 font-semibold">Organization</th>
                  <th className="pb-2.5 font-semibold">MX</th>
                  <th className="pb-2.5 font-semibold">SPF</th>
                  <th className="pb-2.5 font-semibold">DKIM</th>
                  <th className="pb-2.5 font-semibold">DMARC</th>
                  <th className="pb-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2E37]/60">
                {recentDomains.map((d) => (
                  <tr key={d.domain} className="hover:bg-[#1C1F26]/50">
                    <td className="py-3 font-semibold text-white">{d.domain}</td>
                    <td className="py-3 text-slate-400">{d.org}</td>
                    <td className="py-3">
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> PASS</span>
                    </td>
                    <td className="py-3">
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> PASS</span>
                    </td>
                    <td className="py-3">
                      {d.dkim ? (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> PASS</span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> MISSING</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> PASS</span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        d.status === 'verified' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

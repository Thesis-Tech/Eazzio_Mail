'use client';

import React from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Globe, Plus, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function DomainsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto" data-testid="admin-domains-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Custom Domain Management</h1>
            <p className="text-xs text-slate-400 mt-0.5">Configure 4-check DNS verification for tenant mail routing.</p>
          </div>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2D5BFF] hover:bg-[#1E48E0] text-white text-xs font-semibold shadow-md transition-all">
            <Plus className="w-4 h-4" />
            <span>Add New Domain</span>
          </button>
        </div>

        <div className="p-5 bg-[#16181D] border border-[#2A2E37] rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#2A2E37] pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2D5BFF]/10 text-[#2D5BFF] flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">eazzio.com (Primary)</h3>
                <p className="text-[11px] text-slate-400">Target Host: mail.eazzio.com</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/15 text-emerald-400">
              Verified & Active
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#121418] border border-[#2A2E37] space-y-1">
              <p className="text-slate-400 text-[11px]">MX Record</p>
              <p className="font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 10 mail.eazzio.com</p>
            </div>
            <div className="p-3 rounded-xl bg-[#121418] border border-[#2A2E37] space-y-1">
              <p className="text-slate-400 text-[11px]">SPF Record</p>
              <p className="font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> v=spf1 mx ~all</p>
            </div>
            <div className="p-3 rounded-xl bg-[#121418] border border-[#2A2E37] space-y-1">
              <p className="text-slate-400 text-[11px]">DKIM 2048-bit</p>
              <p className="font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> eazzio._domainkey</p>
            </div>
            <div className="p-3 rounded-xl bg-[#121418] border border-[#2A2E37] space-y-1">
              <p className="text-slate-400 text-[11px]">DMARC Policy</p>
              <p className="font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> p=quarantine</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

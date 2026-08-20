'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Inbox, Mail, Search, Sparkles, Filter, RefreshCw, Star, AlertCircle } from 'lucide-react';

export default function MailDashboardPage() {
  const [activeFolderId, setActiveFolderId] = useState('fld-inbox');
  const [activeLabelId, setActiveLabelId] = useState<string | undefined>();
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  return (
    <DashboardLayout
      activeFolderId={activeFolderId}
      activeLabelId={activeLabelId}
      onSelectFolder={(id) => setActiveFolderId(id)}
      onSelectLabel={(id) => setActiveLabelId(id)}
      onOpenCompose={() => setIsComposeOpen(true)}
    >
      <div className="h-full flex flex-col p-6 space-y-6" data-testid="mail-dashboard">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between border-b border-[#2A2E37] pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white capitalize">
              {activeFolderId.replace('fld-', '')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#2D5BFF]/15 text-[#2D5BFF]">
              3 unread
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-xl bg-[#16181D] border border-[#2A2E37] text-slate-300 hover:text-white hover:border-slate-600 transition-all"
              title="Refresh Mailbox"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button className="px-3 py-2 rounded-xl bg-[#16181D] border border-[#2A2E37] text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 flex items-center gap-2 transition-all">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Sample Message Thread Feed */}
        <div className="space-y-2">
          {/* Thread Item 1 */}
          <div className="p-4 rounded-xl bg-[#16181D] border border-[#2A2E37] hover:border-[#2D5BFF]/50 flex items-center justify-between gap-4 cursor-pointer transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <button className="text-slate-500 hover:text-amber-400">
                <Star className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white truncate">Security Team</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-400">
                    SPF/DKIM Valid
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-300 truncate">
                  Q3 Infrastructure Security Audit Report
                </p>
                <p className="text-xs text-slate-500 truncate">
                  Please find the finalized security audit overview for the inbound mail daemon...
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 shrink-0">10:42 AM</span>
          </div>

          {/* Thread Item 2 */}
          <div className="p-4 rounded-xl bg-[#16181D] border border-[#2A2E37] hover:border-[#2D5BFF]/50 flex items-center justify-between gap-4 cursor-pointer transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <button className="text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white truncate">
                    DevOps Engineering
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/10 text-blue-400">
                    CI/CD
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-300 truncate">
                  Valkey Cache & OpenSearch Cluster Scale Out
                </p>
                <p className="text-xs text-slate-500 truncate">
                  Cluster nodes have been scaled horizontally across availability zones...
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 shrink-0">Yesterday</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

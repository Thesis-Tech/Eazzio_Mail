import React from 'react';
import { PrivacyModeBadge } from '../components/PrivacyModeBadge';
import { Inbox, Send, Shield, Search, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-[#2A2E37] bg-[#16181D] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2D5BFF] flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
            E
          </div>
          <span className="text-lg font-semibold tracking-tight">Eazzio Mail</span>
        </div>
        <PrivacyModeBadge tier="standard" />
      </header>

      {/* Hero / Main Console */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-8 flex flex-col justify-center">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Next-Generation <span className="text-[#2D5BFF]">Mail Platform</span>
          </h1>
          <p className="text-[#9AA0AC] text-lg max-w-xl mx-auto">
            High-performance email platform built on Node.js 22 LTS, strict zero-leakage security, custom Argon2id identity, and deterministic spam filtering.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-[#2A2E37] bg-[#16181D] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-[#2D5BFF] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold">Sub-second Speed</h3>
            <p className="text-sm text-[#9AA0AC]">
              OpenSearch accelerated query engine delivering typeahead and full-text search under 400ms.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-[#2A2E37] bg-[#16181D] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold">Strict Security Gate</h3>
            <p className="text-sm text-[#9AA0AC]">
              Automated ClamAV antivirus, SPF/DKIM/DMARC alignment checks, and deterministic decision pipelines.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-[#2A2E37] bg-[#16181D] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-[#FFA43D] flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold">Realtime Mailbox</h3>
            <p className="text-sm text-[#9AA0AC]">
              Multi-channel realtime event streaming, custom tags without message duplication, and thread grouping.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

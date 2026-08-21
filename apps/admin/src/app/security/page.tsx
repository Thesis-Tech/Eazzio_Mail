'use client';

import React, { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Shield, ToggleLeft, ToggleRight, KeyRound, Sparkles } from 'lucide-react';

export default function SecurityPoliciesPage() {
  const [requireMfa, setRequireMfa] = useState(true);
  const [allowAi, setAllowAi] = useState(true);
  const [strictDkim, setStrictDkim] = useState(true);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto" data-testid="admin-security-page">
        <div>
          <h1 className="text-xl font-bold text-white">Organization Security Policies</h1>
          <p className="text-xs text-slate-400 mt-0.5">Enforce tenant-wide authentication, cryptography, and AI data policies.</p>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-[#16181D] border border-[#2A2E37] rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-white">Mandatory Two-Factor Authentication (TOTP)</p>
              <p className="text-[11px] text-slate-400">Require all mailbox owners in organization to configure 2FA.</p>
            </div>
            <button onClick={() => setRequireMfa(!requireMfa)} className="text-slate-400">
              {requireMfa ? <ToggleRight className="w-7 h-7 text-[#2D5BFF]" /> : <ToggleLeft className="w-7 h-7 text-slate-600" />}
            </button>
          </div>

          <div className="p-4 bg-[#16181D] border border-[#2A2E37] rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-white">AI Assistant & Smart Summarization Opt-In</p>
              <p className="text-[11px] text-slate-400">Allow users to utilize LLM summarization on encrypted threads.</p>
            </div>
            <button onClick={() => setAllowAi(!allowAi)} className="text-slate-400">
              {allowAi ? <ToggleRight className="w-7 h-7 text-[#2D5BFF]" /> : <ToggleLeft className="w-7 h-7 text-slate-600" />}
            </button>
          </div>

          <div className="p-4 bg-[#16181D] border border-[#2A2E37] rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-white">Strict Outbound DKIM Key Alignment</p>
              <p className="text-[11px] text-slate-400">Quarantine any message whose envelope sender does not match DKIM d= record.</p>
            </div>
            <button onClick={() => setStrictDkim(!strictDkim)} className="text-slate-400">
              {strictDkim ? <ToggleRight className="w-7 h-7 text-[#2D5BFF]" /> : <ToggleLeft className="w-7 h-7 text-slate-600" />}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

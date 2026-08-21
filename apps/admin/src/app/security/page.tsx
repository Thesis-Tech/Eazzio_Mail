'use client';

import React, { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  Shield,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  KeyRound,
  Sparkles,
  Lock,
  Clock,
  Network,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function SecurityPoliciesPage() {
  const [requireMfa, setRequireMfa] = useState(true);
  const [allowAi, setAllowAi] = useState(true);
  const [strictDkim, setStrictDkim] = useState(true);
  const [spamAction, setSpamAction] = useState('quarantine');
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [ipAllowlist, setIpAllowlist] = useState('192.168.1.0/24, 10.0.0.0/16');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await fetch('/api/security/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requireMfa,
          allowAiSummarization: allowAi,
          strictDkimAlignment: strictDkim,
          spamAction,
          sessionTimeoutMinutes: parseInt(sessionTimeout, 10),
          ipAllowlist,
        }),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch {
      alert('Failed to save security policies.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setRequireMfa(true);
    setAllowAi(true);
    setStrictDkim(true);
    setSpamAction('quarantine');
    setSessionTimeout('30');
    setIpAllowlist('');
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto" data-testid="admin-security-page">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Organization Security & Cryptography Policies</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Enforce tenant-wide authentication, cryptography alignment, AI data privacy, and access boundaries.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 bg-[#1C1F26] border border-[#2A2E37] hover:bg-[#2A2E37] text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleSavePolicies}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2D5BFF] hover:bg-[#1E48E0] text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              data-testid="save-security-policies-btn"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Apply Policies'}</span>
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {saveSuccess && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-400 animate-in fade-in" data-testid="security-success-banner">
            <CheckCircle2 className="w-4 h-4" />
            <span>Organization security policies successfully updated and synchronized across cluster nodes.</span>
          </div>
        )}

        {/* Policy Configuration Cards */}
        <div className="space-y-4">
          {/* 1. Mandatory 2FA */}
          <div className="p-5 bg-[#16181D] border border-[#2A2E37] rounded-2xl flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 mt-0.5">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Mandatory Two-Factor Authentication (TOTP)</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  Require all mailbox owners and administrators in this organization to configure a TOTP authenticator app (e.g. Google Authenticator, 1Password) before accessing mail.
                </p>
              </div>
            </div>
            <button
              onClick={() => setRequireMfa(!requireMfa)}
              className="text-slate-400 focus:outline-none shrink-0"
              data-testid="toggle-mfa"
            >
              {requireMfa ? <ToggleRight className="w-8 h-8 text-[#2D5BFF]" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
            </button>
          </div>

          {/* 2. AI Assistant Opt-in */}
          <div className="p-5 bg-[#16181D] border border-[#2A2E37] rounded-2xl flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">AI Assistant & Smart Summarization</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300">
                    PRIVACY-FIRST
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  Allow organization users to utilize LLM summarization and smart reply generators. Email content is processed through zero-retention ephemeral inference pipelines.
                </p>
              </div>
            </div>
            <button
              onClick={() => setAllowAi(!allowAi)}
              className="text-slate-400 focus:outline-none shrink-0"
              data-testid="toggle-ai"
            >
              {allowAi ? <ToggleRight className="w-8 h-8 text-[#2D5BFF]" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
            </button>
          </div>

          {/* 3. Strict Outbound DKIM Alignment */}
          <div className="p-5 bg-[#16181D] border border-[#2A2E37] rounded-2xl flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Strict Outbound DKIM Key Alignment</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300">
                    ANTI-SPOOF
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  Prevent messages from being dispatched unless the envelope sender domain strictly matches the cryptographic DKIM signing key domain.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStrictDkim(!strictDkim)}
              className="text-slate-400 focus:outline-none shrink-0"
              data-testid="toggle-strict-dkim"
            >
              {strictDkim ? <ToggleRight className="w-8 h-8 text-[#2D5BFF]" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
            </button>
          </div>

          {/* 4. Inbound Spam / Threat Handling */}
          <div className="p-5 bg-[#16181D] border border-[#2A2E37] rounded-2xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Inbound Spam & Threat Action</h3>
                <p className="text-xs text-slate-400">Action taken when incoming mail fails SPF/DKIM or exceeds spam threshold (&gt;5.0 score).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setSpamAction('quarantine')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  spamAction === 'quarantine'
                    ? 'bg-[#2D5BFF]/15 border-[#2D5BFF] text-white'
                    : 'bg-[#121418] border-[#2A2E37] text-slate-400 hover:text-white'
                }`}
                data-testid="spam-opt-quarantine"
              >
                <span className="font-bold block text-white">Quarantine to Spam</span>
                <span className="text-[11px] text-slate-400">Deliver to Spam folder for user review</span>
              </button>

              <button
                type="button"
                onClick={() => setSpamAction('reject')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  spamAction === 'reject'
                    ? 'bg-red-500/15 border-red-500 text-white'
                    : 'bg-[#121418] border-[#2A2E37] text-slate-400 hover:text-white'
                }`}
                data-testid="spam-opt-reject"
              >
                <span className="font-bold block text-white">Reject at SMTP Data</span>
                <span className="text-[11px] text-slate-400">Return 550 5.7.1 rejection banner</span>
              </button>

              <button
                type="button"
                onClick={() => setSpamAction('tag')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  spamAction === 'tag'
                    ? 'bg-amber-500/15 border-amber-500 text-white'
                    : 'bg-[#121418] border-[#2A2E37] text-slate-400 hover:text-white'
                }`}
                data-testid="spam-opt-tag"
              >
                <span className="font-bold block text-white">Tag Subject Header</span>
                <span className="text-[11px] text-slate-400">Prefix subject with [SPAM] in inbox</span>
              </button>
            </div>
          </div>

          {/* 5. Session Timeout & IP Allowlist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Session Timeout */}
            <div className="p-5 bg-[#16181D] border border-[#2A2E37] rounded-2xl space-y-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#2D5BFF]" />
                <h3 className="font-bold text-white">Admin Session Idle Timeout</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Automatically invalidate administrator authentication tokens after specified period of inactivity.
              </p>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full bg-[#121418] border border-[#2A2E37] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#2D5BFF]"
                data-testid="session-timeout-select"
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes (Default)</option>
                <option value="60">1 Hour</option>
                <option value="120">2 Hours</option>
                <option value="720">12 Hours</option>
              </select>
            </div>

            {/* IP Allowlist */}
            <div className="p-5 bg-[#16181D] border border-[#2A2E37] rounded-2xl space-y-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Network className="w-4 h-4 text-[#2D5BFF]" />
                <h3 className="font-bold text-white">Corporate CIDR IP Allowlist</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Comma-separated IP or CIDR subnets allowed to access the admin portal (leave blank for unrestricted).
              </p>
              <input
                type="text"
                value={ipAllowlist}
                onChange={(e) => setIpAllowlist(e.target.value)}
                placeholder="e.g. 192.168.1.0/24, 203.0.113.10"
                className="w-full bg-[#121418] border border-[#2A2E37] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#2D5BFF] font-mono text-[11px]"
                data-testid="ip-allowlist-input"
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

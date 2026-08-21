'use client';

import React, { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { AddDomainModal } from '../../components/domains/AddDomainModal';
import { DnsGuidanceModal } from '../../components/domains/DnsGuidanceModal';
import { ManagedDomain } from '../../types/admin';
import {
  Globe,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  Star,
  Trash2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

const initialDomains: ManagedDomain[] = [
  {
    id: 'dom-1',
    organizationId: 'org-eazzio',
    domainName: 'eazzio.com',
    verificationStatus: 'verified',
    isPrimary: true,
    mxVerified: true,
    spfVerified: true,
    dkimVerified: true,
    dmarcVerified: true,
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'dom-2',
    organizationId: 'org-acme',
    domainName: 'acmecorp.com',
    verificationStatus: 'verified',
    isPrimary: false,
    mxVerified: true,
    spfVerified: true,
    dkimVerified: true,
    dmarcVerified: true,
    createdAt: '2026-08-10T12:30:00Z',
  },
  {
    id: 'dom-3',
    organizationId: 'org-apex',
    domainName: 'apexfintech.io',
    verificationStatus: 'pending',
    isPrimary: false,
    mxVerified: true,
    spfVerified: true,
    dkimVerified: false,
    dmarcVerified: true,
    createdAt: '2026-08-20T08:15:00Z',
  },
];

export default function DomainsPage() {
  const [domains, setDomains] = useState<ManagedDomain[]>(initialDomains);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedGuidanceDomain, setSelectedGuidanceDomain] = useState<ManagedDomain | null>(null);
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleAddDomain = (newDomain: ManagedDomain) => {
    let updated = [...domains];
    if (newDomain.isPrimary) {
      updated = updated.map((d) => ({ ...d, isPrimary: false }));
    }
    setDomains([...updated, newDomain]);
    setSelectedGuidanceDomain(newDomain);
  };

  const handleMakePrimary = (id: string) => {
    setDomains(domains.map((d) => ({ ...d, isPrimary: d.id === id })));
  };

  const handleDeleteDomain = (id: string) => {
    const target = domains.find((d) => d.id === id);
    if (target?.isPrimary) {
      alert('Cannot delete the primary sending domain.');
      return;
    }
    setDomains(domains.filter((d) => d.id !== id));
  };

  const handleVerifyDns = async (domainId: string) => {
    const target = domains.find((d) => d.id === domainId);
    if (!target) return;

    setVerifyingDomainId(domainId);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId: target.id, domainName: target.domainName }),
      });

      const res = await response.json();
      if (res.success && res.data) {
        const result = res.data;
        const updatedDomain: ManagedDomain = {
          ...target,
          mxVerified: result.mxVerified,
          spfVerified: result.spfVerified,
          dkimVerified: result.dkimVerified,
          dmarcVerified: result.dmarcVerified,
          verificationStatus: result.verificationStatus,
        };

        setDomains((prev) => prev.map((d) => (d.id === domainId ? updatedDomain : d)));
        if (selectedGuidanceDomain?.id === domainId) {
          setSelectedGuidanceDomain(updatedDomain);
        }
        setStatusMessage(`DNS 4-check completed for ${target.domainName}: Status is ${result.verificationStatus}.`);
      }
    } catch {
      setStatusMessage(`Failed to verify DNS for ${target.domainName}.`);
    } finally {
      setVerifyingDomainId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto" data-testid="admin-domains-page">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Custom Domain Management</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Verify 4-check DNS records (MX, SPF, DKIM, DMARC) to enable secure outbound and inbound mail routing.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2D5BFF] hover:bg-[#1E48E0] text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all self-start sm:self-auto"
            data-testid="add-domain-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Domain</span>
          </button>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-400 animate-in fade-in" data-testid="status-message-banner">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Managed Domains List */}
        <div className="space-y-4">
          {domains.map((domain) => {
            const isFullyVerified = domain.mxVerified && domain.spfVerified && domain.dkimVerified && domain.dmarcVerified;
            const isChecking = verifyingDomainId === domain.id;

            return (
              <div
                key={domain.id}
                className="p-5 bg-[#16181D] border border-[#2A2E37] rounded-2xl space-y-4 hover:border-[#2A2E37] transition-all"
                data-testid={`domain-card-${domain.id}`}
              >
                {/* Domain Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A2E37]/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2D5BFF]/10 text-[#2D5BFF] flex items-center justify-center font-bold">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-mono">{domain.domainName}</span>
                        {domain.isPrimary && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#2D5BFF]/15 text-[#2D5BFF] border border-[#2D5BFF]/30 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" /> PRIMARY
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">Target MTA: mail.eazzio.com</p>
                    </div>
                  </div>

                  {/* Actions & Global Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                        isFullyVerified
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                      data-testid={`status-badge-${domain.id}`}
                    >
                      {isFullyVerified ? 'Verified & Active' : 'Setup Required'}
                    </span>

                    <button
                      onClick={() => handleVerifyDns(domain.id)}
                      disabled={isChecking}
                      className="p-2 rounded-lg bg-[#1C1F26] border border-[#2A2E37] text-slate-300 hover:text-white hover:border-slate-500 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                      title="Re-check DNS Records"
                      data-testid={`verify-btn-${domain.id}`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-[#2D5BFF]' : ''}`} />
                      <span className="hidden sm:inline">Verify DNS</span>
                    </button>

                    <button
                      onClick={() => setSelectedGuidanceDomain(domain)}
                      className="p-2 rounded-lg bg-[#1C1F26] border border-[#2A2E37] text-slate-300 hover:text-white hover:border-slate-500 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      title="View DNS Records Guidance"
                      data-testid={`guidance-btn-${domain.id}`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-[#2D5BFF]" />
                      <span className="hidden sm:inline">DNS Guidance</span>
                    </button>

                    {!domain.isPrimary && (
                      <button
                        onClick={() => handleMakePrimary(domain.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Make Primary Sending Domain"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}

                    {!domain.isPrimary && (
                      <button
                        onClick={() => handleDeleteDomain(domain.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Domain"
                        data-testid={`delete-domain-${domain.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4-Check Status Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* 1. MX */}
                  <div
                    className={`p-3 rounded-xl border flex flex-col justify-between space-y-1.5 ${
                      domain.mxVerified
                        ? 'bg-[#121418] border-emerald-500/30'
                        : 'bg-[#121418] border-amber-500/30'
                    }`}
                    data-testid={`check-mx-${domain.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-semibold uppercase">MX Record</span>
                      {domain.mxVerified ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <p className={`font-bold font-mono text-[11px] ${domain.mxVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {domain.mxVerified ? '10 mail.eazzio.com' : 'Pending'}
                    </p>
                  </div>

                  {/* 2. SPF */}
                  <div
                    className={`p-3 rounded-xl border flex flex-col justify-between space-y-1.5 ${
                      domain.spfVerified
                        ? 'bg-[#121418] border-emerald-500/30'
                        : 'bg-[#121418] border-amber-500/30'
                    }`}
                    data-testid={`check-spf-${domain.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-semibold uppercase">SPF Record</span>
                      {domain.spfVerified ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <p className={`font-bold font-mono text-[11px] truncate ${domain.spfVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {domain.spfVerified ? 'v=spf1 mx ~all' : 'Missing'}
                    </p>
                  </div>

                  {/* 3. DKIM */}
                  <div
                    className={`p-3 rounded-xl border flex flex-col justify-between space-y-1.5 ${
                      domain.dkimVerified
                        ? 'bg-[#121418] border-emerald-500/30'
                        : 'bg-[#121418] border-amber-500/30'
                    }`}
                    data-testid={`check-dkim-${domain.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-semibold uppercase">DKIM 2048-bit</span>
                      {domain.dkimVerified ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <p className={`font-bold font-mono text-[11px] ${domain.dkimVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {domain.dkimVerified ? 'eazzio._domainkey' : 'Unverified'}
                    </p>
                  </div>

                  {/* 4. DMARC */}
                  <div
                    className={`p-3 rounded-xl border flex flex-col justify-between space-y-1.5 ${
                      domain.dmarcVerified
                        ? 'bg-[#121418] border-emerald-500/30'
                        : 'bg-[#121418] border-amber-500/30'
                    }`}
                    data-testid={`check-dmarc-${domain.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-semibold uppercase">DMARC Policy</span>
                      {domain.dmarcVerified ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <p className={`font-bold font-mono text-[11px] ${domain.dmarcVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {domain.dmarcVerified ? 'p=quarantine' : 'Missing'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Domain Modal */}
        <AddDomainModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddDomain={handleAddDomain}
        />

        {/* DNS Guidance Modal */}
        <DnsGuidanceModal
          domain={selectedGuidanceDomain}
          isOpen={Boolean(selectedGuidanceDomain)}
          onClose={() => setSelectedGuidanceDomain(null)}
          onVerifyDomain={handleVerifyDns}
        />
      </div>
    </AdminLayout>
  );
}

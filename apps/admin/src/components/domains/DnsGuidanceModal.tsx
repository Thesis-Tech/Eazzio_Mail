'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { ManagedDomain } from '../../types/admin';

interface DnsGuidanceModalProps {
  domain: ManagedDomain | null;
  isOpen: boolean;
  onClose: () => void;
  onVerifyDomain: (domainId: string) => Promise<void> | void;
}

export const DnsGuidanceModal: React.FC<DnsGuidanceModalProps> = ({
  domain,
  isOpen,
  onClose,
  onVerifyDomain,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen || !domain) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTriggerVerify = async () => {
    setIsVerifying(true);
    try {
      await onVerifyDomain(domain.id);
    } finally {
      setIsVerifying(false);
    }
  };

  const dnsRecords = [
    {
      key: 'mx',
      title: '1. Inbound Mail Routing (MX Record)',
      type: 'MX',
      host: '@',
      value: '10 mail.eazzio.com',
      priority: '10',
      description: 'Directs incoming email traffic to Eazzio mail receiving daemons.',
      isVerified: domain.mxVerified,
    },
    {
      key: 'spf',
      title: '2. Sender Policy Framework (SPF Record)',
      type: 'TXT',
      host: '@',
      value: 'v=spf1 mx ip4:198.51.100.1 ~all',
      description: 'Authorizes Eazzio outbound mail MTAs to send email on behalf of your domain.',
      isVerified: domain.spfVerified,
    },
    {
      key: 'dkim',
      title: '3. DomainKeys Identified Mail (DKIM 2048-bit Key)',
      type: 'TXT',
      host: 'eazzio._domainkey',
      value: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0s73kEazzioMailDKIMKeySignatureVerified2026',
      description: 'Cryptographically signs outbound emails to guarantee integrity and avoid spam filters.',
      isVerified: domain.dkimVerified,
    },
    {
      key: 'dmarc',
      title: '4. Domain-based Message Authentication (DMARC Policy)',
      type: 'TXT',
      host: '_dmarc',
      value: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${domain.domainName}; pct=100`,
      description: 'Enforces domain reputation policy and instructs recipient servers how to handle spoofing.',
      isVerified: domain.dmarcVerified,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
      data-testid="dns-guidance-modal"
    >
      <div className="bg-[#16181D] border border-[#2A2E37] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-[#2A2E37] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2D5BFF]/15 text-[#2D5BFF] flex items-center justify-center font-bold">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">DNS 4-Check Records Setup</h2>
              <p className="text-[11px] text-slate-400 font-mono">{domain.domainName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white"
            data-testid="close-dns-guidance-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Records Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">
          <div className="p-3 bg-[#121418] border border-[#2A2E37] rounded-xl flex items-start gap-2.5 text-slate-300">
            <HelpCircle className="w-4 h-4 text-[#2D5BFF] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Add the following 4 DNS records in your domain registrar (e.g. Cloudflare, Namecheap, GoDaddy, Route53) to complete domain verification and activate live email sending.
            </p>
          </div>

          <div className="space-y-3">
            {dnsRecords.map((record) => (
              <div
                key={record.key}
                className="p-4 bg-[#121418] border border-[#2A2E37] rounded-xl space-y-2.5"
                data-testid={`dns-record-card-${record.key}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{record.title}</span>
                  {record.isVerified ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> VERIFIED
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> PENDING
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">{record.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                  <div className="p-2 bg-[#1A1D24] border border-[#2A2E37] rounded-lg">
                    <span className="text-[10px] text-slate-500 block uppercase">Type</span>
                    <span className="text-slate-200 font-bold">{record.type}</span>
                  </div>
                  <div className="p-2 bg-[#1A1D24] border border-[#2A2E37] rounded-lg">
                    <span className="text-[10px] text-slate-500 block uppercase">Host / Name</span>
                    <span className="text-slate-200 font-bold">{record.host}</span>
                  </div>
                  <div className="p-2 bg-[#1A1D24] border border-[#2A2E37] rounded-lg sm:col-span-1 flex items-center justify-between">
                    <div className="truncate">
                      <span className="text-[10px] text-slate-500 block uppercase">Value</span>
                      <span className="text-slate-200 truncate">{record.value}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(record.key, record.value)}
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#2A2E37] shrink-0"
                      title="Copy Value"
                      data-testid={`copy-dns-${record.key}`}
                    >
                      {copiedKey === record.key ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-[#2A2E37] flex items-center justify-between bg-[#16181D]">
          <span className="text-xs text-slate-400">DNS changes typically propagate in 1-5 minutes.</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#2A2E37] hover:bg-[#3B4252] text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              disabled={isVerifying}
              onClick={handleTriggerVerify}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2D5BFF] hover:bg-[#1E48E0] text-white rounded-xl text-xs font-semibold shadow-md transition-all disabled:opacity-50"
              data-testid="trigger-verify-dns-btn"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking DNS...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Verify Records Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

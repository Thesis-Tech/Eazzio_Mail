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
  ShieldCheck,
  Zap,
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
  const [preset, setPreset] = useState<'cloudflare_brevo' | 'direct_mta'>('cloudflare_brevo');

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

  const cloudflareBrevoRecords = [
    {
      key: 'mx',
      title: '1. Cloudflare Inbound Email Routing (MX Record)',
      type: 'MX',
      host: '@',
      value: 'isaac.mx.cloudflare.net (Priority 1)\nlinda.mx.cloudflare.net (Priority 5)\namir.mx.cloudflare.net (Priority 10)',
      copyValue: 'isaac.mx.cloudflare.net',
      description: 'Routes incoming public email through Cloudflare Email Routing directly into Eazzio LMTP pipeline.',
      isVerified: domain.mxVerified,
      badge: 'Cloudflare Inbound',
    },
    {
      key: 'spf',
      title: '2. Brevo Sender Policy Framework (SPF Record)',
      type: 'TXT',
      host: '@',
      value: 'v=spf1 include:spf.brevo.com ~all',
      copyValue: 'v=spf1 include:spf.brevo.com ~all',
      description: 'Authorizes Brevo SMTP relays to deliver outbound emails from your domain with zero reputation drops.',
      isVerified: domain.spfVerified,
      badge: 'Brevo Outbound',
    },
    {
      key: 'dkim',
      title: '3. Brevo DomainKeys Identified Mail (DKIM Key)',
      type: 'TXT',
      host: 'mail._domainkey',
      value: 'k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDeMVIigLE3429HKR1AWFeGPGb+KNEtrSjaDAGUMYMmauWHREoPzNwj5VxPGqU2x0dgx0s/NALVKne+BgKT+4YNwvLuGtASboM861CQp6VgEvQI9Hot52CuMOmXYWFnTxvzSmBKRKnMr7lMTXXuHhZkiG/h5Qw7u00+/0ScufDKEQIDAQAB',
      copyValue: 'k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDeMVIigLE3429HKR1AWFeGPGb+KNEtrSjaDAGUMYMmauWHREoPzNwj5VxPGqU2x0dgx0s/NALVKne+BgKT+4YNwvLuGtASboM861CQp6VgEvQI9Hot52CuMOmXYWFnTxvzSmBKRKnMr7lMTXXuHhZkiG/h5Qw7u00+/0ScufDKEQIDAQAB',
      description: 'Cryptographically signs outbound emails using Brevo 2048-bit key for 100% inbox delivery.',
      isVerified: domain.dkimVerified,
      badge: 'Brevo DKIM',
    },
    {
      key: 'dmarc',
      title: '4. Domain-based Message Authentication (DMARC Policy)',
      type: 'TXT',
      host: '_dmarc',
      value: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${domain.domainName}; pct=100`,
      copyValue: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${domain.domainName}; pct=100`,
      description: 'Instructs Gmail, Outlook, and Apple Mail to protect your sender identity and quarantine spoofed emails.',
      isVerified: domain.dmarcVerified,
      badge: 'DMARC Policy',
    },
  ];

  const directMtaRecords = [
    {
      key: 'mx',
      title: '1. Inbound Mail Routing (MX Record)',
      type: 'MX',
      host: '@',
      value: '10 mail.eazzio.com',
      copyValue: 'mail.eazzio.com',
      description: 'Directs incoming email traffic to Eazzio self-hosted mail receiving daemons.',
      isVerified: domain.mxVerified,
      badge: 'Self-Hosted',
    },
    {
      key: 'spf',
      title: '2. Sender Policy Framework (SPF Record)',
      type: 'TXT',
      host: '@',
      value: 'v=spf1 mx ~all',
      copyValue: 'v=spf1 mx ~all',
      description: 'Authorizes Eazzio local MTA to send email on behalf of your domain.',
      isVerified: domain.spfVerified,
      badge: 'Self-Hosted',
    },
    {
      key: 'dkim',
      title: '3. DomainKeys Identified Mail (DKIM 2048-bit Key)',
      type: 'TXT',
      host: 'eazzio._domainkey',
      value: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0s73kEazzioMailDKIMKeySignatureVerified2026',
      copyValue: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0s73kEazzioMailDKIMKeySignatureVerified2026',
      description: 'Cryptographically signs outbound emails using local RSA key.',
      isVerified: domain.dkimVerified,
      badge: 'Self-Hosted',
    },
    {
      key: 'dmarc',
      title: '4. Domain-based Message Authentication (DMARC Policy)',
      type: 'TXT',
      host: '_dmarc',
      value: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${domain.domainName}; pct=100`,
      copyValue: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${domain.domainName}; pct=100`,
      description: 'Enforces domain reputation policy.',
      isVerified: domain.dmarcVerified,
      badge: 'Self-Hosted',
    },
  ];

  const currentRecords = preset === 'cloudflare_brevo' ? cloudflareBrevoRecords : directMtaRecords;

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
              <h2 className="text-sm font-bold text-white">DNS 4-Check Records Auto-Validator</h2>
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

        {/* Preset Selector */}
        <div className="px-6 py-3 bg-[#121418] border-b border-[#2A2E37] flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-400">Architecture Preset:</span>
          <div className="flex items-center gap-1.5 p-1 bg-[#1C1F26] border border-[#2A2E37] rounded-lg">
            <button
              onClick={() => setPreset('cloudflare_brevo')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                preset === 'cloudflare_brevo'
                  ? 'bg-[#2D5BFF] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Cloudflare + Brevo (Recommended)</span>
            </button>
            <button
              onClick={() => setPreset('direct_mta')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                preset === 'direct_mta'
                  ? 'bg-[#2D5BFF] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Direct Self-Hosted MTA</span>
            </button>
          </div>
        </div>

        {/* Records Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">
          <div className="p-3 bg-[#121418] border border-[#2A2E37] rounded-xl flex items-start gap-2.5 text-slate-300">
            <HelpCircle className="w-4 h-4 text-[#2D5BFF] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Add the following 4 DNS records to your DNS provider (e.g. <b>Cloudflare DNS</b>, Namecheap, GoDaddy). Once added, click <b>Run 4-Check Verification</b> below to validate your domain.
            </p>
          </div>

          <div className="space-y-3.5">
            {currentRecords.map((record) => (
              <div
                key={record.key}
                className={`p-4 rounded-xl border transition-all ${
                  record.isVerified
                    ? 'bg-emerald-500/[0.03] border-emerald-500/30'
                    : 'bg-[#1C1F26] border-[#2A2E37]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 text-[12px]">
                      {record.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#121418] border border-[#2A2E37] text-slate-400">
                      {record.badge}
                    </span>
                  </div>
                  {record.isVerified ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Pending DNS
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                  {record.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-[#121418] p-2.5 rounded-lg border border-[#2A2E37] font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-sans">Type</span>
                    <span className="text-slate-200 font-bold">{record.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-sans">Host / Name</span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200 truncate">{record.host}</span>
                      <button
                        onClick={() => handleCopy(`${record.key}-host`, record.host)}
                        className="text-slate-400 hover:text-white p-0.5"
                        title="Copy Host"
                      >
                        {copiedKey === `${record.key}-host` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-slate-500 block text-[10px] uppercase font-sans">Value / Target</span>
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-slate-200 break-all leading-tight">
                        {record.value}
                      </span>
                      <button
                        onClick={() => handleCopy(`${record.key}-val`, record.copyValue || record.value)}
                        className="text-slate-400 hover:text-white p-0.5 shrink-0 ml-1"
                        title="Copy Value"
                      >
                        {copiedKey === `${record.key}-val` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-[#2A2E37] bg-[#121418] flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {domain.verificationStatus === 'verified' ? (
              <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Domain 100% Verified & Active
              </span>
            ) : (
              <span>DNS changes can take 1–5 minutes to propagate.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white border border-[#2A2E37] hover:bg-[#1C1F26] transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleTriggerVerify}
              disabled={isVerifying}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2D5BFF] hover:bg-[#2048DE] text-white transition-all flex items-center gap-1.5 shadow-lg shadow-[#2D5BFF]/20 disabled:opacity-50"
              data-testid="trigger-domain-verify-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Checking DNS...' : 'Run 4-Check Verification'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

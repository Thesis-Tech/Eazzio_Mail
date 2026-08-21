'use client';

import React, { useState } from 'react';
import { X, Globe, Plus, AlertCircle } from 'lucide-react';
import { ManagedDomain } from '../../types/admin';

interface AddDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDomain: (domain: ManagedDomain) => void;
}

export const AddDomainModal: React.FC<AddDomainModalProps> = ({
  isOpen,
  onClose,
  onAddDomain,
}) => {
  const [domainName, setDomainName] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanDomain = domainName.trim().toLowerCase();
    const domainRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

    if (!cleanDomain || !domainRegex.test(cleanDomain)) {
      setErrorMessage('Please enter a valid domain name (e.g. company.com)');
      return;
    }

    const newDomain: ManagedDomain = {
      id: `dom-${Date.now()}`,
      organizationId: 'org-current',
      domainName: cleanDomain,
      verificationStatus: 'pending',
      isPrimary,
      mxVerified: false,
      spfVerified: false,
      dkimVerified: false,
      dmarcVerified: false,
      createdAt: new Date().toISOString(),
    };

    onAddDomain(newDomain);
    setDomainName('');
    setIsPrimary(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
      data-testid="add-domain-modal"
    >
      <div className="bg-[#16181D] border border-[#2A2E37] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 px-6 border-b border-[#2A2E37] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-white font-bold text-base">
            <Globe className="w-5 h-5 text-[#2D5BFF]" />
            <span>Add Custom Domain</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white"
            data-testid="close-add-domain-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="text-slate-400 font-semibold mb-1 block">Domain Name</label>
            <input
              type="text"
              placeholder="e.g. acmecorp.com"
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              className="w-full bg-[#121418] border border-[#2A2E37] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#2D5BFF]"
              data-testid="domain-name-input"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded bg-[#121418] border-[#2A2E37] text-[#2D5BFF] focus:ring-0"
              data-testid="domain-primary-checkbox"
            />
            <label htmlFor="isPrimary" className="text-slate-300 select-none cursor-pointer">
              Set as primary sending domain for this organization
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#2A2E37]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#2A2E37] hover:bg-[#3B4252] text-white rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2D5BFF] hover:bg-[#1E48E0] text-white rounded-xl font-semibold shadow-md transition-all"
              data-testid="submit-add-domain"
            >
              <Plus className="w-4 h-4" />
              <span>Add Domain</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

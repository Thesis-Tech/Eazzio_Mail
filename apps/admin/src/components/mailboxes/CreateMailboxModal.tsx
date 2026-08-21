'use client';

import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, HardDrive, Shield } from 'lucide-react';
import { AdminMailbox } from '../../types/admin';

interface CreateMailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDomains: string[];
  onCreateMailbox: (mailbox: AdminMailbox) => void;
}

export const CreateMailboxModal: React.FC<CreateMailboxModalProps> = ({
  isOpen,
  onClose,
  availableDomains,
  onCreateMailbox,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [localPart, setLocalPart] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(availableDomains[0] || 'eazzio.com');
  const [department, setDepartment] = useState('Engineering');
  const [quotaGB, setQuotaGB] = useState('5');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanLocal = localPart.trim().toLowerCase();
    const cleanName = displayName.trim();

    if (!cleanName) {
      setErrorMessage('Please enter user full name');
      return;
    }

    if (!cleanLocal || !/^[a-z0-9._-]+$/.test(cleanLocal)) {
      setErrorMessage('Please enter a valid mailbox username (lowercase letters, numbers, dot, dash)');
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    const quotaNumGB = parseFloat(quotaGB) || 5;
    const quotaBytes = quotaNumGB * 1024 * 1024 * 1024;
    const fullAddress = `${cleanLocal}@${selectedDomain}`;

    const newMailbox: AdminMailbox = {
      id: `mbx-${Date.now()}`,
      userId: `usr-${Date.now()}`,
      displayName: cleanName,
      address: fullAddress,
      domain: selectedDomain,
      department,
      quotaBytes,
      usedBytes: 0,
      status: 'active',
      isMfaEnabled: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: 'Never',
    };

    onCreateMailbox(newMailbox);
    setDisplayName('');
    setLocalPart('');
    setPassword('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
      data-testid="create-mailbox-modal"
    >
      <div className="bg-[#16181D] border border-[#2A2E37] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 px-6 border-b border-[#2A2E37] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-white font-bold text-base">
            <UserPlus className="w-5 h-5 text-[#2D5BFF]" />
            <span>Provision User Mailbox</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white"
            data-testid="close-create-mailbox-modal"
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
            <label className="text-slate-400 font-semibold mb-1 block">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Alex Henderson"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#121418] border border-[#2A2E37] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#2D5BFF]"
              data-testid="mailbox-name-input"
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold mb-1 block">Mailbox Address</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="alex"
                value={localPart}
                onChange={(e) => setLocalPart(e.target.value)}
                className="flex-1 bg-[#121418] border border-[#2A2E37] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#2D5BFF] font-mono"
                data-testid="mailbox-username-input"
              />
              <span className="text-slate-400 font-bold">@</span>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-48 bg-[#121418] border border-[#2A2E37] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#2D5BFF] font-mono"
                data-testid="mailbox-domain-select"
              >
                {availableDomains.map((dom) => (
                  <option key={dom} value={dom}>
                    {dom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold mb-1 block">Department / Role</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-[#121418] border border-[#2A2E37] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#2D5BFF]"
                data-testid="mailbox-department-select"
              >
                <option value="Engineering">Engineering</option>
                <option value="Leadership">Leadership</option>
                <option value="Operations">Operations</option>
                <option value="Finance">Finance</option>
                <option value="Marketing">Marketing</option>
                <option value="Support">Support</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold mb-1 block">Storage Quota Limit</label>
              <select
                value={quotaGB}
                onChange={(e) => setQuotaGB(e.target.value)}
                className="w-full bg-[#121418] border border-[#2A2E37] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#2D5BFF]"
                data-testid="mailbox-quota-select"
              >
                <option value="2">2 GB (Lite)</option>
                <option value="5">5 GB (Standard)</option>
                <option value="15">15 GB (Pro)</option>
                <option value="50">50 GB (Executive)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-semibold mb-1 block">Initial Temporary Password</label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#121418] border border-[#2A2E37] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#2D5BFF]"
              data-testid="mailbox-password-input"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">User will be prompted to reset upon first login.</span>
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
              data-testid="submit-create-mailbox"
            >
              <UserPlus className="w-4 h-4" />
              <span>Provision Mailbox</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

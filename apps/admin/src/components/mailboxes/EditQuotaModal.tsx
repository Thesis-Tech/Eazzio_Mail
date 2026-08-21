'use client';

import React, { useState, useEffect } from 'react';
import { X, HardDrive, Shield, AlertCircle, Check } from 'lucide-react';
import { AdminMailbox } from '../../types/admin';

interface EditQuotaModalProps {
  mailbox: AdminMailbox | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateMailbox: (updated: AdminMailbox) => void;
}

export const EditQuotaModal: React.FC<EditQuotaModalProps> = ({
  mailbox,
  isOpen,
  onClose,
  onUpdateMailbox,
}) => {
  const [quotaGB, setQuotaGB] = useState('5');
  const [status, setStatus] = useState<'active' | 'suspended' | 'disabled'>('active');
  const [department, setDepartment] = useState('Engineering');

  useEffect(() => {
    if (mailbox) {
      const gb = (mailbox.quotaBytes / (1024 * 1024 * 1024)).toFixed(0);
      setQuotaGB(gb);
      setStatus(mailbox.status);
      setDepartment(mailbox.department || 'Engineering');
    }
  }, [mailbox]);

  if (!isOpen || !mailbox) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const quotaNumGB = parseFloat(quotaGB) || 5;
    const newQuotaBytes = quotaNumGB * 1024 * 1024 * 1024;

    const updated: AdminMailbox = {
      ...mailbox,
      quotaBytes: newQuotaBytes,
      status,
      department,
    };

    onUpdateMailbox(updated);
    onClose();
  };

  const usedMB = (mailbox.usedBytes / (1024 * 1024)).toFixed(1);
  const quotaMB = (mailbox.quotaBytes / (1024 * 1024)).toFixed(0);
  const usagePercent = Math.min(100, Math.round((mailbox.usedBytes / mailbox.quotaBytes) * 100)) || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
      data-testid="edit-quota-modal"
    >
      <div className="bg-[#16181D] border border-[#2A2E37] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 px-6 border-b border-[#2A2E37] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-white font-bold text-base">
            <HardDrive className="w-5 h-5 text-[#2D5BFF]" />
            <span>Edit Mailbox & Storage Quota</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white"
            data-testid="close-edit-quota-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* User Info Header */}
          <div className="p-3 bg-[#121418] border border-[#2A2E37] rounded-xl space-y-1">
            <p className="font-bold text-white text-sm">{mailbox.displayName}</p>
            <p className="text-slate-400 font-mono text-[11px]">{mailbox.address}</p>
          </div>

          {/* Current Usage Gauge */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Storage Used: {usedMB} MB / {quotaMB} MB</span>
              <span className="font-bold text-white">{usagePercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#121418] overflow-hidden border border-[#2A2E37]">
              <div
                className={`h-full transition-all duration-300 ${
                  usagePercent > 85 ? 'bg-red-500' : usagePercent > 60 ? 'bg-amber-500' : 'bg-[#2D5BFF]'
                }`}
                style={{ width: `${Math.max(4, usagePercent)}%` }}
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-semibold mb-1 block">Assigned Storage Quota</label>
            <select
              value={quotaGB}
              onChange={(e) => setQuotaGB(e.target.value)}
              className="w-full bg-[#121418] border border-[#2A2E37] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#2D5BFF]"
              data-testid="edit-quota-select"
            >
              <option value="2">2 GB (Lite)</option>
              <option value="5">5 GB (Standard)</option>
              <option value="15">15 GB (Pro)</option>
              <option value="25">25 GB (Executive)</option>
              <option value="50">50 GB (Enterprise)</option>
              <option value="100">100 GB (Archive)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-semibold mb-1 block">Account Access Status</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`py-2 rounded-xl font-semibold border transition-all ${
                  status === 'active'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-[#121418] border-[#2A2E37] text-slate-400 hover:text-white'
                }`}
                data-testid="status-opt-active"
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatus('suspended')}
                className={`py-2 rounded-xl font-semibold border transition-all ${
                  status === 'suspended'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-[#121418] border-[#2A2E37] text-slate-400 hover:text-white'
                }`}
                data-testid="status-opt-suspended"
              >
                Suspended
              </button>
              <button
                type="button"
                onClick={() => setStatus('disabled')}
                className={`py-2 rounded-xl font-semibold border transition-all ${
                  status === 'disabled'
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-[#121418] border-[#2A2E37] text-slate-400 hover:text-white'
                }`}
                data-testid="status-opt-disabled"
              >
                Disabled
              </button>
            </div>
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
              data-testid="submit-update-quota"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

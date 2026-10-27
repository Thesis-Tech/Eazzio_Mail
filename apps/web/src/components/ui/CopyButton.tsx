'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  onCopySuccess?: () => void;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label,
  className = '',
  onCopySuccess,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-https / testing environments
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      setCopied(true);
      if (onCopySuccess) onCopySuccess();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label || 'Copy to clipboard'}
      title={copied ? 'Copied!' : label || 'Copy to clipboard'}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[#E2E8F0] dark:border-[#2A2E37] bg-white dark:bg-[#16181D] hover:bg-[#F8FAFC] dark:hover:bg-[#20232B] text-xs font-medium text-[#475569] dark:text-[#CBD5E1] transition-all shadow-sm ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-[#14B8A6]" />
          <span className="text-[#14B8A6] font-semibold">{label ? 'Copied' : ''}</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
};

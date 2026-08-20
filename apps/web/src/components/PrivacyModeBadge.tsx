import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { getPrivacyModeLabel, PrivacyTier } from '@eazzio/ui-kit';

interface PrivacyModeBadgeProps {
  tier?: PrivacyTier;
  mode?: PrivacyTier;
}

export function PrivacyModeBadge({ tier, mode = 'standard' }: PrivacyModeBadgeProps) {
  const selectedTier = tier ?? mode;
  const label = getPrivacyModeLabel(selectedTier);

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <ShieldCheck className="w-3.5 h-3.5" />
      <span>{label}</span>
    </div>
  );
}

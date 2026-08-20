// Binding privacy tier copy rules (DECISIONS.md D-011, DESIGN.md Section 6.5)
export type PrivacyTier = 'standard' | 'enhanced' | 'e2ee';

export const PRIVACY_TIER_LABELS: Record<PrivacyTier, string> = {
  standard: 'Standard encryption',
  enhanced: 'Enhanced privacy — reduced server processing',
  e2ee: 'End-to-end encrypted'
} as const;

export function getPrivacyModeLabel(tier: PrivacyTier): string {
  return PRIVACY_TIER_LABELS[tier];
}

import { describe, it, expect } from 'vitest';
import { getPrivacyModeLabel, PRIVACY_TIER_LABELS } from '../src/components/privacy-mode-badge.js';

describe('Privacy Mode Badge Copy Compliance (DESIGN.md Section 6.5)', () => {
  it('should return exact immutable copy for standard encryption', () => {
    expect(getPrivacyModeLabel('standard')).toBe('Standard encryption');
  });

  it('should return exact immutable copy for enhanced privacy', () => {
    expect(getPrivacyModeLabel('enhanced')).toBe('Enhanced privacy — reduced server processing');
  });

  it('should return exact immutable copy for e2ee', () => {
    expect(getPrivacyModeLabel('e2ee')).toBe('End-to-end encrypted');
  });
});

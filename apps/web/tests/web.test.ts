import { describe, it, expect } from 'vitest';
import { getPrivacyModeLabel } from '@eazzio/ui-kit';

describe('Web App Core Components', () => {
  it('should format privacy badge copy consistently with UI tokens', () => {
    expect(getPrivacyModeLabel('standard')).toBe('Standard encryption');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InboundProviderFactory } from '../../src/provider/provider-factory.js';
import { GoDaddyImapProvider } from '../../src/provider/godaddy-imap-provider.js';
import { GenericImapProvider } from '../../src/provider/generic-imap-provider.js';

describe('InboundProviderFactory & GenericImapProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('defaults to GoDaddyImapProvider when INBOUND_MAIL_PROVIDER is unset', () => {
    delete process.env.INBOUND_MAIL_PROVIDER;
    const provider = InboundProviderFactory.createProvider();
    expect(provider).toBeInstanceOf(GoDaddyImapProvider);
    expect(provider.providerName).toBe('godaddy');
  });

  it('defaults to GoDaddyImapProvider when INBOUND_MAIL_PROVIDER is unknown', () => {
    process.env.INBOUND_MAIL_PROVIDER = 'unknown-inbound';
    const provider = InboundProviderFactory.createProvider();
    expect(provider).toBeInstanceOf(GoDaddyImapProvider);
    expect(provider.providerName).toBe('godaddy');
  });

  it('creates GenericImapProvider when INBOUND_MAIL_PROVIDER="generic-imap"', () => {
    process.env.INBOUND_MAIL_PROVIDER = 'generic-imap';
    const provider = InboundProviderFactory.createProvider();
    expect(provider).toBeInstanceOf(GenericImapProvider);
    expect(provider.providerName).toBe('generic-imap');
  });

  it('returns CREDENTIALS_MISSING when tested without credentials', async () => {
    const provider = new GenericImapProvider({
      user: '',
      pass: '',
      host: 'mail.custom-test.com',
    });

    const res = await provider.testConnection();
    expect(res.success).toBe(false);
    expect(res.error).toBe('CREDENTIALS_MISSING');
  });
});

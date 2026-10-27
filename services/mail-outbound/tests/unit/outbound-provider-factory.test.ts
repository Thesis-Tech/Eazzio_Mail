import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nodemailer from 'nodemailer';
import { OutboundProviderFactory } from '../../src/provider/outbound-provider-factory.js';
import { PostfixOutboundProvider } from '../../src/provider/postfix-outbound-provider.js';
import { MailerSendOutboundProvider } from '../../src/provider/mailersend-outbound-provider.js';
import { GoDaddySmtpOutboundProvider } from '../../src/provider/godaddy-smtp-outbound-provider.js';

describe('OutboundProviderFactory & GoDaddySmtpOutboundProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('defaults to PostfixOutboundProvider when OUTBOUND_MAIL_PROVIDER is unset', () => {
    delete process.env.OUTBOUND_MAIL_PROVIDER;
    const provider = OutboundProviderFactory.createProvider();
    expect(provider).toBeInstanceOf(PostfixOutboundProvider);
    expect(provider.providerName).toBe('postfix');
  });

  it('defaults to PostfixOutboundProvider when OUTBOUND_MAIL_PROVIDER is invalid', () => {
    process.env.OUTBOUND_MAIL_PROVIDER = 'unknown-transport';
    const provider = OutboundProviderFactory.createProvider();
    expect(provider).toBeInstanceOf(PostfixOutboundProvider);
    expect(provider.providerName).toBe('postfix');
  });

  it('creates MailerSendOutboundProvider when OUTBOUND_MAIL_PROVIDER="mailersend"', () => {
    process.env.OUTBOUND_MAIL_PROVIDER = 'mailersend';
    const provider = OutboundProviderFactory.createProvider();
    expect(provider).toBeInstanceOf(MailerSendOutboundProvider);
    expect(provider.providerName).toBe('mailersend');
  });

  it('creates GoDaddySmtpOutboundProvider when OUTBOUND_MAIL_PROVIDER="godaddy-smtp"', () => {
    process.env.OUTBOUND_MAIL_PROVIDER = 'godaddy-smtp';
    const provider = OutboundProviderFactory.createProvider();
    expect(provider).toBeInstanceOf(GoDaddySmtpOutboundProvider);
    expect(provider.providerName).toBe('godaddy-smtp');
  });

  it('configures GoDaddy Legacy/Titan SMTP parameters correctly', () => {
    process.env.GODADDY_SMTP_HOST = 'smtpout.secureserver.net';
    process.env.GODADDY_SMTP_PORT = '465';
    process.env.GODADDY_SMTP_SECURE = 'true';
    process.env.GODADDY_SMTP_USERNAME = 'user@eazzio.com';
    process.env.GODADDY_SMTP_PASSWORD = 'password123';

    const provider = new GoDaddySmtpOutboundProvider();
    expect(provider.config.host).toBe('smtpout.secureserver.net');
    expect(provider.config.port).toBe(465);
    expect(provider.config.secure).toBe(true);
    expect(provider.config.user).toBe('user@eazzio.com');
    expect(provider.config.pass).toBe('password123');
  });

  it('configures Microsoft 365 parameters correctly (port 587, STARTTLS)', () => {
    process.env.GODADDY_SMTP_HOST = 'smtp.office365.com';
    process.env.GODADDY_SMTP_PORT = '587';
    process.env.GODADDY_SMTP_SECURE = 'false';
    process.env.INBOUND_MAIL_USERNAME = 'm365@eazzio.com';
    process.env.INBOUND_MAIL_PASSWORD = 'm365password';

    const provider = new GoDaddySmtpOutboundProvider();
    expect(provider.config.host).toBe('smtp.office365.com');
    expect(provider.config.port).toBe(587);
    expect(provider.config.secure).toBe(false);
    expect(provider.config.user).toBe('m365@eazzio.com');
    expect(provider.config.pass).toBe('m365password');
  });

  it('sends email successfully using mocked nodemailer transport', async () => {
    const mockSendMail = vi.fn().mockResolvedValue({
      messageId: '<godaddy-12345@eazzio.com>',
      response: '250 OK message accepted for delivery',
    });

    const createTransportSpy = vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: mockSendMail,
    } as any);

    const provider = new GoDaddySmtpOutboundProvider({
      host: 'smtpout.secureserver.net',
      port: 465,
      secure: true,
      user: 'test@eazzio.com',
      pass: 'secret',
    });

    const result = await provider.send({
      messageId: 'msg-godaddy-1',
      fromAddress: 'test@eazzio.com',
      recipientAddress: 'external@gmail.com',
      rawMime: Buffer.from(
        'From: test@eazzio.com\r\nTo: external@gmail.com\r\nSubject: Hi\r\n\r\nHello',
      ),
    });

    expect(result.success).toBe(true);
    expect(result.queueId).toBe('<godaddy-12345@eazzio.com>');
    expect(createTransportSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtpout.secureserver.net',
        port: 465,
        secure: true,
        auth: {
          user: 'test@eazzio.com',
          pass: 'secret',
        },
      }),
    );
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});

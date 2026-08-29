import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { EazzioEmailTransport } from './interface.js';

function ensureEnvLoaded() {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/web/.env.local'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env'),
  ];
  // Collect all key-value pairs; last non-empty value wins for duplicates
  const collected = new Map<string, string>();
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (val) {
              collected.set(key, val);
            }
          }
        }
      } catch {}
    }
  }
  for (const [key, val] of collected) {
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}
ensureEnvLoaded();


export interface SmtpRelayConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  fromEmail?: string;
  fromName?: string;
  heloHostname?: string;
  timeoutMs?: number;
  provider?: 'custom' | 'brevo' | 'resend' | 'mailgun' | 'ses' | 'smtp2go' | 'godaddy' | 'gmail';
}

export interface NormalizedSmtpError extends Error {
  code?: string;
  smtpCode?: string;
  isTransient: boolean;
  isAuthFailure: boolean;
  isRecipientRejected: boolean;
}

export class SmtpAuthenticatedTransport implements EazzioEmailTransport {
  private readonly config: Required<Omit<SmtpRelayConfig, 'user' | 'pass' | 'fromEmail' | 'fromName'>> & {
    user?: string;
    pass?: string;
    fromEmail?: string;
    fromName?: string;
  };
  private transporter: Transporter | null = null;

  constructor(config?: SmtpRelayConfig) {
    const provider = config?.provider || (process.env.MAIL_RELAY_PROVIDER as SmtpRelayConfig['provider']) || 'custom';
    const presets = SmtpAuthenticatedTransport.getProviderPresets(provider);

    const host =
      config?.host ||
      process.env.SMTP_HOST ||
      process.env.SMTP_AUTH_HOST ||
      presets.host ||
      'smtpout.secureserver.net';

    const port =
      config?.port ||
      (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined) ||
      (process.env.SMTP_AUTH_PORT ? Number(process.env.SMTP_AUTH_PORT) : undefined) ||
      presets.port ||
      587;

    const secure =
      config?.secure ??
      (process.env.SMTP_SECURE === 'true' ||
        process.env.SMTP_AUTH_SECURE === 'true' ||
        presets.secure ||
        port === 465);

    const user =
      config?.user ||
      process.env.SMTP_USERNAME ||
      process.env.SMTP_USER ||
      process.env.SMTP_AUTH_USER;

    const pass =
      config?.pass ||
      process.env.SMTP_PASSWORD ||
      process.env.SMTP_PASS ||
      process.env.SMTP_AUTH_PASS;

    const fromEmail =
      config?.fromEmail ||
      process.env.SMTP_FROM_EMAIL ||
      user ||
      'rahulkumar@eazzio.com';

    const fromName =
      config?.fromName ||
      process.env.SMTP_FROM_NAME ||
      'Eazzio Mail';

    const heloHostname =
      config?.heloHostname ||
      process.env.SMTP_HELO_NAME ||
      'mail.eazzio.com';

    const timeoutMs =
      config?.timeoutMs ||
      (process.env.SMTP_TIMEOUT_MS ? Number(process.env.SMTP_TIMEOUT_MS) : 25000);

    this.config = {
      provider,
      host,
      port,
      secure,
      user,
      pass,
      fromEmail,
      fromName,
      heloHostname,
      timeoutMs,
    };
  }

  public static getProviderPresets(provider?: string): Partial<SmtpRelayConfig> {
    switch (provider?.toLowerCase()) {
      case 'brevo':
        return { host: 'smtp-relay.brevo.com', port: 587, secure: false };
      case 'resend':
        return { host: 'smtp.resend.com', port: 465, secure: true };
      case 'smtp2go':
        return { host: 'mail.smtp2go.com', port: 587, secure: false };
      case 'mailgun':
        return { host: 'smtp.mailgun.org', port: 587, secure: false };
      case 'ses':
        return { host: process.env.AWS_SES_HOST || 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: false };
      case 'godaddy':
        return { host: 'smtpout.secureserver.net', port: 587, secure: false };
      case 'gmail':
        return { host: 'smtp.gmail.com', port: 587, secure: false };
      default:
        return {};
    }
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const auth =
        this.config.user && this.config.pass
          ? {
              user: this.config.user,
              pass: this.config.pass,
            }
          : undefined;

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth,
        name: this.config.heloHostname,
        connectionTimeout: this.config.timeoutMs,
        greetingTimeout: this.config.timeoutMs,
        socketTimeout: this.config.timeoutMs,
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production' && process.env.SMTP_IGNORE_TLS_ERRORS !== 'true',
        },
      });
    }
    return this.transporter;
  }

  public async verifyConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      return { ok: true };
    } catch (err: any) {
      const normalized = this.normalizeError(err);
      return { ok: false, error: normalized.message };
    }
  }

  public async submitOutbound(
    rawMime: Buffer,
    envelopeFrom: string,
    envelopeTo: string[],
  ): Promise<{ queueId: string }> {
    if (!envelopeTo || envelopeTo.length === 0) {
      throw new Error('No recipient addresses specified for outbound relay delivery');
    }

    const queueId = crypto.randomUUID();
    const effectiveFrom =
      process.env.SMTP_FROM_EMAIL ||
      this.config.fromEmail ||
      (envelopeFrom && !envelopeFrom.includes('@eazzio.com') ? envelopeFrom : 'kumarrahulraj468@gmail.com');

    try {
      const transporter = this.getTransporter();

      // Submit raw RFC 5322 MIME stream with authenticated envelope
      const info = await transporter.sendMail({
        envelope: {
          from: effectiveFrom,
          to: envelopeTo,
        },
        raw: rawMime,
      });

      return { queueId: info.messageId || queueId };
    } catch (err: any) {
      throw this.normalizeError(err);
    }
  }

  public async getDeliveryStatus(queueId: string): Promise<{ state: string; detail?: string }> {
    return {
      state: 'accepted_by_relay',
      detail: `Successfully accepted by upstream relay ${this.config.host}:${this.config.port} (ID: ${queueId})`,
    };
  }

  public getConfigSummary(): Record<string, any> {
    return {
      provider: this.config.provider,
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      hasAuth: Boolean(this.config.user && this.config.pass),
      authUser: this.config.user ? `${this.config.user.slice(0, 3)}***@***` : 'None',
      fromEmail: this.config.fromEmail,
      fromName: this.config.fromName,
    };
  }

  private normalizeError(err: any): NormalizedSmtpError {
    const message = err?.message || 'Unknown SMTP Relay error';
    const code = err?.code || 'ESMTP';
    const response = err?.response || '';
    const responseCode = err?.responseCode ? String(err.responseCode) : '';

    const isAuthFailure =
      code === 'EAUTH' ||
      responseCode === '535' ||
      responseCode === '534' ||
      /auth|credentials|password/i.test(message);

    const isRecipientRejected =
      code === 'EENVELOPE' ||
      responseCode === '550' ||
      responseCode === '551' ||
      responseCode === '553' ||
      /recipient|not authorized|user unknown|mailbox not found/i.test(response || message);

    const isTransient =
      code === 'ETIMEDOUT' ||
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'ESOCKET' ||
      responseCode.startsWith('4');

    const normalized = new Error(
      `[SMTP Relay Error ${code}${responseCode ? `:${responseCode}` : ''}] ${response || message}`
    ) as NormalizedSmtpError;

    normalized.code = code;
    normalized.smtpCode = responseCode || code;
    normalized.isTransient = isTransient;
    normalized.isAuthFailure = isAuthFailure;
    normalized.isRecipientRejected = isRecipientRejected;

    return normalized;
  }
}

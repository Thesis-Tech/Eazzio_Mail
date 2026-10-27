import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  OutboundMailProvider,
  OutboundMessagePayload,
  OutboundSendResult,
} from './outbound-provider.interface.js';

export interface GoDaddySmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  connectionTimeout?: number;
}

/**
 * GoDaddy SMTP Outbound Provider.
 * Sends outbound emails directly through GoDaddy's authenticated SMTP submission server
 * (smtpout.secureserver.net:465 SSL, or smtp.office365.com:587 STARTTLS for M365).
 * Because this uses GoDaddy's own authenticated relay, SPF/DKIM configured by GoDaddy
 * for eazzio.com will pass verification at recipient MTAs.
 */
export class GoDaddySmtpOutboundProvider implements OutboundMailProvider {
  public readonly providerName = 'godaddy-smtp';
  public readonly config: Required<GoDaddySmtpConfig>;
  private transporter: Transporter | null = null;

  constructor(config?: GoDaddySmtpConfig) {
    const host =
      config?.host ||
      process.env.GODADDY_SMTP_HOST ||
      process.env.SMTP_HOST ||
      'smtpout.secureserver.net';

    const port =
      config?.port ||
      Number(
        process.env.GODADDY_SMTP_PORT ||
          process.env.SMTP_PORT ||
          (host.includes('office365') ? 587 : 465),
      );

    const secure =
      config?.secure ??
      (process.env.GODADDY_SMTP_SECURE !== undefined
        ? process.env.GODADDY_SMTP_SECURE === 'true'
        : port === 465);

    const user =
      config?.user ||
      process.env.GODADDY_SMTP_USERNAME ||
      process.env.GODADDY_SMTP_USER ||
      process.env.INBOUND_MAIL_USERNAME ||
      process.env.INBOUND_MAIL_USER ||
      process.env.IMAP_USERNAME ||
      process.env.SMTP_USER ||
      '';

    const pass =
      config?.pass ||
      process.env.GODADDY_SMTP_PASSWORD ||
      process.env.GODADDY_SMTP_PASS ||
      process.env.INBOUND_MAIL_PASSWORD ||
      process.env.INBOUND_MAIL_PASS ||
      process.env.IMAP_PASSWORD ||
      process.env.SMTP_PASS ||
      '';

    const connectionTimeout =
      config?.connectionTimeout || Number(process.env.GODADDY_SMTP_TIMEOUT_MS || 20000);

    this.config = {
      host,
      port,
      secure,
      user,
      pass,
      connectionTimeout,
    };
  }

  public getTransporter(): Transporter {
    if (!this.transporter) {
      if (!this.config.user || !this.config.pass) {
        throw new Error(
          'GoDaddy SMTP credentials missing: GODADDY_SMTP_USERNAME and GODADDY_SMTP_PASSWORD (or INBOUND_MAIL_USERNAME/PASSWORD) are required.',
        );
      }

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
        connectionTimeout: this.config.connectionTimeout,
        tls: {
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2',
        },
      });
    }
    return this.transporter;
  }

  public async send(message: OutboundMessagePayload): Promise<OutboundSendResult> {
    if (!this.config.user || !this.config.pass) {
      return {
        success: false,
        messageId: message.messageId,
        error:
          'GoDaddy SMTP credentials missing: please set GODADDY_SMTP_USERNAME and GODADDY_SMTP_PASSWORD in .env',
        smtpCode: 'CONFIG_ERROR',
      };
    }

    try {
      const transporter = this.getTransporter();

      const info = await transporter.sendMail({
        envelope: {
          from: message.fromAddress,
          to: [message.recipientAddress],
        },
        raw: message.rawMime,
      });

      return {
        success: true,
        messageId: message.messageId,
        queueId: info.messageId || String(info.response || 'godaddy-relayed'),
      };
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || 'GoDaddy SMTP relay error';
      return {
        success: false,
        messageId: message.messageId,
        error: errorMsg,
        smtpCode: (err as { responseCode?: number }).responseCode
          ? String((err as { responseCode?: number }).responseCode)
          : 'SMTP_RELAY_ERROR',
      };
    }
  }
}

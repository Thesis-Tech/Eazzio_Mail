import { SmtpSubmissionTransport, SmtpSubmissionConfig } from './smtp-submission-adapter.js';

export class SmtpAuthenticatedTransport extends SmtpSubmissionTransport {
  constructor(config?: Partial<SmtpSubmissionConfig>) {
    super({
      host: config?.host || process.env.SMTP_AUTH_HOST || 'smtp.gmail.com',
      port: config?.port || (process.env.SMTP_AUTH_PORT ? Number(process.env.SMTP_AUTH_PORT) : 587),
      secure: config?.secure ?? (process.env.SMTP_AUTH_SECURE === 'true'),
      user: config?.user || process.env.SMTP_AUTH_USER,
      pass: config?.pass || process.env.SMTP_AUTH_PASS,
      heloHostname: config?.heloHostname || process.env.SMTP_HELO_NAME || 'mail.eazzio.com',
      timeoutMs: config?.timeoutMs || 20000,
    });
  }
}

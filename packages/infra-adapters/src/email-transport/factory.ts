import { EazzioEmailTransport } from './interface.js';
import { DirectMtaEmailTransport } from './direct-mta-adapter.js';
import { SmtpSubmissionTransport } from './smtp-submission-adapter.js';
import { LocalTestTransport } from './local-test-adapter.js';

import { SmtpAuthenticatedTransport } from './smtp-authenticated-adapter.js';

export type TransportType = 'direct' | 'smtp' | 'smtp-auth' | 'relay' | 'local';

export function createEmailTransport(type?: TransportType): EazzioEmailTransport {
  const emailMode = (process.env.EMAIL_MODE || '').toLowerCase();
  const rawTransport = (process.env.MAIL_TRANSPORT || '').toLowerCase();

  let selectedType: TransportType;
  if (type) {
    selectedType = type;
  } else if (rawTransport === 'relay' || rawTransport === 'smtp-auth' || emailMode === 'relay') {
    selectedType = 'relay';
  } else if (rawTransport === 'local' || emailMode === 'local') {
    selectedType = 'local';
  } else if (rawTransport === 'direct' || emailMode === 'direct') {
    selectedType = 'direct';
  } else if (rawTransport === 'smtp') {
    selectedType = 'smtp';
  } else if (
    process.env.SMTP_PASSWORD ||
    process.env.SMTP_PASS ||
    process.env.SMTP_AUTH_PASS ||
    process.env.SMTP_USERNAME ||
    process.env.SMTP_USER ||
    process.env.SMTP_AUTH_USER
  ) {
    selectedType = 'relay';
  } else if (process.env.NODE_ENV === 'production') {
    selectedType = 'relay';
  } else {
    selectedType = 'smtp';
  }

  switch (selectedType) {
    case 'local':
      return new LocalTestTransport();
    case 'direct':
      return new DirectMtaEmailTransport();
    case 'relay':
    case 'smtp-auth':
      return new SmtpAuthenticatedTransport();
    case 'smtp':
    default:
      return new SmtpSubmissionTransport({
        host: process.env.SMTP_HOST || '127.0.0.1',
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 1025,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USERNAME || process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
        heloHostname: process.env.SMTP_HELO_NAME || 'mail.eazzio.com',
      });
  }
}

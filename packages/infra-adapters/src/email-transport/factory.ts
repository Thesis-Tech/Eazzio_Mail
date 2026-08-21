import { EazzioEmailTransport } from './interface.js';
import { DirectMtaEmailTransport } from './direct-mta-adapter.js';
import { SmtpSubmissionTransport } from './smtp-submission-adapter.js';
import { LocalTestTransport } from './local-test-adapter.js';

import { SmtpAuthenticatedTransport } from './smtp-authenticated-adapter.js';

export type TransportType = 'direct' | 'smtp' | 'smtp-auth' | 'local';

export function createEmailTransport(type?: TransportType): EazzioEmailTransport {
  const selectedType =
    type ||
    (process.env.MAIL_TRANSPORT as TransportType) ||
    (process.env.SMTP_AUTH_USER ? 'smtp-auth' : process.env.SMTP_HOST ? 'smtp' : process.env.NODE_ENV === 'production' ? 'direct' : 'smtp');

  switch (selectedType) {
    case 'local':
      return new LocalTestTransport();
    case 'direct':
      return new DirectMtaEmailTransport();
    case 'smtp-auth':
      return new SmtpAuthenticatedTransport();
    case 'smtp':
    default:
      return new SmtpSubmissionTransport({
        host: process.env.SMTP_HOST || '127.0.0.1',
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 1025,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        heloHostname: process.env.SMTP_HELO_NAME || 'mail.eazzio.com',
      });
  }
}

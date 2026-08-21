import { EazzioEmailTransport } from './interface.js';
import { DirectMtaEmailTransport } from './direct-mta-adapter.js';
import { SmtpSubmissionTransport } from './smtp-submission-adapter.js';
import { LocalTestTransport } from './local-test-adapter.js';

export type TransportType = 'direct' | 'smtp' | 'local';

export function createEmailTransport(type?: TransportType): EazzioEmailTransport {
  const selectedType = type || (process.env.MAIL_TRANSPORT as TransportType) || (process.env.SMTP_HOST ? 'smtp' : 'direct');

  switch (selectedType) {
    case 'local':
      return new LocalTestTransport();
    case 'smtp':
      return new SmtpSubmissionTransport();
    case 'direct':
    default:
      return new DirectMtaEmailTransport();
  }
}

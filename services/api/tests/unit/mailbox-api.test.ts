import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { MailboxService } from '../../src/application/mailbox-service.js';
import { TokenService } from '@eazzio/identity';

describe('Mailbox Core API & Application Logic', () => {
  const validToken = TokenService.generateAccessToken({
    userId: 'usr-1',
    sessionId: 'ses-1',
    email: 'user@eazzio.com',
  });

  it('should generate 6 standard system folders', () => {
    const folders = MailboxService.getSystemFolders('mbx-1');
    expect(folders.length).toBe(6);
    expect(folders.map((f) => f.kind)).toEqual([
      'inbox',
      'sent',
      'drafts',
      'spam',
      'trash',
      'archive',
    ]);
  });

  it('should enforce object-level ownership checks', () => {
    expect(() => MailboxService.verifyOwnership('usr-1', 'usr-2')).toThrowError(
      'Access denied to this mailbox',
    );
    expect(() => MailboxService.verifyOwnership('usr-1', 'usr-1')).not.toThrow();
  });

  it('should assign thread heuristically based on subject matching', () => {
    const threadId = MailboxService.assignThread({ subject: 'Re: Project Update' }, [
      { id: 'th-1', subjectNormalized: 'project update' },
    ]);
    expect(threadId).toBe('th-1');
  });

  it('should return 401 AUTH_REQUIRED when token is missing', async () => {
    const res = await request(app).get('/v1/mailboxes/mbx-1/folders');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('should return system folders when authenticated', async () => {
    const res = await request(app)
      .get('/v1/mailboxes/mbx-1/folders')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(6);
  });
});

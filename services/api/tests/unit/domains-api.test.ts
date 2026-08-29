import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../src/app.js';
import { TokenService } from '@eazzio/identity';

describe('Custom Domains & DNS Verification Wizard API (TASK-PHASE-3)', () => {
  let authToken: string;
  let testDomainId: string;
  const testUserId = crypto.randomUUID();
  const testDomainName = `test-${Date.now()}.eazzio.io`;

  beforeAll(() => {
    authToken = TokenService.generateAccessToken({
      userId: testUserId,
      sessionId: crypto.randomUUID(),
      email: `admin_${Date.now()}@eazzio.com`,
    });
  });

  it('POST /v1/domains > should reject invalid domain syntax with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/v1/domains')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ domainName: 'invalid_domain..com' });

    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /v1/domains > should register new domain and generate 2048-bit RSA DKIM keys with DNS recommendations', async () => {
    const res = await request(app)
      .post('/v1/domains')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ domainName: testDomainName });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.domainName).toBe(testDomainName);
    expect(res.body.data.verificationStatus).toBe('pending');
    expect(res.body.data.dkimPublicKey).toBeDefined();
    expect(res.body.data.dkimPublicKey.length).toBeGreaterThan(100);

    // Verify 4 recommended DNS records
    const dnsRecords = res.body.data.dnsRecords;
    expect(dnsRecords).toHaveLength(4);

    const mxRec = dnsRecords.find((r: any) => r.recordType === 'MX');
    expect(mxRec).toBeDefined();
    expect(mxRec.priority).toBe(10);

    const spfRec = dnsRecords.find((r: any) => r.purpose === 'SPF Authentication');
    expect(spfRec).toBeDefined();
    expect(spfRec.value).toContain('v=spf1');

    const dkimRec = dnsRecords.find((r: any) => r.purpose === 'DKIM Signing');
    expect(dkimRec).toBeDefined();
    expect(dkimRec.host).toBe('default._domainkey');
    expect(dkimRec.value).toContain('v=DKIM1; k=rsa; p=');

    const dmarcRec = dnsRecords.find((r: any) => r.purpose === 'DMARC Policy');
    expect(dmarcRec).toBeDefined();
    expect(dmarcRec.value).toContain('v=DMARC1;');

    testDomainId = res.body.data.id;
  });

  it('POST /v1/domains > should reject duplicate domain registration with 409 DOMAIN_EXISTS', async () => {
    const res = await request(app)
      .post('/v1/domains')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ domainName: testDomainName });

    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe('DOMAIN_EXISTS');
  });

  it('GET /v1/domains > should list registered domains', async () => {
    const res = await request(app)
      .get('/v1/domains')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((d: any) => d.id === testDomainId);
    expect(found).toBeDefined();
    expect(found.domainName).toBe(testDomainName);
  });

  it('GET /v1/domains/:id > should retrieve domain details with DNS records', async () => {
    const res = await request(app)
      .get(`/v1/domains/${testDomainId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(testDomainId);
    expect(res.body.data.dnsRecords).toHaveLength(4);
  });

  it('POST /v1/domains/:id/verify > should execute live DNS checks and return diagnostic status', async () => {
    const res = await request(app)
      .post(`/v1/domains/${testDomainId}/verify`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.domainId).toBe(testDomainId);
    expect(res.body.data.details).toBeDefined();
    expect(res.body.data.details.mx).toBeDefined();
    expect(res.body.data.details.spf).toBeDefined();
    expect(res.body.data.details.dkim).toBeDefined();
    expect(res.body.data.details.dmarc).toBeDefined();
  });

  it('DELETE /v1/domains/:id > should delete domain successfully', async () => {
    const res = await request(app)
      .delete(`/v1/domains/${testDomainId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const checkRes = await request(app)
      .get(`/v1/domains/${testDomainId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(checkRes.status).toBe(404);
  });
});

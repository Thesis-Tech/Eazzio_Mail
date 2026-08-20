import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  PostgresAdapter,
  PostgresOrganizationRepository,
  GeminiAiAdapter,
} from '@eazzio/infra-adapters';
import { AiGatewayService } from '../../src/application/ai-service.js';

describe('AI Gateway Live Integration Tests (TASK-014)', () => {
  const dbUrl =
    process.env.DATABASE_URL ||
    'postgresql://eazzio_user:eazzio_password@localhost:5432/eazzio_mail';
  let db: PostgresAdapter;

  let orgRepo: PostgresOrganizationRepository;
  let aiAdapter: GeminiAiAdapter;
  let aiGateway: AiGatewayService;

  const testSuffix = Date.now().toString();
  const optInOrgId = crypto.randomUUID();
  const optOutOrgId = crypto.randomUUID();

  beforeAll(async () => {
    db = new PostgresAdapter(dbUrl);
    orgRepo = new PostgresOrganizationRepository(db);
    aiAdapter = new GeminiAiAdapter();
    aiGateway = new AiGatewayService(aiAdapter, orgRepo);

    // 1. Seed opt-in organization
    await db.query('INSERT INTO organizations (id, name, policy) VALUES ($1, $2, $3)', [
      optInOrgId,
      `Opt-In Org ${testSuffix}`,
      JSON.stringify({ ai_opt_in: true }),
    ]);

    // 2. Seed opt-out organization
    await db.query('INSERT INTO organizations (id, name, policy) VALUES ($1, $2, $3)', [
      optOutOrgId,
      `Opt-Out Org ${testSuffix}`,
      JSON.stringify({ ai_opt_in: false }),
    ]);
  });

  afterAll(async () => {
    await db.query('DELETE FROM organizations WHERE id IN ($1, $2)', [optInOrgId, optOutOrgId]);
    await db.close();
  });

  it('should summarize thread when organization has opted into AI features', async () => {
    const messages = [
      {
        from: 'alice@corp.com',
        subject: 'Project Kickoff',
        body: 'Let us start sprint 1 on Monday.',
      },
      {
        from: 'bob@corp.com',
        subject: 'Re: Project Kickoff',
        body: 'Sounds good. Architecture is approved.',
      },
    ];

    const result = await aiGateway.summarizeThreadFromDb(optInOrgId, messages);
    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('should deny AI summarization when organization policy disables AI opt-in', async () => {
    const messages = [
      { from: 'alice@corp.com', subject: 'Confidential', body: 'Sensitive data thread.' },
    ];

    await expect(aiGateway.summarizeThreadFromDb(optOutOrgId, messages)).rejects.toThrow(
      'AI features are disabled by organization policy',
    );
  });

  it('should generate smart replies and priority classification for opt-in organization', async () => {
    const thread = [
      {
        from: 'vendor@services.com',
        subject: 'Invoice Renewal',
        body: 'Please confirm invoice receipt.',
      },
    ];

    const replies = await aiGateway.suggestReply({ ai_opt_in: true }, thread);
    expect(replies.suggestions.length).toBeGreaterThan(0);

    const priority = await aiGateway.classifyPriority(
      { ai_opt_in: true },
      {
        from: 'alert@monitoring.com',
        subject: 'CRITICAL: High CPU load on mail cluster',
        body: 'Urgent action required.',
      },
    );
    expect(priority.priorityHint).toBe('high');
  });
});

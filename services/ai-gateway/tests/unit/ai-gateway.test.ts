import { describe, it, expect } from 'vitest';
import { AiGatewayService } from '../../src/application/ai-service.js';
import { EazzioAI } from '@eazzio/infra-adapters';

describe('AI Gateway Service & Structural Policy Boundaries', () => {
  const mockAiAdapter: EazzioAI = {
    summarizeThread: async () => ({ summary: 'Key takeaway: Launch is on schedule.' }),
    suggestReply: async () => ({ suggestions: ['Sounds good, thanks!', 'I will review shortly.'] }),
    classifyPriority: async () => ({ priorityHint: 'high' }),
    isEnabled: async () => true
  };

  it('should block AI execution if organization has not opted in', async () => {
    const service = new AiGatewayService(mockAiAdapter);
    const disabledOrgPolicy = { ai_opt_in: false };

    await expect(service.summarizeThread(disabledOrgPolicy, [
      { from: 'colleague@eazzio.com', body: 'Let us meet at 3.' }
    ])).rejects.toThrow('AI features are disabled by organization policy');
  });

  it('should execute summarization when organization policy opts in', async () => {
    const service = new AiGatewayService(mockAiAdapter);
    const enabledOrgPolicy = { ai_opt_in: true };

    const res = await service.summarizeThread(enabledOrgPolicy, [
      { from: 'colleague@eazzio.com', body: 'Project update: milestone 10 is complete.' }
    ]);
    expect(res.summary).toContain('Key takeaway');
  });
});

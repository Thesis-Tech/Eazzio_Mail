import { EazzioAI, MessageSummaryInput } from '@eazzio/infra-adapters';
import { AiPolicyEvaluator } from '../domain/ai-policy.js';
import { OrganizationRepository } from '@eazzio/domain';

export class AiGatewayService {
  constructor(
    private readonly aiAdapter: EazzioAI,
    private readonly orgRepo?: OrganizationRepository
  ) {}

  public async summarizeThread(
    orgPolicy: Record<string, unknown>,
    messages: MessageSummaryInput[],
  ): Promise<{ summary: string }> {
    if (!AiPolicyEvaluator.isAiEnabledForOrg(orgPolicy)) {
      throw new Error('AI features are disabled by organization policy');
    }
    return await this.aiAdapter.summarizeThread(messages);
  }

  public async suggestReply(
    orgPolicy: Record<string, unknown>,
    thread: MessageSummaryInput[],
  ): Promise<{ suggestions: string[] }> {
    if (!AiPolicyEvaluator.isAiEnabledForOrg(orgPolicy)) {
      throw new Error('AI features are disabled by organization policy');
    }
    return await this.aiAdapter.suggestReply(thread);
  }

  public async classifyPriority(
    orgPolicy: Record<string, unknown>,
    message: MessageSummaryInput,
  ): Promise<{ priorityHint: 'low' | 'normal' | 'high' }> {
    if (!AiPolicyEvaluator.isAiEnabledForOrg(orgPolicy)) {
      throw new Error('AI features are disabled by organization policy');
    }
    return await this.aiAdapter.classifyPriority(message);
  }

  /**
   * Database-backed thread summarization with read-only organization policy evaluation.
   */
  public async summarizeThreadFromDb(
    organizationId: string,
    messages: MessageSummaryInput[],
  ): Promise<{ summary: string }> {
    let orgPolicy: Record<string, unknown> = {};

    if (this.orgRepo) {
      const org = await this.orgRepo.findById(organizationId);
      if (!org) {
        throw new Error(`Organization not found: ${organizationId}`);
      }
      orgPolicy = org.policy;
    }

    return this.summarizeThread(orgPolicy, messages);
  }
}

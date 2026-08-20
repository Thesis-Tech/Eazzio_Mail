import { EazzioAI, MessageSummaryInput } from '@eazzio/infra-adapters';
import { AiPolicyEvaluator } from '../domain/ai-policy.js';

export class AiGatewayService {
  constructor(private readonly aiAdapter: EazzioAI) {}

  public async summarizeThread(
    orgPolicy: Record<string, unknown>,
    messages: MessageSummaryInput[]
  ): Promise<{ summary: string }> {
    if (!AiPolicyEvaluator.isAiEnabledForOrg(orgPolicy)) {
      throw new Error('AI features are disabled by organization policy');
    }
    return await this.aiAdapter.summarizeThread(messages);
  }

  public async suggestReply(
    orgPolicy: Record<string, unknown>,
    thread: MessageSummaryInput[]
  ): Promise<{ suggestions: string[] }> {
    if (!AiPolicyEvaluator.isAiEnabledForOrg(orgPolicy)) {
      throw new Error('AI features are disabled by organization policy');
    }
    return await this.aiAdapter.suggestReply(thread);
  }
}

export class AiPolicyEvaluator {
  public static isAiEnabledForOrg(orgPolicy: Record<string, unknown>): boolean {
    return Boolean(orgPolicy['ai_opt_in']);
  }
}

export type PrivacyTier = 'standard' | 'enhanced_privacy' | 'e2ee';

export class AiPolicyEvaluator {
  public static isAiEnabledForOrg(
    orgPolicy: Record<string, unknown>,
    userPrivacyTier?: PrivacyTier
  ): boolean {
    if (userPrivacyTier === 'enhanced_privacy' || userPrivacyTier === 'e2ee') {
      return false;
    }
    if (orgPolicy['privacy_tier'] === 'enhanced_privacy' || orgPolicy['privacy_tier'] === 'e2ee') {
      return false;
    }
    return Boolean(orgPolicy['ai_opt_in']);
  }
}

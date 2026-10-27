export interface AuthResults {
  spf: 'pass' | 'fail' | 'softfail' | 'neutral' | 'none';
  dkim: 'pass' | 'fail' | 'none';
  dmarc: 'pass' | 'fail' | 'none';
  arc?: 'pass' | 'fail' | 'none';
  fromDomain: string;
}

export interface AVResult {
  status: 'clean' | 'infected' | 'error';
  virusName?: string;
}

export interface SpamRuleResult {
  score: number;
  matchedRules: string[];
}

import { AdversarialAnalysisResult, normalizeAdversarialText } from './normalizer.js';

export interface DecisionResult {
  action: 'ACCEPT' | 'QUARANTINE' | 'REJECT';
  reasonCode?: string;
  spamScore: number;
  adversarialAnalysis?: AdversarialAnalysisResult;
}

export function authPenalty(auth: AuthResults): number {
  let penalty = 0;
  if (auth.spf === 'softfail') penalty += 0.3;
  if (auth.spf === 'fail') penalty += 0.5;
  if (auth.dkim === 'fail') penalty += 0.5;
  if (auth.dmarc === 'fail') penalty += 0.4;
  return penalty;
}

export function decide(params: {
  authResults: AuthResults;
  spamRuleResult: SpamRuleResult;
  spamStatisticalScore: number;
  avResult: AVResult;
  domainDmarcPolicy?: 'none' | 'quarantine' | 'reject';
  rateLimitExceeded?: boolean;
  rejectThreshold?: number;
  quarantineThreshold?: number;
  rawTextContent?: string;
  adversarialAnalysis?: AdversarialAnalysisResult;
}): DecisionResult {
  const rejectThreshold = params.rejectThreshold ?? 0.95;
  const quarantineThreshold = params.quarantineThreshold ?? 0.6;

  // Perform adversarial text analysis if rawTextContent is provided and analysis is not precomputed
  const adversarialAnalysis =
    params.adversarialAnalysis ??
    (params.rawTextContent ? normalizeAdversarialText(params.rawTextContent) : undefined);

  // 1. Hard gates first
  if (params.avResult.status === 'infected') {
    return { action: 'REJECT', reasonCode: 'MALWARE_DETECTED', spamScore: 1.0, adversarialAnalysis };
  }

  if (params.authResults.dmarc === 'fail' && params.domainDmarcPolicy === 'reject') {
    return { action: 'REJECT', reasonCode: 'DMARC_REJECT', spamScore: 1.0, adversarialAnalysis };
  }

  if (params.rateLimitExceeded) {
    return { action: 'REJECT', reasonCode: 'RATE_LIMITED', spamScore: 1.0, adversarialAnalysis };
  }

  // 2. Composite score calculation including adversarial evasion penalty
  const adversarialPenalty = adversarialAnalysis ? adversarialAnalysis.evasionPenalty : 0;
  const compositeScore = Math.min(
    1.0,
    params.spamRuleResult.score +
      params.spamStatisticalScore +
      authPenalty(params.authResults) +
      adversarialPenalty
  );

  if (compositeScore >= rejectThreshold) {
    return {
      action: 'REJECT',
      reasonCode: adversarialAnalysis?.isAdversarial ? 'ADVERSARIAL_OBFUSCATION_REJECT' : 'POLICY_REJECT',
      spamScore: compositeScore,
      adversarialAnalysis,
    };
  } else if (compositeScore >= quarantineThreshold) {
    return {
      action: 'QUARANTINE',
      reasonCode: adversarialAnalysis?.isAdversarial ? 'ADVERSARIAL_OBFUSCATION_QUARANTINE' : 'HIGH_SPAM_SCORE',
      spamScore: compositeScore,
      adversarialAnalysis,
    };
  } else {
    return { action: 'ACCEPT', spamScore: compositeScore, adversarialAnalysis };
  }
}

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

export interface DecisionResult {
  action: 'ACCEPT' | 'QUARANTINE' | 'REJECT';
  reasonCode?: string;
  spamScore: number;
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
}): DecisionResult {
  const rejectThreshold = params.rejectThreshold ?? 0.95;
  const quarantineThreshold = params.quarantineThreshold ?? 0.6;

  // 1. Hard gates first
  if (params.avResult.status === 'infected') {
    return { action: 'REJECT', reasonCode: 'MALWARE_DETECTED', spamScore: 1.0 };
  }

  if (params.authResults.dmarc === 'fail' && params.domainDmarcPolicy === 'reject') {
    return { action: 'REJECT', reasonCode: 'DMARC_REJECT', spamScore: 1.0 };
  }

  if (params.rateLimitExceeded) {
    return { action: 'REJECT', reasonCode: 'RATE_LIMITED', spamScore: 1.0 };
  }

  // 2. Composite score calculation
  const compositeScore = Math.min(
    1.0,
    params.spamRuleResult.score +
      params.spamStatisticalScore +
      authPenalty(params.authResults)
  );

  if (compositeScore >= rejectThreshold) {
    return { action: 'REJECT', reasonCode: 'POLICY_REJECT', spamScore: compositeScore };
  } else if (compositeScore >= quarantineThreshold) {
    return { action: 'QUARANTINE', reasonCode: 'HIGH_SPAM_SCORE', spamScore: compositeScore };
  } else {
    return { action: 'ACCEPT', spamScore: compositeScore };
  }
}

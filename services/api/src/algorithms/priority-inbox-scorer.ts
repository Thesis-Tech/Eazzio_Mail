/**
 * Gmail-Grade Priority Inbox Importance Scoring Algorithm
 * 
 * Computes an importance score (0.0 to 1.0) based on:
 * 1. Interaction History (frequent sender weight: +0.35)
 * 2. User has sent emails to this address before (+0.30)
 * 3. User starred previous messages in this conversation (+0.25)
 * 4. Urgent signals in Subject ("Urgent", "Action Required", "Important") (+0.20)
 * 5. Automated / Bulk / List headers (Unsubscribe, newsletter keywords) (-0.40)
 */

export interface MessageScoringFeatures {
  fromAddress: string;
  userEmail: string;
  subject: string;
  hasListUnsubscribeHeader: boolean;
  isAutomatedSender: boolean;
  pastUserSentCountToSender: number;
  hasStarredThreadHistory: boolean;
}

export class PriorityInboxScorer {
  public static calculateScore(features: MessageScoringFeatures): { score: number; isImportant: boolean; reasons: string[] } {
    let score = 0.5; // Neutral baseline
    const reasons: string[] = [];

    const lowerSubj = (features.subject || '').toLowerCase();
    const lowerFrom = (features.fromAddress || '').toLowerCase();

    // Positive indicators
    if (features.pastUserSentCountToSender > 0) {
      score += 0.30;
      reasons.push('You frequently correspond with this sender');
    }

    if (features.hasStarredThreadHistory) {
      score += 0.20;
      reasons.push('You starred previous messages in this conversation');
    }

    if (
      lowerSubj.includes('urgent') ||
      lowerSubj.includes('action required') ||
      lowerSubj.includes('asap') ||
      lowerSubj.includes('important')
    ) {
      score += 0.20;
      reasons.push('High-priority keywords in subject');
    }

    // Direct personal recipient check
    if (!features.isAutomatedSender && !lowerFrom.includes('no-reply') && !lowerFrom.includes('noreply')) {
      score += 0.10;
    }

    // Negative indicators
    if (features.hasListUnsubscribeHeader) {
      score -= 0.35;
      reasons.push('Mailing list / newsletter headers detected');
    }

    if (
      lowerFrom.includes('newsletter') ||
      lowerFrom.includes('marketing') ||
      lowerFrom.includes('digest') ||
      lowerFrom.includes('promotions') ||
      lowerFrom.includes('offers')
    ) {
      score -= 0.35;
      reasons.push('Bulk sender address pattern');
    }

    // Clamp score 0.0 - 1.0
    const clampedScore = Math.max(0.0, Math.min(1.0, score));
    const isImportant = clampedScore >= 0.70;

    return {
      score: Number(clampedScore.toFixed(2)),
      isImportant,
      reasons,
    };
  }
}

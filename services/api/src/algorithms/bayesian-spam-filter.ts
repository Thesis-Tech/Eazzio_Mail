/**
 * Naive Bayes Email Spam Classifier Algorithm
 * 
 * Computes spam probability P(Spam | Message):
 *   P(Spam | W1..Wn) = (P(W1|S)*...*P(Wn|S)*P(S)) / ( (P(W1|S)*...*P(Wn|S)*P(S)) + (P(W1|H)*...*P(Wn|H)*P(H)) )
 * Using log probabilities to avoid floating point underflow.
 */

export interface TokenStats {
  spamCount: number;
  hamCount: number;
}

export class BayesianSpamFilter {
  // Built-in seed dictionary of baseline spam indicators
  private static readonly SEED_SPAM_WORDS: Record<string, number> = {
    'viagra': 0.99,
    'cialis': 0.99,
    'casino': 0.95,
    'lottery': 0.95,
    'winner': 0.90,
    'congratulations': 0.85,
    'prizes': 0.90,
    'crypto': 0.80,
    'bitcoin': 0.80,
    'investment': 0.75,
    'urgent': 0.70,
    'act now': 0.92,
    'free gift': 0.92,
    'unclaimed': 0.88,
    'inheritance': 0.95,
    'funds': 0.75,
    'wire transfer': 0.85,
    'nigerian': 0.95,
    'beneficiary': 0.85,
    'guaranteed': 0.80,
    'risk-free': 0.85,
    'make money': 0.90,
  };

  /**
   * Tokenize text into normalized words of length 3..30.
   */
  public static tokenize(text: string): string[] {
    if (!text) return [];
    const cleaned = text.toLowerCase().replace(/<[^>]*>/g, ' ');
    const tokens = cleaned.match(/[a-z0-9_-]{3,30}/g) || [];
    return Array.from(new Set(tokens)); // unique tokens per email
  }

  /**
   * Classifies an email given its subject and body.
   * Returns a spam score between 0.0 (clean) and 1.0 (definitely spam).
   */
  public static scoreMessage(
    subject: string,
    body: string,
    customTrainedWeights?: Map<string, number>
  ): { score: number; isSpam: boolean; flaggedTokens: string[] } {
    const fullText = `${subject} ${subject} ${body}`; // double weight on subject
    const tokens = this.tokenize(fullText);

    if (tokens.length === 0) {
      return { score: 0.05, isSpam: false, flaggedTokens: [] };
    }

    const probabilities: number[] = [];
    const flaggedTokens: string[] = [];

    for (const token of tokens) {
      let tokenSpamProb = 0.4; // neutral default

      if (customTrainedWeights && customTrainedWeights.has(token)) {
        tokenSpamProb = customTrainedWeights.get(token)!;
      } else if (this.SEED_SPAM_WORDS[token] !== undefined) {
        tokenSpamProb = this.SEED_SPAM_WORDS[token]!;
      }

      // Significant deviation from neutral 0.5
      if (Math.abs(tokenSpamProb - 0.5) > 0.2) {
        probabilities.push(tokenSpamProb);
        if (tokenSpamProb >= 0.75) {
          flaggedTokens.push(token);
        }
      }
    }

    if (probabilities.length === 0) {
      return { score: 0.1, isSpam: false, flaggedTokens: [] };
    }

    // Combine probabilities using Robinson-Fisher formula / Bayes product
    // log(1 - P) vs log(P)
    let logSpam = 0;
    let logHam = 0;

    for (const p of probabilities) {
      const clampedP = Math.max(0.01, Math.min(0.99, p));
      logSpam += Math.log(clampedP);
      logHam += Math.log(1.0 - clampedP);
    }

    const expSpam = Math.exp(logSpam);
    const expHam = Math.exp(logHam);
    const finalScore = expSpam / (expSpam + expHam);
    const normalizedScore = isNaN(finalScore) ? 0.5 : Number(finalScore.toFixed(3));

    return {
      score: normalizedScore,
      isSpam: normalizedScore >= 0.85,
      flaggedTokens,
    };
  }
}

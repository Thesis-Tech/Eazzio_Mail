import { SpamRuleResult } from '@eazzio/security-pipeline';

export interface RspamdScannerConfig {
  endpoint?: string;
  timeoutMs?: number;
}

export class RspamdScanner {
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(config?: RspamdScannerConfig) {
    this.endpoint = config?.endpoint || process.env.RSPAMD_URL || 'http://localhost:11333';
    this.timeoutMs = config?.timeoutMs || 5000;
  }

  public async scan(
    rawMime: Buffer,
    clientIp?: string,
    fromHeader?: string,
  ): Promise<SpamRuleResult> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const headers: Record<string, string> = {
        'Content-Type': 'message/rfc822',
      };
      if (clientIp) headers['IP'] = clientIp;
      if (fromHeader) headers['From'] = fromHeader;

      const res = await fetch(`${this.endpoint}/checkv2`, {
        method: 'POST',
        headers,
        body: new Uint8Array(rawMime),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Rspamd returned HTTP ${res.status}`);
      }

      const json = (await res.json()) as {
        score?: number;
        required_score?: number;
        symbols?: Record<string, { score: number }>;
      };

      const score = typeof json.score === 'number' ? json.score : 0;
      const matchedRules = json.symbols ? Object.keys(json.symbols) : [];

      // Normalize score to 0.0 - 1.0 range
      const normalizedScore = Math.max(0, Math.min(1.0, score / 15.0));

      return {
        score: normalizedScore,
        matchedRules,
      };
    } catch {
      // Safe fallback on scanner unavailability: apply baseline penalty
      return {
        score: 0.1,
        matchedRules: ['RSPAMD_UNAVAILABLE_FALLBACK'],
      };
    }
  }
}

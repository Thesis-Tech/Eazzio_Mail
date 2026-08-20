export interface BackoffConfig {
  baseSeconds: number;
  maxBackoffSeconds: number;
  maxAttempts: number;
}

export const defaultBackoffConfig: BackoffConfig = {
  baseSeconds: 30,
  maxBackoffSeconds: 3600, // 1 hour
  maxAttempts: 8,
};

// Backoff formula per LLD.md Section 5.2: now() + min(base * 2^attempt, maxBackoff)
export function calculateNextAttempt(
  attemptCount: number,
  now: Date = new Date(),
  config: BackoffConfig = defaultBackoffConfig,
): { nextAttemptAt: Date; isExhausted: boolean } {
  if (attemptCount >= config.maxAttempts) {
    return { nextAttemptAt: now, isExhausted: true };
  }

  const delaySeconds = Math.min(
    config.baseSeconds * Math.pow(2, attemptCount),
    config.maxBackoffSeconds,
  );

  const nextAttemptAt = new Date(now.getTime() + delaySeconds * 1000);
  return { nextAttemptAt, isExhausted: false };
}

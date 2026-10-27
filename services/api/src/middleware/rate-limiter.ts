import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler.js';

export interface RateLimitPolicy {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyPrefix?: string;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  timestamps: number[];
  blockedUntil?: number;
  violationCount: number;
}

export class RateLimiterService {
  private static store = new Map<string, RateLimitEntry>();
  private static cleanupInterval: NodeJS.Timeout | null = null;

  public static initCleanup(): void {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
          if (entry.blockedUntil && entry.blockedUntil > now) continue;
          entry.timestamps = entry.timestamps.filter((ts) => now - ts < 60 * 60 * 1000);
          if (entry.timestamps.length === 0 && (!entry.blockedUntil || entry.blockedUntil <= now)) {
            this.store.delete(key);
          }
        }
      }, 60 * 1000);
    }
  }

  public static check(key: string, policy: RateLimitPolicy): { allowed: boolean; remaining: number; resetMs: number } {
    this.initCleanup();
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry) {
      entry = { timestamps: [], violationCount: 0 };
      this.store.set(key, entry);
    }

    // If currently blocked under progressive penalty
    if (entry.blockedUntil && entry.blockedUntil > now) {
      const resetMs = entry.blockedUntil - now;
      return { allowed: false, remaining: 0, resetMs };
    }

    // Filter timestamps within policy window
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < policy.windowMs);

    if (entry.timestamps.length >= policy.maxRequests) {
      entry.violationCount += 1;
      // Progressive escalation: 1st block = 30 min (1800000ms), 2nd block = 60 min (3600000ms), etc.
      const blockDurationMs = entry.violationCount * 30 * 60 * 1000;
      entry.blockedUntil = now + blockDurationMs;
      return { allowed: false, remaining: 0, resetMs: blockDurationMs };
    }

    entry.timestamps.push(now);
    return {
      allowed: true,
      remaining: policy.maxRequests - entry.timestamps.length,
      resetMs: policy.windowMs,
    };
  }

  public static reset(key: string): void {
    this.store.delete(key);
  }
}

/**
 * Express middleware factory for route-level and action-level rate limiting
 */
export function rateLimit(policy: RateLimitPolicy) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, allow bypassing rate limit to prevent flakiness
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      return next();
    }

    const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').toString().split(',')[0]!.trim();
    const userId = (req as any).user?.userId || (req.headers['x-user-email'] as string) || '';
    const identifier = userId ? `user:${userId}` : `ip:${ip}`;
    const key = `${policy.keyPrefix || req.baseUrl + req.path}:${identifier}`;

    const result = RateLimiterService.check(key, policy);

    res.setHeader('X-RateLimit-Limit', policy.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetMs / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil(result.resetMs / 1000));
      const waitMinutes = Math.ceil(result.resetMs / (60 * 1000));
      return next(
        new AppError(
          'RATE_LIMITED',
          policy.message || `Too many requests (max ${policy.maxRequests}). Rate limit exceeded. Please wait ${waitMinutes} minute(s) before trying again.`,
          429
        )
      );
    }

    next();
  };
}

// Standard predefined security policies with 3 attempts max and 30m escalation
export const RateLimitPolicies = {
  // Authentication policies (Max 3 attempts, then 30 min + 30 min escalation)
  LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 3, message: 'Too many login attempts (maximum 3). Please wait 30 minutes before trying again.' },
  REGISTER: { windowMs: 60 * 60 * 1000, maxRequests: 3, message: 'Registration limit reached (maximum 3). Please try again in 30 minutes.' },
  OTP_SEND: { windowMs: 15 * 60 * 1000, maxRequests: 3, message: 'Maximum 3 OTP requests allowed. Please wait 30 minutes.' },
  FORGOT_PASSWORD: { windowMs: 15 * 60 * 1000, maxRequests: 3, message: 'Too many recovery attempts (maximum 3). Please wait 30 minutes.' },
  REFRESH_TOKEN: { windowMs: 15 * 60 * 1000, maxRequests: 30, message: 'Too many token refresh requests.' },

  // Mail mutation policies
  MAIL_SEND: { windowMs: 60 * 1000, maxRequests: 30, message: 'Email sending quota exceeded. Please slow down.' },
  BULK_ACTION: { windowMs: 60 * 1000, maxRequests: 60, message: 'Bulk action limit reached. Please wait a moment.' },
  SEARCH: { windowMs: 60 * 1000, maxRequests: 60, message: 'Search rate limit exceeded.' },
  MUTATION_GENERAL: { windowMs: 60 * 1000, maxRequests: 120, message: 'Too many operations. Please wait a moment.' },

  // General API protection policies (prevents server exhaustion & DDoS)
  GLOBAL_API: { windowMs: 60 * 1000, maxRequests: 300, message: 'API request limit reached. Please slow down to preserve server capacity.' },
  READ_API: { windowMs: 60 * 1000, maxRequests: 180, message: 'Too many read requests. Please wait a moment.' },
  WRITE_API: { windowMs: 60 * 1000, maxRequests: 60, message: 'Too many write requests. Please wait a moment.' },
  DDOS_PROTECTION: { windowMs: 10 * 1000, maxRequests: 100, message: 'Unusual traffic detected from your IP. Temporarily throttled for server stability.' },
};
